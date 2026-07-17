import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { protocols } from '../core/constants.js';
import { normalizeCheckinData, getHumanizedTime, renderMiniDeltaSVG } from '../core/utils.js';
import { calculateVagalPoint, calculatePlasticity } from '../core/vagal-engine.js';
import { getWeeklyInsight } from '../services/insight-engine.js';
import { SensoryEngine } from '../services/sensory.js';
import { prepareExercise } from './checkin.js';

let configProps = {
  fb: null,
  navigateTo: null
};

export function initDashboard(config) {
  Object.assign(configProps, config);

  window.addEventListener('aura-history-updated', loadDashboard);

  // Quick Interventions: Sadece 1 Dakika (SOS Breathing)
  const sosBtn = document.getElementById('sosBreathingBtn');
  if (sosBtn) {
    sosBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('aura-haptic', {detail: 'medium'}));
      if (configProps.navigateTo) {
        configProps.navigateTo('view-swipe-breathing');
      }
    });
  }

  // Quick Interventions: Ambiyans Keşfi (Custom Action 1)
  const custom1Btn = document.getElementById('customAction1Btn');
  if (custom1Btn) {
    custom1Btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('aura-haptic', {detail: 'medium'}));
      if (configProps.navigateTo) {
        configProps.navigateTo('view-swipe-ambient');
      }
    });
  }

  // Quick Interventions: Hızlı Günlük (Custom Action 2)
  const custom2Btn = document.getElementById('customAction2Btn');
  if (custom2Btn) {
    custom2Btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('aura-haptic', {detail: 'medium'}));
      if (configProps.navigateTo) {
        configProps.navigateTo('view-notebook');
        // Let notebook open the write subpage
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('aura-open-write-notebook'));
        }, 100);
      }
    });
  }

  const intentCard = document.getElementById('dailyIntentCard');
  if (intentCard) {
    intentCard.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('aura-haptic', {detail: 'light'}));
      // Can expand to let user choose intent later
    });
  }
}

export async function loadDashboard() {
  document.body.classList.add('crystal-entry');
  setTimeout(() => document.body.classList.remove('crystal-entry'), 800);

  const hour = new Date().getHours();
  const defaultName = AppState.lang === 'tr' ? 'Dostum' : 'Friend';
  let storedName = localStorage.getItem('aura_guest_name');
  const name = AppState.user?.displayName || storedName || defaultName;

  let greetingKey = '';
  // Handle justFinishedCheckIn
  if (AppState.justFinishedCheckIn) {
    const state = AppState.lastCheckInState;
    if (state === 'okay') greetingKey = 'checkin_ventral';
    else if (state === 'wired') greetingKey = 'checkin_sympathetic';
    else if (state === 'foggy') greetingKey = 'checkin_dorsal';
    else greetingKey = 'checkin_dorsal';
    AppState.justFinishedCheckIn = false;
  } else {
    if (hour >= 6 && hour < 11) greetingKey = 'dash_morning';
    else if (hour >= 11 && hour < 17) greetingKey = 'dash_afternoon';
    else if (hour >= 17 && hour < 22) greetingKey = 'dash_evening';
    else greetingKey = 'dash_night';
  }

  const greeting = t(greetingKey).replace('{name}', name);
  if (elements.greetingText) {
    elements.greetingText.textContent = greeting;
  }

  // CACHE LOGIC: Serve existing data immediately
  if (AppState.userHistory && AppState.userHistory.length > 0) {
    renderDashboardComponents(AppState.userHistory);
    // If cache is fresh (< 2 mins), skip the fetch
    if (Date.now() - AppState.lastHistoryFetch < 120000) return;
  } else if (elements.historyList && !elements.historyList.querySelector('.stat-card, .history-item')) {
    // Only show skeleton if NO data is present to avoid flickering on re-visit
    elements.historyList.innerHTML = `
      <div class="skeleton-card skeleton" style="margin-bottom: 1rem;"></div>
      <div class="skeleton-card skeleton" style="margin-bottom: 1rem;"></div>
      <div class="skeleton-card skeleton"></div>
    `;
  }

  try {
    if (!configProps.fb || !configProps.fb.isInitialized) {
      console.warn("[Dashboard] Firebase not ready yet, waiting...");
      // Try again in 500ms if not ready
      setTimeout(loadDashboard, 500);
      return;
    }
    let historyData = [];
    const fb = configProps.fb;
    if (fb && fb.isInitialized && AppState.user) {
      const q = fb.query(fb.collection(fb.db, 'checkins'), fb.where('uid', '==', AppState.user.uid));
      const snapshot = await fb.getDocs(q);
      snapshot.forEach(doc => historyData.push(doc.data()));
      historyData.sort((a, b) => b.timestamp - a.timestamp);

      // Update Cache
      AppState.userHistory = historyData;
      AppState.lastHistoryFetch = Date.now();

      renderDashboardComponents(historyData);
    } else {
      renderDashboardComponents(AppState.mockHistory);
    }
  } catch (e) {
    console.warn("Could not load history", e);
    if (!AppState.userHistory) renderDashboardComponents(AppState.mockHistory);
  }
}

