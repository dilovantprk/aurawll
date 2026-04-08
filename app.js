// Dynamic import for Firebase — races against a 3s timeout to prevent CDN hang
import { locales } from './translations.js';
import { getWeeklyInsight } from './weeklyInsight.js';
// import { startMeditation } from './meditation.js'; // Missing file in current project
import { initWelcomeScreen } from './welcomeScreen.js';
import { signInAsGuest, isGuestUser } from './authService.js';
import { renderGuestBanner } from './settings.js';
import {
  calculateVagalState,
  getWeightsFromState,
  calculateVagalPoint,
  calculatePlasticity,
  getPoeticTimeLabel
} from './vagal-logic.js';
import { SensoryEngine } from './audio-engine.js';

window.GEMINI_API_KEY = "AIzaSyD_7M1V_wTGgNuPInVYoj7ODQZgVfVWPIo";
let fb;
try {
  fb = await Promise.race([
    import('./firebase.js'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase import timeout')), 3000))
  ]);
} catch (err) {
  console.warn('Firebase module failed to load, running in offline mode:', err);
  fb = { isInitialized: false, auth: null, db: null };
}

// Safe wrapper for localStorage
function safeGetItem(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSetItem(key, val) {
  try { localStorage.setItem(key, val); } catch (e) { console.warn('localStorage is blocked'); }
}

/* --- STATE MANAGEMENT --- */
const AppState = {
  user: null,
  lang: safeGetItem('aura_lang') || 'en',
  isMuted: safeGetItem('aura_muted') === 'true',
  hapticEnabled: safeGetItem('aura_haptic') !== 'false', // Default true
  droneEnabled: safeGetItem('aura_drone') !== 'false', // Default true
  appVolume: parseInt(safeGetItem('aura_volume')) || 50, // Default 50
  currentCheckIn: {
    state: null, // 'wired', 'foggy', 'okay'
    subEmotion: null, // e.g. 'se_anxious', 'se_other'
    customEmotion: '', // text if 'se_other'
    sensations: [],
    savoringText: '',
    timestamp: null
  },
  mockHistory: JSON.parse(safeGetItem('aura_history')) || [
    { state: 'foggy', subEmotion: 'se_exhausted', sensations: ['mar_tense'], savoringText: 'A good cup of tea', timestamp: Date.now() - 86400000 },
    { state: 'wired', subEmotion: 'se_anxious', sensations: ['mar_lighter'], savoringText: 'Finished a hard task', timestamp: Date.now() - 172800000 },
    { state: 'okay', subEmotion: 'se_calm', sensations: ['mar_calmer'], savoringText: 'Sunset walk', timestamp: Date.now() - 259200000 },
    { state: 'wired', subEmotion: 'se_overwhelmed', sensations: ['mar_tense'], savoringText: 'Deep breathing helped', timestamp: Date.now() - 345600000 },
    { state: 'okay', subEmotion: 'se_grateful', sensations: ['mar_warmer'], savoringText: 'Call with a friend', timestamp: Date.now() - 432000000 },
    { state: 'foggy', subEmotion: 'se_heavy', sensations: ['mar_slower'], savoringText: 'Quick nap', timestamp: Date.now() - 518400000 },
    { state: 'okay', subEmotion: 'se_focused', sensations: ['mar_clearer'], savoringText: 'Flow state in coding', timestamp: Date.now() - 604800000 },
    { state: 'wired', subEmotion: 'se_anxious', sensations: ['mar_tense'], savoringText: 'Late night project', timestamp: Date.now() - 7200000 }, // Today
    { state: 'okay', subEmotion: 'se_calm', sensations: ['mar_calmer'], savoringText: 'Tea session', timestamp: Date.now() - 3600000 } // Today
  ]
};

function saveHistoryToLocal() {
  localStorage.setItem('aura_history', JSON.stringify(AppState.mockHistory));
}

async function migrateGuestData(uid) {
  if (!fb.isInitialized || !uid) return;
  
  const localHistory = AppState.mockHistory || [];
  const guestEntries = localHistory.filter(e => !e.synced); // Identify un-synced guest data

  if (guestEntries.length === 0) return;

  console.log(`Migrating ${guestEntries.length} entries to Cloud...`);
  
  for (const entry of guestEntries) {
    try {
      await fb.addDoc(fb.collection(fb.db, "checkins"), {
        uid: uid,
        ...entry,
        migrated: true
      });
      entry.synced = true; // Mark as synced locally
    } catch(err) {
      console.warn("Migration failed for entry", entry.timestamp, err);
    }
  }
  saveHistoryToLocal();
}

/* --- SENSORY ENGINE MOVED TO audio-engine.js --- */

/* --- i18n ENGINE --- */
function t(key) {
  return locales[AppState.lang][key] || key;
}

function updateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = t(el.getAttribute('data-i18n'));
    } else {
      el.textContent = t(el.getAttribute('data-i18n'));
    }
  });
  document.querySelectorAll('[data-i18n-prop]').forEach(el => {
    const rules = el.getAttribute('data-i18n-prop').split(';');
    rules.forEach(rule => {
      const [prop, key] = rule.split(':');
      if (prop && key) el.setAttribute(prop, t(key));
    });
  });
  if (document.getElementById('langToggleBtn')) {
    document.getElementById('langToggleBtn').textContent = AppState.lang.toUpperCase();
  }
  
  if (typeof checkCircadian === 'function') checkCircadian();
}

function checkCircadian() {
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  document.documentElement.style.setProperty('--bg-brightness', isNight ? '0.8' : '1');
}

const elements = {
  header: document.getElementById('main-header'),
  headerActions: document.getElementById('headerActions'),
  langToggleBtn: document.getElementById('langToggleBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  views: document.querySelectorAll('.view'),
  
  // Auth
  viewAuth: document.getElementById('view-auth'),
  tabLogin: document.getElementById('tabLogin'),
  tabRegister: document.getElementById('tabRegister'),
  tabsPill: document.getElementById('tabs-pill'),
  authForm: document.getElementById('authForm'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  authError: document.getElementById('authError'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  skipAuthBtn: document.getElementById('skipAuthBtn'),

  // Dashboard
  greetingText: document.getElementById('greetingText'),
  startCheckinBtn: document.getElementById('startCheckinBtn'),
  historyList: document.getElementById('historyList'),
  weeklyTimeline: document.getElementById('weeklyTimeline'),
  weeklyInsight: document.getElementById('weeklyInsight'),
  insightText: document.getElementById('insightText'),
  weeklyExercise: document.getElementById('weeklyExercise'),
  insightExText: document.getElementById('insightExText'),
  weeklyEmpty: document.getElementById('weeklyEmpty'),
  
  // Vagal Heatmap
  vagalHeatmapCard: document.getElementById('vagalHeatmapCard'),
  vagalBlob: document.getElementById('vagalBlob'),
  vagalTraces: document.getElementById('vagalTraces'),
  vagalModal: document.getElementById('vagalModal'),
  vagalModalTitle: document.getElementById('vagalModalTitle'),
  vagalModalAnalysis: document.getElementById('vagalModalAnalysis'),
  vagalModalRec: document.getElementById('vagalModalRec'),
  vagalModalHeatmap: document.getElementById('vagalModalHeatmap'),
  closeVagalModal: document.getElementById('closeVagalModal'),

  // Insight View
  viewInsight: document.getElementById('view-insight'),
  insightHeroTitle: document.getElementById('insight-hero-title'),
  macroBlob: document.getElementById('macroBlob'),
  macroTraces: document.getElementById('macroTraces'),
  energyPathSvg: document.getElementById('energy-path-svg'),
  resilienceScoreLarge: document.getElementById('resilience-score-large'),
  resilienceWaveCanvas: document.getElementById('resilience-wave-canvas'),
  insightNarratives: document.getElementById('insight-narratives'),
  insightSummaryText: document.getElementById('insight-summary-text'),
  insightResilienceBar: document.getElementById('insight-resilience-bar'),

  // Step 1: Picker
  stateCards: document.querySelectorAll('.state-card'),

  // Step 2: Sub-Emotions
  subEmotionTitle: document.getElementById('subEmotionTitle'),
  subEmotionContainer: document.getElementById('subEmotionContainer'),
  otherInputContainer: document.getElementById('otherInputContainer'),
  customSubEmotionInput: document.getElementById('customSubEmotionInput'),
  customSubEmotionBtn: document.getElementById('customSubEmotionBtn'),

  // Step 3: Exercise
  exerciseTitle: document.getElementById('exerciseTitle'),
  exerciseMicrocopy: document.getElementById('exerciseMicrocopy'),
  exerciseDesc: document.getElementById('exerciseDesc'),
  savoringSubmitBtn: document.getElementById('savoringSubmitBtn'),
  skipSavoringBtn: document.getElementById('skipSavoringBtn'),
  breathCircle: document.getElementById('breathCircle'),
  breathInstruction: document.getElementById('breathInstruction'),
  startExerciseBtn: document.getElementById('startExerciseBtn'),
  skipExerciseBtn: document.getElementById('skipExerciseBtn'),

  // Step 4: Savoring & Marination
  marPhase1: document.getElementById('marPhase1'),
  marPhase2: document.getElementById('marPhase2'),
  marPhaseOffer: document.getElementById('marPhaseOffer'),
  offerContinueBtn: document.getElementById('offerContinueBtn'),
  offerDoneBtn: document.getElementById('offerDoneBtn'),
  marPhaseScan: document.getElementById('marPhaseScan'),
  scanExitBtn: document.getElementById('scanExitBtn'),
  scanText: document.getElementById('scanText'),
  marPhase3: document.getElementById('marPhase3'),
  marContinueBtn: document.getElementById('marContinueBtn'),
  savoringForm: document.getElementById('savoringForm'),
  savoringInput: document.getElementById('savoringInput'),

  // Step 2.5: Meditation Loading
  viewMeditationLoading: document.getElementById('view-meditation-loading'),
  meditationLoadingTitle: document.getElementById('meditationLoadingTitle'),
  loadingCircleProgress: document.getElementById('loadingCircleProgress'),
  skipLoadingBtn: document.getElementById('skipLoadingBtn'),

  // Onboarding
  onbSkipBtn: document.getElementById('onbSkipBtn'),
  onbLetsGoBtn: document.getElementById('onbLetsGoBtn'),
  onbScreensContainer: document.getElementById('onbScreensContainer'),

  // Completion
  returnHomeBtn: document.getElementById('returnHomeBtn'),

  // Notifications
    notifToggleCheckbox: document.getElementById('notifToggleCheckbox'),
    notifModal: document.getElementById('notifModal'),
    notifAcceptBtn: document.getElementById('notifAcceptBtn'),
    notifDenyBtn: document.getElementById('notifDenyBtn'),

    // Cockpit / Profile
    auraCoreSphere: document.getElementById('aura-core-sphere'),
    userDisplayName: document.getElementById('user-display-name'),
    uniqueDaysStats: document.getElementById('unique-days-stats'),
    hapticToggle: document.getElementById('hapticToggle'),
    droneToggle: document.getElementById('droneToggle'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeValLabel: document.getElementById('volume-val-label'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportTxtBtn: document.getElementById('exportTxtBtn'),
    resetMemoryBtn: document.getElementById('resetMemoryBtn'),
  
  // Scientific Info Modal
  infoModal: document.getElementById('infoModal'),
  infoBackdrop: document.getElementById('infoBackdrop'),
  closeInfoBtn: document.getElementById('closeInfoBtn'),
  infoIcon: document.getElementById('infoIcon'),
  infoTitle: document.getElementById('infoTitle'),
  infoBody: document.getElementById('infoBody'),
  infoRef: document.getElementById('infoRef'),
  globalInfoBtn: document.getElementById('globalInfoBtn'),
  globalMuteBtn: document.getElementById('globalMuteBtn'),
  muteIconOn: document.getElementById('muteIconOn'),
  muteIconOff: document.getElementById('muteIconOff'),

  // Mobile  // Navigation
  mobileNav: document.getElementById('mobile-nav'),
  desktopNav: document.getElementById('desktop-nav'),
  navLinks: document.querySelectorAll('.nav-link'),
  navItems: document.querySelectorAll('.nav-item'),
  navHome: document.getElementById('navHome'),
  navMeditations: document.getElementById('navMeditations'),
  navNotebook: document.getElementById('navNotebook'),
  navInsight: document.getElementById('navInsight'),
  navProfile: document.getElementById('navProfile'),

  // Meditations View
  meditationsList: document.getElementById('meditationsList'),

  // Notebook View
  notebookEntries: document.getElementById('notebookEntries')
};

// Language Toggle
if (elements.langToggleBtn) elements.langToggleBtn.addEventListener('click', () => {
  AppState.lang = AppState.lang === 'en' ? 'tr' : 'en';
  safeSetItem('aura_lang', AppState.lang);
  updateUI();
  
  // Re-render auth mode button if active
  if(!document.getElementById('view-auth').classList.contains('hidden')) {
    elements.authSubmitBtn.textContent = isLoginMode ? t('btn_login') : t('btn_register');
    const nameGroup = document.getElementById('nameInputGroup');
    if (nameGroup) nameGroup.classList.toggle('hidden', isLoginMode);
  }
  
  // Re-render sub-emotions if we are on that view
  if(!document.getElementById('view-sub-emotion').classList.contains('hidden')) {
    renderSubEmotions(AppState.currentCheckIn.state);
  }
  // Re-load dashboard to re-translate the dynamic patterns if it is active
  if(!document.getElementById('view-dashboard').classList.contains('hidden') && AppState.user) {
    loadDashboard();
  }
  // Re-render exercise values if active
  if(!document.getElementById('view-exercise').classList.contains('hidden')) {
    const mins = Math.floor(timeRemaining / 60);
    const secs = (timeRemaining % 60).toString().padStart(2, '0');
    if (!elements.startExerciseBtn.disabled) {
       elements.startExerciseBtn.innerHTML = `${t('ex_begin')} (<span id="exerciseDuration">${mins}:${secs}</span>)`;
    }
  }

  // Re-render settings if active
  if(!document.getElementById('view-settings').classList.contains('hidden')) {
    navigateTo('view-settings');
  }
});

const emojiMap = {
  se_anxious: '😰', se_overwhelmed: '🤯', se_scattered: '🌪️', se_frustrated: '😤',
  se_racing_thoughts: '💭', se_on_edge: '😬',
  se_exhausted: '🥱', se_numb: '😶', se_disconnected: '🧩', se_bored: '😒',
  se_heavy: '🪨', se_spaced_out: '🌌',
  se_calm: '🕊️', se_focused: '🎯', se_content: '😌', se_grateful: '🙏',
  se_neutral: '⚖️', se_grounded: '🌳',
  se_other: '📝'
};

/* --- EXERCISE DICTIONARY (6 Protocols) --- */
const protocols = {
  p_478: {
    title: "4-7-8 Relaxing Breath",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Hold", class: "breathe-hold", duration: 7000 },
      { name: "Exhale", class: "breathe-exhale", duration: 8000 }
    ],
    totalDuration: 114
  },
  p_sigh: {
    title: "Deep Sigh (Cooling)",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-empty", duration: 8000 }
    ],
    totalDuration: 120
  },
  p_bellows: {
    title: "Energizing Bellows",
    phases: [
      { name: "In", class: "breathe-inhale", duration: 2000 },
      { name: "Out", class: "breathe-exhale", duration: 2000 }
    ],
    totalDuration: 90
  },
  p_resonance: {
    title: "Resonance Frequency",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 5500 },
      { name: "Exhale", class: "breathe-exhale", duration: 5500 }
    ],
    totalDuration: 110
  },
  p_grounding: {
    title: "Grounding Breath",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 6000 }
    ],
    totalDuration: 120
  },
  p_box: {
    title: "Box Breathing",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Hold", class: "breathe-hold", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 4000 },
      { name: "Hold", class: "breathe-empty", duration: 4000 }
    ],
    totalDuration: 120
  }
};

