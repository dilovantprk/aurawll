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
