/* --- SOMATIC & POLYVAGAL CONSTANTS --- */
export const SOMATIC_MAP = {
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

export const EMOTION_OPTIONS = {
    ventral: ["emo_grateful", "emo_curious", "emo_peaceful", "emo_joyful", "emo_compassionate", "emo_connected"],
    sympathetic: ["emo_anxious", "emo_angry", "emo_overwhelmed", "emo_excited", "emo_tense", "emo_impatient"],
    dorsal: ["emo_numb", "emo_tired", "emo_sad", "emo_empty", "emo_hopeless", "emo_dull"]
};

export const stateLegacyMap = { ventral: "Okay", sympathetic: "Wired", dorsal: "Foggy" };

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
  calm: `<path d="M22 12c-2.66 0-4.33-1.67-6-3.33C14.33 7 12.66 5.33 10 5.33S5.67 7 4 8.67C2.33 10.33.67 12 0 12" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>`,
  energize: `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  focus: `<circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none" opacity="0.8"/><circle cx="12" cy="12" r="6" stroke="white" stroke-width="2" fill="none" opacity="0.5"/><circle cx="12" cy="12" r="2" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>`,
  wave: `<path d="M2 12h4l2-9 5 18 5-18 2 9h4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  wind: `<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>`,
  leaf: `<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M2 22 12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  fire: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  balance: `<path d="M12 3v18" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/><circle cx="8" cy="12" r="3" stroke="white" stroke-width="2" fill="none" opacity="0.8"/><circle cx="16" cy="12" r="3" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>`,
  box: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  sigh: `<path d="M4 12v-3a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/><path d="M12 15v5" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/><path d="M9 18l3 3 3-3" stroke="white" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/>`,
  infinity: `<path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  heart: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  expand: `<path d="M15 3h6v6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M9 21H3v-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M21 3l-7 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M3 21l7-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`,
  bellows: `<path d="M4 14a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/><path d="M4 14l3 6h10l3-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.8"/>`
};

export const PROTOCOL_META = {
  p_478: { icon: PROTOCOL_ICONS.moon, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_478' },
  p_sigh: { icon: PROTOCOL_ICONS.sigh, accent: 'rgba(168, 230, 207, 0.4)', benefitKey: 'benefit_sigh' },
  p_bellows: { icon: PROTOCOL_ICONS.bellows, accent: 'rgba(255, 160, 100, 0.4)', benefitKey: 'benefit_bellows' },
  p_resonance: { icon: PROTOCOL_ICONS.infinity, accent: 'rgba(200, 140, 255, 0.4)', benefitKey: 'benefit_resonance' },
  p_grounding: { icon: PROTOCOL_ICONS.leaf, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_grounding' },
  p_box: { icon: PROTOCOL_ICONS.box, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_box' },
  p_phys_sigh: { icon: PROTOCOL_ICONS.expand, accent: 'rgba(168, 230, 207, 0.4)', benefitKey: 'benefit_phys_sigh' },
  p_coherent: { icon: PROTOCOL_ICONS.heart, accent: 'rgba(200, 140, 255, 0.4)', benefitKey: 'benefit_coherent' },
  p_ext_exhale: { icon: PROTOCOL_ICONS.calm, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_ext_exhale' },
  p_cyclic_sigh: { icon: PROTOCOL_ICONS.wave, accent: 'rgba(168, 230, 207, 0.4)', benefitKey: 'benefit_cyclic_sigh' },
  p_fire: { icon: PROTOCOL_ICONS.fire, accent: 'rgba(255, 160, 100, 0.4)', benefitKey: 'benefit_fire' },
  p_nadi: { icon: PROTOCOL_ICONS.balance, accent: 'rgba(200, 140, 255, 0.4)', benefitKey: 'benefit_nadi' }
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
