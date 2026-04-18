// Dynamic import for Firebase — races against a 3s timeout to prevent CDN hang
import { locales } from './translations.js?v=202';
import { getWeeklyInsight } from './weeklyInsight.js?v=202';
import { startMeditation, stopMeditation, MEDITATION_PROTOCOLS } from './meditation.js?v=202';
import { initWelcomeScreen } from './welcomeScreen.js?v=202';
import { signInAsGuest, isGuestUser, upgradeGuestWithGoogle } from './authService.js?v=202';
import { renderGuestBanner } from './settings.js?v=202';
import {
  calculateVagalState,
  getWeightsFromState,
  calculateVagalPoint,
  calculatePlasticity,
  getPoeticTimeLabel
} from './vagal-logic.js?v=202';
import { SensoryEngine } from './audio-engine.js?v=202';

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
  lang: safeGetItem('aura_lang') || 'tr',
  isMuted: safeGetItem('aura_muted') === 'true',
  hapticEnabled: safeGetItem('aura_haptic') !== 'false', // Default true
  droneEnabled: safeGetItem('aura_drone') !== 'false', // Default true
  appVolume: parseInt(safeGetItem('aura_volume')) || 50, // Default 50
  currentCheckIn: {
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

/* --- SOMATIC & POLYVAGAL CONSTANTS --- */
const SOMATIC_MAP = {
    // Ventral
    "bs_ventral_shoulders": { a: 0.3, v: 0.8, state: 'ventral' },
    "bs_ventral_belly": { a: 0.4, v: 0.8, state: 'ventral' },
    "bs_ventral_settling": { a: 0.3, v: 0.7, state: 'ventral' },
    "bs_ventral_belong": { a: 0.4, v: 0.9, state: 'ventral' },
    "bs_ventral_jaw": { a: 0.3, v: 0.8, state: 'ventral' },
    // Sympathetic
    "bs_symp_jaw": { a: 0.8, v: 0.4, state: 'sympathetic' },
    "bs_symp_shoulders": { a: 0.8, v: 0.3, state: 'sympathetic' },
    "bs_symp_chest": { a: 0.7, v: 0.3, state: 'sympathetic' },
    "bs_symp_hands": { a: 0.7, v: 0.4, state: 'sympathetic' },
    "bs_symp_legs": { a: 0.9, v: 0.4, state: 'sympathetic' },
    "bs_symp_heart": { a: 0.9, v: 0.3, state: 'sympathetic' },
    "bs_symp_spring": { a: 0.8, v: 0.4, state: 'sympathetic' },
    // Dorsal
    "bs_dorsal_distant": { a: 0.2, v: 0.2, state: 'dorsal' },
    "bs_dorsal_heavy": { a: 0.2, v: 0.3, state: 'dorsal' },
    "bs_dorsal_numb": { a: 0.1, v: 0.2, state: 'dorsal' },
    "bs_dorsal_eyes": { a: 0.3, v: 0.3, state: 'dorsal' },
    "bs_dorsal_vulnerable": { a: 0.3, v: 0.2, state: 'dorsal' },
    "bs_dorsal_voice": { a: 0.2, v: 0.4, state: 'dorsal' },
    // Neutral
    "bs_neutral_deep": { a: 0.4, v: 0.7, state: 'ventral' },
    "bs_neutral_weight": { a: 0.3, v: 0.4, state: 'dorsal' },
    "bs_neutral_cold": { a: 0.6, v: 0.4, state: 'sympathetic' },
    "bs_neutral_face": { a: 0.7, v: 0.4, state: 'sympathetic' },
    // Digestion
    "bs_digest_throat": { a: 0.7, v: 0.3, state: 'sympathetic' },
    "bs_digest_appetite": { a: 0.2, v: 0.3, state: 'dorsal' },
    "bs_digest_stomach": { a: 0.6, v: 0.3, state: 'sympathetic' },
    "bs_digest_head": { a: 0.7, v: 0.4, state: 'sympathetic' }
};

const EMOTION_OPTIONS = {
    ventral: ["emo_grateful", "emo_curious", "emo_peaceful", "emo_joyful", "emo_compassionate", "emo_connected"],
    sympathetic: ["emo_anxious", "emo_angry", "emo_overwhelmed", "emo_excited", "emo_tense", "emo_impatient"],
    dorsal: ["emo_numb", "emo_tired", "emo_sad", "emo_empty", "emo_hopeless", "emo_dull"]
};

const stateLegacyMap = { ventral: "Okay", sympathetic: "Wired", dorsal: "Foggy" };

function normalizeCheckinData(data) {
    if (!data) return data;
    if (data.pre_arousal === undefined) {
        const legacyMap = {
            "Wired": { a: 0.8, v: 0.2, state: "sympathetic" },
            "Foggy": { a: 0.2, v: 0.2, state: "dorsal" },
            "Okay":  { a: 0.5, v: 0.8, state: "ventral" }
        };
        const mapped = legacyMap[data.state] || legacyMap["Okay"];
        return {
            ...data,
            pre_arousal: mapped.a,
            pre_valence: mapped.v,
            polyvagal_state: mapped.state,
            is_legacy: true
        };
    }
    return data;
}

function calculatePolyvagalState(a, v) {
    if (v >= 0.5) return "ventral";
    return a >= 0.5 ? "sympathetic" : "dorsal";
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

  // Somatic & Grid
  viewSomaticEntry: document.getElementById('view-somatic-entry'),
  somaticContainer: document.getElementById('somaticContainer'),
  somaticNextBtn: document.getElementById('somaticNextBtn'),
  viewAffectGrid: document.getElementById('view-affect-grid'),
  gridTouchArea: document.getElementById('grid-touch-area'),
  suggestionDot: document.getElementById('suggestion-dot'),
  userDot: document.getElementById('user-dot'),
  gridNextBtn: document.getElementById('gridNextBtn'),
  viewEmotionRefinement: document.getElementById('view-emotion-refinement'),
  emotionRefinementContainer: document.getElementById('emotionRefinementContainer'),
  emotionNextBtn: document.getElementById('emotionNextBtn'),

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
  resilienceScore: document.getElementById('resilienceScore'),
  resilienceStatus: document.getElementById('resilienceStatus'),
  resilienceFill: document.getElementById('resilienceFill'),
  vagalModalTitle: document.getElementById('vagalModalTitle'),
  vagalModalAnalysis: document.getElementById('vagalModalAnalysis'),
  vagalModalRec: document.getElementById('vagalModalRec'),
  vagalModalHeatmap: document.getElementById('vagalModalHeatmap'),
  closeVagalModal: document.getElementById('closeVagalModal'),

  // Step 1: Picker

  // Step 1: Picker
  stateCards: document.querySelectorAll('.state-card'),

  // Step 2 is now Somatic & Grid (handled above)

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
  marSensationContainer: document.getElementById('marSensationContainer'),
  marinationHUD: document.getElementById('marinationHUD'),
  savoringForm: document.getElementById('savoringForm'),
  savoringInput: document.getElementById('savoringInput'),
  savoringInfoBtn: document.getElementById('savoringInfoBtn'),

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
  globalHUD: document.getElementById('globalHUD'),
  globalHUDBtn: document.getElementById('globalHUDBtn'),

  // Notifications
    notifToggleCheckbox: document.getElementById('notifToggleCheckbox'),
    notifModal: document.getElementById('notifModal'),
    notifAcceptBtn: document.getElementById('notifAcceptBtn'),
    notifDenyBtn: document.getElementById('notifDenyBtn'),

    // Cockpit / Profile
    auraCoreSphere: document.getElementById('aura-core-sphere'),
    userDisplayName: document.getElementById('user-display-name'),
    uniqueDaysStats: document.getElementById('unique-days-stats'),
    guestCtaBox: document.getElementById('guest-cta-box'),
    guestCtaRegisterBtn: document.getElementById('guest-cta-register-btn'),
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

  // Navigation
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
  filterChips: document.getElementById('filterChips'),
  recommendationsContainer: document.getElementById('recommendationsContainer'),

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
  
  // Re-render filter chips for meditations view
  renderFilterChips();
  renderRecommendations();

  // Re-load dashboard to re-translate the dynamic patterns if it is active
  if(!document.getElementById('view-dashboard').classList.contains('hidden') && AppState.user) {
    loadDashboard();
  }
  // Re-render exercise labels if active
  if(!document.getElementById('view-exercise').classList.contains('hidden')) {
    const mins = Math.floor(timeRemaining / 60);
    const secs = (timeRemaining % 60).toString().padStart(2, '0');
    // Circle instruction update is the new standard
    if (elements.breathInstruction) {
        elements.breathInstruction.innerHTML = `${t("ex_ready")}<br><span style="font-size: 1.1rem; opacity: 0.9; font-weight: 300; text-transform: none; letter-spacing: 0; display: block; margin-top: 0.3rem;">${mins}:${secs}</span>`;
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
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Hold", class: "breathe-hold", duration: 7000 },
      { name: "Exhale", class: "breathe-exhale", duration: 8000 }
    ],
    totalDuration: 114
  },
  p_sigh: {
    title: "Deep Sigh (Cooling)",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-empty", duration: 8000 }
    ],
    totalDuration: 120
  },
  p_bellows: {
    title: "Energizing Bellows",
    category: "energize",
    phases: [
      { name: "In", class: "breathe-inhale", duration: 2000 },
      { name: "Out", class: "breathe-exhale", duration: 2000 }
    ],
    totalDuration: 90
  },
  p_resonance: {
    title: "Resonance Frequency",
    category: "focus",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 5500 },
      { name: "Exhale", class: "breathe-exhale", duration: 5500 }
    ],
    totalDuration: 110
  },
  p_grounding: {
    title: "Grounding Breath",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 6000 }
    ],
    totalDuration: 120
  },
  p_phys_sigh: {
    title: "Physiological Sigh",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 2000 },
      { name: "Inhale Top-Up", class: "breathe-inhale-top-up", duration: 1000 },
      { name: "Exhale", class: "breathe-exhale", duration: 6000 }
    ],
    totalDuration: 60
  },
  p_coherent: {
    title: "Coherent Breathing",
    category: "focus",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 5500 },
      { name: "Exhale", class: "breathe-exhale", duration: 5500 }
    ],
    totalDuration: 300
  },
  p_ext_exhale: {
    title: "Extended Exhale (4-8)",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 8000 }
    ],
    totalDuration: 120
  },
  p_cyclic_sigh: {
    title: "Cyclic Sighing",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 3000 },
      { name: "Inhale Top-Up", class: "breathe-inhale-top-up", duration: 1000 },
      { name: "Exhale", class: "breathe-exhale", duration: 8000 }
    ],
    totalDuration: 300
  },
  p_fire: {
    title: "Breath of Fire",
    category: "energize",
    phases: [
      { name: "In", class: "breathe-inhale", duration: 250 },
      { name: "Out", class: "breathe-exhale", duration: 250 }
    ],
    totalDuration: 120
  },
  p_nadi: {
    title: "Nadi Shodhana",
    category: "focus",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 4000 }
    ],
    totalDuration: 240
  },
  p_box: {
    title: "Box Breathing",
    category: "focus",
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
    
    // Explicitly update individual vertex colors for CSS gradients if they are used as variables
    document.documentElement.style.setProperty('--vagal-ventral-rgb', '16, 185, 129');
    document.documentElement.style.setProperty('--vagal-symp-rgb', '245, 158, 11');
    document.documentElement.style.setProperty('--vagal-dorsal-rgb', '59, 130, 246');
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
let currentMeditationId = null;

// Settings
// (Settings btn removed)

/* --- SCIENTIFIC INFO MODAL LOGIC --- */
let isModalOpen = false;

function getAuraSVGIcon(type) {
  // Ultra-thin schematic symbols for the Neural Archives
  const iconMap = {
    // Dashboard Cards
    'heatmap': `<rect x="18" y="18" width="8" height="8" rx="1" fill="white" opacity="0.6"/><rect x="28" y="18" width="8" height="8" rx="1" fill="white" opacity="0.3"/><rect x="38" y="18" width="8" height="8" rx="1" fill="white" opacity="0.8"/><rect x="18" y="28" width="8" height="8" rx="1" fill="white" opacity="0.2"/><rect x="28" y="28" width="8" height="8" rx="1" fill="white" opacity="0.9"/><rect x="38" y="28" width="8" height="8" rx="1" fill="white" opacity="0.4"/><rect x="18" y="38" width="8" height="8" rx="1" fill="white" opacity="0.5"/><rect x="28" y="38" width="8" height="8" rx="1" fill="white" opacity="0.1"/><rect x="38" y="38" width="8" height="8" rx="1" fill="white" opacity="0.7"/>`,
    'resilience': `<path d="M12 32 C 18 12, 26 52, 32 32 C 38 12, 46 52, 52 32" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/><path d="M12 32 L 52 32" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'insight': `<circle cx="32" cy="32" r="12" stroke="white" stroke-width="1.5"/><circle cx="32" cy="32" r="22" stroke="white" stroke-width="0.5" stroke-dasharray="2 4"/><path d="M32 20V12M32 52V44M44 32H52M12 32H20" stroke="white" stroke-width="1" opacity="0.6"/>`,
    'exercise': `<path d="M22 32L28 32L32 20L36 44L40 32L46 32" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="32" cy="32" r="25" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    
    // Core Journey Steps
    'step1': `<circle cx="32" cy="32" r="6" fill="white" opacity="0.9"><animate attributeName="r" values="6;10;6" dur="3s" repeatCount="indefinite"/></circle><path d="M32 10V54M10 32H54" stroke="white" stroke-width="0.5" opacity="0.3"/>`,
    'step2': `<path d="M32 12V52M12 32H52" stroke="white" stroke-width="1" opacity="0.4"/><rect x="22" y="22" width="20" height="20" stroke="white" stroke-width="1.5"/><circle cx="37" cy="27" r="3" fill="white"/>`,
    'step2b': `<path d="M20 20H44V36H28L20 44V20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="28" r="1" fill="white"/><circle cx="28" cy="28" r="1" fill="white"/><circle cx="36" cy="28" r="1" fill="white"/>`,
    'step3': `<path d="M18 48C18 48 12 40 12 30C12 20 20 12 32 12C44 12 52 20 52 30C52 40 46 48 46 48" stroke="white" stroke-width="1.5" fill="none"/><path d="M32 28V44" stroke="white" stroke-width="1" opacity="0.5"/>`,
    'step4': `<circle cx="32" cy="32" r="4" fill="white"/><circle cx="32" cy="32" r="12" stroke="white" stroke-width="1" opacity="0.4"/><circle cx="32" cy="32" r="24" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'step5': `<path d="M20 44L32 20L44 44H20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="34" r="2" fill="white"/>`,
    'step6': `<path d="M32 48C32 48 12 36 12 24C12 16 18 12 24 12C28 12 32 15 32 15C32 15 36 12 40 12C46 12 52 16 52 24C52 36 32 48 32 48Z" stroke="white" stroke-width="1.5" fill="none"/><path d="M22 24H42" stroke="white" stroke-width="0.5" opacity="0.4"/>`,

<<<<<<< HEAD
    'breathing': `<circle cx="32" cy="32" r="14" stroke="white" stroke-width="1.5" fill="none"><animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite"/></circle><circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.2)" stroke-width="1" fill="none"/>`
  };
  
  const innerContent = iconMap[type] || `<circle cx="32" cy="32" r="10" fill="white" opacity="0.8"/><circle cx="32" cy="32" r="22" stroke="rgba(255,255,255,0.2)" fill="none"/>`;
  
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
=======
  // Contextual modal population
  if (type === 'breathing' && exerciseParams && exerciseParams.id) {
    const pId = exerciseParams.id;
    elements.infoIcon.textContent = '🧬';
    elements.infoTitle.textContent = t(`sci_${pId}_title`);
    elements.infoBody.innerHTML = t(`sci_${pId}_desc`);
    elements.infoRef.textContent = t(`sci_${pId}_ref`);
  } else {
    elements.infoIcon.textContent = getInfoIcon(type);
    elements.infoTitle.textContent = getInfoTitle(type);
    elements.infoBody.innerHTML = t(`info_${type}_body`);
    elements.infoRef.textContent = t(`info_${type}_ref`);
  }

  elements.infoBackdrop.classList.add('active');
  elements.infoModal.classList.add('active');

  // Pause timers if active
  if (breathTimerInterval && !isTimerPaused && !elements.startExerciseBtn.disabled) {
    pauseExercise();
  }
  if (scanTimeouts.length > 0 && !isMeditationPaused) {
    pauseMeditation();
  }
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
}

function openInfoArchive(key) {
  if (!elements.vagalModal) return;

  const type = key.replace('info_', '').replace('_desc', '').replace('_title', '').replace('_body', '');
  
  // Content extraction
  const title = t(`info_${type}_title`);
  const body = t(`info_${type}_body`);
  const ref = t(`info_${type}_ref`);

  // Hide other modal children
  if (elements.vagalModalTitle) elements.vagalModalTitle.style.display = 'none';
  if (elements.vagalModalHeatmap) elements.vagalModalHeatmap.style.display = 'none';
  if (elements.vagalModalRec) elements.vagalModalRec.style.display = 'none';

  if (elements.vagalModalAnalysis) {
    elements.vagalModalAnalysis.innerHTML = `
      <div class="info-sheet-content">
        <div class="info-sheet-icon">${getAuraSVGIcon(type)}</div>
        <h2 class="info-sheet-title">${title}</h2>
        <div class="info-sheet-body">${body}</div>
        <div class="info-sheet-ref">Source: ${ref}</div>
      </div>
    `;
  }

  elements.vagalModal.classList.add('open');
  
  // Pause exercises if active
  if (typeof isTimerPaused !== 'undefined' && !isTimerPaused && typeof pauseExercise === 'function') pauseExercise();
  if (typeof isMeditationPaused !== 'undefined' && !isMeditationPaused && typeof pauseMeditation === 'function') pauseMeditation();
}

function showInfoModal(type) {
  openInfoArchive(`info_${type}`);
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

  // Lazy Hiding: Only hide the current active view
  if (currentView) {
    currentView.classList.add('hidden');
    currentView.classList.remove('active', 'opacity-100', 'translate-y-0');
  } else {
    // Fallback for safety if somehow multiple active
    elements.views.forEach(v => {
      v.classList.add('hidden');
      v.classList.remove('active', 'opacity-100', 'translate-y-0');
    });
  }

  // Show target
  target.classList.remove('hidden');
  target.scrollTop = 0;

  // Immersive Check-in Logic
  const checkinViews = [
    'view-somatic-entry', 'view-affect-grid', 'view-emotion-refinement', 
    'view-exercise', 'view-savoring', 'view-meditation-loading', 'view-completion'
  ];
  if (checkinViews.includes(viewId)) {
    document.body.classList.add('in-checkin');
  } else {
    document.body.classList.remove('in-checkin');
  }

  // Replaced void target.offsetHeight with a passive animation frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.classList.add('active', 'opacity-100', 'translate-y-0');
    });
  });

  // Toggle navbar visibility based on view
  const ritualViews = ['view-welcome', 'view-auth', 'view-onboarding'];
  const isRitual = ritualViews.includes(viewId);
  const isCheckin = viewId.includes('picker') || viewId.includes('breathing') || viewId.includes('savoring') || viewId.includes('somatic') || viewId.includes('grid') || viewId.includes('emotion');
  
  // Show nav only if we have a user AND we aren't in a ritual screen
  const showNav = AppState.user && !isRitual && !isCheckin;
  document.body.classList.toggle('is-authenticated', !!showNav);

  // IMMERSION MODE: Hide global navs during check-in
  const immersionViews = ['view-welcome', 'view-somatic-entry', 'view-affect-grid', 'view-emotion-refinement', 'view-exercise', 'view-savoring', 'view-meditation-loading', 'view-completion'];
  const isImmersion = immersionViews.includes(viewId);
  
  if (elements.header) {
      elements.header.classList.toggle('hidden', isImmersion);
      elements.header.style.display = isImmersion ? 'none' : 'flex';
  }
  if (elements.desktopNav) elements.desktopNav.classList.toggle('nav-hidden', isImmersion);
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) mobileNav.classList.toggle('nav-hidden', isImmersion);

  // RESET HUD: Always hide global HUD on view change unless explicitly shown by the next logic
  if (elements.globalHUD) elements.globalHUD.classList.remove('active');

  updateActiveNavLink(viewId);

  try {
    if (viewId === 'view-dashboard') loadDashboard();
    if (viewId === 'view-meditations') {
      renderMeditationsList();
      renderFilterChips();
      renderRecommendations();
    }
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
        if (elements.guestCtaBox) {
          if (isGuestUser(AppState.user)) {
            elements.guestCtaBox.classList.remove('hidden');
          } else {
            elements.guestCtaBox.classList.add('hidden');
          }
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

function renderRecommendations() {
  if (!elements.recommendationsContainer) return;

  // Pattern: Priority to Firebase/User history, fallback to mock if empty
  const historyItems = (AppState.user && AppState.user.history && AppState.user.history.length > 0) 
    ? AppState.user.history 
    : (AppState.mockHistory || []);
    
  const lastEntry = historyItems.length > 0 ? historyItems[0] : null;

  if (!lastEntry || !lastEntry.state) {
    elements.recommendationsContainer.classList.add('hidden');
    return;
  }

  // State-to-protocol mapping
  const recMap = {
    wired: ['p_coherent', 'p_box'],
    okay: ['p_cyclic_sigh', 'p_nadi'],
    foggy: ['p_fire', 'p_bellows'] // Default for foggy
  };

  // Nuance: Distinguish between High Stress and Low Energy within foggy state
  let recIds = recMap[lastEntry.state] || [];
  if (lastEntry.state === 'foggy') {
    const isHighStressSub = ['se_overwhelmed', 'se_anxious', 'se_other'].includes(lastEntry.subEmotion);
    if (isHighStressSub) {
      recIds = ['p_phys_sigh', 'p_478'];
    }
  } else if (lastEntry.state === 'wired') {
     // Check if it's very high activation/anger
     const isExtremeWired = ['se_angry', 'se_restless'].includes(lastEntry.subEmotion);
     if (isExtremeWired) {
       recIds = ['p_coherent', 'p_box']; // Already defaults, but consistent
     }
  }

  if (recIds.length === 0) {
    elements.recommendationsContainer.classList.add('hidden');
    return;
  }

  elements.recommendationsContainer.classList.remove('hidden');
  
  const label = AppState.lang === 'tr' ? 'SİZİN İÇİN ÖNERİLER' : 'RECOMMENDED FOR YOU';
  const badgeText = AppState.lang === 'tr' ? '★ Önerilen' : '★ Recommended';

  // We reuse the protocolMeta defined inside renderMeditationsList or define it here
  // For consistency and scoping, let's redefine locally the ones we need or use a global one
  const protocolMeta = {
    p_478: { icon: '🌙', accent: 'rgba(133, 141, 255, 0.4)', benefit: AppState.lang === 'tr' ? 'Vagal tonu aktive eder' : 'Activates vagal tone' },
    p_phys_sigh: { icon: '😮‍💨', accent: 'rgba(168, 230, 207, 0.4)', benefit: AppState.lang === 'tr' ? 'Anında stres tahliyesi' : 'Instant stress offloading' },
    p_coherent: { icon: '🌊', accent: 'rgba(200, 140, 255, 0.4)', benefit: AppState.lang === 'tr' ? 'Biyolojik rezonans' : 'Biological resonance' },
    p_box: { icon: '📦', accent: 'rgba(133, 141, 255, 0.4)', benefit: AppState.lang === 'tr' ? 'Sinir sistemi dengeleme' : 'Nervous system regulation' },
    p_fire: { icon: '⚡️', accent: 'rgba(255, 160, 100, 0.4)', benefit: AppState.lang === 'tr' ? 'Zihinsel netlik ve ateş' : 'Mental clarity & fire' },
    p_bellows: { icon: '🔥', accent: 'rgba(255, 160, 100, 0.4)', benefit: AppState.lang === 'tr' ? 'Enerji ve odak yükseltir' : 'Boosts energy & focus' },
    p_cyclic_sigh: { icon: '🌀', accent: 'rgba(168, 230, 207, 0.4)', benefit: AppState.lang === 'tr' ? 'Ruh hali iyileştirme' : 'Potent mood enhancement' },
    p_nadi: { icon: '☯️', accent: 'rgba(200, 140, 255, 0.4)', benefit: AppState.lang === 'tr' ? 'Beyin küre dengesi' : 'Hemispheric balance' }
  };

  elements.recommendationsContainer.innerHTML = `
    <span class="rec-label">${label}</span>
    <div class="rec-scroll-row">
      ${recIds.map(id => {
        const p = protocols[id];
        const meta = protocolMeta[id];
        const mins = Math.ceil(p.totalDuration / 60);
        return `
          <button class="meditation-card" data-protocol="${id}" style="border-left: 3px solid ${meta.accent};">
            <span class="rec-card-badge">${badgeText}</span>
            <div class="meditation-card-icon">${meta.icon}</div>
            <div class="meditation-card-info">
              <span class="meditation-card-title">${p.title}</span>
              <span class="meditation-card-meta">${mins} ${t('meditations_duration')} · ${meta.benefit}</span>
            </div>
          </button>
        `;
      }).join('')}
    </div>
  `;

  // Attach listeners to recommendation cards
  elements.recommendationsContainer.querySelectorAll('.meditation-card').forEach(card => {
    card.addEventListener('click', () => prepareExerciseStandalone(card.getAttribute('data-protocol')));
  });
}

function renderFilterChips() {
  if (!elements.filterChips) return;

  const categories = [
    { id: 'all', label: AppState.lang === 'tr' ? 'Hepsi' : 'All' },
    { id: 'calm', label: AppState.lang === 'tr' ? 'Sakinleş' : 'Calm' },
    { id: 'focus', label: AppState.lang === 'tr' ? 'Odaklan' : 'Focus' },
    { id: 'energize', label: AppState.lang === 'tr' ? 'Canlan' : 'Energize' }
  ];

  AppState._activeFilter = AppState._activeFilter || 'all';

  elements.filterChips.innerHTML = categories.map(cat => `
    <button class="filter-chip ${AppState._activeFilter === cat.id ? 'active' : ''}" 
            data-category="${cat.id}">
      ${cat.label}
    </button>
  `).join('');

  elements.filterChips.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.getAttribute('data-category');
      AppState._activeFilter = filter;
      
      // Update chip UI
      elements.filterChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      // Filter list
      filterMeditations(filter);
    });
  });
}

