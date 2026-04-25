import { elements } from '../core/dom.js';
import { AppState, saveHistoryToLocal } from '../core/state.js';
import { t } from '../core/i18n.js';
import { SOMATIC_MAP, EMOTION_OPTIONS, protocols, subEmotionMap, stateLegacyMap, PROTOCOL_META, EMOTION_PROTOCOL_MAP } from '../core/constants.js';
import { vibrate } from '../core/utils.js';

let configProps = {
  navigateTo: null,
  updateEmbodiedUI: null,
  SensoryEngine: null,
  calculatePolyvagalState: null,
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
        polyvagal_state: null,
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
      renderSomaticEntry();
    });
  }
}

export function renderSomaticEntry() {
  if (configProps.navigateTo) configProps.navigateTo('view-somatic-entry');
  const container = elements.somaticContainer;
  if (!container) return;
  const shuffledKeys = Object.keys(SOMATIC_MAP).sort(() => Math.random() - 0.5);
  container.innerHTML = shuffledKeys.map((key) => `<button class="rhizome-chip ${SOMATIC_MAP[key].state}" data-key="${key}" data-state="${SOMATIC_MAP[key].state}">${t(key)}</button>`).join('');
  const chips = container.querySelectorAll('.rhizome-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      vibrate('light');
      const key = chip.getAttribute('data-key');
      const idx = AppState.currentCheckIn.somatic_selections.indexOf(key);
      if (idx === -1) {
        if (AppState.currentCheckIn.somatic_selections.length < 3) {
          AppState.currentCheckIn.somatic_selections.push(key);
          chip.classList.add('selected');
        }
      } else {
        AppState.currentCheckIn.somatic_selections.splice(idx, 1);
        chip.classList.remove('selected');
      }
      applyDynamicFilter(chips, container);
      updatePrediction();
      if (AppState.currentCheckIn.somatic_selections.length > 0) {
        setHUD('arrow', () => renderAffectGrid());
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
  chips.forEach(c => c.style.order = "0");

  if (selectedKeys.length > 0) {
    container.classList.add('has-selection');
    const activeStates = [...new Set(selectedKeys.map(k => SOMATIC_MAP[k]?.state).filter(Boolean))];
    activeStates.forEach(state => container.classList.add(`selected-category-${state}`));
    
    // Neural Clustering Logic: Prioritize SPECIFICALLY selected chips
    chips.forEach(chip => {
      const chipState = chip.getAttribute('data-state');
      const isSelected = chip.classList.contains('selected');
      
      if (isSelected) {
        chip.style.order = "-2"; // Absolute top for selected
      } else if (activeStates.includes(chipState)) {
        chip.style.order = "-1"; // Near top for related
      } else {
        chip.style.order = "1"; // Push to back
      }
    });

    // Scroll to focus on selection
    const scrollTarget = container.closest('.view') || container;
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function renderAffectGrid() {
  if (configProps.navigateTo) configProps.navigateTo('view-affect-grid');
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
      const state = configProps.calculatePolyvagalState(a, v);
      AppState.currentCheckIn.polyvagal_state = state;
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
  const container = elements.emotionRefinementContainer;
  container.className = 'rhizome-container nebula-cluster'; // Apply new layout
  container.innerHTML = EMOTION_OPTIONS[state].map(emoKey => `<button class="rhizome-chip ${state}" data-emo="${emoKey}">${t(emoKey)}</button>`).join('');
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
        }
      } else {
        AppState.currentCheckIn.selected_emotions.splice(idx, 1);
        chip.classList.remove('selected');
      }
      
      if (AppState.currentCheckIn.selected_emotions.length > 0) {
        setHUD('arrow', () => {
          // Diversity logic: Use the first selected emotion's specific protocol
          const firstEmotion = AppState.currentCheckIn.selected_emotions[0];
          const protocolId = EMOTION_PROTOCOL_MAP[firstEmotion] || (state === 'sympathetic' ? 'p_478' : (state === 'dorsal' ? 'p_bellows' : 'p_resonance'));
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
  AppState.currentExercise = ex; // Fix for exercise.js:27
  configProps.exerciseParams = ex;
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

  configProps.timeRemaining = ex.totalDuration;
  if (configProps.navigateTo) configProps.navigateTo('view-exercise');
  setTimeout(() => {
    setHUD('skip', () => advanceFromExercise());
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
    if (elements.returnHomeBtn) {
      elements.returnHomeBtn.onclick = () => {
        if (configProps.loadDashboard) configProps.loadDashboard();
        if (configProps.navigateTo) configProps.navigateTo('view-dashboard');
      };
    }
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

export function setHUD(mode, onClick) {
  if (!elements.globalHUD || !elements.globalHUDBtn) return;
  if (!mode) {
    elements.globalHUD.classList.remove('active');
    elements.globalHUDBtn.innerHTML = '';
    elements.globalHUDBtn.onclick = null;
    return;
  }
  const svgs = {
    arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    skip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>`
  };
  elements.globalHUDBtn.innerHTML = svgs[mode] || '';
  elements.globalHUD.classList.add('active');
  elements.globalHUDBtn.onclick = (e) => { e.preventDefault(); if (onClick) onClick(); };
}