const subEmotionMap = {
  // Wired
  se_anxious: { list: 'wired', protocol: 'p_478' },
  se_overwhelmed: { list: 'wired', protocol: 'p_box' },
  se_scattered: { list: 'wired', protocol: 'p_grounding' },
  se_frustrated: { list: 'wired', protocol: 'p_sigh' },
  se_racing_thoughts: { list: 'wired', protocol: 'p_478' },
  se_on_edge: { list: 'wired', protocol: 'p_resonance' },
  // Foggy
  se_exhausted: { list: 'foggy', protocol: 'p_resonance' },
  se_numb: { list: 'foggy', protocol: 'p_bellows' },
  se_disconnected: { list: 'foggy', protocol: 'p_grounding' },
  se_bored: { list: 'foggy', protocol: 'p_bellows' },
  se_heavy: { list: 'foggy', protocol: 'p_resonance' },
  se_spaced_out: { list: 'foggy', protocol: 'p_grounding' },
  // Okay
  se_calm: { list: 'okay', protocol: 'p_resonance' },
  se_focused: { list: 'okay', protocol: 'p_box' },
  se_content: { list: 'okay', protocol: 'p_box' },
  se_grateful: { list: 'okay', protocol: 'p_resonance' },
  se_neutral: { list: 'okay', protocol: 'p_resonance' },
  se_grounded: { list: 'okay', protocol: 'p_box' },
  // Core default
  se_other: { protocol: 'p_resonance' }
};

/**
 * Updates the global Antigravity (v2) UI state
 */
function updateEmbodiedUI(stateId) {
  if (!stateId || typeof getWeightsFromState !== 'function') return;
  const weights = getWeightsFromState(stateId);
  const vagalState = calculateVagalState(weights.wV, weights.wS, weights.wD);
  const point = calculateVagalPoint(vagalState.weights.wV * 100, vagalState.weights.wS * 100, vagalState.weights.wD * 100);
  
  if (document.documentElement) {
    document.documentElement.style.setProperty('--vagal-x', point.x);
    document.documentElement.style.setProperty('--vagal-y', point.y);
    document.documentElement.style.setProperty('--vagal-color', vagalState.color);
    document.documentElement.style.setProperty('--vagal-color-rgb', vagalState.colorRgb || '255, 255, 255');
  }
  
  // Body state class management (drives all bio-reactive CSS)
  document.body.classList.remove('state-wired', 'state-foggy', 'state-okay', 'state-resolved');
  document.body.classList.add(`state-${stateId}`);
  
  if (SensoryEngine && typeof SensoryEngine.update === 'function') {
    SensoryEngine.update(stateId);
  }
}

/**
 * THE RESOLUTION — Called when check-in is saved.
 * Transitions from chaos (entropy) to clarity (order).
 * All bio-jitter/blur stops, drone fades out, success glow activates.
 */
function resetBioFeedback() {
  // 1. Apply resolved state — CSS handles the 1.5s cubic-bezier transition
  document.body.classList.remove('state-wired', 'state-foggy', 'state-okay');
  document.body.classList.add('state-resolved');

  // 2. Stop haptics, then fire success vibration
  if (SensoryEngine) {
    SensoryEngine.stopHaptics();
  }
  if (navigator.vibrate) {
    setTimeout(() => navigator.vibrate([50, 100, 50, 100, 200]), 300);
  }

  // 3. Binaural drone graceful fade-out (3 seconds) + Perfect 5th chord
  if (SensoryEngine && typeof SensoryEngine.triggerResolutionChord === 'function') {
    SensoryEngine.triggerResolutionChord();
  }

  // 4. Reset jitter CSS variables
  if (document.documentElement) {
    document.documentElement.style.setProperty('--jitter-strength', '0px');
    document.documentElement.style.setProperty('--jitter-active', 'none');
  }

  // 5. After 5s, settle into Ventral (okay) baseline
  setTimeout(() => {
    document.body.classList.remove('state-resolved');
    document.body.classList.add('state-okay');
  }, 5000);
}


let exerciseParams;
let timeRemaining = 0;
let phaseStartTime = 0;
let remainingPhaseDuration = 0;
let isTimerPaused = false;
let breathTimerInterval = null;
let currentPhaseIndex = 0;
let exerciseTimer = null;
let scanTimeouts = [];
let meditationLoadingTimeout = null;

// Settings
// (Settings btn removed)

/* --- SCIENTIFIC INFO MODAL LOGIC --- */
let isModalOpen = false;

function showInfoModal(type) {
  if (isModalOpen) return;
  isModalOpen = true;

  elements.infoIcon.textContent = getInfoIcon(type);
  elements.infoTitle.textContent = getInfoTitle(type);
  elements.infoBody.innerHTML = t(`info_${type}_body`);
  elements.infoRef.textContent = t(`info_${type}_ref`);

  elements.infoBackdrop.classList.add('active');
  elements.infoModal.classList.add('active');

  // Pause timers if active
  if (breathTimerInterval && !isTimerPaused && !elements.startExerciseBtn.disabled) {
    pauseExercise();
  }
  if (scanTimeouts.length > 0 && !isMeditationPaused) {
    pauseMeditation();
  }
}

function hideInfoModal() {
  isModalOpen = false;
  elements.infoBackdrop.classList.remove('active');
  elements.infoModal.classList.remove('active');

  if (isTimerPaused) {
    resumeExercise();
  }
  if (isMeditationPaused) {
    resumeMeditation();
  }
}

function getInfoIcon(type) {
  switch(type) {
    case 'checkin': return '🧠';
    case 'breathing': return '🫁';
    case 'marination': return '✨';
    case 'meditation': return '🧘';
    case 'savoring': return '🌿';
    default: return '🧬';
  }
}

function getInfoTitle(type) {
  return t(`info_${type}_title`);
}

// Global modal close listeners
if (elements.closeInfoBtn) elements.closeInfoBtn.addEventListener('click', hideInfoModal);
if (elements.infoBackdrop) elements.infoBackdrop.addEventListener('click', hideInfoModal);

// Global info button (? in header) — determines step type contextually
if (elements.globalInfoBtn) elements.globalInfoBtn.addEventListener('click', () => {
  const activeView = Array.from(elements.views).find(v => !v.classList.contains('hidden'));
  if (!activeView) return;

  let type = 'checkin';
  if (activeView.id === 'view-state-picker' || activeView.id === 'view-sub-emotion') type = 'checkin';
  else if (activeView.id === 'view-exercise') type = 'breathing';
  else if (activeView.id === 'view-savoring') {
    if (elements.marPhaseScan && !elements.marPhaseScan.classList.contains('hidden')) type = 'meditation';
    else if (elements.marPhase3 && !elements.marPhase3.classList.contains('hidden')) type = 'savoring';
    else type = 'marination';
  }
  showInfoModal(type);
});

// Global Mute Toggle (AudioEngine + SensoryEngine)
if (elements.globalMuteBtn) {
  elements.globalMuteBtn.addEventListener('click', () => {
    AppState.isMuted = !AppState.isMuted;
    localStorage.setItem('aura_muted', AppState.isMuted ? 'true' : 'false');
    
    // Toggle SVG icons
    if (elements.muteIconOn && elements.muteIconOff) {
      if (AppState.isMuted) {
        elements.muteIconOn.classList.remove('hidden');
        elements.muteIconOff.classList.add('hidden');
      } else {
        elements.muteIconOn.classList.add('hidden');
        elements.muteIconOff.classList.remove('hidden');
      }
    }

    // Toggle Audio Engines
    if (SensoryEngine && typeof SensoryEngine.mute === 'function') {
      SensoryEngine.mute(AppState.isMuted);
    }
  });

  // Init state
  if (localStorage.getItem('aura_muted') === 'true') {
    AppState.isMuted = true;
    if (elements.muteIconOn) elements.muteIconOn.classList.remove('hidden');
    if (elements.muteIconOff) elements.muteIconOff.classList.add('hidden');
  } else {
    AppState.isMuted = false;
  }
}

/* --- ROUTING HELPERS --- */
let navTimeout = null;

function updateActiveNavLink(viewId) {
  const links = document.querySelectorAll('.nav-link, .mobile-nav-btn');
  const viewTag = viewId.replace('view-', '');
  links.forEach(link => {
    const isMatched = link.getAttribute('data-view') === viewTag;
    link.classList.toggle('active', isMatched);
  });
}

