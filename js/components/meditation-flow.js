import { elements } from '../core/dom.js';
import { AppState, saveHistoryToLocal } from '../core/state.js';
import { t } from '../core/i18n.js';
import { syncGlobalTheme } from '../core/utils.js';
import { protocols, subEmotionMap, PROTOCOL_META } from '../core/constants.js';

let configProps = {
  fb: null,
  navigateTo: null,
  updateUI: null,
  resetBioFeedback: null,
  AudioEngine: null,
  setHUD: null
};

let scanTimeouts = [];
let meditationIndex = 0;
let meditationPhaseStartTime = 0;
let meditationRemainingDuration = 0;
let meditationFinishTimeout = null;
let meditationCountdownInterval = null;
let meditationLoadingTimeout = null;

export function initMeditationFlow(config) {
  Object.assign(configProps, config);
  
  if (elements.offerDoneBtn) elements.offerDoneBtn.onclick = () => goToSavoring(elements.marPhaseOffer);
  if (elements.scanExitBtn) elements.scanExitBtn.onclick = () => finishGuidedScan();
  if (elements.offerContinueBtn) {
    elements.offerContinueBtn.onclick = () => {
      try { if (configProps.AudioEngine) configProps.AudioEngine.init(); } catch(e) {}
      elements.marPhaseOffer.classList.add('opacity-0');
      setTimeout(() => {
        elements.marPhaseOffer.classList.add('hidden');
        const rawProtocolId = AppState.currentExercise?.id || 'p_resonance';
        startMeditationLoading(rawProtocolId);
      }, 800);
    };
  }
}

export function startMeditationLoading(protocolId) {
  if (configProps.setHUD) configProps.setHUD(null);
  const protocol = protocols[protocolId];
  
  // CRITICAL: Set active state so modals and other components know what's playing
  if (AppState) {
    AppState.currentExercise = { ...protocol, id: protocolId };
  }
  
  elements.meditationLoadingTitle.textContent = t(protocol.titleKey);
  
  // HARD BIND: Ensure the info button in the next screen (exercise) is ready
  const exerciseInfoBtn = document.querySelector('#view-exercise .checkin-info-btn');
  if (exerciseInfoBtn) {
    exerciseInfoBtn.setAttribute('data-type', protocolId);
    exerciseInfoBtn.removeAttribute('data-info');
  }

  if (configProps.updateUI) configProps.updateUI();
  
  elements.loadingCircleProgress.style.transition = 'none';
  elements.loadingCircleProgress.style.strokeDashoffset = '283';
  const iconEl = document.querySelector('.loading-icon');
  if (iconEl) { iconEl.textContent = "5"; iconEl.style.opacity = '1'; iconEl.style.transform = 'scale(1)'; }
  
  if (configProps.navigateTo) configProps.navigateTo('view-meditation-loading');

  if (meditationLoadingTimeout) clearTimeout(meditationLoadingTimeout);
  if (meditationCountdownInterval) clearInterval(meditationCountdownInterval);
  
  setTimeout(() => {
    elements.loadingCircleProgress.style.transition = 'stroke-dashoffset 5s linear';
    elements.loadingCircleProgress.style.strokeDashoffset = '0';
    let timeLeft = 4;
    meditationCountdownInterval = setInterval(() => {
      if (iconEl) {
        iconEl.style.transform = 'scale(0.8)'; iconEl.style.opacity = '0.5';
        setTimeout(() => {
          iconEl.textContent = timeLeft; iconEl.style.transform = 'scale(1.1)'; iconEl.style.opacity = '1';
          setTimeout(() => { iconEl.style.transform = 'scale(1)'; }, 150);
          timeLeft--;
          if (timeLeft < 0) clearInterval(meditationCountdownInterval);
        }, 150);
      }
    }, 1000);

    meditationLoadingTimeout = setTimeout(() => {
      if (configProps.navigateTo) configProps.navigateTo('view-savoring');
      [elements.marPhase1, elements.marPhase2, elements.marPhaseOffer, elements.marPhase3].forEach(p => p?.classList.add('hidden'));
      elements.marPhaseScan.classList.remove('hidden');
      meditationIndex = 0;
      runMeditation();
    }, 5000);
  }, 450);
}

