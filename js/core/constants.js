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
  calm: `<path d="M12 32 C 18 12, 26 52, 32 32 C 38 12, 46 52, 52 32" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  energize: `<path d="M32 10 L 42 35 L 32 30 L 22 35 Z" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  focus: `<rect x="22" y="22" width="20" height="20" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  wave: `<path d="M10 32 Q 21 12 32 32 T 54 32" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  moon: `<path d="M42 48 A 20 20 0 1 1 42 16 A 15 15 0 0 0 42 48" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  wind: `<path d="M10 25 H 40 C 45 25 45 15 40 15 S 35 25 40 25 M 10 40 H 35 C 40 40 40 30 35 30 S 30 40 35 40" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  leaf: `<path d="M32 52 C 32 52 12 42 12 22 C 12 12 22 12 32 22 C 42 12 52 12 52 22 C 52 42 32 52 32 52 Z" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`,
  fire: `<path d="M32 52 C 32 52 42 42 42 32 C 42 22 32 12 32 12 C 32 12 22 22 22 32 C 22 42 32 52 32 52 Z" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/><path d="M32 42 C 32 42 36 38 36 32 C 36 28 32 24 32 24 C 32 24 28 28 28 32 C 28 38 32 42 32 42 Z" stroke="white" stroke-width="1" fill="none" opacity="0.4"/>`,
  balance: `<circle cx="24" cy="32" r="10" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/><circle cx="40" cy="32" r="10" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>`,
  box: `<rect x="18" y="18" width="28" height="28" rx="4" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/>`
};

export const PROTOCOL_META = {
  p_478: { icon: PROTOCOL_ICONS.moon, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_478' },
  p_sigh: { icon: PROTOCOL_ICONS.wind, accent: 'rgba(168, 230, 207, 0.4)', benefitKey: 'benefit_sigh' },
  p_bellows: { icon: PROTOCOL_ICONS.fire, accent: 'rgba(255, 160, 100, 0.4)', benefitKey: 'benefit_bellows' },
  p_resonance: { icon: PROTOCOL_ICONS.wave, accent: 'rgba(200, 140, 255, 0.4)', benefitKey: 'benefit_resonance' },
  p_grounding: { icon: PROTOCOL_ICONS.leaf, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_grounding' },
  p_box: { icon: PROTOCOL_ICONS.box, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_box' },
  p_phys_sigh: { icon: PROTOCOL_ICONS.wind, accent: 'rgba(168, 230, 207, 0.4)', benefitKey: 'benefit_phys_sigh' },
  p_coherent: { icon: PROTOCOL_ICONS.wave, accent: 'rgba(200, 140, 255, 0.4)', benefitKey: 'benefit_coherent' },
  p_ext_exhale: { icon: PROTOCOL_ICONS.calm, accent: 'rgba(133, 141, 255, 0.4)', benefitKey: 'benefit_ext_exhale' },
  p_cyclic_sigh: { icon: PROTOCOL_ICONS.wind, accent: 'rgba(168, 230, 207, 0.4)', benefitKey: 'benefit_cyclic_sigh' },
  p_fire: { icon: PROTOCOL_ICONS.energize, accent: 'rgba(255, 160, 100, 0.4)', benefitKey: 'benefit_fire' },
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