function navigateTo(viewId, skipHistory = false) {
  const currentView = Array.from(elements.views).find(v => !v.classList.contains('hidden'));
  if (currentView && currentView.id === viewId) return;

  const target = document.getElementById(viewId);
  if (!target) { console.warn('navigateTo: target not found:', viewId); return; }

  if (!skipHistory) {
    history.pushState({ view: viewId }, '', '#' + viewId.replace('view-', ''));
  }

  if (navTimeout) {
    clearTimeout(navTimeout);
    navTimeout = null;
  }

  // Instantly hide all views
  elements.views.forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active', 'opacity-100', 'translate-y-0');
  });

  // Show target
  target.classList.remove('hidden');
  target.scrollTop = 0;
  void target.offsetHeight; // force reflow

  requestAnimationFrame(() => {
    target.classList.add('active', 'opacity-100', 'translate-y-0');
  });

  // Toggle navbar visibility based on view
  const ritualViews = ['view-welcome', 'view-auth', 'view-onboarding'];
  const isRitual = ritualViews.includes(viewId);
  const isCheckin = viewId.includes('picker') || viewId.includes('breathing') || viewId.includes('savoring');
  
  // Show nav only if we have a user AND we aren't in a ritual screen
  const showNav = AppState.user && !isRitual && !isCheckin;
  document.body.classList.toggle('is-authenticated', !!showNav);

  updateActiveNavLink(viewId);

  try {
    if (viewId === 'view-dashboard') loadDashboard();
    if (viewId === 'view-meditations') renderMeditationsList();
    if (viewId === 'view-notebook') loadNotebook();
    if (viewId === 'view-insight') {
      const historyItems = AppState.user ? (AppState.user.history || []) : AppState.mockHistory;
      updateInsightView(historyItems);
    }
    if (viewId === 'view-settings') {
      if (typeof updateSettingsView === 'function') updateSettingsView();
      const container = target.querySelector('.settings-content');
      if (container) {
        const oldBanners = container.querySelectorAll('.settings-guest-banner, .settings-account-status');
        oldBanners.forEach(b => b.remove());
        if (typeof renderGuestBanner === 'function') renderGuestBanner(AppState.user, container, t);
        const logoutBtn = target.querySelector('#logoutBtn');
        if (logoutBtn) {
          logoutBtn.textContent = isGuestUser(AppState.user) ? t('btn_exit_guest') : t('btn_logout');
        }
      }
    }
  } catch (e) {
    console.warn('navigateTo feature trigger error:', e);
  }

  // Main header visibility
  if (elements.header) {
    if (viewId === 'view-welcome' || viewId === 'view-loading') {
      elements.header.classList.add('hidden');
    } else {
      elements.header.classList.remove('hidden');
    }
  }

  if (elements.headerActions) {
    if (['view-dashboard', 'view-auth', 'view-settings', 'view-meditations', 'view-notebook', 'view-insight'].includes(viewId)) {
      elements.headerActions.classList.remove('hidden');
      if (elements.globalInfoBtn) elements.globalInfoBtn.classList.add('hidden');
    } else if (['view-state-picker', 'view-sub-emotion', 'view-exercise', 'view-savoring'].includes(viewId)) {
      elements.headerActions.classList.remove('hidden');
      if (elements.globalInfoBtn) elements.globalInfoBtn.classList.remove('hidden');
    } else {
      elements.headerActions.classList.add('hidden');
    }
  }

  updateMobileNav(viewId);
  updateDesktopNav(viewId);
}

/* --- DESKTOP NAVIGATION LOGIC --- */
function updateDesktopNav(viewId) {
  const desktopNav = document.getElementById('desktop-nav');
  if (!desktopNav) return;

  const links = desktopNav.querySelectorAll('.nav-link');
  links.forEach(link => link.classList.remove('active'));

  // Map viewId to the data-view attribute in index.html
  const viewKey = viewId.replace('view-', '');
  const activeLink = desktopNav.querySelector(`.nav-link[data-view="${viewKey}"]`);
  if (activeLink) activeLink.classList.add('active');
}

/* --- MOBILE NAVIGATION LOGIC --- */
const NAV_VISIBLE_VIEWS = ['view-dashboard', 'view-settings', 'view-meditations', 'view-notebook', 'view-insight'];

function updateMobileNav(viewId) {
  if (!elements.mobileNav) return;

  const shouldShow = NAV_VISIBLE_VIEWS.includes(viewId);
  const isCurrentlyVisible = elements.mobileNav.classList.contains('nav-visible');

  if (shouldShow && !isCurrentlyVisible) {
    elements.mobileNav.classList.remove('nav-hidden');
    elements.mobileNav.classList.add('nav-visible');
    document.body.classList.add('has-nav');
  } else if (!shouldShow && isCurrentlyVisible) {
    elements.mobileNav.classList.add('nav-hidden');
    elements.mobileNav.classList.remove('nav-visible');
    document.body.classList.remove('has-nav');
  }

  // Update active tab
  const navItems = [elements.navHome, elements.navMeditations, elements.navNotebook, elements.navInsight, elements.navProfile];
  navItems.forEach(item => { if (item) item.classList.remove('active'); });

  if (viewId === 'view-dashboard') {
    elements.navHome?.classList.add('active');
  } else if (viewId === 'view-meditations') {
    elements.navMeditations?.classList.add('active');
  } else if (viewId === 'view-notebook') {
    elements.navNotebook?.classList.add('active');
  } else if (viewId === 'view-insight') {
    elements.navInsight?.classList.add('active');
  } else if (viewId === 'view-settings') {
    elements.navProfile?.classList.add('active');
  }
}
// Nav item listeners — explicit per-button for reliability
const navRoutes = {
  navHome: 'view-dashboard',
  navMeditations: 'view-meditations', 
  navNotebook: 'view-notebook',
  navInsight: 'view-insight',
  navProfile: 'view-settings'
};

Object.entries(navRoutes).forEach(([id, viewId]) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateTo(viewId);
    });
  }
});

// Desktop Nav Support — explicit per-button
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const view = link.getAttribute('data-view');
    if (view) navigateTo('view-' + view);
  });
});

/* --- MEDITATIONS LIST RENDERER --- */
function renderMeditationsList() {
  if (!elements.meditationsList) return;
  
  // Show loader if nothing rendered yet
  if (elements.meditationsList.children.length === 0) {
     elements.meditationsList.innerHTML = '<div class="loader-circle"></div>';
  }

  const protocolIcons = {
    p_478: '🌙',
    p_sigh: '💨',
    p_bellows: '🔥',
    p_resonance: '🎵',
    p_grounding: '🌿',
    p_box: '📦'
  };

  elements.meditationsList.innerHTML = Object.keys(protocols).map(id => {
    const p = protocols[id];
    const icon = protocolIcons[id] || '🫁';
    const mins = Math.ceil(p.totalDuration / 60);
    const phaseNames = p.phases.map(ph => ph.name).join(' · ');

    return `
      <button class="meditation-card" data-protocol="${id}">
        <div class="meditation-card-icon">${icon}</div>
        <div class="meditation-card-info">
          <span class="meditation-card-title">${p.title}</span>
          <span class="meditation-card-meta">${mins} ${t('meditations_duration')} · ${phaseNames}</span>
        </div>
        <svg class="meditation-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    `;
  }).join('');

  // Attach listeners
  elements.meditationsList.querySelectorAll('.meditation-card').forEach(card => {
    card.addEventListener('click', () => {
      const protocolId = card.getAttribute('data-protocol');
      prepareExerciseStandalone(protocolId);
    });
  });
}

// Launch a breathing exercise directly from the meditations tab (standalone, no check-in)
function prepareExerciseStandalone(protocolId) {
  exerciseParams = protocols[protocolId];
  elements.exerciseTitle.textContent = exerciseParams.title;
  
  if(elements.exerciseMicrocopy) {
    elements.exerciseMicrocopy.textContent = t(`mc_${protocolId}`);
    elements.exerciseMicrocopy.style.opacity = '0.7';
  }
  
  const mins = Math.floor(exerciseParams.totalDuration / 60);
  const secs = (exerciseParams.totalDuration % 60).toString().padStart(2, '0');
  
  timeRemaining = exerciseParams.totalDuration;
  elements.breathCircle.className = 'breath-circle';
  elements.breathCircle.style.transitionDuration = '0.5s';
  elements.breathInstruction.innerHTML = `${t("ex_ready")}<br><span style="font-size: 1.1rem; opacity: 0.9; font-weight: 300; text-transform: none; letter-spacing: 0; display: block; margin-top: 0.3rem;">${mins}:${secs}</span>`;
  elements.startExerciseBtn.innerHTML = `${t('ex_begin')} (<span id="exerciseDuration">${mins}:${secs}</span>)`;
  elements.startExerciseBtn.disabled = false;

  // Mark this as standalone so skip/finish returns to meditations instead of marination
  AppState._standaloneExercise = true;
  navigateTo('view-exercise');
}

/* --- NOTEBOOK RENDERER --- */
async function loadNotebook() {
  navigateTo('view-notebook');
  if (!elements.notebookEntries) return;

  elements.notebookEntries.innerHTML = '<div class="loader-circle"></div>';

  let localEntries = AppState.mockHistory || [];
  let cloudEntries = [];
  
  try {
    if (fb.isInitialized && AppState.user && !AppState.user.guest) {
      const q = fb.query(fb.collection(fb.db, 'checkins'), fb.where('uid', '==', AppState.user.uid));
      const snapshot = await fb.getDocs(q);
      snapshot.forEach(doc => cloudEntries.push(doc.data()));
    }
  } catch(e) {
    console.warn('Cloud notebook load error:', e);
  }

  // Merge & Deduplicate by timestamp
  const merged = [...localEntries];
  const cloudTimestamps = new Set(localEntries.map(e => e.timestamp));
  
  cloudEntries.forEach(ce => {
    if (!cloudTimestamps.has(ce.timestamp)) {
      merged.push(ce);
    }
  });

  merged.sort((a, b) => b.timestamp - a.timestamp);
  renderNotebook(merged);
}

function renderNotebook(entries) {
  if (!elements.notebookEntries) return;

  if (entries.length === 0) {
    elements.notebookEntries.innerHTML = `<div class="notebook-empty-state">${t('notebook_empty')}</div>`;
    return;
  }

  // Group by day
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  entries.forEach(entry => {
    const dateStr = new Date(entry.timestamp).toDateString();
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(entry);
  });

  let html = '';
  for (const [dateStr, dayEntries] of Object.entries(groups)) {
    let label;
    if (dateStr === today) {
      label = t('notebook_today');
    } else if (dateStr === yesterday) {
      label = t('notebook_yesterday');
    } else {
      const d = new Date(dayEntries[0].timestamp);
      label = d.toLocaleDateString(AppState.lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    html += `<div class="notebook-day-group">`;
    html += `<div class="notebook-day-label">${label}</div>`;

    dayEntries.forEach(entry => {
      const timeStr = new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      
      let stateEmoji = '💭';
      if (entry.state === 'wired') stateEmoji = '⚡️';
      else if (entry.state === 'foggy') stateEmoji = '☁️';
      else if (entry.state === 'okay') stateEmoji = '🌱';

      let emotionLabel = entry.customEmotion || (entry.subEmotion ? t(entry.subEmotion) : '');

      const sensationsHTML = (entry.sensations && entry.sensations.length > 0)
        ? `<div class="notebook-entry-sensations">${entry.sensations.map(s => `<span class="notebook-sensation-tag">${t(s)}</span>`).join('')}</div>`
        : '';

      html += `
        <div class="notebook-entry">
          <div class="notebook-entry-header">
            <span class="notebook-entry-time">${timeStr}</span>
            <span class="notebook-entry-badge ${entry.state || ''}">${stateEmoji} ${emotionLabel}</span>
          </div>
          ${entry.savoringText ? `<div class="notebook-entry-savoring">"${entry.savoringText}"</div>` : ''}
          ${sensationsHTML}
        </div>
      `;
    });

    html += '</div>';
  }

  elements.notebookEntries.innerHTML = html;
}

/* --- AUDIO ENGINE --- */
const AudioEngine = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  playBell(type = 'soft') {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // İki farklı osilatör (Oscillator) kullanarak Tibet çanağı (Singing Bowl) benzeri 
    // zengin ve hafif titreşimli (meditatif) bir ses yaratıyoruz.
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    
    // Inhale (start) biraz daha aydınlık (C4), Exhale/Hold daha derin (G3)
    let baseFreq = type === 'start' ? 261.63 : 196.00; 

    // İkinci osilatörü hafifçe bozarak (detune) "Omm" benzeri yavaş bir dalgalanma (beating) elde ediyoruz.
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq + 1.5, now);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // Çok yavaş (soft) bir girizgah ve uzuuun bir sönümleme (fade out 4 saniye)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.5);   // Yavaşça yüksel
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4.0);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 4.1);
    osc2.stop(now + 4.1);
  }
};

