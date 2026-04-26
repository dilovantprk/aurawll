// Safe wrapper for localStorage
export function safeGetItem(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

export function safeSetItem(key, val) {
  try { localStorage.setItem(key, val); } catch (e) { console.warn('localStorage is blocked'); }
}

/* --- STATE MANAGEMENT --- */
export const AppState = {
  user: null,
  userHistory: null,
  lastHistoryFetch: 0,
  lang: safeGetItem('aura_lang') || 'tr',
  isMuted: safeGetItem('aura_muted') === 'true',
  hapticEnabled: safeGetItem('aura_haptic') !== 'false', // Default true
  droneEnabled: safeGetItem('aura_drone') !== 'false', // Default true
  uiSoundsEnabled: safeGetItem('aura_ui_sounds') === 'true', // Default false
  appVolume: parseInt(safeGetItem('aura_volume')) || 50, // Default 50
  showNotebook: safeGetItem('aura_show_notebook') !== 'false', // Default true
  showMeditations: safeGetItem('aura_show_meditations') !== 'false', // Default true
  showFocus: safeGetItem('aura_show_focus') === 'true', // Default false
  showAmbient: safeGetItem('aura_show_ambient') === 'true', // Default false
  justFinishedCheckIn: false,
  lastCheckInState: null,
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
  mockHistory: JSON.parse(safeGetItem('aura_history')) || []
};

export function saveHistoryToLocal() {
  safeSetItem('aura_history', JSON.stringify(AppState.mockHistory));
}