export function runMeditation(customDuration = null) {
  if (configProps.setHUD) configProps.setHUD(null); 
  if (meditationIndex >= 5) return;

  // Use the actual protocol that was just practiced
  let rawProtocolId = AppState.currentExercise?.id || 'p_resonance';
  
  // Mapping for protocols that don't have dedicated scan sets yet
  const fallbackMap = {
    'p_phys_sigh': 'p_sigh',
    'p_cyclic_sigh': 'p_sigh',
    'p_coherent': 'p_resonance',
    'p_nadi': 'p_resonance',
    'p_ext_exhale': 'p_478',
    'p_fire': 'p_bellows'
  };

  const finalProtocolId = fallbackMap[rawProtocolId] || rawProtocolId;
  const protocolId = finalProtocolId.replace('p_','');
  const textKey = `scan_${protocolId}_${meditationIndex}`;
  const textLine = t(textKey);
  
  elements.scanText.textContent = textLine === textKey ? "..." : textLine;
  elements.scanText.style.opacity = '1';

  const duration = customDuration || 15000;
  meditationPhaseStartTime = Date.now();
  meditationRemainingDuration = duration;

  if (!customDuration) {
    try { if (configProps.AudioEngine) configProps.AudioEngine.playBell('start'); } catch(e) {}
  }

  const fadeOutTimeout = setTimeout(() => { elements.scanText.style.opacity = '0'; }, duration - 1000);
  scanTimeouts.push(fadeOutTimeout);

  const nextTimeout = setTimeout(() => {
    meditationIndex++;
    if (meditationIndex < 5) runMeditation();
    else meditationFinishTimeout = setTimeout(finishGuidedScan, 10000);
  }, duration);
  scanTimeouts.push(nextTimeout);
}

function finishGuidedScan() {
  scanTimeouts.forEach(clearTimeout);
  scanTimeouts = [];
  
  // Phase 1: Meditative Intro
  [elements.marPhaseScan, elements.marPhaseOffer, elements.marPhase2, elements.marPhase3].forEach(p => p?.classList.add('hidden'));
  elements.marPhase1.classList.remove('hidden');
  elements.marPhase1.classList.add('fade-in');

  // Step 5 Indicator
  const stepInd = document.getElementById('savoringStepIndicator');
  if (stepInd) { stepInd.textContent = t('step_5'); stepInd.setAttribute('data-i18n', 'step_5'); }

  // Phase 2: Show Options after 4 seconds
  setTimeout(() => {
    elements.marPhase1.classList.add('hidden');
    elements.marPhase2.classList.remove('hidden');
    elements.marPhase2.classList.add('fade-in-pure');
    renderMarinationSensations();
  }, 4000);
}