/* --- INITIALIZATION --- */
function startAppFlow(user) {
  // Prevent double-initialization if already in app with same user
  if (user && AppState.user && AppState.user.uid === user.uid) return;
  
  updateUI();

  if (user) {
    AppState.user = user;
    // Trigger Background Migration
    migrateGuestData(user.uid);
  } else {
    AppState.user = null;
  }

  // Always show Welcome Screen first (Ritual Mode)
  // Unless we are explicitly navigating back (which is handled by other paths)
  navigateTo('view-welcome');

  initWelcomeScreen({
    user: AppState.user,
    onGesture: () => {
      SensoryEngine.initAudio();
    },
    onComplete: async ({ mode }) => {
      if (mode === 'guest' || (mode === 'login' && AppState.user)) {
        try {
          // If we weren't logged in, sign in as guest
          if (!AppState.user) AppState.user = await signInAsGuest();
          
          // Ritual Delay: Allow orb scale-down animation to finish
          setTimeout(() => {
            if (!safeGetItem('aura_onboarded')) {
              startOnboardingFlow();
            } else {
              loadDashboard();
            }
          }, 800);
        } catch (err) {
          console.warn('[Aura] Entry failed:', err);
          AppState.user = { uid: 'guest_' + Date.now(), guest: true };
          loadDashboard();
        }
      } else if (mode === 'login') {
        navigateTo('view-auth');
      }
    },
    t,
    lang: AppState.lang
  });
}

function initAppBootstrap() {
  checkCircadian();
  
  // Cockpit Engine Sync
  if (typeof SensoryEngine !== 'undefined') {
    SensoryEngine.appVolume = AppState.appVolume;
    SensoryEngine.droneEnabled = AppState.droneEnabled;
    SensoryEngine.isMuted = AppState.isMuted;
  }

  // Sync Mute UI
  if (elements.muteIconOn && elements.muteIconOff) {
    if (AppState.isMuted) {
      elements.muteIconOn.classList.remove('hidden');
      elements.muteIconOff.classList.add('hidden');
      if (SensoryEngine) SensoryEngine.isMuted = true;
    } else {
      elements.muteIconOn.classList.add('hidden');
      elements.muteIconOff.classList.remove('hidden');
      if (SensoryEngine) SensoryEngine.isMuted = false;
    }
  }

  // Start with default neutral embodied UI
  try { updateEmbodiedUI('okay'); } catch(e) {}
  
  try {
    initSettingsListeners();
    // Removed initWelcomeScreen here - startAppFlow will handle it if needed
  } catch(e) { console.warn('[Aura] Settings init failed:', e); }

  try {
    if (fb.isInitialized && fb.auth) {
      // Set a safety timeout — if Firebase auth doesn't respond in 5s, proceed anyway
      const safetyTimeout = setTimeout(() => {
        console.warn('Firebase auth timeout — proceeding to welcome screen.');
        startAppFlow(null);
      }, 5000);

      fb.onAuthStateChanged(fb.auth, (user) => {
        clearTimeout(safetyTimeout);
        startAppFlow(user);
      });
    } else {
      setTimeout(() => startAppFlow(null), 1000);
    }
  } catch (err) {
    console.warn('Firebase init error, falling back to offline mode:', err);
    setTimeout(() => startAppFlow(null), 1000);
  }

  updateUI();
}

/* --- ONBOARDING FLOW --- */
let currentOnbScreen = 0;
function startOnboardingFlow() {
  navigateTo('view-onboarding');
  if(!elements.onbScreensContainer) return;
  const screens = elements.onbScreensContainer.querySelectorAll('.onb-screen');
  const dots = document.querySelectorAll('.onb-dot');
  
  const showScreen = (idx) => {
    screens.forEach((s, i) => {
      if(i === idx) {
        s.classList.remove('hidden');
        void s.offsetWidth;
        s.classList.add('active');
        s.style.opacity = '1';
        s.style.position = 'relative';
      } else {
        s.style.opacity = '0';
        s.style.position = 'absolute';
        setTimeout(()=> s.classList.add('hidden'), 500); // Wait for transition
        s.classList.remove('active');
      }
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };
  showScreen(0);

  // Swiping and Tapping support
  let touchStartX = 0;
  let touchEndX = 0;

  elements.onbScreensContainer.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  elements.onbScreensContainer.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) {
      // Swipe left -> Next
      if(currentOnbScreen < 3) {
        currentOnbScreen++;
        showScreen(currentOnbScreen);
      }
    } else if (touchEndX > touchStartX + 50) {
      // Swipe right -> Previous
      if(currentOnbScreen > 0) {
        currentOnbScreen--;
        showScreen(currentOnbScreen);
      }
    }
  }, { passive: true });

  elements.onbScreensContainer.onclick = (e) => {
    if(e.target.closest('button')) return; 
    // Prevent double-advancing if a swipe just occurred
    if (Math.abs(touchEndX - touchStartX) > 50) {
      touchStartX = 0;
      touchEndX = 0;
      return;
    }
    if(currentOnbScreen < 3) {
      currentOnbScreen++;
      showScreen(currentOnbScreen);
    }
  };

  const finish = () => {
    safeSetItem('aura_onboarded', 'true');
    AppState.currentCheckIn = { state: null, subEmotion: null, customEmotion: '', sensations: [], savoringText: '', timestamp: null };
    navigateTo('view-state-picker'); // Dropped into check-in exactly per requirements
  };

  if(elements.onbSkipBtn) elements.onbSkipBtn.onclick = finish;
  if(elements.onbLetsGoBtn) elements.onbLetsGoBtn.onclick = finish;
}

/* --- DASHBOARD LOGIC --- */
async function loadDashboard() {
  navigateTo('view-dashboard');

  // Crystal Clarity: blur→clarity transition on dashboard entry
  document.body.classList.add('crystal-entry');
  setTimeout(() => document.body.classList.remove('crystal-entry'), 2200);

  const hour = new Date().getHours();
  let greetingKey = 'dash_evening';
  if (hour < 12) greetingKey = 'dash_morning';
  else if (hour < 18) greetingKey = 'dash_afternoon';

  // Personalization
  const greeting = t(greetingKey);
  const defaultName = AppState.lang === 'tr' ? 'Dostum' : 'Friend';
  let storedName = localStorage.getItem('aura_guest_name');
  const name = AppState.user?.displayName || storedName || defaultName;
  elements.greetingText.textContent = t('dash_greeting').replace('{greeting}', greeting).replace('{name}', name);


  elements.historyList.innerHTML = '<div class="loader-circle" style="width:24px;height:24px;border-width:2px;margin:1rem auto;"></div>';

  try {
    let historyData = [];
    if (fb.isInitialized && AppState.user) {
      // Load toggles
      const userRef = fb.doc(fb.db, "users", AppState.user.uid);
      const userDoc = await fb.getDoc(userRef);
      if (userDoc.exists() && userDoc.data().notificationsEnabled) {
         elements.notifToggleCheckbox.checked = true;
      } else {
         elements.notifToggleCheckbox.checked = false;
      }

      const q = fb.query(fb.collection(fb.db, 'checkins'), fb.where('uid', '==', AppState.user.uid));
      const snapshot = await fb.getDocs(q);
      snapshot.forEach(doc => historyData.push(doc.data()));
      
      // Sort by newest first
      historyData.sort((a, b) => b.timestamp - a.timestamp);
      
      // Analyze the raw full array for Weekly Patterns
      analyzeWeeklyPatterns(historyData);
      
      // Limit actual history list to 5
      historyData = historyData.slice(0, 5);
    } else {
      historyData = AppState.mockHistory;
      analyzeWeeklyPatterns(historyData);
    }

    renderHistory(historyData);
  } catch(e) {
    console.warn("Could not load history from Firestore", e);
    analyzeWeeklyPatterns(AppState.mockHistory);
    renderHistory(AppState.mockHistory);
  }
}

function renderHistory(data) {
  if (data.length === 0) {
    elements.historyList.innerHTML = `<div class="empty-state">${t('dash_empty')}</div>`;
    return;
  }

  elements.historyList.innerHTML = data.map(item => {
    const rawDateStr = new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const poeticTag = getPoeticTimeLabel(item.timestamp, item.state);
    const dateStr = `${rawDateStr} — <span style="color:var(--text-muted);font-style:italic;font-size:0.85em">${poeticTag}</span>`;
    
    let stateEmoji = '💭';
    if (item.state === 'wired') stateEmoji = '⚡️';
    else if (item.state === 'foggy') stateEmoji = '☁️';
    else if (item.state === 'okay') stateEmoji = '🌱';

    let emotionLabel = item.customEmotion;
    if (!emotionLabel) {
       emotionLabel = item.subEmotion ? t(item.subEmotion) : '...';
    }
    
    // Clear and compact badge format: "⚡️ Dağınık"
    const badgeStr = `${stateEmoji} ${emotionLabel}`;
    
    return `
      <div class="history-item fade-in-up">
        <div class="history-header">
          <span>${dateStr}</span>
          <span class="state-badge ${item.state}">${badgeStr}</span>
        </div>
        <div class="history-savoring">"${item.savoringText}"</div>
      </div>
    `;
  }).join('');
}

/* --- MOOD CHART RENDERER (Cleaned/Disabled) --- */
function renderMoodChart() {}

/* --- VAGAL GEOMETRY & HEATMAP --- */

function renderVagalHeatmap(data, isModal = false) {
  const targetBlob = isModal ? document.querySelector('#vagalModalHeatmap .vagal-blob') : elements.vagalBlob;
  const targetTraces = isModal ? document.querySelector('#vagalModalHeatmap .vagal-traces') : elements.vagalTraces;
  
  if (!data) {
    // Fallback if data is missing: center
    const point = calculateVagalPoint(33, 33, 34);
    if (targetBlob) {
      targetBlob.style.left = point.x;
      targetBlob.style.top = point.y;
      targetBlob.style.opacity = '0.5';
    }
    return;
  }

  const point = calculateVagalPoint(data.ventral, data.sympathetic, data.dorsal);
  if (targetBlob) {
    targetBlob.style.left = point.x;
    targetBlob.style.top = point.y;
    targetBlob.style.opacity = '1';
    
    // Antigravity (v2) Chromotherapy: Sync background with blob
    const stateId = (data.ventral > data.sympathetic && data.ventral > data.dorsal) ? 'okay' : 
                    (data.sympathetic > data.dorsal) ? 'wired' : 'foggy';
    
    const weights = getWeightsFromState(stateId);
    const vagalState = calculateVagalState(weights.wV, weights.wS, weights.wD);
    
    document.documentElement.style.setProperty('--vagal-x', point.x);
    document.documentElement.style.setProperty('--vagal-y', point.y);
    document.documentElement.style.setProperty('--vagal-color', vagalState.color);
    
    SensoryEngine.update(stateId);

    targetBlob.style.width = '45px';
    targetBlob.style.height = '45px';
  }

  // Handle Traces (from localStorage)
  if (targetTraces) {
    targetTraces.innerHTML = '';
    let history = JSON.parse(localStorage.getItem('vagal_history') || '[]');
    
    // Ghost Traces Logic: If empty, generate 5 nearby "haunt" points
    if (history.length === 0 && !isModal) {
      for (let i = 0; i < 5; i++) {
        const offset = (Math.random() - 0.5) * 15;
        history.push({
          x: `${50 + offset}%`,
          y: `${50 + offset}%`,
          ghost: true
        });
      }
    }

    const traceSlice = history.slice(-7);
    traceSlice.forEach(pt => {
      const trace = document.createElement('div');
      trace.className = 'vagal-trace-point';
      trace.style.left = pt.x;
      trace.style.top = pt.y;
      if (pt.ghost) trace.style.opacity = '0.1';
      targetTraces.appendChild(trace);
    });

    // --- Energy Path: SVG Spline connecting trace points ---
    if (traceSlice.length >= 2) {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'vagal-energy-path');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      
      // Parse percentage coordinates to numbers
      const pts = traceSlice.map(p => ({
        x: parseFloat(p.x),
        y: parseFloat(p.y)
      }));
      
      // Catmull-Rom to SVG path
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[Math.min(i + 1, pts.length - 1)];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'energy-spline');
      svg.appendChild(path);
      targetTraces.appendChild(svg);
    }

    // Save current real point for next time
    if (!isModal && !data.ghost) {
      const last = history.filter(h => !h.ghost).pop();
      if (!last || last.x !== point.x || last.y !== point.y) {
        history = history.filter(h => !h.ghost); // Clear ghosts once real data exists
        history.push({...point, timestamp: Date.now()});
        localStorage.setItem('vagal_history', JSON.stringify(history.slice(-10)));
      }
    }
  }
}

/* --- VAGAL PLASTICITY SCORE MOVED TO vagal-logic.js --- */

