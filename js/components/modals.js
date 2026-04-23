import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { PROTOCOL_META } from '../core/constants.js';
import { AppState } from '../core/state.js';

let galaxyAnimationId = null;

let isModalOpen = false;
let configProps = {
  pauseExercise: null,
  pauseMeditation: null,
  resumeExercise: null,
  resumeMeditation: null,
  getExerciseParams: null,
  isTimerPaused: false,
  isMeditationPaused: false
};

export function initModals(config) {
  Object.assign(configProps, config);
  
  if (elements.closeInfoBtn) elements.closeInfoBtn.addEventListener('click', hideInfoModal);
  if (elements.infoBackdrop) elements.infoBackdrop.addEventListener('click', hideInfoModal);
  if (elements.closeVagalModal) elements.closeVagalModal.addEventListener('click', hideInfoModal);

  // Global Info Support: Handle all elements with data-info or data-type
  document.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.cockpit-info-btn, .info-icon, .info-trigger');
    if (infoBtn) {
      const infoKey = infoBtn.getAttribute('data-info') || infoBtn.getAttribute('data-type');
      if (infoKey) openInfoArchive(infoKey);
    }
  });

  initCommunityModal();
}

export function initCommunityModal() {
  if (elements.closeCommunityBtn) elements.closeCommunityBtn.onclick = hideCommunityModal;
  if (elements.communityBackdrop) elements.communityBackdrop.onclick = hideCommunityModal;

  elements.commTabBtns.forEach(btn => {
    btn.onclick = () => {
      const tab = btn.getAttribute('data-tab');
      elements.commTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      elements.commTabPanes.forEach(pane => {
        if (pane.id === (tab === 'ben' ? 'commTabBen' : 'commTabTopluluk')) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      if (tab === 'topluluk') startGalaxy();
      else stopGalaxy();
    };
  });
}

export function openCommunityModal(history) {
  if (!elements.communityModal) return;
  
  renderPersonalStats(history);
  renderCommunityStats();
  
  elements.communityModal.classList.add('active');
  if (elements.communityBackdrop) elements.communityBackdrop.classList.add('active');
  
  // Default tab
  const benTab = Array.from(elements.commTabBtns).find(b => b.getAttribute('data-tab') === 'ben');
  if (benTab) benTab.click();
}

export function hideCommunityModal() {
  if (elements.communityModal) elements.communityModal.classList.remove('active');
  if (elements.communityBackdrop) elements.communityBackdrop.classList.remove('active');
  stopGalaxy();
}

function renderPersonalStats(history = []) {
  if (!elements.personalStatsGrid) return;
  
  const stats = { wired: 0, foggy: 0, okay: 0 };
  const sensationsMap = {};
  let totalSessions = history.length;
  
  history.forEach(h => {
    if (h.state && stats[h.state] !== undefined) stats[h.state]++;
    
    // Support both old (sensations) and new (somatic_selections) history formats
    const signals = h.somatic_selections || h.sensations || [];
    if (Array.isArray(signals)) {
      signals.forEach(s => {
        sensationsMap[s] = (sensationsMap[s] || 0) + 1;
      });
    }
  });

  // Find most frequent sensation
  let topSensation = '-';
  let topCount = 0;
  for (const [key, count] of Object.entries(sensationsMap)) {
    if (count > topCount) {
      topCount = count;
      topSensation = t(key);
    }
  }

  elements.personalStatsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">${t('vagal_ventral')}</div>
      <div class="stat-value" style="color: #64E49F;">${stats.okay}</div>
      <div class="stat-sub">${t('stat_ventral_desc')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${t('vagal_symp')}</div>
      <div class="stat-value" style="color: #FBA044;">${stats.wired}</div>
      <div class="stat-sub">${t('stat_symp_desc')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${t('vagal_dorsal')}</div>
      <div class="stat-value" style="color: #62A4FF;">${stats.foggy}</div>
      <div class="stat-sub">${t('stat_dorsal_desc')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${t('stat_total_sessions')}</div>
      <div class="stat-value">${totalSessions}</div>
      <div class="stat-sub">${totalSessions > 0 ? t('comm_streak').replace('{count}', totalSessions) : '-'}</div>
    </div>
    <div class="stat-card" style="grid-column: span 2; background: rgba(255, 255, 255, 0.03);">
      <div class="stat-label">${t('stat_top_signal')}</div>
      <div class="stat-value" style="font-size: 1.1rem; text-transform: capitalize; color: #fff;">${topSensation}</div>
      <div class="stat-sub">Somatic farkındalık lideri</div>
    </div>
  `;
}

async function renderCommunityStats() {
  const totalCheckins = 42083 + Math.floor(Math.random() * 100);
  if (elements.commCheckinCount) {
    elements.commCheckinCount.innerHTML = t('comm_checkin_count').replace('{count}', `<span>${totalCheckins.toLocaleString()}</span>`);
  }
  
  // Random distribution for mock feel
  const v = 45, s = 30, d = 25;
  if (elements.distVentral) elements.distVentral.style.width = `${v}%`;
  if (elements.distSympathetic) elements.distSympathetic.style.width = `${s}%`;
  if (elements.distDorsal) elements.distDorsal.style.width = `${d}%`;
  
  if (elements.commTopProtocol) elements.commTopProtocol.textContent = t('title_p_resonance');
  if (elements.commActiveNow) elements.commActiveNow.textContent = 12 + Math.floor(Math.random() * 20);
}

function startGalaxy() {
  const canvas = elements.galaxyCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  resize();

  const particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: 0.2 + Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.5
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y -= p.speed;
      if (p.y < 0) p.y = canvas.height;
      ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    galaxyAnimationId = requestAnimationFrame(animate);
  };
  
  stopGalaxy();
  animate();
}

function stopGalaxy() {
  if (galaxyAnimationId) {
    cancelAnimationFrame(galaxyAnimationId);
    galaxyAnimationId = null;
  }
}

export function updateModalState(state) {
  Object.assign(configProps, state);
}

function getAuraSVGIcon(type) {
  const iconMap = {
    'heatmap': `<rect x="18" y="18" width="8" height="8" rx="1" fill="white" opacity="0.6"/><rect x="28" y="18" width="8" height="8" rx="1" fill="white" opacity="0.3"/><rect x="38" y="18" width="8" height="8" rx="1" fill="white" opacity="0.8"/><rect x="18" y="28" width="8" height="8" rx="1" fill="white" opacity="0.2"/><rect x="28" y="28" width="8" height="8" rx="1" fill="white" opacity="0.9"/><rect x="38" y="28" width="8" height="8" rx="1" fill="white" opacity="0.4"/><rect x="18" y="38" width="8" height="8" rx="1" fill="white" opacity="0.5"/><rect x="28" y="38" width="8" height="8" rx="1" fill="white" opacity="0.1"/><rect x="38" y="38" width="8" height="8" rx="1" fill="white" opacity="0.7"/>`,
    'resilience': `<path d="M12 32 C 18 12, 26 52, 32 32 C 38 12, 46 52, 52 32" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/><path d="M12 32 L 52 32" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'insight': `<circle cx="32" cy="32" r="12" stroke="white" stroke-width="1.5"/><circle cx="32" cy="32" r="22" stroke="white" stroke-width="0.5" stroke-dasharray="2 4"/><path d="M32 20V12M32 52V44M44 32H52M12 32H20" stroke="white" stroke-width="1" opacity="0.6"/>`,
    'exercise': `<path d="M22 32L28 32L32 20L36 44L40 32L46 32" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="32" cy="32" r="25" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'step1': `<circle cx="32" cy="32" r="6" fill="white" opacity="0.9"><animate attributeName="r" values="6;10;6" dur="3s" repeatCount="indefinite"/></circle><path d="M32 10V54M10 32H54" stroke="white" stroke-width="0.5" opacity="0.3"/>`,
    'step2': `<path d="M32 12V52M12 32H52" stroke="white" stroke-width="1" opacity="0.4"/><rect x="22" y="22" width="20" height="20" stroke="white" stroke-width="1.5"/><circle cx="37" cy="27" r="3" fill="white"/>`,
    'step2b': `<path d="M20 20H44V36H28L20 44V20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="28" r="1" fill="white"/><circle cx="28" cy="28" r="1" fill="white"/><circle cx="36" cy="28" r="1" fill="white"/>`,
    'step3': `<path d="M18 48C18 48 12 40 12 30C12 20 20 12 32 12C44 12 52 20 52 30C52 40 46 48 46 48" stroke="white" stroke-width="1.5" fill="none"/><path d="M32 28V44" stroke="white" stroke-width="1" opacity="0.5"/>`,
    'step4': `<circle cx="32" cy="32" r="4" fill="white"/><circle cx="32" cy="32" r="12" stroke="white" stroke-width="1" opacity="0.4"/><circle cx="32" cy="32" r="24" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'step5': `<path d="M20 44L32 20L44 44H20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="34" r="2" fill="white"/>`,
    'step6': `<path d="M32 48C32 48 12 36 12 24C12 16 18 12 24 12C28 12 32 15 32 15C32 15 36 12 40 12C46 12 52 16 52 24C52 36 32 48 32 48Z" stroke="white" stroke-width="1.5" fill="none"/><path d="M22 24H42" stroke="white" stroke-width="0.5" opacity="0.4"/>`,
    'breathing': `<circle cx="32" cy="32" r="14" stroke="white" stroke-width="1.5" fill="none"><animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite"/></circle><circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.2)" stroke-width="1" fill="none"/>`
  };
  
  if (iconMap[type]) {
    const innerContent = iconMap[type];
    return `
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="auraGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g filter="url(#auraGlow)">
          ${innerContent}
        </g>
      </svg>
    `;
  } else {
    // Protocol or other: Use stylized background with the SVG icon
    const meta = PROTOCOL_META[type] || { icon: '' };
    return `
      <div class="stylized-protocol-icon" style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 50%; box-shadow: 0 0 30px rgba(255,255,255,0.05); backdrop-filter: blur(10px);">
        <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${meta.icon}
        </svg>
      </div>
    `;
  }
}

export function openInfoArchive(key) {
  console.log("Aura Modal Triggered with key:", key);
  if (!elements.vagalModal) return;

  // Cleanup key and identify type
  const cleanKey = key.replace('info_', '').replace('_desc', '').replace('_title', '').replace('_body', '');
  
  let title, body, ref, iconType = cleanKey;
  
  // Resolve exercise context
  const activeEx = (configProps.AppState && configProps.AppState.currentExercise) || 
                   (typeof configProps.getExerciseParams === 'function' ? configProps.getExerciseParams() : null);

  // Helper for reliable translation
  const getT = (k) => {
    const val = t(k);
    return (val && val !== k) ? val : null;
  };

  // Determine pId (Protocol ID)
  let pId = (cleanKey.startsWith('p_') || PROTOCOL_META[cleanKey]) ? cleanKey : null;
  
  // If we are in breathing/exercise context, try to resolve pId from active exercise
  if (!pId && (cleanKey === 'breathing' || cleanKey === 'step3' || cleanKey === 'exercise') && activeEx) {
    pId = activeEx.id;
  }

  // 1. Try Specific Scientific Content
  if (pId) {
    const sTitle = getT(`sci_${pId}_title`);
    const sBody = getT(`sci_${pId}_desc`);
    const sRef = getT(`sci_${pId}_ref`);
    
    if (sTitle && sBody) {
      title = sTitle;
      body = sBody;
      ref = sRef || 'Aura Scientific Archive';
      iconType = pId;
    }
  }

  // 2. Fallback to Generic Content
  if (!title) {
    title = t(`info_${cleanKey}_title`);
    body = t(`info_${cleanKey}_body`);
    ref = t(`info_${cleanKey}_ref`);
    iconType = cleanKey;
  }

  // UI PREP: Reset all specific fields in the Vagal Modal
  if (elements.vagalModalTitle) elements.vagalModalTitle.style.display = 'none';
  if (elements.vagalModalHeatmap) elements.vagalModalHeatmap.style.display = 'none';
  if (elements.vagalModalRec) elements.vagalModalRec.style.display = 'none';
  if (elements.vagalModalAnalysis) {
    elements.vagalModalAnalysis.style.display = 'block';
    // Add legal-content class for better readability of long texts
    if (cleanKey.startsWith('legal_')) {
      elements.vagalModalAnalysis.classList.add('legal-content');
    } else {
      elements.vagalModalAnalysis.classList.remove('legal-content');
    }
  }

  // Render Content
  if (elements.vagalModalAnalysis) {
    elements.vagalModalAnalysis.innerHTML = `
      <div class="info-sheet-content">
        <div class="info-sheet-icon">${getAuraSVGIcon(iconType)}</div>
        <h2 class="info-sheet-title">${title}</h2>
        <div class="info-sheet-body">${body}</div>
        <div class="info-sheet-ref">Source: ${ref}</div>
      </div>
    `;
  }

  elements.vagalModal.classList.add('open');
  
  // Pause any active timers
  if (!configProps.isTimerPaused && configProps.pauseExercise) configProps.pauseExercise();
  if (!configProps.isMeditationPaused && configProps.pauseMeditation) configProps.pauseMeditation();
}

export function showInfoModal(type) {
  openInfoArchive(`info_${type}`);
}

export function hideInfoModal() {
  isModalOpen = false;
  if(elements.infoBackdrop) elements.infoBackdrop.classList.remove('active');
  if(elements.infoModal) elements.infoModal.classList.remove('active');
  if(elements.vagalModal) elements.vagalModal.classList.remove('open');

  if (configProps.isTimerPaused && configProps.resumeExercise) configProps.resumeExercise();
  if (configProps.isMeditationPaused && configProps.resumeMeditation) configProps.resumeMeditation();
}
