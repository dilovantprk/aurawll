import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { protocols } from '../core/constants.js';
import { normalizeCheckinData, getHumanizedTime, renderMiniDeltaSVG } from '../core/utils.js';
import { calculateVagalPoint, calculatePlasticity } from '../core/vagal-engine.js';
import { getWeeklyInsight } from '../services/insight-engine.js';

let configProps = {
  fb: null,
  navigateTo: null
};

export function initDashboard(config) {
  Object.assign(configProps, config);
}

export async function loadDashboard() {
  if (configProps.navigateTo) configProps.navigateTo('view-dashboard');
  document.body.classList.add('crystal-entry');
  setTimeout(() => document.body.classList.remove('crystal-entry'), 800);

  const hour = new Date().getHours();
  let greetingKey = hour < 12 ? 'dash_morning' : (hour < 18 ? 'dash_afternoon' : 'dash_evening');
  const greeting = t(greetingKey);
  const defaultName = AppState.lang === 'tr' ? 'Dostum' : 'Friend';
  let storedName = localStorage.getItem('aura_guest_name');
  const name = AppState.user?.displayName || storedName || defaultName;
  elements.greetingText.textContent = t('dash_greeting').replace('{greeting}', greeting).replace('{name}', name);

  // CACHE LOGIC: Serve existing data immediately
  if (AppState.userHistory && AppState.userHistory.length > 0) {
    renderDashboardComponents(AppState.userHistory);
    // If cache is fresh (< 2 mins), skip the fetch
    if (Date.now() - AppState.lastHistoryFetch < 120000) return;
  } else {
    elements.historyList.innerHTML = '<div class="loader-circle" style="width:24px;height:24px;border-width:2px;margin:1rem auto;"></div>';
  }

  try {
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
  } catch(e) {
    console.warn("Could not load history", e);
    if (!AppState.userHistory) renderDashboardComponents(AppState.mockHistory);
  }
}

function renderDashboardComponents(data) {
  analyzeWeeklyPatterns(data);
  const displayData = data.slice(0, 5);
  renderHistory(displayData);
  if (data.length > 0) {
    if (elements.vagalHeatmapCard) elements.vagalHeatmapCard.classList.remove('hidden');
    if (elements.resilienceBar) elements.resilienceBar.classList.remove('hidden'); 
    renderVagalHeatmap(data[0]); 
  }
}

export function renderHistory(data) {
  if (data.length === 0) {
    elements.historyList.innerHTML = `<div class="empty-state">${t('dash_empty')}</div>`;
    return;
  }
  elements.historyList.innerHTML = data.map(doc => {
    const item = normalizeCheckinData(doc);
    const timeStr = getHumanizedTime(item.timestamp);
    const stateName = { 'wired': AppState.lang === 'tr' ? 'Sempatik' : 'Sympathetic', 'foggy': AppState.lang === 'tr' ? 'Dorsal' : 'Dorsal', 'okay': AppState.lang === 'tr' ? 'Ventral' : 'Ventral' }[item.state] || '...';
    let emotionLabel = item.customEmotion || (item.subEmotion ? t(item.subEmotion) : '');
    if (emotionLabel === 'null' || !emotionLabel || emotionLabel === item.subEmotion) emotionLabel = stateName; 
    const tags = [];
    if (item.somatic_selections) item.somatic_selections.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
    return `
      <div class="aura-card fade-in-up">
        <div class="card-header"><div class="aura-orb ${item.polyvagal_state || 'ventral'}"></div><div class="time-meta">${timeStr}</div><div class="state-label">${emotionLabel}</div></div>
        <div class="card-body"><p class="user-note">${item.savoringText ? `"${item.savoringText}"` : '...'}</p><div class="delta-mini-grid">${renderMiniDeltaSVG(item)}</div></div>
        ${tags.length > 0 ? `<div class="card-footer">${tags.map(tag => `<span class="somatic-tag">${tag}</span>`).join('')}</div>` : ''}
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
      logsThisDay.forEach(log => { if(log.state) counts[log.state] = (counts[log.state] || 0) + 1; });
      dominantState = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
    timelineHTML += `<div class="day-col"><div class="day-label" data-i18n="${dayKey}">${t(dayKey)}</div><div class="${dominantState ? `day-circle day-${dominantState}` : 'day-circle'}"></div></div>`;
  }
  elements.weeklyTimeline.innerHTML = timelineHTML;
  if (weeklyData.length < 3) { elements.weeklyEmpty.classList.remove('hidden'); elements.weeklyInsight.classList.add('hidden'); elements.weeklyExercise.classList.add('hidden'); elements.vagalHeatmapCard.classList.add('hidden'); return; }
  elements.weeklyEmpty.classList.add('hidden');
  const compassionMessage = checkCompassionateIntervention(weeklyData);
  if (compassionMessage) { elements.insightText.innerHTML = compassionMessage; elements.weeklyInsight.classList.remove('hidden'); elements.weeklyInsight.classList.add('compassion-mode'); }
  else {
    const insight = getWeeklyInsight(weeklyData);
    if (insight) {
      if (elements.insightTitle) elements.insightTitle.textContent = insight.title;
      if (elements.insightText) elements.insightText.textContent = insight.desc;
      elements.weeklyInsight?.classList.remove('hidden');
    }
    // Also show exercise part if available
    elements.weeklyExercise?.classList.remove('hidden');
    if (elements.insightExText) elements.insightExText.textContent = AppState.lang === 'tr' ? 'Rezonans' : 'Resonance';
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
  const point = calculateVagalPoint(data?.ventral || 33, data?.sympathetic || 33, data?.dorsal || 34);
  if (targetBlob) { targetBlob.style.left = point.x; targetBlob.style.top = point.y; targetBlob.style.opacity = data ? '1' : '0.5'; }
}