function renderPlasticityBar(plasticity) {
  const bar = document.getElementById('resilienceBar');
  const fill = document.getElementById('resilienceFill');
  const label = document.getElementById('resilienceLevel');
  if (!bar || !fill || !label) return;

  bar.classList.remove('hidden');
  
  const colors = {
    high: 'linear-gradient(90deg, #4ade80, #22d3ee)',
    medium: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
    low: 'linear-gradient(90deg, #f87171, #ef4444)'
  };
  
  fill.style.background = colors[plasticity.level];
  fill.style.width = `${plasticity.score}%`;
  label.textContent = t(`plasticity_${plasticity.level}`);
  label.className = `resilience-level resilience-${plasticity.level}`;
}

function checkCompassionateIntervention(weeklyData) {
  if (weeklyData.length < 3) return null;
  
  const lastThree = [...weeklyData]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
  
  const allSameState = lastThree.every(d => d.state === lastThree[0].state);
  if (!allSameState) return null;
  
  const state = lastThree[0].state;
  if (state === 'wired' || state === 'foggy') {
    return t(`compassion_${state}`);
  }
  return null;
}

/* --- WEEKLY PATTERNS ANALYTICS --- */
function analyzeWeeklyPatterns(historyData) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const weeklyData = historyData.filter(item => item.timestamp >= sevenDaysAgo);

  // --- Plasticity Score ---
  const plasticity = calculatePlasticity(weeklyData);
  renderPlasticityBar(plasticity);

  // 1. Render Timeline & Chart (Last 7 Days)
  let timelineHTML = '';
  const scoreMap = { okay: 1, wired: 0, foggy: -1 };

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayKey = `day_${d.getDay()}`;
    const dateQuery = d.toDateString();
    const logsThisDay = weeklyData.filter(item => new Date(item.timestamp).toDateString() === dateQuery);
    
    let dominantState = null;

    if (logsThisDay.length > 0) {
      const counts = { wired: 0, foggy: 0, okay: 0 };
      logsThisDay.forEach(log => {
        if(log.state) {
          counts[log.state] = (counts[log.state] || 0) + 1;
        }
      });
      dominantState = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
    
    const circleClass = dominantState ? `day-circle day-${dominantState}` : 'day-circle';
    timelineHTML += `
      <div class="day-col">
        <div class="day-label" data-i18n="${dayKey}">${t(dayKey)}</div>
        <div class="${circleClass}"></div>
      </div>
    `;
  }
  elements.weeklyTimeline.innerHTML = timelineHTML;

  // 2. Insight Logic
  if (weeklyData.length < 3) { 
    elements.weeklyEmpty.classList.remove('hidden');
    elements.weeklyInsight.classList.add('hidden');
    elements.weeklyExercise.classList.add('hidden');
    elements.vagalHeatmapCard.classList.add('hidden');
    return;
  }
  
  elements.weeklyEmpty.classList.add('hidden');

  // --- Compassionate Intervention Check ---
  const compassionMessage = checkCompassionateIntervention(weeklyData);
  
  // Calculate most frequent sub-emotion
  const subCounts = {};
  weeklyData.forEach(l => {
     if (l.subEmotion && l.subEmotion !== 'se_other') {
        subCounts[l.subEmotion] = (subCounts[l.subEmotion] || 0) + 1;
     }
  });
  
  let dominantSubEmotion = null;
  const keys = Object.keys(subCounts);
  if (keys.length > 0) {
     dominantSubEmotion = keys.reduce((a, b) => subCounts[a] > subCounts[b] ? a : b);
  }
  
  if (compassionMessage) {
     // Override with compassionate intervention
     elements.insightText.innerHTML = compassionMessage;
     elements.weeklyInsight.classList.remove('hidden');
     elements.weeklyInsight.classList.add('compassion-mode');
  } else if (dominantSubEmotion) {
     elements.weeklyInsight.classList.remove('compassion-mode');
     const todCounts = { tod_morning: 0, tod_afternoon: 0, tod_evening: 0 };
     weeklyData.forEach(l => {
       if (l.subEmotion === dominantSubEmotion) {
          const hr = new Date(l.timestamp).getHours();
          if (hr < 12) todCounts.tod_morning++;
          else if (hr < 18) todCounts.tod_afternoon++;
          else todCounts.tod_evening++;
       }
     });
     const dominantTime = Object.keys(todCounts).reduce((a, b) => todCounts[a] > todCounts[b] ? a : b);
     
     let text = t('insight_template')
        .replace('{emotion}', t(dominantSubEmotion).toLowerCase())
        .replace('{time}', t(dominantTime).toLowerCase());
     
     elements.insightText.innerHTML = text;
     elements.weeklyInsight.classList.remove('hidden');
     
     const exId = subEmotionMap[dominantSubEmotion].protocol;
     elements.insightExText.textContent = protocols[exId].title;
     elements.weeklyExercise.classList.remove('hidden');
  } else {
     elements.weeklyInsight.classList.remove('compassion-mode');
     elements.insightText.textContent = t('insight_no_dominant');
     elements.weeklyInsight.classList.remove('hidden');
  }

  // Layer 5: AI Insight Generation
  (async () => {
    try {
      // Show loading state — save template for fallback
      const originalTemplate = elements.insightText.innerHTML;
      elements.insightText.innerHTML = `<span class="loading-dots">${t('insight_loading')}</span>`;
      
      // Always show the heatmap container if we have enough data
      elements.vagalHeatmapCard.classList.remove('hidden');
      elements.vagalHeatmapCard.style.opacity = "1";
      renderVagalHeatmap(null); // Shows center blob as loading/fallback
      
      const aiResponse = await getWeeklyInsight(weeklyData, AppState.lang, t);
      if (aiResponse) {
        try {
          const report = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
          
          if (report.summary) {
            elements.insightText.innerHTML = report.summary.trim();

            // Render Heatmap with real data
            if (report.heatmap_data) {
              renderVagalHeatmap(report.heatmap_data);
              // Store latest analysis for modal
              AppState.latestVagalAnalysis = report;
            }
          } else {
            elements.insightText.innerHTML = originalTemplate;
          }
        } catch (jsonErr) {
          console.warn("AI JSON parse error:", jsonErr, aiResponse);
          elements.insightText.innerHTML = originalTemplate;
        }
      } else {
        // API failed but we keep the heatmap card visible with fallback (centered blob)
        elements.insightText.innerHTML = originalTemplate;
        AppState.latestVagalAnalysis = {
           insight_title: t('dash_insight_placeholder_title') || "Sinir Sistemi Analizi",
           summary: originalTemplate,
           recommendation: "Gelişmiş AI analizi için birkaç gün daha veri girişi yapmaya devam edin.",
           heatmap_data: { ventral: 33, sympathetic: 33, dorsal: 34 }
        };
      }
    } catch (err) {
      console.warn("AI Insight overall error:", err);
    }
  })();
}

// Vagal Modal Logic
if (elements.vagalHeatmapCard) {
  elements.vagalHeatmapCard.addEventListener('click', () => {
    const report = AppState.latestVagalAnalysis;
    if (!report) return;

    elements.vagalModalTitle.textContent = report.insight_title || "Nervous System Map";
    elements.vagalModalAnalysis.innerHTML = report.summary;
    elements.vagalModalRec.innerHTML = `<strong>${t('recommendation_title')}:</strong> ${report.recommendation || "Maintain your current rhythm."}`;
    
    // Duplicate the triangle into the modal for larger view
    elements.vagalModalHeatmap.innerHTML = elements.vagalHeatmapCard.innerHTML;
    
    elements.vagalModal.classList.remove('hidden');
    
    // Re-render specifically for modal to ensure traces/blob are positioned
    setTimeout(() => renderVagalHeatmap(report.heatmap_data, true), 10);
  });
}

if (elements.closeVagalModal) {
  elements.closeVagalModal.addEventListener('click', () => {
    elements.vagalModal.classList.add('hidden');
  });
}

/* --- CORE LOOP --- */
elements.startCheckinBtn.addEventListener('click', () => {
  AppState.currentCheckIn = { state: null, subEmotion: null, customEmotion: '', sensations: [], savoringText: '', timestamp: null };
  navigateTo('view-state-picker');
});

// Step 1: Picking State
elements.stateCards.forEach(card => {
  card.addEventListener('click', () => {
    const state = card.getAttribute('data-state');
    AppState.currentCheckIn.state = state;
    
    // Antigravity (v2) Sensory Shift
    updateEmbodiedUI(state);
    
    renderSubEmotions(state);
    navigateTo('view-sub-emotion');
  });
});

// Step 2: Sub-Emotions
function renderSubEmotions(state) {
  elements.subEmotionTitle.textContent = t(`sub_title_${state}`);
  elements.otherInputContainer.classList.add('hidden');
  elements.customSubEmotionInput.value = '';

  const chips = Object.keys(subEmotionMap)
    .filter(k => subEmotionMap[k].list === state);
    
  // Load custom emotions for this state
  let customEmotions = [];
  try {
    const storedEmotions = JSON.parse(localStorage.getItem('aura_custom_emotions') || '{}');
    if (storedEmotions[state]) {
      customEmotions = storedEmotions[state];
    }
  } catch(e) {}

  let htmlStr = chips.map(key => `
      <button class="emotion-card ${state}-tint" data-sub="${key}">
        <span class="emotion-emoji">${emojiMap[key] || '💭'}</span>
        <span class="emotion-text">${t(key)}</span>
      </button>
  `).join('');
  
  htmlStr += customEmotions.map(emotionText => `
      <button class="emotion-card ${state}-tint" data-sub="custom" data-text="${emotionText.replace(/"/g, '&quot;')}">
        <span class="emotion-emoji">📝</span>
        <span class="emotion-text">${emotionText}</span>
      </button>
  `).join('');

  htmlStr += `
      <button class="emotion-card ${state}-tint emotion-other-span" data-sub="se_other">
        <span class="emotion-emoji">📝</span>
        <span class="emotion-text">${t('se_other')}</span>
      </button>
  `;

  elements.subEmotionContainer.innerHTML = htmlStr;

  // Attach events
  document.querySelectorAll('.emotion-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-sub');
      const customText = btn.getAttribute('data-text');
      
      // Visual select
      document.querySelectorAll('.emotion-card').forEach(b => {
         b.classList.remove('selected');
         b.style.opacity = '0.5';
      });
      btn.style.opacity = '1';
      btn.classList.add('selected');

      AppState.currentCheckIn.subEmotion = selected;

      if (selected === 'se_other') {
        elements.otherInputContainer.classList.remove('hidden');
        elements.customSubEmotionInput.focus();
      } else if (selected === 'custom') {
        AppState.currentCheckIn.customEmotion = customText;
        prepareExercise(subEmotionMap['se_other'].protocol);
      } else {
        AppState.currentCheckIn.customEmotion = ''; 
        prepareExercise(subEmotionMap[selected].protocol);
      }
    });
  });
}

// "Other" Continue Button
elements.customSubEmotionBtn.addEventListener('click', () => {
  const text = elements.customSubEmotionInput.value.trim();
  if(!text) return;
  AppState.currentCheckIn.customEmotion = text;
  
  // Save to Custom Emotions history
  const state = AppState.currentCheckIn.state;
  try {
      const storedEmotions = JSON.parse(localStorage.getItem('aura_custom_emotions') || '{}');
      if (!storedEmotions[state]) storedEmotions[state] = [];
      if (!storedEmotions[state].includes(text)) {
          storedEmotions[state].unshift(text); // Add to beginning
          if (storedEmotions[state].length > 5) {
              storedEmotions[state].pop(); // Limit to 5 custom emotions per state
          }
          localStorage.setItem('aura_custom_emotions', JSON.stringify(storedEmotions));
      }
  } catch(e) {}

  prepareExercise(subEmotionMap['se_other'].protocol); // Default to resonance for unknown emotions
});

// Step 3: Exercise Setup & Engine
function prepareExercise(protocolId) {
  exerciseParams = protocols[protocolId];
  elements.exerciseTitle.textContent = exerciseParams.title;
  
  if(elements.exerciseMicrocopy) {
    elements.exerciseMicrocopy.textContent = t(`mc_${protocolId}`);
    elements.exerciseMicrocopy.style.opacity = '0.7';
  }
  
  const mins = Math.floor(exerciseParams.totalDuration / 60);
  const secs = (exerciseParams.totalDuration % 60).toString().padStart(2, '0');
  
  timeRemaining = exerciseParams.totalDuration;
  elements.breathCircle.className = 'breath-circle';
  elements.breathCircle.style.transitionDuration = '0.5s';
  elements.breathInstruction.innerHTML = `${t("ex_ready")}<br><span style="font-size: 1.1rem; opacity: 0.9; font-weight: 300; text-transform: none; letter-spacing: 0; display: block; margin-top: 0.3rem;">${mins}:${secs}</span>`;
  elements.startExerciseBtn.innerHTML = `${t('ex_begin')} (<span id="exerciseDuration">${mins}:${secs}</span>)`;
  elements.startExerciseBtn.disabled = false;

  AppState._standaloneExercise = false; // Normal check-in flow
  navigateTo('view-exercise');
}