function renderMarinationSensations() {
  const container = elements.marSensationContainer;
  if (!container) return;
  
  const sensations = [
    {id: 'mar_calmer'}, {id: 'mar_warmer'}, 
    {id: 'mar_lighter'}, {id: 'mar_slower'},
    {id: 'mar_clearer'}, {id: 'mar_grounded'}
  ];
  
  const state = AppState.currentCheckIn.polyvagal_state || 'ventral';
  
  container.innerHTML = sensations.map(s => {
    // Organic Randomization
    const speed = 6 + Math.random() * 4;
    const delay = -(Math.random() * 5);
    const mx = 5 + Math.random() * 10;
    const my = -(5 + Math.random() * 10);
    
    return `
      <button class="rhizome-chip ${state}" data-id="${s.id}" 
              style="--speed: ${speed}s; --delay: ${delay}s; --mx: ${mx}px; --my: ${my}px; --mx2: -${mx}px; --my2: ${-my}px;">
        <div class="liquid-wave" style="--speed: ${speed * 0.8}s"></div>
        <span>${t(s.id)}</span>
      </button>
    `;
  }).join('');
  
  AppState.currentCheckIn.sensations = [];
  container.querySelectorAll('.rhizome-chip').forEach(chip => {
    chip.onclick = () => {
      const id = chip.getAttribute('data-id');
      const idx = AppState.currentCheckIn.sensations.indexOf(id);
      if (idx > -1) {
        AppState.currentCheckIn.sensations.splice(idx, 1);
        chip.classList.remove('selected');
      } else {
        AppState.currentCheckIn.sensations.push(id);
        chip.classList.add('selected');
      }
      
      if (AppState.currentCheckIn.sensations.length > 0) {
        configProps.setHUD('check', () => goToSavoring(elements.marPhase2));
      } else {
        configProps.setHUD(null);
      }
    };
  });
  
  configProps.setHUD(null);
}

export function goToSavoring(fromPhase) {
  setTimeout(() => {
      fromPhase.classList.add('hidden');
      renderSavoringLog();
  }, 800);
}

export function drawBecomingArrow() {
  const canvas = document.getElementById('becomingCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const pre = { a: AppState.currentCheckIn.pre_arousal || 0.5, v: AppState.currentCheckIn.pre_valence || 0.5 };
  const postA = AppState.currentCheckIn.post_arousal || pre.a;
  const postV = AppState.currentCheckIn.post_valence || pre.v;

  const w = rect.width;
  const h = rect.height;
  const pX = pre.v * w;
  const pY = (1 - pre.a) * h;
  const tX = postV * w;
  const tY = (1 - postA) * h;

  let progress = 0;
  const animate = () => {
    progress += 0.02;
    if (progress > 1) progress = 1;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.moveTo(pX, pY);
    ctx.lineTo(tX, tY);
    ctx.stroke();
    ctx.setLineDash([]);

    const cX = pX + (tX - pX) * progress;
    const cY = pY + (tY - pY) * progress;

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#22c55e';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pX, pY);
    ctx.lineTo(cX, cY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cX, cY, 4, 0, Math.PI * 2);
    ctx.fill();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      showShiftBadge(pre, { a: postA, v: postV });
    }
  };

  animate();

  const preLbl = document.querySelector('.becoming-label.pre');
  const postLbl = document.querySelector('.becoming-label.post');
  if (preLbl) { preLbl.style.left = `${pX}px`; preLbl.style.top = `${pY-10}px`; }
  if (postLbl) { postLbl.style.left = `${tX}px`; postLbl.style.top = `${tY+15}px`; }
}

export function showShiftBadge(pre, post) {
  const container = document.querySelector('.becoming-visualizer');
  if (!container) return;
  
  const existing = container.querySelector('.shift-badge');
  if (existing) existing.remove();

  const diffV = Math.round((post.v - pre.v) * 100);
  const diffA = Math.round((post.a - pre.a) * 100);
  
  const badge = document.createElement('div');
  badge.className = 'shift-badge';
  badge.innerHTML = `
    <span style="font-family: monospace; font-size: 0.7rem; opacity: 0.6; letter-spacing: 1px;">NEURAL SHIFT</span>
    <div style="display: flex; gap: 1rem; font-weight: 600;">
      <span style="color: #6ee7c7;">VALENCE ${diffV > 0 ? '+' : ''}${diffV}%</span>
      <span style="color: #7b9ccc;">AROUSAL ${diffA > 0 ? '+' : ''}${diffA}%</span>
    </div>
  `;
  container.appendChild(badge);
  setTimeout(() => badge.classList.add('active'), 100);
}

