/* --- SOMATIC & POLYVAGAL CONSTANTS --- */
export const SOMATIC_MAP = {
    // Ventral
    "bs_ventral_shoulders": { a: 0.3, v: 0.8, state: 'coherence' },
    "bs_ventral_belly": { a: 0.4, v: 0.8, state: 'coherence' },
    "bs_ventral_settling": { a: 0.3, v: 0.7, state: 'coherence' },
    "bs_ventral_belong": { a: 0.4, v: 0.9, state: 'coherence' },
    "bs_ventral_jaw": { a: 0.3, v: 0.8, state: 'coherence' },
    // Sympathetic
    "bs_symp_jaw": { a: 0.8, v: 0.4, state: 'mobilization' },
    "bs_symp_shoulders": { a: 0.8, v: 0.3, state: 'mobilization' },
    "bs_symp_chest": { a: 0.7, v: 0.3, state: 'mobilization' },
    "bs_symp_hands": { a: 0.7, v: 0.4, state: 'mobilization' },
    "bs_symp_legs": { a: 0.9, v: 0.4, state: 'mobilization' },
    "bs_symp_heart": { a: 0.9, v: 0.3, state: 'mobilization' },
    "bs_symp_spring": { a: 0.8, v: 0.4, state: 'mobilization' },
    // Dorsal
    "bs_dorsal_distant": { a: 0.2, v: 0.2, state: 'immobilization' },
    "bs_dorsal_heavy": { a: 0.2, v: 0.3, state: 'immobilization' },
    "bs_dorsal_numb": { a: 0.1, v: 0.2, state: 'immobilization' },
    "bs_dorsal_eyes": { a: 0.3, v: 0.3, state: 'immobilization' },
    "bs_dorsal_vulnerable": { a: 0.3, v: 0.2, state: 'immobilization' },
    "bs_dorsal_voice": { a: 0.2, v: 0.4, state: 'immobilization' },
    // Neutral
    "bs_neutral_deep": { a: 0.4, v: 0.7, state: 'coherence' },
    "bs_neutral_weight": { a: 0.3, v: 0.4, state: 'immobilization' },
    "bs_neutral_cold": { a: 0.6, v: 0.4, state: 'mobilization' },
    "bs_neutral_face": { a: 0.7, v: 0.4, state: 'mobilization' },
    // Digestion
    "bs_digest_throat": { a: 0.7, v: 0.3, state: 'mobilization' },
    "bs_digest_appetite": { a: 0.2, v: 0.3, state: 'immobilization' },
    "bs_digest_stomach": { a: 0.6, v: 0.3, state: 'mobilization' },
    "bs_digest_head": { a: 0.7, v: 0.4, state: 'mobilization' }
};

export const EMOTION_OPTIONS = {
    coherence: ["emo_grateful", "emo_curious", "emo_peaceful", "emo_joyful", "emo_compassionate", "emo_connected"],
    mobilization: ["emo_anxious", "emo_angry", "emo_overwhelmed", "emo_excited", "emo_tense", "emo_impatient"],
    immobilization: ["emo_numb", "emo_tired", "emo_sad", "emo_empty", "emo_hopeless", "emo_dull"],
    // Legacy support
    ventral: ["emo_grateful", "emo_curious", "emo_peaceful", "emo_joyful", "emo_compassionate", "emo_connected"],
    sympathetic: ["emo_anxious", "emo_angry", "emo_overwhelmed", "emo_excited", "emo_tense", "emo_impatient"],
    dorsal: ["emo_numb", "emo_tired", "emo_sad", "emo_empty", "emo_hopeless", "emo_dull"]
};

export const stateLegacyMap = { 
  ventral: "Okay", sympathetic: "Wired", dorsal: "Foggy",
  coherence: "Okay", mobilization: "Wired", immobilization: "Foggy" 
};