let meditationCountdownInterval = null;

function startMeditationLoading(protocolId) {
  const protocol = protocols[protocolId];
  elements.meditationLoadingTitle.textContent = protocol.title;
  
  updateUI(); // In case there are translations in the loading view
  
  // Reset circle and countdown text
  elements.loadingCircleProgress.style.transition = 'none';
  elements.loadingCircleProgress.style.strokeDashoffset = '283';
  const iconEl = document.querySelector('.loading-icon');
  iconEl.textContent = "5";
  iconEl.style.opacity = '1';
  iconEl.style.transform = 'scale(1)';
  
  navigateTo('view-meditation-loading');
  
  // Update parent step header to Step 5
  const parentStepIndicator = document.getElementById('savoringStepIndicator');
  if (parentStepIndicator) {
    parentStepIndicator.textContent = t('step_5');
    parentStepIndicator.setAttribute('data-i18n', 'step_5');
    if (parentStepIndicator.parentElement) parentStepIndicator.parentElement.classList.remove('hidden');
  }

  if (meditationLoadingTimeout) clearTimeout(meditationLoadingTimeout);
  if (meditationCountdownInterval) clearInterval(meditationCountdownInterval);
  
  // Start animation after a 450ms delay so the navigateTo transition can fully settle and view is visible
  setTimeout(() => {
    elements.loadingCircleProgress.style.transition = 'stroke-dashoffset 5s linear';
    elements.loadingCircleProgress.style.strokeDashoffset = '0';
    
    let timeLeft = 4;
    meditationCountdownInterval = setInterval(() => {
      iconEl.style.transform = 'scale(0.8)';
      iconEl.style.opacity = '0.5';
      
      setTimeout(() => {
        iconEl.textContent = timeLeft;
        iconEl.style.transform = 'scale(1.1)';
        iconEl.style.opacity = '1';
        
        setTimeout(() => {
          iconEl.style.transform = 'scale(1)';
        }, 150);
        
        timeLeft--;
        if (timeLeft < 0) clearInterval(meditationCountdownInterval);
      }, 150);
    }, 1000);

    meditationLoadingTimeout = setTimeout(() => {
      navigateTo('view-savoring');
      // Reset marination phases, show only scan
      if(elements.marPhase1) elements.marPhase1.classList.add('hidden');
      if(elements.marPhase2) elements.marPhase2.classList.add('hidden');
      if(elements.marPhaseOffer) elements.marPhaseOffer.classList.add('hidden');
      if(elements.marPhase3) elements.marPhase3.classList.add('hidden');

      elements.marPhaseScan.classList.remove('hidden');
      elements.marPhaseScan.classList.remove('opacity-0');
      meditationIndex = 0;
      runMeditation();
    }, 5000);
  }, 450);
}

/* --- INSIGHT VIEW CORE LOGIC --- */

function updateInsightView(history) {
    // Robust Default: Ensure we don't return early if empty, but use defaults
    const safeHistory = (history && history.length > 0) ? history : [{ state: 'okay', timestamp: Date.now() }];
    
    const plasticity = calculatePlasticity(safeHistory);
    const dominantState = getDominantState(safeHistory);
    
    // Dynamic Theme Class
    const insightSection = document.getElementById('view-insight');
    if (insightSection) {
        insightSection.classList.remove('theme-ventral', 'theme-sympathetic', 'theme-dorsal');
        insightSection.classList.add(`theme-${dominantState === 'okay' ? 'ventral' : (dominantState === 'wired' ? 'sympathetic' : 'dorsal')}`);
    }

    // 1. Poetic Hero Title
    if (elements.insightHeroTitle) {
        elements.insightHeroTitle.style.opacity = '0';
        setTimeout(() => {
            elements.insightHeroTitle.innerText = generatePoeticInsight(dominantState, plasticity.score);
            elements.insightHeroTitle.style.opacity = '1';
        }, 200);
    }
    
    // 2. Resilience Score
    if (elements.resilienceScoreLarge) {
        elements.resilienceScoreLarge.innerText = plasticity.score;
        elements.resilienceScoreLarge.style.color = 'var(--vagal-accent)';
    }

    // 2b. Insight Resilience Bar (mini version in Insight view)
    if (elements.insightResilienceBar) {
        const colors = {
            high: 'linear-gradient(90deg, #4ade80, #22d3ee)',
            medium: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            low: 'linear-gradient(90deg, #f87171, #ef4444)'
        };
        elements.insightResilienceBar.innerHTML = `
            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden;">
                <div style="height: 100%; width: ${plasticity.score}%; background: ${colors[plasticity.level]}; border-radius: 100px; transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);"></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                <span style="font-size: 0.7rem; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase;">${t('dash_resilience')}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${t('plasticity_' + plasticity.level)}</span>
            </div>
        `;
    }

    // 2c. Summary Card — deterministic insight text
    if (elements.insightSummaryText) {
        const hour = new Date().getHours();
        const tod = (hour >= 5 && hour < 12) ? 'day' : (hour >= 12 && hour < 20 ? 'day' : 'night');
        const intensity = plasticity.score >= 70 ? 'chronic' : (plasticity.score >= 40 ? 'medium' : 'light');
        const insightKey = `insight_${dominantState === 'okay' ? 'okay' : dominantState}_${intensity}_${tod}`;
        const insightText = t(insightKey);
        elements.insightSummaryText.textContent = insightText !== insightKey ? insightText : t('insight_summary_empty');
    }

    // 3. Trace & Blob for Macro Heatmap
    const latest = history[history.length - 1];
    const weights = getWeightsFromState(latest.state);
    const point = calculateVagalPoint(weights.wV, weights.wS, weights.wD);
    if (elements.macroBlob) {
        elements.macroBlob.style.left = point.x;
        elements.macroBlob.style.top = point.y;
    }
    
    // Dynamic Label Opacity
    const labels = {
        ventral: document.querySelector('#view-insight .v-ventral'),
        symp: document.querySelector('#view-insight .v-sympathetic'),
        dorsal: document.querySelector('#view-insight .v-dorsal')
    };
    if (labels.ventral) labels.ventral.style.opacity = weights.wV > 0.5 ? '1' : '0.3';
    if (labels.symp) labels.symp.style.opacity = weights.wS > 0.5 ? '1' : '0.3';
    if (labels.dorsal) labels.dorsal.style.opacity = weights.wD > 0.5 ? '1' : '0.3';

    // 4. Render Energy Path
    setTimeout(() => {
        renderEnergyPath(history);
    }, 400);
}

/* --- COCKPIT / SETTINGS LOGIC --- */

function initSettingsListeners() {
  // Sensory Toggles
  elements.hapticToggle?.addEventListener('change', (e) => {
    AppState.hapticEnabled = e.target.checked;
    safeSetItem('aura_haptic', AppState.hapticEnabled);
  });

  elements.droneToggle?.addEventListener('change', (e) => {
    AppState.droneEnabled = e.target.checked;
    safeSetItem('aura_drone', AppState.droneEnabled);
    SensoryEngine.setDroneEnabled(AppState.droneEnabled);
  });

  // Volume Slider
  elements.volumeSlider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    AppState.appVolume = val;
    elements.volumeValLabel.textContent = `${val}%`;
    safeSetItem('aura_volume', val);
    SensoryEngine.setVolume(val);
  });

  // Data Actions
  elements.exportJsonBtn?.addEventListener('click', () => exportHistory('json'));
  elements.exportTxtBtn?.addEventListener('click', () => exportHistory('txt'));
  
  elements.resetMemoryBtn?.addEventListener('click', () => {
    if (confirm(t('prof_reset_confirm'))) {
      localStorage.clear();
      window.location.reload();
    }
  });
}

function updateSettingsView() {
  // Sync Toggles/Sliders with AppState
  if (elements.hapticToggle) elements.hapticToggle.checked = AppState.hapticEnabled;
  if (elements.droneToggle) elements.droneToggle.checked = AppState.droneEnabled;
  if (elements.notifToggleCheckbox) elements.notifToggleCheckbox.checked = localStorage.getItem('aura_notifs_enabled') === 'true';
  if (elements.volumeSlider) {
    elements.volumeSlider.value = AppState.appVolume;
    elements.volumeValLabel.textContent = `${AppState.appVolume}%`;
  }

  // Aura Core & Profile Stats
  // UNIFIED: Merge local and auth history for accurate stats
  const localHistory = AppState.mockHistory || [];
  const mergedHistory = [...localHistory];
  
  // If we have a logged in user, stats should reflect reconciled data (merged in loadNotebook)
  // For simplicity here, we just use the local ground truth which is now reconciled on save/load
  const name = AppState.user?.displayName || (AppState.user?.guest ? 'Explorer' : (localStorage.getItem('aura_guest_name') || 'Explorer'));
  
  if (elements.userDisplayName) elements.userDisplayName.textContent = name;
  
  if (elements.uniqueDaysStats) {
    const uniqueDays = new Set(mergedHistory.map(h => new Date(h.timestamp).toDateString())).size || 0;
    elements.uniqueDaysStats.textContent = t('prof_active_days').replace('{count}', uniqueDays);
  }

  if (latest && elements.auraCoreSphere) {
    const weights = getWeightsFromState(latest.state);
    const stateData = calculateVagalState(weights.wV, weights.wS, weights.wD);
    elements.auraCoreSphere.style.background = `radial-gradient(circle at 35% 35%, ${stateData.color} 0%, rgba(255,255,255,0.4) 40%, transparent 80%)`;
    elements.auraCoreSphere.style.boxShadow = `0 0 60px ${stateData.color.replace('rgb', 'rgba').replace(')', ', 0.6)')}, inset 0 0 20px rgba(255,255,255,0.5)`;
    // Update the glow accent for pseudo-element (v2)
    document.documentElement.style.setProperty('--vagal-accent', stateData.color);
  }

  // Dynamic Login / Logout Button Logic
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutText = document.getElementById('logoutText');
  const logoutIcon = document.getElementById('logoutIcon');
  
  if (logoutBtn && logoutText && logoutIcon) {
    const isGuest = !AppState.user || AppState.user.guest || isGuestUser?.(AppState.user);
    if (isGuest) {
      logoutText.textContent = t('btn_login');
      logoutBtn.classList.remove('hover:bg-red-500/10');
      logoutBtn.classList.add('hover:bg-emerald-500/10');
      logoutIcon.innerHTML = `<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line>`;
      logoutIcon.classList.remove('group-hover:text-red-400');
      logoutIcon.classList.add('group-hover:text-emerald-400');
    } else {
      logoutText.textContent = t('prof_logout');
      logoutBtn.classList.add('hover:bg-red-500/10');
      logoutBtn.classList.remove('hover:bg-emerald-500/10');
      logoutIcon.innerHTML = `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>`;
      logoutIcon.classList.add('group-hover:text-red-400');
      logoutIcon.classList.remove('group-hover:text-emerald-400');
    }
  }
}