function renderSavoringLog() {
  // Instead of navigateTo(non-existent-view), we stay in view-savoring but show marPhase3
  [elements.marPhase1, elements.marPhase2, elements.marPhaseOffer, elements.marPhaseScan].forEach(p => p?.classList.add('hidden'));
  if (elements.marPhase3) elements.marPhase3.classList.remove('hidden');
  
  const noteEl = document.getElementById('savoringNote');
  if (noteEl) {
    noteEl.addEventListener('input', () => {
      if (noteEl.value.trim().length > 0) {
        if (configProps.setHUD) configProps.setHUD('check', () => submitSavoringLog());
      } else {
        if (configProps.setHUD) configProps.setHUD(null);
      }
    });
  }
  
  if (configProps.setHUD) configProps.setHUD(null); // Hide initially until typing
  
  // Transition to Step 6 visuals
  const stepInd = document.getElementById('savoringStepIndicator');
  if (stepInd) {
    stepInd.textContent = t('step_6');
    stepInd.setAttribute('data-i18n', 'step_6');
  }
  
  // Trigger Becoming visualizer
  setTimeout(() => drawBecomingArrow(), 500);
}

async function submitSavoringLog() {
  const noteEl = document.getElementById('savoringNote');
  AppState.currentCheckIn.savoringText = noteEl ? noteEl.value.trim() : '';
  AppState.currentCheckIn.timestamp = Date.now();
  
  // Calculate Shift Coords
  const sens = AppState.currentCheckIn.sensations || [];
  let postA = AppState.currentCheckIn.pre_arousal || 0.5;
  let postV = AppState.currentCheckIn.pre_valence || 0.5;
  if (sens.includes('mar_calmer')) { postA = postA * 0.7 + 0.5 * 0.3; postV = Math.min(1, postV + 0.15); }
  if (sens.includes('mar_slower')) { postA = Math.max(0, postA - 0.15); }
  if (sens.includes('mar_clearer')) { postV = Math.min(1, postV + 0.2); }
  if (sens.includes('mar_warmer')) { postV = Math.min(1, postV + 0.1); }
  if (sens.includes('mar_lighter')) { postA = postA * 0.9 + 0.5 * 0.1; postV = Math.min(1, postV + 0.1); }
  AppState.currentCheckIn.post_arousal = postA;
  AppState.currentCheckIn.post_valence = postV;

  AppState.mockHistory.unshift({...AppState.currentCheckIn});
  saveHistoryToLocal();

  const fb = configProps.fb;
  if (fb && fb.isInitialized) {
    // Non-blocking cloud save
    (async () => {
      try {
        // 1. Global Community Counter (All users contribute)
        const globalStatsRef = fb.doc(fb.db, "stats", "community");
        await fb.setDoc(globalStatsRef, { totalCheckins: fb.increment(1) }, { merge: true });

        // 2. Personal History (Authenticated users only)
        if (AppState.user && !AppState.user.guest) {
          await fb.addDoc(fb.collection(fb.db, "checkins"), { uid: AppState.user.uid, ...AppState.currentCheckIn });
          const userRef = fb.doc(fb.db, "users", AppState.user.uid);
          await fb.setDoc(userRef, { lastEmotion: AppState.currentCheckIn.subEmotion || 'se_neutral' }, { merge: true });
        }
      } catch(err) { console.warn("Cloud save background failed", err); }
    })();
  }

  if (configProps.resetBioFeedback) configProps.resetBioFeedback();
  AppState.justFinishedCheckIn = true;
  AppState.lastCheckInState = AppState.currentCheckIn.state;
  syncGlobalTheme();
  
  if (configProps.navigateTo) configProps.navigateTo('view-completion');
  
  // Modern HUD-based navigation
  if (elements.returnHomeBtn) elements.returnHomeBtn.style.display = 'none';
  
  if (configProps.setHUD) {
    configProps.setHUD('home', () => {
      if (configProps.loadDashboard) configProps.loadDashboard();
      if (configProps.navigateTo) configProps.navigateTo('view-dashboard', 'left');
    });
  }
}
