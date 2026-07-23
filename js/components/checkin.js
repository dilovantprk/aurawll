import { elements } from '../core/dom.js';
import { AppState, saveHistoryToLocal } from '../core/state.js';
import { t } from '../core/i18n.js';
import { SOMATIC_MAP, EMOTION_OPTIONS, protocols, subEmotionMap, stateLegacyMap, PROTOCOL_META, EMOTION_PROTOCOL_MAP } from '../core/constants.js';
import { vibrate, getAutonomicClass } from '../core/utils.js';
import { CheckinAudio } from '../services/checkin-audio.js';


let configProps = {
  navigateTo: null,
  updateEmbodiedUI: null,
  SensoryEngine: null,
  calculateRegulationState: null,
  loadDashboard: null,
  resetBioFeedback: null,
  saveCheckinToFirebase: null,
  startMeditation: null,
  stopMeditation: null,
  get isTimerPaused() { return false; },
  set isTimerPaused(v) {},
  get exerciseParams() { return null; },
  set exerciseParams(v) {},
  get timeRemaining() { return 0; },
  set timeRemaining(v) {}
};

export function initCheckin(config) {
  Object.assign(configProps, config);
  
  if (elements.startCheckinBtn) {
    elements.startCheckinBtn.addEventListener('click', () => {
      vibrate('medium');
      AppState.isCheckIn = true; // Set flow context
      AppState.currentCheckIn = { 
        state: null, 
        regulation_state: null,
        pre_arousal: null,
        pre_valence: null,
        somatic_selections: [],
        selected_emotions: [],
        subEmotion: null, 
        customEmotion: '', 
        sensations: [], 
        savoringText: '', 
        timestamp: null 
      };
      
      if (isMorningCheckin()) {
        renderMorningCheckin();
      } else {
        renderSomaticEntry();
      }
    });
  }
}



function isMorningCheckin() {
  const now = new Date();
  const hour = now.getHours();
  // Sabah saat 5 ile 12 arasi
  if (hour < 5 || hour >= 12) return false;

  const history = (AppState.userHistory && AppState.userHistory.length > 0) ? AppState.userHistory : (AppState.mockHistory || []);
  if (history.length === 0) return true;
  
  const lastEntry = history[history.length - 1];
  const lastDate = new Date(lastEntry.timestamp);
  
  const isSameDay = lastDate.getDate() === now.getDate() && 
                    lastDate.getMonth() === now.getMonth() && 
                    lastDate.getFullYear() === now.getFullYear();
  
  return !isSameDay;
}

function renderMorningCheckin() {
  if (configProps.navigateTo) configProps.navigateTo('view-morning-checkin');
  CheckinAudio.playMorningOpen();
  
  const dreamBtns = document.querySelectorAll('#morningDreamBtns .morning-btn');
  const bodyBtns = document.querySelectorAll('#morningBodyBtns .morning-btn');
  
  let dreamVal = null;
  let bodyVal = null;

  AppState.currentCheckIn.sleep_data = {};

  const checkNext = () => {
    if (dreamVal && bodyVal) {
      setHUD('arrow', () => {
        CheckinAudio.playMorningNext();
        setHUD(null);
        renderSomaticEntry();
      });
    } else {
      setHUD(null);
    }
  };

  dreamBtns.forEach(btn => {
    btn.onclick = () => {
      dreamBtns.forEach(b => b.classList.remove('active', 'selected'));
      btn.classList.add('active', 'selected');
      dreamVal = btn.getAttribute('data-val');
      AppState.currentCheckIn.sleep_data.dream = dreamVal;
      CheckinAudio.playMorningSelect('dream');
      checkNext();
    };
  });

  bodyBtns.forEach(btn => {
    btn.onclick = () => {
      bodyBtns.forEach(b => b.classList.remove('active', 'selected'));
      btn.classList.add('active', 'selected');
      bodyVal = btn.getAttribute('data-val');
      AppState.currentCheckIn.sleep_data.body = bodyVal;
      CheckinAudio.playMorningSelect('body');
      checkNext();
    };
  });

  setHUD(null);
}