function exportHistory(format) {
  const history = AppState.user?.history || AppState.mockHistory || [];
  let content, type, filename;

  if (format === 'json') {
    content = JSON.stringify({
      user: AppState.user?.displayName || 'Aura User',
      exportedAt: new Date().toISOString(),
      history: history,
      settings: {
        lang: AppState.lang,
        haptic: AppState.hapticEnabled,
        drone: AppState.droneEnabled,
        volume: AppState.appVolume
      }
    }, null, 2);
    type = 'application/json';
    filename = 'aura_memory_backup.json';
  } else {
    const dominant = getDominantState(history);
    const plasticity = calculatePlasticity(history);
    content = `
AURA WELLNESS REPORT
--------------------
Date: ${new Date().toLocaleDateString()}

User: ${AppState.user?.displayName || 'Explorer'}
Persistence: ${new Set(history.map(h => new Date(h.timestamp).toDateString())).size} active days.

Vagal Mirror Summary:
Dominant State: ${dominant.toUpperCase()}
Resilience Score: ${plasticity.score}/100

This week, you've spent the most time in ${dominant === 'okay' ? 'Ventral Flow' : (dominant === 'wired' ? 'Sympathetic Alert' : 'Dorsal Fog')}.
Keep breathing, observing, and regulating.

Produced by Aura Neuroscience.
    `;
    type = 'text/plain';
    filename = 'aura_wellness_report.txt';
  }

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getDominantState(history) {
    const counts = { okay: 0, wired: 0, foggy: 0 };
    history.forEach(h => { if(h.state) counts[h.state]++; });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function generatePoeticInsight(state, score) {
    if (score >= 80) return AppState.lang === 'tr' ? "Sistemin Bahar Tadında" : "Your System is in Bloom";
    if (state === 'okay') return AppState.lang === 'tr' ? "Dingin Bir Akıştasın" : "You are in a Serene Flow";
    if (state === 'wired') return AppState.lang === 'tr' ? "Fırtına Diniyor" : "The Storm is Subsiding";
    return AppState.lang === 'tr' ? "Sisin İçinde Bir Işık" : "A Light Within the Fog";
}

function renderEnergyPath(history) {
    const svg = elements.energyPathSvg;
    if (!svg) return;
    svg.innerHTML = '';
    
    const last7 = history.slice(-7);
    if (last7.length < 2) return;

    // Create Gradient
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(133, 141, 255, 0)" />
            <stop offset="100%" stop-color="rgba(255, 255, 255, 0.8)" />
        </linearGradient>
    `;
    svg.appendChild(defs);

    const points = last7.map(h => {
        const w = getWeightsFromState(h.state);
        const p = calculateVagalPoint(w.wV, w.wS, w.wD);
        return {
            x: parseFloat(p.x) * 2.8, 
            y: parseFloat(p.y) * 2.6
        };
    });

    let pathData = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const xc = (points[i-1].x + points[i].x) / 2;
        const yc = (points[i-1].y + points[i].y) / 2;
        pathData += ` Q ${points[i-1].x},${points[i-1].y} ${xc},${yc}`;
    }
    pathData += ` L ${points[points.length-1].x},${points[points.length-1].y}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", "energy-line animating");
    path.style.strokeWidth = "4";
    svg.appendChild(path);
}

function drawResilienceWave(canvas, history) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    const h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const last7 = history.slice(-7);
    ctx.clearRect(0, 0, w, h);
    
    // Create gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(168, 230, 207, 0.2)");
    grad.addColorStop(1, "rgba(168, 230, 207, 0)");

    ctx.strokeStyle = "rgba(168, 230, 207, 0.8)";
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const step = (canvas.offsetWidth) / (last7.length - 1 || 1);
    const scorePoints = last7.map((item, i) => {
        // Use a 3-day window for local plasticity focus in the wave
        const sc = calculatePlasticity(history.slice(0, Math.max(1, history.length - 7 + i))).score;
        return { x: i * step, y: 50 - (sc / 100) * 40, score: sc };
    });

    // Find highest point
    let maxPt = scorePoints[0];
    scorePoints.forEach(p => { if(p.score > maxPt.score) maxPt = p; });

    ctx.moveTo(scorePoints[0].x, scorePoints[0].y);
    for (let i = 1; i < scorePoints.length; i++) {
        const xc = (scorePoints[i-1].x + scorePoints[i].x) / 2;
        const yc = (scorePoints[i-1].y + scorePoints[i].y) / 2;
        ctx.quadraticCurveTo(scorePoints[i-1].x, scorePoints[i-1].y, xc, yc);
    }
    ctx.lineTo(scorePoints[scorePoints.length-1].x, scorePoints[scorePoints.length-1].y);
    ctx.stroke();

    // Fill area
    ctx.lineTo(scorePoints[scorePoints.length-1].x, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Marker at Highest Point
    ctx.beginPath();
    ctx.arc(maxPt.x, maxPt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.fill();
}

function renderNarrativeCards(history) {
    const plasticity = calculatePlasticity(history);
    const container = elements.insightNarratives;
    
    // Weekly Growth Calculation
    const mid = Math.floor(history.length / 2);
    const firstHalf = calculatePlasticity(history.slice(0, mid)).score;
    const secondHalf = plasticity.score;
    const growth = Math.max(0, secondHalf - firstHalf);

    // Circadian Logic
    const counts = { morning: 0, afternoon: 0, evening: 0 };
    history.forEach(h => {
        const hour = new Date(h.timestamp).getHours();
        const tod = (hour >= 5 && hour < 12) ? 'morning' : (hour >= 12 && hour < 18 ? 'afternoon' : 'evening');
        if (h.state === 'okay') counts[tod]++;
    });
    const bestTod = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const todKey = `tod_${bestTod}`;

    container.innerHTML = `
        <div class="insight-card liquid-border stagger-1">
            <div class="flex items-center gap-2 mb-1" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span style="font-size: 1.2rem;">☀️</span>
                <span class="text-[10px] text-indigo-400 tracking-widest uppercase">${t('insight_circadian_title')}</span>
            </div>
            <p class="text-white/80 mt-1">${t('insight_circadian_desc').replace('{time}', t(todKey))}</p>
        </div>
        <div class="insight-card liquid-border stagger-2">
            <div class="flex items-center gap-2 mb-1" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <script type="module" src="app.js?v=66"></script>
                <span class="text-[10px] text-emerald-400 tracking-widest uppercase">${t('insight_growth_title')}</span>
            </div>
            <p class="text-white/80 mt-1">${t('insight_growth_desc').replace('{percent}', growth)}</p>
        </div>
        <div class="insight-card liquid-border stagger-3">
            <div class="flex items-center gap-2 mb-1" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span style="font-size: 1.2rem;">🧘</span>
                <span class="text-[10px] text-orange-400 tracking-widest uppercase">${t('insight_advice_title')}</span>
            </div>
            <p class="text-white/80 mt-1">${t('insight_advice_desc')}</p>
        </div>
    `;
}

if (elements.skipLoadingBtn) {
  elements.skipLoadingBtn.addEventListener('click', () => {
    if (meditationLoadingTimeout) clearTimeout(meditationLoadingTimeout);
    if (meditationCountdownInterval) clearInterval(meditationCountdownInterval);
    
    navigateTo('view-savoring');
    
    // Update step indicator to Step 6
    const parentStepIndicator = document.getElementById('savoringStepIndicator');
    if (parentStepIndicator) {
      parentStepIndicator.textContent = t('step_6');
      parentStepIndicator.setAttribute('data-i18n', 'step_6');
      if (parentStepIndicator.parentElement) parentStepIndicator.parentElement.classList.remove('hidden');
    }

    // Hide everything except Savoring
    if(elements.marPhase1) elements.marPhase1.classList.add('hidden');
    if(elements.marPhase2) elements.marPhase2.classList.add('hidden');
    if(elements.marPhaseOffer) elements.marPhaseOffer.classList.add('hidden');
    if(elements.marPhaseScan) elements.marPhaseScan.classList.add('hidden');
    
    if(elements.marPhase3) {
      elements.marPhase3.classList.remove('hidden');
      elements.marPhase3.classList.remove('opacity-0');
      setTimeout(() => elements.savoringInput && elements.savoringInput.focus(), 100);
    }
  });
}

elements.breathCircle.addEventListener('click', () => {
  if (!elements.startExerciseBtn.disabled) {
    elements.startExerciseBtn.click();
  }
});

elements.startExerciseBtn.addEventListener('click', () => {
  AudioEngine.init();
  elements.startExerciseBtn.disabled = true;
  elements.startExerciseBtn.textContent = '...';
  
  if(elements.exerciseMicrocopy) {
    setTimeout(() => {
      elements.exerciseMicrocopy.style.opacity = '0';
    }, 5000);
  }
  
  currentPhaseIndex = 0;
  
  if (breathTimerInterval) clearInterval(breathTimerInterval);
  
  breathTimerInterval = setInterval(() => {
    if (isModalOpen) return; // Silent pause for total timer
    timeRemaining--;
    if(timeRemaining <= 0) {
      clearInterval(breathTimerInterval);
      stopExercise();
      if (AppState._standaloneExercise) {
        navigateTo('view-completion');
        return;
      }
      startMarinationFlow();
    }
  }, 1000);

  runPhase();
});

function runPhase(customDuration = null) {
  if(timeRemaining <= 0 || isModalOpen) return;
  const phase = exerciseParams.phases[currentPhaseIndex];
  const duration = customDuration || phase.duration;
  
  phaseStartTime = Date.now();
  remainingPhaseDuration = duration;

  elements.breathCircle.className = `breath-circle ${phase.class}`;
  elements.breathCircle.style.transitionDuration = `${duration / 1000}s`;
  document.documentElement.style.setProperty('--breath-duration', `${duration / 1000}s`);
  
  const lookupKey = `ex_${phase.name.toLowerCase().replace(' ', '_')}`;
  elements.breathInstruction.textContent = t(lookupKey) !== lookupKey ? t(lookupKey) : phase.name;
  
  if (phase.name.toLowerCase().includes('in')) {
    AudioEngine.playBell('start');
    SensoryEngine.setBreathingPhase('inhale');
    document.documentElement.style.setProperty('--bg-brightness', 1);
  } else if (phase.name.toLowerCase().includes('out') || phase.name.toLowerCase().includes('ex')) {
    AudioEngine.playBell('soft');
    SensoryEngine.setBreathingPhase('exhale');
    document.documentElement.style.setProperty('--bg-brightness', 0.4);
  } else {
    SensoryEngine.setBreathingPhase('hold');
  }

  exerciseTimer = setTimeout(() => {
    currentPhaseIndex = (currentPhaseIndex + 1) % exerciseParams.phases.length;
    runPhase();
  }, duration);
}

function pauseExercise() {
  if (!exerciseTimer) return;
  isTimerPaused = true;
  clearTimeout(exerciseTimer);
  
  const elapsed = Date.now() - phaseStartTime;
  remainingPhaseDuration = Math.max(0, remainingPhaseDuration - elapsed);

  // Freeze the circle animation
  const computedStyle = window.getComputedStyle(elements.breathCircle);
  const currentTransform = computedStyle.getPropertyValue('transform');
  elements.breathCircle.style.transitionDuration = '0s';
  elements.breathCircle.style.transform = currentTransform;
}

function resumeExercise() {
  isTimerPaused = false;
  // Restore transition for the remainder
  elements.breathCircle.style.transitionDuration = `${remainingPhaseDuration / 1000}s`;
  elements.breathCircle.style.transform = ''; // Let CSS classes take over again
  
  runPhase(remainingPhaseDuration);
}

elements.skipExerciseBtn.addEventListener('click', () => {
  if (breathTimerInterval) clearInterval(breathTimerInterval);
  stopExercise();
  if (AppState._standaloneExercise) {
    renderMeditationsList();
    navigateTo('view-meditations');
    return;
  }
  startMarinationFlow();
});

function stopExercise() {
  if (exerciseTimer) clearTimeout(exerciseTimer);
  elements.breathCircle.className = 'breath-circle';
}

/* --- MARINATION FLOW --- */
function startMarinationFlow() {
  navigateTo('view-savoring');
  
  // Restore parent step header (may have been hidden or changed by scan)
  const parentStepIndicator = document.getElementById('savoringStepIndicator');
  if (parentStepIndicator) {
    parentStepIndicator.textContent = t('step_4');
    parentStepIndicator.setAttribute('data-i18n', 'step_4');
    if (parentStepIndicator.parentElement) parentStepIndicator.parentElement.classList.remove('hidden');
  }
  
  // Reset phases
  if(elements.marPhase1) {
    elements.marPhase1.classList.remove('hidden', 'opacity-0');
    elements.marPhase2.classList.add('hidden');
    elements.marPhase2.classList.remove('opacity-0');
    elements.marPhaseOffer.classList.add('hidden');
    elements.marPhaseOffer.classList.remove('opacity-0');
    elements.marPhaseScan.classList.add('hidden');
    elements.marPhaseScan.classList.remove('opacity-0');
    elements.marPhase3.classList.add('hidden');
    elements.marPhase3.classList.remove('opacity-0');
    
    // Reset pill selection
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('selected'));

    // Auto-advance Phase 1 -> Phase 2 after 5 seconds
    setTimeout(() => {
       // Check if user hasn't cancelled or returned early
       if(!elements.marPhase1) return;
       // If modal is open, wait until it closes
       if (isModalOpen) {
         const checkInterval = setInterval(() => {
           if (!isModalOpen) {
             clearInterval(checkInterval);
             advanceMarination();
           }
         }, 500);
         return;
       }
       advanceMarination();
    }, 5000);
  }
}

function advanceMarination() {
  elements.marPhase1.classList.add('opacity-0');
  setTimeout(() => {
     elements.marPhase1.classList.add('hidden');
     elements.marPhase2.classList.remove('hidden');
     elements.marPhase2.classList.add('opacity-0');
     setTimeout(() => elements.marPhase2.classList.remove('opacity-0'), 50);
  }, 800);
}

// Pill Selection Logic
if (elements.marPhase2) {
  elements.marPhase2.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill-btn')) {
      e.target.classList.toggle('selected');
    }
  });
}