function renderDashboardComponents(data) {
  analyzeWeeklyPatterns(data);
  const displayData = data.slice(0, 5);
  renderHistory(displayData);
  
  renderDailyContent();

  // Show/Hide Quick Action cards based on active modules
  const custom1Btn = document.getElementById('customAction1Btn');
  const custom2Btn = document.getElementById('customAction2Btn');
  if (custom1Btn) {
    custom1Btn.style.display = AppState.showAmbient ? 'flex' : 'none';
  }
  if (custom2Btn) {
    custom2Btn.style.display = AppState.showNotebook ? 'flex' : 'none';
  }

  // ALWAYS SHOW: Ensure these are visible even if history is empty
  elements.vagalHeatmapCard?.classList.remove('hidden');
  elements.resilienceBar?.classList.remove('hidden');

  if (data.length > 0) {
    renderVagalHeatmap(data[0]);
  } else {
    renderVagalHeatmap(null); // Show initial/placeholder state
  }
}

function renderDailyContent() {
  const intentsCount = 5;
  const bitesCount = 15;

  // Pick pseudo-random based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  
  const intentEl = document.getElementById('dailyIntentText');
  if (intentEl) intentEl.textContent = t('intent_' + (dayOfYear % intentsCount));
  
  const biteEl = document.getElementById('dailyBiteText');
  if (biteEl) biteEl.textContent = t('bite_' + (dayOfYear % bitesCount));
}

export function renderHistory(data) {
  if (!elements.historyList) return;
  const historySection = elements.historyList.closest('.history-section');
  if (data.length === 0) {
    historySection?.classList.add('hidden');
    return;
  }
  historySection?.classList.remove('hidden');
  elements.historyList.classList.remove('locked-preview');
  elements.historyList.innerHTML = data.map((doc, index) => {
    const item = normalizeCheckinData(doc);
    const timeStr = getHumanizedTime(item.timestamp);

    const stateKey = item.polyvagal_state || item.state;
    const stateNameMap = {
      'ventral': AppState.lang === 'tr' ? 'Sistemsel Güvenlik' : 'Systemic Safety',
      'okay': AppState.lang === 'tr' ? 'Sistemsel Güvenlik' : 'Systemic Safety',
      'sympathetic': AppState.lang === 'tr' ? 'Sempatik Mobilizasyon' : 'Sympathetic Mobilization',
      'wired': AppState.lang === 'tr' ? 'Sempatik Mobilizasyon' : 'Sympathetic Mobilization',
      'dorsal': AppState.lang === 'tr' ? 'Davranışsal Geri Çekilme' : 'Behavioral Withdrawal',
      'foggy': AppState.lang === 'tr' ? 'Davranışsal Geri Çekilme' : 'Behavioral Withdrawal'
    };
    const stateName = stateNameMap[stateKey] || '...';

    let emotionLabel = '';
    if (item.selected_emotions && item.selected_emotions.length > 0) {
      emotionLabel = item.selected_emotions.map(e => t(e)).join(', ');
    } else {
      emotionLabel = item.customEmotion || (item.subEmotion ? t(item.subEmotion) : '');
    }
    if (!emotionLabel || emotionLabel === 'null') emotionLabel = stateName;

    const tags = [];
    if (item.somatic_selections) item.somatic_selections.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });

    let somaticSummary = '';
    if (tags.length > 0) {
      const prefix = AppState.lang === 'tr' ? 'Odak: ' : 'Focus: ';
      if (tags.length <= 2) {
        somaticSummary = prefix + tags.join(', ');
      } else {
        const otherText = AppState.lang === 'tr' ? ' diğer' : ' others';
        somaticSummary = `${prefix}${tags[0]}, ${tags[1]} +${tags.length - 2}${otherText}`;
      }
    }

    return `
      <div class="aura-card glow-card stagger-${(index % 4) + 3}" onclick="window.dispatchEvent(new CustomEvent('aura-haptic', {detail: 'light'}))">
        <div class="card-header">
          <div class="aura-orb ${item.polyvagal_state || 'ventral'}"></div>
          <div class="time-meta">${timeStr}</div>
          <div class="state-label">${emotionLabel}</div>
        </div>
        <div class="card-body">
          <p class="user-note">${item.savoringText || '...'}</p>
        </div>
        ${somaticSummary ? `<div class="card-footer"><span class="somatic-summary">${somaticSummary}</span></div>` : ''}
      </div>`;
  }).join('');
}