export function renderSomaticEntry() {
  if (configProps.navigateTo) configProps.navigateTo('view-somatic-entry');
  CheckinAudio.playSomaticOpen();
  const container = elements.somaticContainer;
  if (!container) return;
  const shuffledKeys = Object.keys(SOMATIC_MAP).sort(() => Math.random() - 0.5);
  let html = `<div class="neural-spine-line"></div><div class="neural-flow-list">`;
  html += shuffledKeys.map((key, idx) => {
    const cssClass = getAutonomicClass(SOMATIC_MAP[key].state);
    const offsetClass = `offset-${(idx % 4) + 1}`;
    return `
      <div class="neural-node-wrapper ${offsetClass}">
        <div class="neural-node-dot ${cssClass}"></div>
        <button class="rhizome-chip ${cssClass}" data-key="${key}" data-state="${SOMATIC_MAP[key].state}">${t(key)}</button>
      </div>
    `;
  }).join('');
  html += `</div>`;
  container.innerHTML = html;
  const chips = container.querySelectorAll('.rhizome-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      vibrate('light');
      const key = chip.getAttribute('data-key');
      const chipState = chip.getAttribute('data-state');
      const idx = AppState.currentCheckIn.somatic_selections.indexOf(key);
      if (idx === -1) {
        if (AppState.currentCheckIn.somatic_selections.length < 3) {
          AppState.currentCheckIn.somatic_selections.push(key);
          chip.classList.add('selected');
          CheckinAudio.playChipSelect(chipState);
          // 3 chip dolunca saturation chord
          if (AppState.currentCheckIn.somatic_selections.length === 3) {
            setTimeout(() => CheckinAudio.playChipSaturation(), 250);
          }
        }
      } else {
        AppState.currentCheckIn.somatic_selections.splice(idx, 1);
        chip.classList.remove('selected');
        CheckinAudio.playChipDeselect();
      }
      applyDynamicFilter(chips, container);
      updatePrediction();
      if (AppState.currentCheckIn.somatic_selections.length > 0) {
        setHUD('arrow', () => {
          CheckinAudio.playStepTransition();
          renderAffectGrid();
        });
      } else {
        setHUD(null);
      }
    });
  });
  if (elements.somaticNextBtn) elements.somaticNextBtn.onclick = () => renderAffectGrid();
  setHUD(null);
}

function updatePrediction() {
  const selected = AppState.currentCheckIn.somatic_selections;
  if (!selected.length || !elements.suggestionDot) {
    if (elements.suggestionDot) elements.suggestionDot.classList.add('hidden');
    return;
  }
  let sumA = 0, sumV = 0;
  selected.forEach(k => { sumA += SOMATIC_MAP[k]?.a || 0.5; sumV += SOMATIC_MAP[k]?.v || 0.5; });
  const avgA = sumA / selected.length;
  const avgV = sumV / selected.length;
  elements.suggestionDot.style.left = `${avgV * 100}%`;
  elements.suggestionDot.style.top = `${(1 - avgA) * 100}%`;
  elements.suggestionDot.classList.remove('hidden');
}