function filterMeditations(filter) {
  if (!elements.meditationsList) return;
  
<<<<<<< HEAD
  // Merge both protocol sets to ensure filter looks everywhere
  const allProtocols = { ...protocols, ...(MEDITATION_PROTOCOLS || {}) };
  const cards = elements.meditationsList.querySelectorAll('.meditation-card');
  
  cards.forEach(card => {
    const protocolId = card.getAttribute('data-protocol');
    const protocol = allProtocols[protocolId];
    
    if (!protocol) return; // Safety check

=======
  const cards = elements.meditationsList.querySelectorAll('.meditation-card');
  cards.forEach(card => {
    const protocolId = card.getAttribute('data-protocol');
    const protocol = protocols[protocolId];
    
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
    if (filter === 'all' || protocol.category === filter) {
      card.classList.remove('hidden-protocol');
    } else {
      card.classList.add('hidden-protocol');
    }
  });

  // SMART REORDERING: Move hidden cards to the end to eliminate grid gaps
  const container = elements.meditationsList;
  const cardArray = Array.from(cards);
  
  cardArray.sort((a, b) => {
    const aHidden = a.classList.contains('hidden-protocol');
    const bHidden = b.classList.contains('hidden-protocol');
    if (aHidden && !bHidden) return 1;
    if (!aHidden && bHidden) return -1;
    return 0;
  });

  cardArray.forEach(card => container.appendChild(card));
}

/* --- MEDITATIONS LIST RENDERER --- */
function renderMeditationsList() {
  if (!elements.meditationsList) return;

  // Consistent data source logic
  const historyItems = (AppState.user && AppState.user.history && AppState.user.history.length > 0) 
    ? AppState.user.history 
    : (AppState.mockHistory || []);
  
  const lastEntry = historyItems.length > 0 ? historyItems[0] : null;

  // Show loader if nothing rendered yet
  if (elements.meditationsList.children.length === 0) {
     elements.meditationsList.innerHTML = '<div class="loader-circle"></div>';
  }

  const protocolMeta = {
    p_478: { 
      icon: '🌙', 
      accent: 'rgba(133, 141, 255, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Vagal tonu aktive eder' : 'Activates vagal tone'
    },
    p_sigh: { 
      icon: '💨', 
      accent: 'rgba(168, 230, 207, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Hızlı sakinleşme refleksi' : 'Rapid calming reflex'
    },
    p_bellows: { 
      icon: '🔥', 
      accent: 'rgba(255, 160, 100, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Enerji ve odak yükseltir' : 'Boosts energy & focus'
    },
    p_resonance: { 
      icon: '🫀', 
      accent: 'rgba(200, 140, 255, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Kalp-beyin senkronizasyonu' : 'Heart-brain coherence'
    },
    p_grounding: { 
      icon: '🌿', 
      accent: 'rgba(133, 141, 255, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Bedeni şimdiye taşır' : 'Grounds you in the present'
    },
    p_box: { 
      icon: '📦', 
      accent: 'rgba(133, 141, 255, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Sinir sistemi dengeleme' : 'Nervous system regulation'
    },
    p_phys_sigh: { 
      icon: '😮‍💨', 
      accent: 'rgba(168, 230, 207, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Anında stres tahliyesi' : 'Instant stress offloading'
    },
    p_coherent: { 
      icon: '🌊', 
      accent: 'rgba(200, 140, 255, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Biyolojik rezonans' : 'Biological resonance'
    },
    p_ext_exhale: { 
      icon: '🌬️', 
      accent: 'rgba(133, 141, 255, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Derin parasempatik fren' : 'Deep parasympathetic brake'
    },
    p_cyclic_sigh: { 
      icon: '🌀', 
      accent: 'rgba(168, 230, 207, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Ruh hali iyileştirme' : 'Potent mood enhancement'
    },
    p_fire: { 
      icon: '⚡️', 
      accent: 'rgba(255, 160, 100, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Zihinsel netlik ve ateş' : 'Mental clarity & fire'
    },
    p_nadi: { 
      icon: '☯️', 
      accent: 'rgba(200, 140, 255, 0.4)', 
      benefit: AppState.lang === 'tr' ? 'Beyin küre dengesi' : 'Hemispheric balance'
<<<<<<< HEAD
    },
    // Immersive Journeys Meta
    m_nsdr: {
      icon: '🧘',
      accent: 'rgba(133, 141, 255, 0.6)',
      benefit: AppState.lang === 'tr' ? 'Derin Dinlenme (Non-Sleep Deep Rest)' : 'Non-Sleep Deep Rest'
    },
    m_vagal_tone: {
      icon: '🫀',
      accent: 'rgba(168, 230, 207, 0.6)',
      benefit: AppState.lang === 'tr' ? 'Vagal Tonu Dengeleme' : 'Vagal Tone Balance'
    },
    m_presence: {
      icon: '✨',
      accent: 'rgba(255, 160, 100, 0.6)',
      benefit: AppState.lang === 'tr' ? 'Farkındalık ve Genişleme' : 'Deep Mindful Expansion'
    }
  };

  const headerDesc = document.querySelector('#view-meditations .view-header p');
  const breatheProtocols = protocols || {};
  const journeyProtocols = MEDITATION_PROTOCOLS || {};
  
  if (headerDesc && lastEntry && lastEntry.state) {
    const statePrompts = {
      wired: AppState.lang === 'tr' ? '⚡ Son durumun gergin — sakinleştirici protokoller önerilir' : '⚡ You were wired — calming protocols recommended',
      foggy: AppState.lang === 'tr' ? '☁️ Son durumun durgun — enerji veren nefes dene' : '☁️ You felt foggy — try an energizing breath',
      okay: AppState.lang === 'tr' ? '🌱 Dengeli görünüyorsun — derinleştirmek için seç' : '🌱 You seem balanced — choose to deepen'
    };
    headerDesc.textContent = statePrompts[lastEntry.state] || (AppState.lang === 'tr' ? 'Durumuna göre bir protokol seç' : 'Select a protocol for your current state.');
  }
=======
    }
  };

  // Dynamic header prompt based on last check-in state
  const headerDesc = document.querySelector('#view-meditations .view-header p');
  if (headerDesc) {
    if (lastEntry && lastEntry.state) {
      const statePrompts = {
        wired: AppState.lang === 'tr' 
          ? '⚡ Son durumun gergin — sakinleştirici protokoller önerilir' 
          : '⚡ You were wired — calming protocols recommended',
        foggy: AppState.lang === 'tr' 
          ? '☁️ Son durumun durgun — enerji veren nefes dene' 
          : '☁️ You felt foggy — try an energizing breath',
        okay: AppState.lang === 'tr' 
          ? '🌱 Dengeli görünüyorsun — derinleştirmek için seç' 
          : '🌱 You seem balanced — choose to deepen'
      };
      headerDesc.textContent = statePrompts[lastEntry.state] || (AppState.lang === 'tr' ? 'Durumuna göre bir protokol seç' : 'Select a protocol for your current state.');
    }
  }

  elements.meditationsList.innerHTML = Object.keys(protocols).map(id => {
    const p = protocols[id];
    const meta = protocolMeta[id] || { icon: '🫁', accent: 'rgba(255,255,255,0.1)', benefit: '' };
    const mins = Math.ceil(p.totalDuration / 60);
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af

  // Helper for rendering cards
  const renderCard = (id, p) => {
    const isMeditation = id.startsWith('m_');
    const meta = protocolMeta[id] || { icon: '🫁', accent: 'rgba(255,255,255,0.1)', benefit: '' };
    const mins = Math.ceil(p.totalDuration / 60000) || Math.ceil(p.totalDuration / 60);
    return `
<<<<<<< HEAD
      <button class="meditation-card ${AppState._activeFilter && AppState._activeFilter !== 'all' && p.category !== AppState._activeFilter ? 'hidden-protocol' : ''} ${isMeditation ? 'deep-journey-card' : ''}" 
=======
      <button class="meditation-card ${AppState._activeFilter && AppState._activeFilter !== 'all' && p.category !== AppState._activeFilter ? 'hidden-protocol' : ''}" 
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
              data-protocol="${id}" style="border-left: 3px solid ${meta.accent};">
        <div class="meditation-card-icon">${meta.icon}</div>
        <div class="meditation-card-info">
          <span class="meditation-card-title">${p.title}</span>
          <span class="meditation-card-meta">${mins} ${t('meditations_duration')} · ${meta.benefit}</span>
        </div>
        <svg class="meditation-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>`;
  };

  // 1. Render Breathing Exercises (Sorted by state priority if available)
  const sortedBreathIds = Object.keys(breatheProtocols).sort((a, b) => {
    if (!lastEntry || !lastEntry.state) return 0;
    const aMatch = breatheProtocols[a].state_match === lastEntry.state;
    const bMatch = breatheProtocols[b].state_match === lastEntry.state;
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const breathHTML = sortedBreathIds.map(id => renderCard(id, breatheProtocols[id])).join('');
  const journeyHTML = Object.keys(journeyProtocols).map(id => renderCard(id, journeyProtocols[id])).join('');

  elements.meditationsList.innerHTML = `
    <h3 class="meditation-section-header">${t('med_recommended_title')}</h3>
    ${breathHTML}
    <h3 class="meditation-section-header">${t('med_journeys_title')}</h3>
    ${journeyHTML}
  `;

  // Attach listeners
  elements.meditationsList.querySelectorAll('.meditation-card').forEach(card => {
    card.addEventListener('click', () => {
      const protocolId = card.getAttribute('data-protocol');
      if (protocolId.startsWith('m_')) {
        prepareDeepJourney(protocolId);
      } else {
        prepareExerciseStandalone(protocolId);
      }
    });
  });
}

// Launch a breathing exercise directly from the meditations tab (standalone, no check-in)
function prepareExerciseStandalone(protocolId) {
  exerciseParams = protocols[protocolId];
  exerciseParams.id = protocolId; // Save ID for science modal lookups
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
  
  // Connect to Global HUD instead of deprecated button
  setHUD('arrow', () => startExercise());
  if (elements.globalHUD) elements.globalHUD.classList.add('active');

  // Mark this as standalone so skip/finish returns to meditations instead of marination
  AppState._standaloneExercise = true;
  navigateTo('view-exercise');
}

function prepareDeepJourney(protocolId) {
  currentMeditationId = protocolId;
  const p = MEDITATION_PROTOCOLS[protocolId];
  if (!p) return;

  elements.meditationLoadingTitle.textContent = p.title;
  elements.loadingCircleProgress.style.strokeDashoffset = '283'; // Reset circle
  
  navigateTo('view-meditation-loading');

  // Skip button listener
  elements.skipLoadingBtn.onclick = () => {
    clearTimeout(meditationLoadingTimeout);
    startDeepMeditationSession(protocolId);
  };

  // Auto-start after 3s
  meditationLoadingTimeout = setTimeout(() => {
    startDeepMeditationSession(protocolId);
  }, 3000);
}

function startDeepMeditationSession(protocolId) {
  navigateTo('view-savoring');
  
  // Hide standard savoring phases, show specialized scan view
  elements.marPhase1.classList.add('hidden');
  elements.marPhase2.classList.add('hidden');
  elements.marPhase3.classList.add('hidden');
  elements.marPhaseOffer.classList.add('hidden');
  elements.marPhaseScan.classList.remove('hidden');
  
  // Update step indicator
  const stepInd = document.getElementById('savoringStepIndicator');
  if (stepInd) stepInd.textContent = t('nav_meditations');

  startMeditation(protocolId, {
    SensoryEngine: AppState.audioEngine,
    onPhase: (phase, index, total) => {
      elements.scanText.style.opacity = '0';
      setTimeout(() => {
        elements.scanText.textContent = t(phase.prompt);
        elements.scanText.style.opacity = '1';
        
        // Sensory update if needed
        if (AppState.audioEngine && AppState.hapticEnabled) {
          AppState.audioEngine.triggerHaptic('light');
        }
      }, 500);
    },
    onComplete: (result) => {
      elements.scanText.textContent = t('done_title');
      setTimeout(() => {
        navigateTo('view-completion');
      }, 2000);
    }
  });

  elements.scanExitBtn.onclick = () => {
    const result = stopMeditation({ SensoryEngine: AppState.audioEngine });
    navigateTo('view-meditations');
  };
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

// --- HUMANIZED TIME & MINI-DELTA HELPERS ---
function getHumanizedTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString(AppState.lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  if (diffMs < 60000) return t('time_now');
  if (diffMs < 3600000) return `${Math.floor(diffMs/60000)} ${t('time_mins_ago')}`;
  
  if (isToday) {
    if (date.getHours() < 12) return `${t('time_today_morning')}, ${timeStr}`;
    if (date.getHours() < 17) return `${t('time_today_afternoon')}, ${timeStr}`;
    return `${t('time_today_evening')}, ${timeStr}`;
  }
  
  if (isYesterday) return `${t('time_yesterday')}, ${timeStr}`;
  
  return date.toLocaleDateString(AppState.lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' }) + `, ${timeStr}`;
}

function renderMiniDeltaSVG(entry) {
  const preA = entry.pre_arousal || 0.5;
  const preV = entry.pre_valence || 0.5;
  const postA = entry.post_arousal || preA;
  const postV = entry.post_valence || preV;

  const size = 60;
  const pX = preV * size;
  const pY = (1 - preA) * size;
  const tX = postV * size;
  const tY = (1 - postA) * size;

  const stateColor = {
    ventral: '#22c55e',
    sympathetic: '#ef4444',
    dorsal: '#3b82f6'
  }[entry.polyvagal_state || 'ventral'];

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 4px;">
      <line x1="${size/2}" y1="0" x2="${size/2}" y2="${size}" stroke="white" stroke-opacity="0.1" />
      <line x1="0" y1="${size/2}" x2="${size}" y2="${size/2}" stroke="white" stroke-opacity="0.1" />
      <line x1="${pX}" y1="${pY}" x2="${tX}" y2="${tY}" stroke="${stateColor}" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="${tX}" cy="${tY}" r="3" fill="${stateColor}" />
    </svg>
  `;
}

function renderNotebook(providedEntries) {
  if (!elements.notebookEntries) return;

  const history = providedEntries || (AppState.user && AppState.user.history ? AppState.user.history : (AppState.mockHistory || []));
  let html = '';

  if (history.length === 0) {
    html = `<div class="empty-state">${t('notebook_empty')}</div>`;
  } else {
    html = `<div class="notebook-list">`;
    history.forEach(entry => {
      const timeStr = getHumanizedTime(entry.timestamp);
      const stateName = {
        'wired': AppState.lang === 'tr' ? 'Sempatik' : 'Sympathetic',
        'foggy': AppState.lang === 'tr' ? 'Dorsal' : 'Dorsal',
        'okay': AppState.lang === 'tr' ? 'Ventral' : 'Ventral'
      }[entry.state] || '...';

      let emotionLabel = entry.customEmotion || (entry.subEmotion ? t(entry.subEmotion) : '');
      if (emotionLabel === 'null' || !emotionLabel || emotionLabel === entry.subEmotion) {
        emotionLabel = stateName; 
      }

      const tags = [];
      if (entry.somatic_selections) {
        entry.somatic_selections.forEach(s => {
          const trans = t(s);
          if (trans && trans !== s && trans !== 'null') tags.push(trans);
        });
      }
      if (entry.sensations) {
        entry.sensations.forEach(s => {
          const trans = t(s);
          if (trans && trans !== s && trans !== 'null') tags.push(trans);
        });
      }

      const tagsHTML = tags.length > 0
        ? `<div class="card-footer">${tags.map(tag => `<span class="somatic-tag">${tag}</span>`).join('')}</div>`
        : '';

      html += `
        <div class="aura-card fade-in-up">
          <div class="card-header">
            <div class="aura-orb ${entry.polyvagal_state || 'ventral'}"></div>
            <div class="time-meta">${timeStr}</div>
            <div class="state-label">${emotionLabel}</div>
          </div>

          <div class="card-body">
            <p class="user-note">${entry.savoringText ? `"${entry.savoringText}"` : '...'}</p>
            <div class="delta-mini-grid">
              ${renderMiniDeltaSVG(entry)}
            </div>
          </div>

          ${tagsHTML}
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
  setBreathingPhase(phase, durationMs = 2000) {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const durationSec = durationMs / 1000;

      // Safe anchor for ramping to prevent pops or silent nodes
      this.biquadFilter.frequency.setValueAtTime(this.biquadFilter.frequency.value, now);
      this.breathFilter.frequency.setValueAtTime(this.breathFilter.frequency.value, now);
      this.breathGain.gain.setValueAtTime(this.breathGain.gain.value, now);

      if (phase === 'inhale') {
          this.biquadFilter.frequency.linearRampToValueAtTime(3000, now + durationSec);
          this.breathFilter.frequency.linearRampToValueAtTime(2500, now + durationSec);
          this.breathGain.gain.linearRampToValueAtTime(0.08, now + durationSec);
      } else if (phase === 'exhale') {
          this.biquadFilter.frequency.linearRampToValueAtTime(400, now + durationSec);
          this.breathFilter.frequency.linearRampToValueAtTime(800, now + durationSec);
          this.breathGain.gain.linearRampToValueAtTime(0.01, now + durationSec);
      } else {
          this.breathGain.gain.linearRampToValueAtTime(0.02, now + 1);
      }
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
    AppState.currentCheckIn = { state: null, subEmotion: null, selected_emotions: [], customEmotion: '', sensations: [], savoringText: '', timestamp: null };
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

  elements.historyList.innerHTML = data.map(doc => {
    const item = normalizeCheckinData(doc);
    const timeStr = getHumanizedTime(item.timestamp);
    const stateName = {
      'wired': AppState.lang === 'tr' ? 'Sempatik' : 'Sympathetic',
      'foggy': AppState.lang === 'tr' ? 'Dorsal' : 'Dorsal',
      'okay': AppState.lang === 'tr' ? 'Ventral' : 'Ventral'
    }[item.state] || '...';

    let emotionLabel = item.customEmotion || (item.subEmotion ? t(item.subEmotion) : '');
    if (emotionLabel === 'null' || !emotionLabel || emotionLabel === item.subEmotion) {
      emotionLabel = stateName; 
    }

    const tags = [];
    if (item.somatic_selections) {
      item.somatic_selections.forEach(s => {
        const trans = t(s);
        if (trans && trans !== s && trans !== 'null') tags.push(trans);
      });
    }
    if (item.sensations) {
      item.sensations.forEach(s => {
        const trans = t(s);
        if (trans && trans !== s && trans !== 'null') tags.push(trans);
      });
    }

    return `
      <div class="aura-card fade-in-up">
        <div class="card-header">
          <div class="aura-orb ${item.polyvagal_state || 'ventral'}"></div>
          <div class="time-meta">${timeStr}</div>
          <div class="state-label">${emotionLabel}</div>
        </div>

        <div class="card-body">
          <p class="user-note">${item.savoringText ? `"${item.savoringText}"` : '...'}</p>
          <div class="delta-mini-grid">
            ${renderMiniDeltaSVG(item)}
          </div>
        </div>

        ${tags.length > 0 ? `
          <div class="card-footer">${tags.map(tag => `<span class="somatic-tag">${tag}</span>`).join('')}</div>
        ` : ''}
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
  const fill = elements.resilienceFill;
  const score = elements.resilienceScore;
  const status = elements.resilienceStatus;
  if (!bar || !fill || !score || !status) return;

  bar.classList.remove('hidden');
  
  const colors = {
    high: 'linear-gradient(90deg, #4ade80, #22d3ee)',
    medium: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
    low: 'linear-gradient(90deg, #f87171, #ef4444)'
  };
  
  fill.style.background = colors[plasticity.level];
  fill.style.width = `${plasticity.score}%`;
  score.textContent = plasticity.score;
  status.textContent = t(`plasticity_${plasticity.level}`);
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
     if (elements.insightExText) elements.insightExText.textContent = protocols[exId].title;
     if (elements.weeklyExercise) elements.weeklyExercise.classList.remove('hidden');
  } else {
     if (elements.weeklyInsight) elements.weeklyInsight.classList.remove('compassion-mode');
     if (elements.insightText) elements.insightText.textContent = t('insight_no_dominant');
     if (elements.weeklyInsight) elements.weeklyInsight.classList.remove('hidden');
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

// Vagal Modal Logic (Interaction removed per user request)
/*
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
*/

if (elements.closeVagalModal) {
  elements.closeVagalModal.addEventListener('click', () => {
    elements.vagalModal.classList.remove('open');
  });
}

// Info Box Logic (Neural Archive Integration)
document.addEventListener('click', (e) => {
  const infoBtn = e.target.closest('.cockpit-info-btn') || e.target.closest('.checkin-info-btn');
  if (infoBtn) {
    e.stopPropagation();
    const infoKey = infoBtn.getAttribute('data-info');
    if (infoKey) openInfoArchive(infoKey);
  }
});

/* --- CORE LOOP --- */
elements.startCheckinBtn.addEventListener('click', () => {
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

// Phase 1: Somatic Entry
function renderSomaticEntry() {
  navigateTo('view-somatic-entry');
  const container = elements.somaticContainer;
  const nextBtn = elements.somaticNextBtn;
  const hud = document.getElementById('somaticHUD');
  
  if (!container) return;
  
  // Shuffle SOMATIC_MAP keys for a "slightly mixed" feel
  const shuffledKeys = Object.keys(SOMATIC_MAP).sort(() => Math.random() - 0.5);
  
  const somaticHTML = shuffledKeys.map((key) => {
    const data = SOMATIC_MAP[key];
    return `
      <button class="rhizome-chip ${data.state}" data-key="${key}" data-state="${data.state}">
        ${t(key)}
      </button>
    `;
  }).join('');
  
  container.innerHTML = somaticHTML;
  
  if (hud) hud.classList.remove('active');
  container.classList.remove('has-selection');

  const chips = container.querySelectorAll('.rhizome-chip');

  const applyDynamicFilter = () => {
    const selectedKeys = AppState.currentCheckIn.somatic_selections;
    
    // FLIP Step 1: Record initial positions
    const firstPositions = new Map();
    chips.forEach(chip => {
      firstPositions.set(chip, chip.getBoundingClientRect());
    });

    if (selectedKeys.length === 0) {
      chips.forEach(c => c.classList.remove('dimmed', 'highlighted'));
      container.classList.remove('has-selection', 'selected-category-ventral', 'selected-category-sympathetic', 'selected-category-dorsal');
    } else {
      // Get the states of currently selected chips
      const activeStates = [...new Set(selectedKeys.map(k => SOMATIC_MAP[k]?.state))];
      
      // Manage container-level category classes
      container.classList.remove('selected-category-ventral', 'selected-category-sympathetic', 'selected-category-dorsal');
      activeStates.forEach(state => {
        if (state) container.classList.add(`selected-category-${state}`);
      });

      chips.forEach(chip => {
        const chipState = chip.getAttribute('data-state');
        if (activeStates.includes(chipState)) {
          chip.classList.add('highlighted');
          chip.classList.remove('dimmed');
        } else {
          chip.classList.add('dimmed');
          chip.classList.remove('highlighted');
        }
      });

      // Clustering Logic: Reorder DOM
      const sortedChips = Array.from(chips).sort((a, b) => {
        const stateA = a.getAttribute('data-state');
        const stateB = b.getAttribute('data-state');
        const isSelA = a.classList.contains('selected');
        const isSelB = b.classList.contains('selected');
        const isActiveA = activeStates.includes(stateA);
        const isActiveB = activeStates.includes(stateB);

        // 1. Selected chips go first
        if (isSelA && !isSelB) return -1;
        if (!isSelA && isSelB) return 1;

        // 2. Chips of any currently active state (same color) follow
        if (isActiveA && !isActiveB) return -1;
        if (!isActiveA && isActiveB) return 1;

        // 3. Keep other states grouped alphabetically for stability
        if (stateA !== stateB) {
          return stateA.localeCompare(stateB);
        }
        return 0;
      });

      // Appending existing elements moves them in the DOM
      sortedChips.forEach(chip => container.appendChild(chip));
    }

    // FLIP Step 2: Record last positions and play animation
    chips.forEach(chip => {
      const first = firstPositions.get(chip);
      const last = chip.getBoundingClientRect();
      
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      
      if (dx !== 0 || dy !== 0) {
        chip.animate([
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'none' }
        ], {
          duration: 600,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        });
      }
    });

    // Auto-Scroll: Follow the action to keep clusters in view
    if (selectedKeys.length > 0 && elements.viewSomaticEntry) {
      elements.viewSomaticEntry.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.getAttribute('data-key');
      const index = AppState.currentCheckIn.somatic_selections.indexOf(key);
      
      if (index > -1) {
        AppState.currentCheckIn.somatic_selections.splice(index, 1);
        chip.classList.remove('selected');
      } else if (AppState.currentCheckIn.somatic_selections.length < 3) {
        AppState.currentCheckIn.somatic_selections.push(key);
        chip.classList.add('selected');
      }
      
      // Update dynamic visuals
      applyDynamicFilter();

      // Dynamic HUD activation
      const count = AppState.currentCheckIn.somatic_selections.length;
      if (count > 0) {
        container.classList.add('has-selection');
        setHUD('arrow', () => {
          const coords = calculateInitialCoords();
          AppState.currentCheckIn.pre_arousal = coords.a;
          AppState.currentCheckIn.pre_valence = coords.v;
          renderAffectGrid();
        });
        if (elements.globalHUD) elements.globalHUD.classList.add('active');
      } else {
        container.classList.remove('has-selection');
        if (elements.globalHUD) elements.globalHUD.classList.remove('active');
      }
    });
  });
}

function calculateInitialCoords() {
  const selections = AppState.currentCheckIn.somatic_selections;
  if (selections.length === 0) return { a: 0.5, v: 0.5 };
  
  let totalA = 0, totalV = 0;
  selections.forEach(key => {
    totalA += SOMATIC_MAP[key].a;
    totalV += SOMATIC_MAP[key].v;
  });
  
  return {
    a: totalA / selections.length,
    v: totalV / selections.length
  };
}

// Phase 2: Affect Grid
function renderAffectGrid() {
  navigateTo('view-affect-grid');
  
  const a = AppState.currentCheckIn.pre_arousal;
  const v = AppState.currentCheckIn.pre_valence;
  
  // Position suggested dot
  elements.suggestionDot.style.left = `${v * 100}%`;
  elements.suggestionDot.style.top = `${(1 - a) * 100}%`;
  
  elements.userDot.classList.add('hidden');
  const hud = document.getElementById('gridHUD');
  if (hud) hud.classList.remove('active'); // Hide initially
  
  initGridTouchListener();
}

function initGridTouchListener() {
  const area = elements.gridTouchArea;
  const userDot = elements.userDot;
  const nextBtn = elements.gridNextBtn;
  const hud = document.getElementById('gridHUD');
  
  const handleTouch = (e) => {
    const rect = area.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let v = x / rect.width;
    let a = 1 - (y / rect.height);
    
    v = Math.max(0, Math.min(1, v));
    a = Math.max(0, Math.min(1, a));
    
    AppState.currentCheckIn.pre_arousal = a;
    AppState.currentCheckIn.pre_valence = v;
    
    userDot.style.left = `${v * 100}%`;
    userDot.style.top = `${(1 - a) * 100}%`;
    userDot.classList.remove('hidden');
    
    // Quadrant Highlight Logic
    const quads = {
      tr: document.querySelector('.grid-quad_tr'),
      tl: document.querySelector('.grid-quad_tl'),
      bl: document.querySelector('.grid-quad_bl'),
      br: document.querySelector('.grid-quad_br')
    };
    
    // Dynamic Bio-Glow Background Shift
    const quadColors = {
      tr: '251, 160, 68',  // Amber/Gold (Flow)
      tl: '255, 107, 107', // Red/Rose (Tension)
      bl: '98, 164, 255',  // Blue/Indigo (Fog)
      br: '100, 228, 159'  // Green/Emerald (Rest)
    };

    Object.values(quads).forEach(q => q && q.classList.remove('active'));
    
    let activeQuad = '';
    if (v >= 0.5 && a >= 0.5) activeQuad = 'tr';
    else if (v < 0.5 && a >= 0.5) activeQuad = 'tl';
    else if (v < 0.5 && a < 0.5) activeQuad = 'bl';
    else if (v >= 0.5 && a < 0.5) activeQuad = 'br';

    if (activeQuad) {
      quads[activeQuad]?.classList.add('active');
      document.documentElement.style.setProperty('--vagal-color-rgb', quadColors[activeQuad]);
      document.documentElement.style.setProperty('--bg-brightness', '1.2');
    }

    // NEW: Dynamic HUD emergence
    setHUD('arrow', () => {
      const state = calculatePolyvagalState(AppState.currentCheckIn.pre_arousal, AppState.currentCheckIn.pre_valence);
      AppState.currentCheckIn.polyvagal_state = state;
      AppState.currentCheckIn.state = stateLegacyMap[state]; 
      renderEmotionRefinement(state);
    });
    if (elements.globalHUD) elements.globalHUD.classList.add('active');
  };
  
  area.onclick = handleTouch;
}

// Phase 2B: Emotion Refinement
function renderEmotionRefinement(state) {
  navigateTo('view-emotion-refinement');
  const container = elements.emotionRefinementContainer;
  const nextBtn = elements.emotionNextBtn;
  const hud = document.getElementById('emotionHUD');
  
  const emotions = EMOTION_OPTIONS[state];
  container.innerHTML = emotions.map(emoKey => {
    return `
      <button class="rhizome-chip" data-emo="${emoKey}">
        ${t(emoKey)}
      </button>
    `;
  }).join('');
  
  if (hud) hud.classList.remove('active');
  container.classList.remove('has-selection');

  AppState.currentCheckIn.selected_emotions = [];
  
  container.querySelectorAll('.rhizome-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const emo = chip.getAttribute('data-emo');
      const index = AppState.currentCheckIn.selected_emotions.indexOf(emo);
      
      if (index > -1) {
        AppState.currentCheckIn.selected_emotions.splice(index, 1);
        chip.classList.remove('selected');
      } else if (AppState.currentCheckIn.selected_emotions.length < 3) {
        AppState.currentCheckIn.selected_emotions.push(emo);
        chip.classList.add('selected');
      }
      
      // NEW: Dynamic HUD emergence
      const count = AppState.currentCheckIn.selected_emotions.length;
      if (count > 0) {
        container.classList.add('has-selection');
        setHUD('arrow', () => {
            const protocolMap = {
              ventral: 'p_resonance',
              sympathetic: 'p_478',
              dorsal: 'p_bellows'
            };
            prepareExercise(protocolMap[state]);
        });
        if (elements.globalHUD) elements.globalHUD.classList.add('active');
      } else {
        container.classList.remove('has-selection');
        if (elements.globalHUD) elements.globalHUD.classList.remove('active');
      }
    });
  });
}

function advanceFromExercise() {
  stopExercise();
  // We can still pass the state for context, but we move to savoring
  startMarinationFlow();
}

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

  AppState._standaloneExercise = false; // Normal check-in flow
  navigateTo('view-exercise');
  
  // THE FIX: Trigger liquid emergence after transition
  setTimeout(() => {
    setHUD('skip', () => advanceFromExercise());
    if (elements.globalHUD) elements.globalHUD.classList.add('active');
  }, 1000);
}

let meditationCountdownInterval = null;
let marinationTimer = null; 

/**
 * NEW: Unified HUD Controller
 * Standardizes the "Neural Cockpit" interaction button across all steps.
 * @param {string} mode - 'arrow' (next), 'check' (finish), 'skip' (fast-forward)
 * @param {Function} onClick - Action handler
 */
function setHUD(mode, onClick) {
  if (!elements.globalHUD || !elements.globalHUDBtn) return;

  // Clear previous icon and set SVG based on mode
  let svg = '';
  if (mode === 'arrow') {
    svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
  } else if (mode === 'check') {
    svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (mode === 'skip') {
    svg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>`;
  }

  elements.globalHUDBtn.innerHTML = svg;
  elements.globalHUDBtn.onclick = (e) => {
    if (e) e.preventDefault();
    if (onClick) onClick();
  };
}

function startMeditationLoading(protocolId) {
  const protocol = protocols[protocolId];
  elements.meditationLoadingTitle.textContent = protocol.title;
  
  updateUI(); // In case there are translations in the loading view
  
  // Reset circle and countdown text
  elements.loadingCircleProgress.style.transition = 'none';
  elements.loadingCircleProgress.style.strokeDashoffset = '283';
  const iconEl = document.querySelector('.loading-icon');
  if (iconEl) {
    iconEl.textContent = "5";
    iconEl.style.opacity = '1';
    iconEl.style.transform = 'scale(1)';
  }
  
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
    const normalizedHistory = history.map(h => normalizeCheckinData(h));
    const safeHistory = (normalizedHistory.length > 0) ? normalizedHistory : [{ state: 'okay', timestamp: Date.now() }];
    
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
                <div style="height: 100%; width: ${plasticity.score}%; background: ${colors[plasticity.level]}; border-radius: 100px; transition: background 2.5s cubic-bezier(0.16, 1, 0.3, 1), filter 2.5s ease-in-out;"></div>
            </div>
            <p class="subtitle" data-i18n="somatic_subtitle" style="opacity: 0.6; margin-top: 0.5rem;">Select up to 3 options.</p>
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
    const latest = history.length > 0 ? history[history.length - 1] : { state: 'okay' };
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

  elements.guestCtaRegisterBtn?.addEventListener('click', () => {
     navigateTo('view-auth');
     if (elements.guestCtaBox) elements.guestCtaBox.classList.add('hidden');
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

  const latest = mergedHistory[0];
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
      logoutIcon.innerHTML = `<path d="M9 21H5a2 2 0 0 1 2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>`;
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
    
    // Clear efficiently
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    
    const last7 = history.slice(-7);
    if (last7.length < 2) return;

    // Create Gradient using standard NS methods
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", "lineGradient");
    grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "0%");
    
    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "rgba(133, 141, 255, 0)");
    
    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "rgba(255, 255, 255, 0.8)");
    
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
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
    path.setAttribute("stroke", "url(#lineGradient)");
    path.style.strokeWidth = "4";
    path.style.fill = "none";
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

// THE FIX: Move exercise start logic to the breath circle itself
if (elements.breathCircle) {
  elements.breathCircle.onclick = () => {
    // Force Unlock Audio on Exercise Start
    if (SensoryEngine && typeof SensoryEngine.initAudio === 'function') {
      SensoryEngine.initAudio();
    }
    
    if(elements.exerciseMicrocopy) {
      setTimeout(() => {
        elements.exerciseMicrocopy.style.opacity = '0';
      }, 3000);
    }
    
    startExerciseEngine();
  };
}

function startExerciseEngine() {
  if (isExerciseActive) return; // Prevent multiple triggers
  isExerciseActive = true;
  currentPhaseIndex = 0;
  
  if (breathTimerInterval) clearInterval(breathTimerInterval);
  if (exerciseTimer) clearTimeout(exerciseTimer); 
  
  breathTimerInterval = setInterval(() => {
    if (isModalOpen) return;
    timeRemaining--;
    if(timeRemaining <= 0) {
      stopExercise();
      if (SensoryEngine && typeof SensoryEngine.triggerResolutionChord === 'function') {
        SensoryEngine.triggerResolutionChord();
      }
      if (AppState._standaloneExercise) {
        navigateTo('view-completion');
        return;
      }
      startMarinationFlow();
    }
  }, 1000);

  if (SensoryEngine && typeof SensoryEngine.initAudio === 'function') {
    SensoryEngine.initAudio();
  }
  runPhase();
}

function runPhase(customDuration = null) {
  if(timeRemaining <= 0 || isModalOpen) return;
  const phase = exerciseParams.phases[currentPhaseIndex];
  const duration = customDuration || phase.duration;
  
  phaseStartTime = Date.now();
  remainingPhaseDuration = duration;

<<<<<<< HEAD
  // Add rapid class for high-frequency breathing
=======
  // Add rapid class for high-frequency breathing (Breath of Fire)
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
  const isRapid = duration < 600;
  elements.breathCircle.className = `breath-circle ${phase.class} ${isRapid ? 'breathe-rapid' : ''}`;
  elements.breathCircle.style.transitionDuration = `${duration / 1000}s`;
  
  const lookupKey = `ex_${phase.name.toLowerCase().replace(' ', '_')}`;
  elements.breathInstruction.textContent = t(lookupKey) !== lookupKey ? t(lookupKey) : phase.name;
  
<<<<<<< HEAD
  const durationMs = (phase.duration || phase.seconds || 4) * 1000;
  
  // Sync Audio Engine with Phase Duration
  if (SensoryEngine && typeof SensoryEngine.setBreathingPhase === 'function') {
      const pId = phase.name.toLowerCase();
      const mappedPhase = pId.includes('in') ? 'inhale' : (pId.includes('out') || pId.includes('ex') ? 'exhale' : 'hold');
      SensoryEngine.setBreathingPhase(mappedPhase, durationMs);
  }

  // Sync Background Transition Duration
  document.documentElement.style.setProperty('--breath-duration', `${durationMs}ms`);

  if (phase.name.toLowerCase().includes('in') || phase.name.toLowerCase() === 'inhale top-up') {
    AudioEngine.playBell(phase.name.toLowerCase() === 'inhale top-up' ? 'soft' : 'start');
    document.documentElement.style.setProperty('--bg-brightness', '1.6');
    document.documentElement.style.setProperty('--breath-scale', '1.15');
=======
  if (phase.name.toLowerCase().includes('in') || phase.name.toLowerCase() === 'inhale top-up') {
    AudioEngine.playBell(phase.name.toLowerCase() === 'inhale top-up' ? 'soft' : 'start');
    SensoryEngine.setBreathingPhase('inhale');
    document.documentElement.style.setProperty('--bg-brightness', 1);
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
  } else if (phase.name.toLowerCase().includes('out') || phase.name.toLowerCase().includes('ex')) {
    AudioEngine.playBell('soft');
    document.documentElement.style.setProperty('--bg-brightness', '0.35');
    document.documentElement.style.setProperty('--breath-scale', '0.92');
  } else {
    // Hold / Empty (Static State)
    document.documentElement.style.setProperty('--bg-brightness', '0.75');
    document.documentElement.style.setProperty('--breath-scale', '1.02');
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


function stopExercise() {
  if (breathTimerInterval) clearInterval(breathTimerInterval);
  if (exerciseTimer) clearTimeout(exerciseTimer);
  isExerciseActive = false;
  elements.breathCircle.className = 'breath-circle';
}

/* --- MARINATION FLOW --- */
function startMarinationFlow() {
  navigateTo('view-savoring');
  
  // Restore parent step header and set Step 4 Indicator
  const parentStepIndicator = document.getElementById('savoringStepIndicator');
  if (parentStepIndicator) {
    if (parentStepIndicator.parentElement) parentStepIndicator.parentElement.classList.remove('hidden');
    parentStepIndicator.textContent = t('step_4');
    parentStepIndicator.setAttribute('data-i18n', 'step_4');
  }

  // Set Info Key for Step 4
  if (elements.savoringInfoBtn) elements.savoringInfoBtn.setAttribute('data-info', 'info_step4_desc');
  
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
    marinationTimer = setTimeout(() => {
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
  const container = elements.marSensationContainer;
  const savoringSenses = ['mar_lighter', 'mar_slower', 'mar_warmer', 'mar_clearer', 'mar_calmer', 'mar_tense'];
  const state = AppState.currentCheckIn.polyvagal_state || 'ventral'; 

  elements.marPhase1.classList.add('opacity-0');
  setTimeout(() => {
    elements.marPhase1.classList.add('hidden');
    elements.marPhase2.classList.remove('hidden');
    elements.marPhase2.classList.add('opacity-0');

    if (container) {
      // Clear previous and set ripple layout
      container.className = 'rhizome-container ripple-grid';
      
      // Smart Grid Shuffling to prevent excessive overlap
      // Create 6 grid slots (3 columns x 2 rows)
      const slots = [
        { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
        { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }
      ].sort(() => Math.random() - 0.5); // Shuffle slots

      container.innerHTML = savoringSenses.map((key, i) => {
        const slot = slots[i % slots.length];
        const gridX = (slot.c * 33) + 5; // Base column pos
        const gridY = (slot.r * 40) + 10; // Base row pos
        
        // Add jitter (random offset within the grid cell)
        const top = gridY + (Math.random() * 20 - 10);
        const left = gridX + (Math.random() * 15 - 7);
        const speed = 7 + Math.random() * 5; 
        const delay = Math.random() * -10;

        // Biological wandering offsets
        const mx = Math.random() * 25 - 12.5;
        const my = Math.random() * 25 - 12.5;
        const mx2 = Math.random() * 25 - 12.5;
        const my2 = Math.random() * 25 - 12.5;

        const style = `
          --top: ${top}%; --left: ${left}%; 
          --speed: ${speed}s; --delay: ${delay}s; 
          --mx: ${mx}px; --my: ${my}px; --mx2: ${mx2}px; --my2: ${my2}px;
        `;

        return `
          <button class="rhizome-chip ${state}" data-sense="${key}" style="${style}">
            <span>${t(key)}</span>
          </button>
        `;
      }).join('');

      container.querySelectorAll('.rhizome-chip').forEach((chip, i) => {
        // Staggered fade in
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.5)';
        setTimeout(() => {
          chip.style.opacity = '1';
          chip.style.transform = 'scale(1)';
        }, 100 + (i * 80));

        chip.addEventListener('click', () => {
          chip.classList.toggle('selected');
          
          // Sensory Feedback
          if (chip.classList.contains('selected') && SensoryEngine) {
            SensoryEngine.playUnlock && SensoryEngine.playUnlock();
          }

          const hasSelection = container.querySelectorAll('.rhizome-chip.selected').length > 0;
          if (hasSelection) {
            setHUD('arrow', () => proceedFromSensations());
            if (elements.globalHUD) elements.globalHUD.classList.add('active');
          } else {
            if (elements.globalHUD) elements.globalHUD.classList.remove('active');
          }
        });
      });
    }

    if (elements.marinationHUD) elements.marinationHUD.classList.remove('active');
    if (elements.savoringInfoBtn) elements.savoringInfoBtn.setAttribute('data-info', 'info_step4_desc');

    setTimeout(() => {
      elements.marPhase2.classList.remove('opacity-0');
    }, 100);
  }, 800);
}

function proceedFromSensations() {
    const selected = Array.from(document.querySelectorAll('.rhizome-chip.selected')).map(b => b.getAttribute('data-sense'));
    AppState.currentCheckIn.sensations = selected;
    
    setTimeout(() => {
        elements.marPhase2.classList.add('opacity-0');
        setTimeout(() => {
            elements.marPhase2.classList.add('hidden');
            
            // Direct to Loading (Step 5)
            const targetProtocol = (typeof subEmotionMap !== 'undefined' && subEmotionMap[AppState.currentCheckIn.subEmotion]) 
              ? subEmotionMap[AppState.currentCheckIn.subEmotion].protocol 
              : 'p_resonance';
            startMeditationLoading(targetProtocol);
            
        }, 800);
    }, 500);
}

<<<<<<< HEAD
// Ensure renderSavoringLog is accessible globally if needed, and clean definition
window.renderSavoringLog = renderSavoringLog;
function renderSavoringLog() {
    // 1. Clean visibility across all phases
    document.querySelectorAll('.marination-phase').forEach(p => p.classList.add('hidden'));
    
    if (elements.marPhase3) {
      elements.marPhase3.classList.remove('hidden');
=======
// 2b-2. Final Savoring Phase Entry
function goToSavoring(fromPhase) {
  // Capture protocolId if coming from exercise
  if (exerciseParams && exerciseParams.id) {
    AppState.currentCheckIn.protocol = exerciseParams.id;
  }
  fromPhase.classList.add('opacity-0');
  setTimeout(() => {
      fromPhase.classList.add('hidden');
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
      
      // Integrate with Global HUD for completion
      setHUD('check', () => {
         const note = elements.savoringNote ? elements.savoringNote.value : '';
         AppState.currentCheckIn.note = note;
         finalCheckout();
      });
      if (elements.globalHUD) elements.globalHUD.classList.add('active');
      
      setTimeout(() => elements.marPhase3.classList.remove('opacity-0'), 100);
    }
      
      // Ensure Step 6 headers are explicitly visible and unhidden
      const stepHeaders = elements.marPhase3.querySelectorAll('h2, p');
      stepHeaders.forEach(h => {
        h.classList.remove('hidden', 'opacity-0');
        h.style.opacity = '1';
        h.style.display = 'block';
      });

      const parentStepIndicator = document.getElementById('savoringStepIndicator');
      if (parentStepIndicator) {
        parentStepIndicator.textContent = t('step_6');
        parentStepIndicator.setAttribute('data-i18n', 'step_6');
        parentStepIndicator.classList.remove('hidden');
      }

      if (elements.savoringInfoBtn) {
        elements.savoringInfoBtn.setAttribute('data-info', 'info_step6_desc');
        elements.savoringInfoBtn.classList.remove('hidden');
      }

      setHUD('check', () => submitSavoringLog());
      setTimeout(() => {
          if (elements.globalHUD) elements.globalHUD.classList.add('active');
          if (elements.savoringNote) {
            elements.savoringNote.focus();
            elements.savoringNote.classList.remove('hidden');
          }
      }, 1000);
}

// 2b-2. Final Savoring Phase Entry
function goToSavoring(fromPhase) {
  // Capture protocolId if coming from exercise
  if (exerciseParams && exerciseParams.id) {
    AppState.currentCheckIn.protocol = exerciseParams.id;
  }
  setTimeout(() => {
      fromPhase.classList.add('hidden');
      renderSavoringLog();
  }, 800);
}

// 2c. Offer Buttons
if (elements.offerDoneBtn) {
  elements.offerDoneBtn.onclick = () => goToSavoring(elements.marPhaseOffer);
}

let isMeditationPaused = false;
let isExerciseActive = false; // Mutex for breathing exercise
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

function drawBecomingArrow() {
  const canvas = document.getElementById('becomingCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // High-dpi scaling
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
    
    // Draw trail
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.moveTo(pX, pY);
    ctx.lineTo(tX, tY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Growing Vector
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

    // Draw End Beacon
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

  // Labels
  const preLbl = document.querySelector('.becoming-label.pre');
  const postLbl = document.querySelector('.becoming-label.post');
  if (preLbl) { preLbl.style.left = `${pX}px`; preLbl.style.top = `${pY-10}px`; }
  if (postLbl) { postLbl.style.left = `${tX}px`; postLbl.style.top = `${tY+15}px`; }
}

function showShiftBadge(pre, post) {
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

if (elements.scanExitBtn) {
  elements.scanExitBtn.onclick = finishGuidedScan;
}

// Step 6 Save Implementation (Triggered by Global HUD)
async function submitSavoringLog() {
  const noteEl = document.getElementById('savoringNote');
  const text = noteEl ? noteEl.value.trim() : '';

  AppState.currentCheckIn.savoringText = text;
  AppState.currentCheckIn.timestamp = Date.now();
  
  // Calculate Post State for Delta Arrow (Vector towards Ventral)
  const sens = AppState.currentCheckIn.sensations || [];
  let postA = AppState.currentCheckIn.pre_arousal || 0.5;
  let postV = AppState.currentCheckIn.pre_valence || 0.5;

  // Simple heuristic mapping
  if (sens.includes('mar_calmer')) { postA = postA * 0.7 + 0.5 * 0.3; postV = Math.min(1, postV + 0.15); }
  if (sens.includes('mar_slower')) { postA = Math.max(0, postA - 0.15); }
  if (sens.includes('mar_clearer')) { postV = Math.min(1, postV + 0.2); }
  if (sens.includes('mar_warmer')) { postV = Math.min(1, postV + 0.1); }
  if (sens.includes('mar_lighter')) { postA = postA * 0.9 + 0.5 * 0.1; postV = Math.min(1, postV + 0.1); }
  
  AppState.currentCheckIn.post_arousal = postA;
  AppState.currentCheckIn.post_valence = postV;
  
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

  // Update user's last emotion in Firestore globally for notifications
  if (fb.isInitialized && AppState.user) {
     const userRef = fb.doc(fb.db, "users", AppState.user.uid);
     await fb.setDoc(userRef, { lastEmotion: AppState.currentCheckIn.subEmotion || 'se_neutral' }, { merge: true });
  }

  // trigger bio-feedback reset before completion
  resetBioFeedback();

  navigateTo('view-completion');
  setTimeout(() => {
    if (typeof checkAndShowPushModal === 'function') checkAndShowPushModal();
  }, 2000);
}

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
          
          // Get selected time from picker or default to current
          const picker = document.getElementById('nudgeTimePicker');
          let nudgeHour = new Date().getUTCHours();
          if (picker && picker.value) {
            const [h, m] = picker.value.split(':');
            nudgeHour = parseInt(h); // Simplified for skeleton
          }

          await fb.setDoc(userRef, {
             pushAsked: true,
             notificationsEnabled: true,
             fcmToken: token,
             nudgeHourUTC: nudgeHour,
             language: AppState.lang,
             lastEmotion: AppState.currentCheckIn.subEmotion || 'se_neutral'
          }, { merge: true });

          localStorage.setItem('aura_notifs_enabled', 'true');
          if (elements.notifToggleCheckbox) elements.notifToggleCheckbox.checked = true;
          const container = document.getElementById('nudgeTimeContainer');
          if (container) container.classList.remove('hidden');
          
          // Hide Dashboard Banner if permission granted
          const banner = document.querySelector('.dash-notif-banner');
          if (banner) banner.classList.add('hidden');
       }
    }
  } catch(e) {
    console.warn("FCM Token fetch failed:", e);
  }
}

if (elements.notifToggleCheckbox) {
  elements.notifToggleCheckbox.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    if (isEnabled) {
       await requestAndSaveFCMToken();
    } else {
       if (AppState.user) {
         const userRef = fb.doc(fb.db, "users", AppState.user.uid);
         await fb.setDoc(userRef, { notificationsEnabled: false }, { merge: true });
       }
       localStorage.setItem('aura_notifs_enabled', 'false');
       const container = document.getElementById('nudgeTimeContainer');
       if (container) container.classList.add('hidden');
    }
  });
}

const timePicker = document.getElementById('nudgeTimePicker');
if (timePicker) {
  timePicker.addEventListener('change', () => {
    if (localStorage.getItem('aura_notifs_enabled') === 'true') {
      requestAndSaveFCMToken(); // Update in background
    }
  });
}

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
  const isGuest = !AppState.user || AppState.user.guest || isGuestUser?.(AppState.user);
  if (isGuest) {
    navigateTo('view-auth');
    return;
  }

  if (fb.isInitialized && fb.auth && fb.auth.currentUser) {
    fb.signOut(fb.auth).catch(err => console.error("Sign out error:", err));
  }
  
  // Force local clear and redirect immediately for better UX
  AppState.user = null;
  AppState.mockHistory = [];
  localStorage.removeItem('aura_user');
  localStorage.removeItem('aura_history');
  localStorage.removeItem('aura_guest_name');
  localStorage.removeItem('aura_custom_emotions');
  
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

/* --- COMMUNITY & STATS LOGIC --- */
let galaxyAnimationId = null;

function calculatePersonalStats() {
  const history = (AppState.user && AppState.user.history && AppState.user.history.length > 0) 
    ? AppState.user.history 
    : (AppState.mockHistory || []);

  const totalCheckins = history.length;
  if (totalCheckins === 0) return { total: 0, streak: 0, state: '-', protocol: '-', avg: 0, memberSince: '-' };

  // Streak calculation
  let streak = 0;
  const today = new Date().setHours(0,0,0,0);
  const distinctDays = [...new Set(history.map(e => new Date(e.timestamp).setHours(0,0,0,0)))].sort((a,b) => b - a);
  
  if (distinctDays.includes(today) || distinctDays.includes(today - 86400000)) {
    let currentDay = distinctDays.includes(today) ? today : today - 86400000;
    for (let day of distinctDays) {
       if (day === currentDay) {
         streak++;
         currentDay -= 86400000;
       } else if (day < currentDay) break;
    }
  }

  // Most frequent state (last 30 days)
  const last30Days = Date.now() - (30 * 86400000);
  const recentHistory = history.filter(e => e.timestamp > last30Days);
  const stateCounts = recentHistory.reduce((acc, e) => {
    acc[e.state] = (acc[e.state] || 0) + 1;
    return acc;
  }, {});
  const dominantState = Object.keys(stateCounts).reduce((a, b) => stateCounts[a] > stateCounts[b] ? a : b, 'okay');

  // Most used protocol
  const protocolCounts = history.reduce((acc, e) => {
    if (e.protocol) acc[e.protocol] = (acc[e.protocol] || 0) + 1;
    return acc;
  }, {});
  const dominantProtocol = Object.keys(protocolCounts).reduce((a, b) => protocolCounts[a] > protocolCounts[b] ? a : b, null);
  const protocolName = dominantProtocol ? (protocols[dominantProtocol] ? protocols[dominantProtocol].title : 'Egzersiz') : '-';
  const protocolIcon = dominantProtocol ? (protocols[dominantProtocol] ? 
    (AppState.lang === 'tr' ? '✨ En Sevdiğin' : '⭐ Favorite') : '') : '';

  // Avg per week
  const firstEntry = history[history.length - 1].timestamp;
  const weeksDiff = Math.max(1, Math.ceil((Date.now() - firstEntry) / (7 * 86400000)));
  const avgPerWeek = (totalCheckins / weeksDiff).toFixed(1);

  // Member Since
  const options = { year: 'numeric', month: 'long' };
  const memberSince = new Date(firstEntry).toLocaleDateString(AppState.lang === 'tr' ? 'tr-TR' : 'en-US', options);

  return {
    total: totalCheckins,
    streak,
    state: dominantState,
    protocol: protocolName,
    protocolIcon,
    avg: avgPerWeek,
    memberSince
  };
}

async function fetchCommunityStats() {
  if (fb.isInitialized && fb.db) {
    try {
      const docRef = fb.doc(fb.db, "community_stats", "global");
      const snap = await fb.getDoc(docRef);
      if (snap.exists()) return snap.data();
    } catch (e) {
      console.warn("Community stats fetch failed:", e);
    }
  }
  // Placeholder fallback
  return {
    total_users: 1248,
    checkins_today: 247,
    state_distribution: { ventral: 45, sympathetic: 30, dorsal: 25 },
    top_protocol: 'p_coherent',
    active_now: 12,
    pending: true
  };
}

function initGalaxyAnimation(dist) {
  const canvas = document.getElementById('galaxyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let w = canvas.offsetWidth;
  let h = canvas.offsetHeight;
  canvas.width = w * window.devicePixelRatio;
  canvas.height = h * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const particles = [];
  const particleCount = 200;
  
  // Colors
  const colors = {
    ventral: '#6ee7c7',
    sympathetic: '#f4a24a',
    dorsal: '#7b9ccc'
  };

  const states = ['ventral', 'sympathetic', 'dorsal'];
  const distribution = dist || { ventral: 33, sympathetic: 33, dorsal: 34 };

  for (let i = 0; i < particleCount; i++) {
    // Pick state based on distribution
    const rand = Math.random() * 100;
    let state = 'ventral';
    if (rand > distribution.ventral) state = 'sympathetic';
    if (rand > (distribution.ventral + distribution.sympathetic)) state = 'dorsal';

    // Galaxy position (3 spirals)
    const arm = i % 3;
    const angle = (arm / 3) * Math.PI * 2 + (Math.random() * 0.5);
    const distance = 10 + Math.random() * 80;
    const spiralAngle = distance * 0.15 + angle;

    particles.push({
      x: w/2,
      y: h/2,
      angle: spiralAngle,
      dist: distance,
      radius: Math.random() * 1.5 + 0.5,
      color: colors[state],
      speed: 0.005 + Math.random() * 0.008,
      pulse: Math.random() * Math.PI,
      pulseSpeed: 0.02 + Math.random() * 0.03
    });
  }

  function animate() {
<<<<<<< HEAD
    if (!galaxyAnimationId) return; // Prevent ghost loops
    ctx.clearRect(0, 0, w, h);
    
    // Subtle center glow (Drawn once per frame)
=======
    ctx.clearRect(0, 0, w, h);
    
    // Subtle center glow
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 100);
    gradient.addColorStop(0, 'rgba(133, 141, 255, 0.08)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

<<<<<<< HEAD
    // Group particles by color for batching
    const groups = { ventral: [], sympathetic: [], dorsal: [] };
    const stateKeys = ['ventral', 'sympathetic', 'dorsal'];
    
    particles.forEach(p => {
      p.angle += p.speed;
      p.pulse += p.pulseSpeed;
      // Store state key in the particle object during init if not already (adding now for robustness)
      const colorKey = stateKeys.find(k => colors[k] === p.color) || 'ventral';
      groups[colorKey].push(p);
    });

    // Batch Draw by Color
    stateKeys.forEach(key => {
      const group = groups[key];
      if (group.length === 0) return;

      ctx.beginPath();
      ctx.fillStyle = colors[key];
      
      group.forEach(p => {
        const x = w/2 + Math.cos(p.angle) * p.dist;
        const y = h/2 + Math.sin(p.angle) * p.dist;
        const currentOpacity = 0.3 + Math.sin(p.pulse) * 0.2; // Slightly reduced amplitude for batch feel
        
        // Use individual arcs but a single fill() - Note: Per-particle opacity is hard with batching
        // We'll use a global alpha for the group to stay performant, or individual draws if needed.
        // For MAX performance, we use a shared alpha or a simplified pulse.
        ctx.moveTo(x + p.radius, y);
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      });
      
      ctx.globalAlpha = 0.6; // Solid average visibility for the whole group
      ctx.fill();
=======
    particles.forEach(p => {
      p.angle += p.speed;
      const x = w/2 + Math.cos(p.angle) * p.dist;
      const y = h/2 + Math.sin(p.angle) * p.dist;
      
      const opacity = 0.3 + Math.sin(p.pulse) * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = opacity;
      ctx.fill();
      
      p.pulse += p.pulseSpeed;
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
    });
    
    ctx.globalAlpha = 1;
    galaxyAnimationId = requestAnimationFrame(animate);
  }
  
  animate();
}

async function showCommunityModal() {
  const stats = calculatePersonalStats();
  const personalGrid = document.getElementById('personalStatsGrid');
  
  if (personalGrid) {
    const stateColorMap = { wired: '#f4a24a', okay: '#6ee7c7', foggy: '#7b9ccc' };
    const stateLabelMap = { 
      wired: AppState.lang === 'tr' ? 'Sempatik' : 'Sympathetic',
      okay: AppState.lang === 'tr' ? 'Ventral' : 'Ventral',
      foggy: AppState.lang === 'tr' ? 'Dorsal' : 'Dorsal'
    };

    personalGrid.innerHTML = `
<<<<<<< HEAD
      <div class="stat-card liquid-border">
=======
      <div class="stat-card">
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
        <span class="stat-label">${AppState.lang === 'tr' ? 'Yolculuk Serisi' : 'Vagal Streak'}</span>
        <span class="stat-value">${stats.streak}</span>
        <span class="stat-sub">${AppState.lang === 'tr' ? 'Gün aktif' : 'Days active'}</span>
      </div>
<<<<<<< HEAD
      <div class="stat-card liquid-border">
=======
      <div class="stat-card">
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
        <span class="stat-label">${AppState.lang === 'tr' ? 'Toplam Kayıt' : 'Total Records'}</span>
        <span class="stat-value">${stats.total}</span>
        <span class="stat-sub">${AppState.lang === 'tr' ? 'Check-in kaydı' : 'Neural check-ins'}</span>
      </div>
<<<<<<< HEAD
      <div class="stat-card liquid-border" style="border-left: 2px solid ${stateColorMap[stats.state]}">
=======
      <div class="stat-card" style="border-left: 2px solid ${stateColorMap[stats.state]}">
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
        <span class="stat-label">${AppState.lang === 'tr' ? 'Baskın Durum' : 'Dominant State'}</span>
        <span class="stat-value" style="color: ${stateColorMap[stats.state]}">${stateLabelMap[stats.state]}</span>
        <span class="stat-sub">${AppState.lang === 'tr' ? 'Son 30 gün' : 'Last 30 days'}</span>
      </div>
<<<<<<< HEAD
      <div class="stat-card liquid-border">
=======
      <div class="stat-card">
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
        <span class="stat-label">${AppState.lang === 'tr' ? 'Sıkça Yapılan' : 'Top Protocol'}</span>
        <span class="stat-value" style="font-size: 1.1rem">${stats.protocol}</span>
        <span class="stat-sub">${stats.protocolIcon}</span>
      </div>
<<<<<<< HEAD
      <div class="stat-card liquid-border">
=======
      <div class="stat-card">
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
        <span class="stat-label">${AppState.lang === 'tr' ? 'Haftalık Ort.' : 'Avg / Week'}</span>
        <span class="stat-value">${stats.avg}</span>
        <span class="stat-sub">${AppState.lang === 'tr' ? 'Senans / Hafta' : 'Sessions / week'}</span>
      </div>
<<<<<<< HEAD
      <div class="stat-card liquid-border">
=======
      <div class="stat-card">
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
        <span class="stat-label">${AppState.lang === 'tr' ? 'Aura Yolculuğu' : 'Aura Voyage'}</span>
        <span class="stat-value" style="font-size: 0.9rem">${stats.memberSince}</span>
        <span class="stat-sub">${AppState.lang === 'tr' ? 'Başlangıç' : 'Commenced'}</span>
      </div>
    `;
  }

  // Show Modal
  document.getElementById('communityBackdrop').classList.add('active');
  document.getElementById('communityModal').classList.add('active');
  
  // Set default tab
  switchCommTab('ben');
}

async function switchCommTab(tabId) {
  const panes = document.querySelectorAll('.comm-tab-pane');
  const buttons = document.querySelectorAll('.comm-tab-btn');
  const indicator = document.querySelector('.comm-tab-indicator');
  
  panes.forEach(p => p.classList.toggle('active', p.id === `commTab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`));
  buttons.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    if (b.classList.contains('active')) {
       indicator.style.width = `${b.offsetWidth}px`;
       indicator.style.left = `${b.offsetLeft}px`;
    }
  });

  if (tabId === 'topluluk') {
    const commData = await fetchCommunityStats();
    
    // UI Update
    const checkinText = AppState.lang === 'tr' 
      ? `Bugün <span>${commData.checkins_today}</span> kişi check-in yaptı` 
      : `<span>${commData.checkins_today}</span> people checked in today`;
    document.getElementById('commCheckinCount').innerHTML = checkinText;
    
    const dist = commData.state_distribution;
    document.getElementById('distVentral').style.width = `${dist.ventral}%`;
    document.getElementById('distSympathetic').style.width = `${dist.sympathetic}%`;
    document.getElementById('distDorsal').style.width = `${dist.dorsal}%`;
    
    const topProt = commData.top_protocol;
<<<<<<< HEAD
    const cp = document.getElementById('commTopProtocol');
    if (cp) cp.textContent = protocols[topProt] ? protocols[topProt].title : '-';
    const can = document.getElementById('commActiveNow');
    if (can) can.textContent = commData.active_now;
=======
    document.getElementById('commTopProtocol').textContent = protocols[topProt] ? protocols[topProt].title : '-';
    document.getElementById('commActiveNow').textContent = commData.active_now;
>>>>>>> 32417ea05b716f38815df2c00a5f84bf0d6c12af
    
    if (commData.pending) document.getElementById('commPlaceholderNote').classList.remove('hidden');
    else document.getElementById('commPlaceholderNote').classList.add('hidden');

    if (galaxyAnimationId) cancelAnimationFrame(galaxyAnimationId);
    initGalaxyAnimation(dist);
  } else {
    if (galaxyAnimationId) cancelAnimationFrame(galaxyAnimationId);
  }
}

function hideCommunityModal() {
  document.getElementById('communityBackdrop').classList.remove('active');
  document.getElementById('communityModal').classList.remove('active');
  if (galaxyAnimationId) cancelAnimationFrame(galaxyAnimationId);
}

// Event Listeners for Community
if (elements.auraCoreSphere) {
  elements.auraCoreSphere.addEventListener('click', showCommunityModal);
}
document.getElementById('closeCommunityBtn')?.addEventListener('click', hideCommunityModal);
document.getElementById('communityBackdrop')?.addEventListener('click', hideCommunityModal);
document.querySelectorAll('.comm-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchCommTab(btn.getAttribute('data-tab')));
});