export function analyzeWeeklyPatterns(historyData) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weeklyData = historyData.filter(item => item.timestamp >= sevenDaysAgo);
  const plasticity = calculatePlasticity(weeklyData);
  renderPlasticityBar(plasticity);
  let timelineHTML = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayKey = `day_${d.getDay()}`;
    const logsThisDay = weeklyData.filter(item => new Date(item.timestamp).toDateString() === d.toDateString());
    let dominantState = null;
    if (logsThisDay.length > 0) {
      const counts = { wired: 0, foggy: 0, okay: 0 };
      logsThisDay.forEach(log => { if (log.state) counts[log.state] = (counts[log.state] || 0) + 1; });
      dominantState = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
    timelineHTML += `<div class="day-col"><div class="day-label" data-i18n="${dayKey}">${t(dayKey)}</div><div class="${dominantState ? `day-circle day-${dominantState}` : 'day-circle'}"></div></div>`;
  }
  elements.weeklyTimeline.innerHTML = timelineHTML;

  // Handle data deficiency with premium previews
  // Hide analysis cards entirely if insufficient data
  if (weeklyData.length < 3) {
    elements.vagalHeatmapCard?.classList.add('hidden');
    elements.resilienceBar?.classList.add('hidden');
    elements.weeklyInsight?.classList.add('hidden');
    elements.weeklyEmpty?.classList.add('hidden');
    return;
  }

  elements.vagalHeatmapCard?.classList.remove('hidden');
  elements.resilienceBar?.classList.remove('hidden');
  elements.weeklyInsight?.classList.remove('hidden');
  elements.weeklyEmpty?.classList.add('hidden');
  
  elements.vagalHeatmapCard?.classList.remove('locked-preview');
  elements.resilienceBar?.classList.remove('locked-preview');
  elements.weeklyInsight?.classList.remove('locked-preview');
  const compassionMessage = checkCompassionateIntervention(weeklyData);
  if (compassionMessage) {
    if (elements.insightText) elements.insightText.innerHTML = compassionMessage;
    elements.weeklyInsight?.classList.remove('hidden');
    elements.weeklyInsight?.classList.add('compassion-mode');
  }
  else {
    const insight = getWeeklyInsight(weeklyData, AppState.lang);
    if (insight) {
      if (elements.insightTitle) elements.insightTitle.textContent = insight.title;
      if (elements.insightText) elements.insightText.textContent = insight.desc;

      const focusEl = document.getElementById('insightFocus');
      const recEl = document.getElementById('insightRecommendation');
      if (focusEl) focusEl.textContent = insight.focus;
      if (recEl) recEl.textContent = insight.recommendation;

      elements.weeklyInsight?.classList.remove('hidden');
    }
  }
}

function renderPlasticityBar(plasticity) {
  if (elements.plasticityScore) elements.plasticityScore.textContent = plasticity.score;
  const fill = elements.weeklyTimeline.parentElement?.querySelector('.resilience-fill') || document.querySelector('.resilience-fill');
  if (fill) fill.style.width = `${plasticity.score}%`;
}


function checkCompassionateIntervention(weeklyData) {
  const recent3 = weeklyData.slice(0, 3);
  if (recent3.length === 3 && recent3.every(l => l.state === 'foggy' || l.state === 'wired')) return t('insight_compassion_needed');
  return null;
}

export function renderVagalHeatmap(data, isModal = false) {
  const targetBlob = isModal ? document.querySelector('#vagalModalHeatmap .vagal-blob') : elements.vagalBlob;
  if (!targetBlob) return;

  // Map state to weights if exact numeric data is missing (for the new flow)
  let v = data?.ventral || 0;
  let s = data?.sympathetic || 0;
  let d = data?.dorsal || 0;

  if (v === 0 && s === 0 && d === 0 && data?.polyvagal_state) {
    if (data.polyvagal_state === 'ventral') { v = 80; s = 10; d = 10; }
    else if (data.polyvagal_state === 'sympathetic') { v = 10; s = 80; d = 10; }
    else if (data.polyvagal_state === 'dorsal') { v = 10; s = 10; d = 80; }
  } else if (v === 0 && s === 0 && d === 0) {
    // Default center
    v = 33; s = 33; d = 34;
  }

  const point = calculateVagalPoint(v, s, d);

  // Apply with transition for "living" feel
  targetBlob.style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
  targetBlob.style.left = point.x;
  targetBlob.style.top = point.y;
  targetBlob.style.opacity = data ? '1' : '0.4';

  // Add a subtle "pulse" based on state
  targetBlob.classList.remove('pulse-slow', 'pulse-fast');
  if (data?.polyvagal_state === 'sympathetic') targetBlob.classList.add('pulse-fast');
  else targetBlob.classList.add('pulse-slow');
}