function applyDynamicFilter(chips, container) {
  const selectedKeys = AppState.currentCheckIn.somatic_selections;
  container.classList.remove('has-selection', 'selected-category-ventral', 'selected-category-sympathetic', 'selected-category-dorsal');
  
  // Reset orders
  chips.forEach(c => {
    const wrapper = c.closest('.neural-node-wrapper');
    if (wrapper) wrapper.style.order = "0";
  });

  if (selectedKeys.length > 0) {
    container.classList.add('has-selection');
    const activeStates = [...new Set(selectedKeys.map(k => SOMATIC_MAP[k]?.state).filter(Boolean))];
    activeStates.forEach(state => container.classList.add(`selected-category-${getAutonomicClass(state)}`));
    
    // Neural Clustering Logic: Prioritize SPECIFICALLY selected chips
    chips.forEach(chip => {
      const chipState = chip.getAttribute('data-state');
      const isSelected = chip.classList.contains('selected');
      const wrapper = chip.closest('.neural-node-wrapper');
      const target = wrapper || chip;
      
      if (isSelected) {
        target.style.order = "-2"; // Absolute top for selected
      } else if (activeStates.includes(chipState)) {
        target.style.order = "-1"; // Near top for related
      } else {
        target.style.order = "1"; // Push to back
      }
    });

    // Scroll to focus on selection
    const scrollTarget = container.closest('.view') || container;
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function renderAffectGrid() {
  if (configProps.navigateTo) configProps.navigateTo('view-affect-grid');
  CheckinAudio.playGridOpen();
  const area = elements.gridTouchArea;
  const userDot = elements.userDot;
  if (!area || !userDot) return;
  userDot.classList.add('hidden');
  area.onclick = (e) => {
    vibrate('medium');
    const rect = area.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const a = Math.max(0, Math.min(1, 1 - ((e.clientY - rect.top) / rect.height)));
    AppState.currentCheckIn.pre_arousal = a;
    AppState.currentCheckIn.pre_valence = v;
    CheckinAudio.playGridTouch(a, v);

    userDot.style.left = `${v * 100}%`;
    userDot.style.top = `${(1 - a) * 100}%`;
    userDot.classList.remove('hidden');

    // Update Quadrant Labels (Active State)
    document.querySelectorAll('.grid-quadrant-label').forEach(lbl => lbl.classList.remove('active'));
    let quadClass = '';
    if (v > 0.5 && a > 0.5) quadClass = '.grid-quad_tr';
    else if (v < 0.5 && a > 0.5) quadClass = '.grid-quad_tl';
    else if (v < 0.5 && a < 0.5) quadClass = '.grid-quad_bl';
    else if (v > 0.5 && a < 0.5) quadClass = '.grid-quad_br';
    const activeLbl = document.querySelector(quadClass);
    if (activeLbl) activeLbl.classList.add('active');

    if (elements.suggestionDot) elements.suggestionDot.style.opacity = '0.3';
    
    setHUD('arrow', () => {
      CheckinAudio.playStepTransition();
      const state = configProps.calculateRegulationState(a, v);
      AppState.currentCheckIn.regulation_state = state;
      AppState.currentCheckIn.state = stateLegacyMap[state]; 
      renderEmotionRefinement(state);
    });
  };

  // Initial Label Population
  const quads = { tr: 'grid_quad_tr', tl: 'grid_quad_tl', bl: 'grid_quad_bl', br: 'grid_quad_br' };
  Object.entries(quads).forEach(([q, key]) => {
    const el = document.querySelector(`.grid-quad_${q}`);
    if (el) el.textContent = t(key);
  });

  setHUD(null);
}

export function renderEmotionRefinement(state) {
  if (configProps.navigateTo) configProps.navigateTo('view-emotion-refinement');
  CheckinAudio.playEmotionOpen(state);
  const container = elements.emotionRefinementContainer;
  container.className = 'rhizome-container nebula-cluster'; // Apply new layout
  const cssClass = getAutonomicClass(state);
  container.innerHTML = EMOTION_OPTIONS[state].map(emoKey => `<button class="rhizome-chip ${cssClass}" data-emo="${emoKey}">${t(emoKey)}</button>`).join('');
  AppState.currentCheckIn.selected_emotions = [];
  const chips = container.querySelectorAll('.rhizome-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const emo = chip.getAttribute('data-emo');
      const idx = AppState.currentCheckIn.selected_emotions.indexOf(emo);
      if (idx === -1) {
        if (AppState.currentCheckIn.selected_emotions.length < 3) {
          AppState.currentCheckIn.selected_emotions.push(emo);
          chip.classList.add('selected');
          CheckinAudio.playEmotionSelect(state, AppState.currentCheckIn.selected_emotions.length);
        }
      } else {
        AppState.currentCheckIn.selected_emotions.splice(idx, 1);
        chip.classList.remove('selected');
        CheckinAudio.playChipDeselect();
      }
      
      if (AppState.currentCheckIn.selected_emotions.length > 0) {
        setHUD('arrow', () => {
          CheckinAudio.playStepTransition();
          // Diversity logic: Use the first selected emotion's specific protocol
          const firstEmotion = AppState.currentCheckIn.selected_emotions[0];
          const protocolId = EMOTION_PROTOCOL_MAP[firstEmotion] || (state === 'sympathetic' || state === 'mobilization' ? 'p_478' : (state === 'dorsal' || state === 'immobilization' ? 'p_bellows' : 'p_resonance'));
          prepareExercise(protocolId);
        });
      } else {
        setHUD(null);
      }
    });
  });
  // Default HUD: HIDDEN
  setHUD(null);
}