// 2b. Continue from Pills to Offer
if (elements.marContinueBtn) {
  elements.marContinueBtn.onclick = () => {
    const selected = Array.from(document.querySelectorAll('.pill-btn.selected')).map(b => b.getAttribute('data-i18n'));
    // Save sensations strictly by their translation key
    AppState.currentCheckIn.sensations = selected;
    
    elements.marPhase2.classList.add('opacity-0');
    setTimeout(() => {
        elements.marPhase2.classList.add('hidden');
        // Bypass marPhaseOffer and go straight to loading
        const rawProtocolId = subEmotionMap[AppState.currentCheckIn.subEmotion]?.protocol || 'p_resonance';
        startMeditationLoading(rawProtocolId);
    }, 800);
  };
}

// 2b-2. Final Savoring Phase Entry
function goToSavoring(fromPhase) {
  fromPhase.classList.add('opacity-0');
  setTimeout(() => {
      fromPhase.classList.add('hidden');
      
      // Update parent step header to Step 6
      const parentStepIndicator = document.getElementById('savoringStepIndicator');
      if (parentStepIndicator) {
        parentStepIndicator.textContent = t('step_6');
        parentStepIndicator.setAttribute('data-i18n', 'step_6');
        if (parentStepIndicator.parentElement) parentStepIndicator.parentElement.classList.remove('hidden');
      }

      elements.marPhase3.classList.remove('hidden');
      elements.marPhase2.classList.add('hidden');
      elements.marPhase3.classList.remove('hidden');
      setTimeout(() => elements.marPhase3.classList.remove('opacity-0'), 50);
  }, 800);
}

// 2c. Offer Buttons
if (elements.offerDoneBtn) {
  elements.offerDoneBtn.onclick = () => goToSavoring(elements.marPhaseOffer);
}

let isMeditationPaused = false;
let meditationIndex = 0;
let meditationPhaseStartTime = 0;
let meditationRemainingDuration = 0;
let meditationFinishTimeout = null;

if (elements.offerContinueBtn) {
  elements.offerContinueBtn.onclick = () => {
    try { AudioEngine.init(); } catch(e) { console.warn('Audio init failed', e); }
    
    elements.marPhaseOffer.classList.add('opacity-0');
    setTimeout(() => {
      elements.marPhaseOffer.classList.add('hidden');
      // Show meditation loading screen before body scan
      const rawProtocolId = subEmotionMap[AppState.currentCheckIn.subEmotion]?.protocol || 'p_resonance';
      startMeditationLoading(rawProtocolId);
    }, 800);
  };
}

// Alias to resolve ReferenceError in browser
window.startMeditation = runMeditation;
function runMeditation(customDuration = null) {
  if (meditationIndex >= 5 || isModalOpen) return;

  const rawProtocolId = subEmotionMap[AppState.currentCheckIn.subEmotion]?.protocol || 'p_resonance';
  const protocolId = rawProtocolId.replace('p_','');
  
  const textKey = `scan_${protocolId}_${meditationIndex}`;
  const textLine = t(textKey);
  
  elements.scanText.textContent = textLine === textKey ? "..." : textLine;
  elements.scanText.style.opacity = '1';

  const duration = customDuration || 15000;
  meditationPhaseStartTime = Date.now();
  meditationRemainingDuration = duration;

  if (!customDuration) {
    try { AudioEngine.playBell('start'); } catch(e) {}
  }

  // Fade out text at N-1 seconds
  const fadeOutTimeout = setTimeout(() => {
    elements.scanText.style.opacity = '0';
  }, duration - 1000);
  scanTimeouts.push(fadeOutTimeout);

  const nextTimeout = setTimeout(() => {
    meditationIndex++;
    if (meditationIndex < 5) {
      runMeditation();
    } else {
      // Final silence
      meditationFinishTimeout = setTimeout(finishGuidedScan, 10000);
      scanTimeouts.push(meditationFinishTimeout);
    }
  }, duration);
  scanTimeouts.push(nextTimeout);
}

function pauseMeditation() {
  isMeditationPaused = true;
  scanTimeouts.forEach(clearTimeout);
  scanTimeouts = [];
  
  const elapsed = Date.now() - meditationPhaseStartTime;
  meditationRemainingDuration = Math.max(0, meditationRemainingDuration - elapsed);
}

function resumeMeditation() {
  isMeditationPaused = false;
  runMeditation(meditationRemainingDuration);
}

function finishGuidedScan() {
  scanTimeouts.forEach(clearTimeout);
  scanTimeouts = [];
  goToSavoring(elements.marPhaseScan);
}

if (elements.scanExitBtn) {
  elements.scanExitBtn.onclick = finishGuidedScan;
}

// Step 4: Savoring Form Submit
elements.savoringForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = elements.savoringInput.value.trim();
  if(!text) return;

  AppState.currentCheckIn.savoringText = text;
  AppState.currentCheckIn.timestamp = Date.now();
  
  const btn = document.getElementById('finishLoopBtn');
  btn.textContent = t('btn_saving');
  btn.disabled = true;

  // UNIFIED SAVING LAYER
  // 1. Always save to Local (Backup/Guest Source)
  AppState.mockHistory.unshift({...AppState.currentCheckIn});
  saveHistoryToLocal();

  // 2. Save to Cloud if authenticated
  if (fb.isInitialized && AppState.user && !AppState.user.guest) {
    try {
      await fb.addDoc(fb.collection(fb.db, "checkins"), {
        uid: AppState.user.uid,
        ...AppState.currentCheckIn
      });
    } catch(err) {
      console.warn("Cloud save failed, local backup is safe.", err);
    }
  }

  btn.textContent = t('btn_complete');
  btn.disabled = false;
  elements.savoringInput.value = '';

  // Update user's last emotion in Firestore globally for notifications
  if (fb.isInitialized && AppState.user) {
     const userRef = fb.doc(fb.db, "users", AppState.user.uid);
     await fb.setDoc(userRef, { lastEmotion: AppState.currentCheckIn.subEmotion || 'se_neutral' }, { merge: true });
  }

  // THE RESOLUTION — trigger bio-feedback reset before completion
  resetBioFeedback();

  navigateTo('view-completion');
  setTimeout(() => checkAndShowPushModal(), 2000);
});

// --- PUSH NOTIFICATIONS ---
let messagingInstance = null;
if (fb.isInitialized && fb.getMessaging) {
  try { messagingInstance = fb.getMessaging(); } catch(e) {}
}

async function checkAndShowPushModal() {
  if (!fb.isInitialized || !AppState.user || !messagingInstance) return;
  const userRef = fb.doc(fb.db, "users", AppState.user.uid);
  const userDoc = await fb.getDoc(userRef);
  if (userDoc.exists() && userDoc.data().pushAsked) return; // Already prompted

  elements.notifModal.classList.remove('hidden');
}

elements.notifAcceptBtn.addEventListener('click', async () => {
  elements.notifModal.classList.add('hidden');
  await requestAndSaveFCMToken();
});

elements.notifDenyBtn.addEventListener('click', async () => {
  elements.notifModal.classList.add('hidden');
  if (fb.isInitialized && AppState.user) {
    const userRef = fb.doc(fb.db, "users", AppState.user.uid);
    await fb.setDoc(userRef, { pushAsked: true, notificationsEnabled: false }, { merge: true });
  }
});

async function requestAndSaveFCMToken() {
  if (!messagingInstance) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
       const token = await fb.getToken(messagingInstance, {
          vapidKey: "BAu9kCnceud-AOidcVBEcxxB38w2Ez2PXQFtYZhmiJCtIDo4zsrcwJAdEI6twlu6IfB7PcH7rPmr4nP22_myIec"
       });
       if (token) {
          const userRef = fb.doc(fb.db, "users", AppState.user.uid);
          const currentUTCHour = new Date().getUTCHours();
          await fb.setDoc(userRef, {
             pushAsked: true,
             notificationsEnabled: true,
             fcmToken: token,
             nudgeHourUTC: currentUTCHour,
             language: AppState.lang,
             lastEmotion: AppState.currentCheckIn.subEmotion || 'se_neutral'
          }, { merge: true });
          elements.notifToggleCheckbox.checked = true;
       }
    }
  } catch(e) {
    console.warn("FCM Token fetch failed:", e);
  }
}

elements.notifToggleCheckbox.addEventListener('change', async (e) => {
  const isEnabled = e.target.checked;
  if (!fb.isInitialized || !AppState.user) return;
  
  if (isEnabled) {
     if (Notification.permission === 'granted') {
       await requestAndSaveFCMToken();
     } else {
       await requestAndSaveFCMToken(); // re-requests if default
     }
  } else {
     const userRef = fb.doc(fb.db, "users", AppState.user.uid);
     await fb.setDoc(userRef, { notificationsEnabled: false }, { merge: true });
  }
});

// Completion return Home
elements.returnHomeBtn.addEventListener('click', () => loadDashboard());

/* --- AUTH LOGIC --- */
let isLoginMode = true;

elements.tabLogin.addEventListener('click', () => {
  isLoginMode = true;
  elements.tabLogin.classList.add('active');
  elements.tabRegister.classList.remove('active');
  elements.tabsPill.style.transform = 'translateX(0)';
  elements.authSubmitBtn.textContent = t('btn_login');
  document.getElementById('nameInputGroup')?.classList.add('hidden');
});

elements.tabRegister.addEventListener('click', () => {
  isLoginMode = false;
  elements.tabRegister.classList.add('active');
  elements.tabLogin.classList.remove('active');
  elements.tabsPill.style.transform = 'translateX(100%)';
  elements.authSubmitBtn.textContent = t('btn_register');
  document.getElementById('nameInputGroup')?.classList.remove('hidden');
});

elements.skipAuthBtn?.addEventListener('click', () => {
  AppState.user = { uid: 'guest_' + Date.now(), guest: true };
  loadDashboard();
});

elements.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('nameInput')?.value || '';
  
  if(!fb.isInitialized) {
    AppState.user = { uid: 'local_123', email: elements.emailInput.value, displayName: name };
    if (name) localStorage.setItem('aura_guest_name', name);
    loadDashboard();
    return;
  }

  const email = elements.emailInput.value;
  const pw = elements.passwordInput.value;
  elements.authError.classList.add('hidden');
  elements.authSubmitBtn.disabled = true;
  
  try {
    if (isLoginMode) {
      await fb.signInWithEmailAndPassword(fb.auth, email, pw);
    } else {
      const cred = await fb.createUserWithEmailAndPassword(fb.auth, email, pw);
      if (name && fb.updateProfile) {
        await fb.updateProfile(cred.user, { displayName: name });
        AppState.user.displayName = name;
      }
    }
  } catch(err) {
    elements.authError.textContent = err.message;
    elements.authError.classList.remove('hidden');
  }

  elements.authSubmitBtn.disabled = false;
});

elements.logoutBtn.addEventListener('click', () => {
  if (fb.isInitialized && fb.auth && fb.auth.currentUser) {
    fb.signOut(fb.auth).catch(err => console.error("Sign out error:", err));
  }
  
  // Force local clear and redirect immediately for better UX
  AppState.user = null;
  localStorage.removeItem('aura_user'); // If saved
  startAppFlow(null);
});

/* --- BOOTSTRAP --- */
initAppBootstrap();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW registration failed:', err));
}
window.addEventListener('popstate', (e) => {
  if (typeof meditationLoadingTimeout !== 'undefined' && meditationLoadingTimeout) clearTimeout(meditationLoadingTimeout);
  if (typeof meditationCountdownInterval !== 'undefined' && meditationCountdownInterval) clearInterval(meditationCountdownInterval);
  if (typeof exerciseTimer !== 'undefined' && exerciseTimer) clearTimeout(exerciseTimer);
  if (typeof breathTimerInterval !== 'undefined' && breathTimerInterval) clearInterval(breathTimerInterval);
  
  if (e.state && e.state.view) {
    navigateTo(e.state.view, true);
  } else {
    if (AppState.user) {
      if (window.location.hash) {
        navigateTo('view-' + window.location.hash.replace('#', ''), true);
      } else {
        navigateTo('view-dashboard', true);
      }
    } else {
      navigateTo('view-welcome', true);
    }
  }
});
