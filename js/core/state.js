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

export function saveHistoryToLocal() {
  safeSetItem('aura_history', JSON.stringify(AppState.mockHistory));
}