export function prepareExercise(protocolId) {
  const ex = protocols[protocolId];
  AppState.currentExercise = { ...ex, id: protocolId }; // Fix for exercise.js:27
  configProps.exerciseParams = AppState.currentExercise;
  elements.exerciseTitle.textContent = t(ex.titleKey);
  if(elements.exerciseMicrocopy) elements.exerciseMicrocopy.textContent = t(`mc_${protocolId}`);
  
  // Hide step indicator if NOT in check-in flow
  if (elements.exerciseStepIndicator) {
    elements.exerciseStepIndicator.style.display = AppState.isCheckIn ? 'block' : 'none';
  }
  
  // HARD BIND: Ensure the info button knows exactly which protocol we are in
  const exerciseInfoBtn = document.querySelector('#view-exercise .checkin-info-btn');
  if (exerciseInfoBtn) {
    exerciseInfoBtn.setAttribute('data-type', protocolId);
    exerciseInfoBtn.removeAttribute('data-info');
  }
  const globalInfoBtn = document.getElementById('globalInfoBtn');
  if (globalInfoBtn) {
    globalInfoBtn.setAttribute('data-type', protocolId);
    globalInfoBtn.removeAttribute('data-info');
  }

  configProps.timeRemaining = ex.totalDuration;
  if (configProps.navigateTo) configProps.navigateTo('view-exercise');
  setTimeout(() => {
    setHUD('skip', () => advanceFromExercise(), true);
    if (elements.globalHUD) elements.globalHUD.classList.add('active');
  }, 1000);
}

export function advanceFromExercise() {
  if (configProps.stopExercise) configProps.stopExercise();
  
  // If standalone (from Breathe page), show completion
  if (AppState.isCheckIn === false) {
    setHUD(null);
    if (configProps.navigateTo) configProps.navigateTo('view-completion');
    vibrate('success');
    CheckinAudio.playCompletion();
    // Hide the old button and use HUD instead
    if (elements.returnHomeBtn) elements.returnHomeBtn.style.display = 'none';
    
    setHUD('home', () => {
      CheckinAudio.playLanding();
      if (configProps.loadDashboard) configProps.loadDashboard();
      if (configProps.navigateTo) configProps.navigateTo('view-dashboard', 'left');
    });
    return;
  }

  startMarinationFlow();
}

function startMarinationFlow() {
  const protocolId = AppState.currentExercise?.id || 'p_resonance';
  if (configProps.startMeditationLoading) {
    configProps.startMeditationLoading(protocolId);
  } else if (configProps.loadDashboard) {
    configProps.loadDashboard();
  }
}

export function setHUD(mode, onClick, isMinimal = false) {
  if (!elements.globalHUD || !elements.globalHUDBtn) return;
  if (!mode) {
    elements.globalHUD.classList.remove('active', 'hud-minimal');
    elements.globalHUDBtn.innerHTML = '';
    elements.globalHUDBtn.onclick = null;
    return;
  }
  const svgs = {
    arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    skip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`
  };
  elements.globalHUDBtn.innerHTML = svgs[mode] || '';
  elements.globalHUD.classList.add('active');
  if (isMinimal) {
    elements.globalHUD.classList.add('hud-minimal');
  } else {
    elements.globalHUD.classList.remove('hud-minimal');
  }
  elements.globalHUDBtn.onclick = (e) => { e.preventDefault(); if (onClick) onClick(); };
}