export const protocols = {
  p_478: {
    titleKey: "title_p_478",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Hold", class: "breathe-hold", duration: 7000 },
      { name: "Exhale", class: "breathe-exhale", duration: 8000 }
    ],
    totalDuration: 114
  },
  p_sigh: {
    titleKey: "title_p_sigh",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-empty", duration: 8000 }
    ],
    totalDuration: 120
  },
  p_bellows: {
    titleKey: "title_p_bellows",
    category: "energize",
    phases: [
      { name: "In", class: "breathe-inhale", duration: 2000 },
      { name: "Out", class: "breathe-exhale", duration: 2000 }
    ],
    totalDuration: 90
  },
  p_resonance: {
    titleKey: "title_p_resonance",
    category: "focus",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 5500 },
      { name: "Exhale", class: "breathe-exhale", duration: 5500 }
    ],
    totalDuration: 110
  },
  p_grounding: {
    titleKey: "title_p_grounding",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 6000 }
    ],
    totalDuration: 120
  },
  p_phys_sigh: {
    titleKey: "title_p_phys_sigh",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 2000 },
      { name: "Inhale Top-Up", class: "breathe-inhale-top-up", duration: 1000 },
      { name: "Exhale", class: "breathe-exhale", duration: 6000 }
    ],
    totalDuration: 60
  },
  p_coherent: {
    titleKey: "title_p_coherent",
    category: "focus",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 5500 },
      { name: "Exhale", class: "breathe-exhale", duration: 5500 }
    ],
    totalDuration: 300
  },
  p_ext_exhale: {
    titleKey: "title_p_ext_exhale",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 8000 }
    ],
    totalDuration: 120
  },
  p_cyclic_sigh: {
    titleKey: "title_p_cyclic_sigh",
    category: "calm",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 3000 },
      { name: "Inhale Top-Up", class: "breathe-inhale-top-up", duration: 1000 },
      { name: "Exhale", class: "breathe-exhale", duration: 8000 }
    ],
    totalDuration: 300
  },
  p_fire: {
    titleKey: "title_p_fire",
    category: "energize",
    phases: [
      { name: "In", class: "breathe-inhale", duration: 250 },
      { name: "Out", class: "breathe-exhale", duration: 250 }
    ],
    totalDuration: 120
  },
  p_nadi: {
    titleKey: "title_p_nadi",
    category: "focus",
    phases: [
      { name: "Inhale", class: "breathe-inhale", duration: 4000 },
      { name: "Exhale", class: "breathe-exhale", duration: 4000 }
    ],
    totalDuration: 240
  },
  p_box: {
    titleKey: "title_p_box",
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

export const PROTOCOL_ICONS = {
  p_478: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_sigh: `<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>`,
  p_bellows: `<path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><line x1="23" y1="13" x2="23" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/><polyline points="11 6 7 12 13 12 9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_resonance: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_grounding: `<circle cx="12" cy="5" r="3" stroke="currentColor" stroke-width="2" fill="none" opacity="0.8"/><line x1="12" y1="22" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_phys_sigh: `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.8"/><polyline points="8 12 12 16 16 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`,
  p_coherent: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_ext_exhale: `<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><line x1="16" y1="8" x2="2" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/><line x1="17.5" y1="15" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`,
  p_cyclic_sigh: `<polyline points="23 4 23 10 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><polyline points="1 20 1 14 7 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_fire: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_nadi: `<path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><line x1="7" y1="21" x2="17" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/><line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/><path d="M3 7h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  p_box: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`
};

export const PROTOCOL_META = {
  p_478: { icon: PROTOCOL_ICONS.p_478, accent: "rgba(133, 141, 255, 0.4)", benefitKey: "benefit_478" },
  p_sigh: { icon: PROTOCOL_ICONS.p_sigh, accent: "rgba(168, 230, 207, 0.4)", benefitKey: "benefit_sigh" },
  p_bellows: { icon: PROTOCOL_ICONS.p_bellows, accent: "rgba(255, 160, 100, 0.4)", benefitKey: "benefit_bellows" },
  p_resonance: { icon: PROTOCOL_ICONS.p_resonance, accent: "rgba(200, 140, 255, 0.4)", benefitKey: "benefit_resonance" },
  p_grounding: { icon: PROTOCOL_ICONS.p_grounding, accent: "rgba(133, 141, 255, 0.4)", benefitKey: "benefit_grounding" },
  p_box: { icon: PROTOCOL_ICONS.p_box, accent: "rgba(133, 141, 255, 0.4)", benefitKey: "benefit_box" },
  p_phys_sigh: { icon: PROTOCOL_ICONS.p_phys_sigh, accent: "rgba(168, 230, 207, 0.4)", benefitKey: "benefit_phys_sigh" },
  p_coherent: { icon: PROTOCOL_ICONS.p_coherent, accent: "rgba(200, 140, 255, 0.4)", benefitKey: "benefit_coherent" },
  p_ext_exhale: { icon: PROTOCOL_ICONS.p_ext_exhale, accent: "rgba(133, 141, 255, 0.4)", benefitKey: "benefit_ext_exhale" },
  p_cyclic_sigh: { icon: PROTOCOL_ICONS.p_cyclic_sigh, accent: "rgba(168, 230, 207, 0.4)", benefitKey: "benefit_cyclic_sigh" },
  p_fire: { icon: PROTOCOL_ICONS.p_fire, accent: "rgba(255, 160, 100, 0.4)", benefitKey: "benefit_fire" },
  p_nadi: { icon: PROTOCOL_ICONS.p_nadi, accent: "rgba(200, 140, 255, 0.4)", benefitKey: "benefit_nadi" }
};

export const subEmotionMap = {
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

export const EMOTION_PROTOCOL_MAP = {
  // Ventral
  emo_grateful: 'p_resonance',
  emo_curious: 'p_box',
  emo_peaceful: 'p_coherent',
  emo_joyful: 'p_resonance',
  emo_compassionate: 'p_nadi',
  emo_connected: 'p_coherent',
  
  // Sympathetic
  emo_anxious: 'p_478',
  emo_angry: 'p_phys_sigh',
  emo_overwhelmed: 'p_box',
  emo_excited: 'p_resonance',
  emo_tense: 'p_478',
  emo_impatient: 'p_sigh',
  
  // Dorsal
  emo_numb: 'p_bellows',
  emo_tired: 'p_fire',
  emo_sad: 'p_grounding',
  emo_empty: 'p_bellows',
  emo_hopeless: 'p_grounding',
  emo_dull: 'p_fire'
};

export const BADGE_ICONS = {
  explorer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>`,
  earlybird: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-7.925 0"/><path d="M3 21h18"/><path d="M12 10V2"/></svg>`,
  nightowl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  streak7: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  master: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></svg>`,
  zen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
};

export const BADGES = {
  explorer: { id: 'explorer', icon: BADGE_ICONS.explorer, titleKey: 'badge_explorer', descKey: 'badge_explorer_desc' },
  earlybird: { id: 'earlybird', icon: BADGE_ICONS.earlybird, titleKey: 'badge_earlybird', descKey: 'badge_earlybird_desc' },
  nightowl: { id: 'nightowl', icon: BADGE_ICONS.nightowl, titleKey: 'badge_nightowl', descKey: 'badge_nightowl_desc' },
  streak7: { id: 'streak7', icon: BADGE_ICONS.streak7, titleKey: 'badge_streak7', descKey: 'badge_streak7_desc' },
  master: { id: 'master', icon: BADGE_ICONS.master, titleKey: 'badge_master', descKey: 'badge_master_desc' },
  zen: { id: 'zen', icon: BADGE_ICONS.zen, titleKey: 'badge_zen', descKey: 'badge_zen_desc' }
};
