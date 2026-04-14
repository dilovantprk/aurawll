/**
 * AURA NEURAL ICONOGRAPHY (v1.0)
 * Minimal SVG icons to replace emojis across the application.
 * All icons are 20x20 and use currentColor for theme compatibility.
 */

export const EMOTION_ICONS = {
  // --- Vagal Baseline States ---
  wired: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 10c1-3 2-3 3 0s2 3 3 0 2-3 3 0 2 3 3 0 2 3 3 0"/></svg>`,
  foggy: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 7h14"/><path d="M4 10h12" opacity="0.6"/><path d="M6 13h8" opacity="0.3"/></svg>`,
  okay: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 17c0 0-7-4-7-9a7 7 0 0 1 14 0c0 5-7 9-7 9z"/><path d="M10 17V8" opacity="0.4"/></svg>`,

  // --- Wired Subs ---
  se_anxious: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 3a7 7 0 1 1-4.9 2"/><path d="M5 1v4h4"/></svg>`,
  se_angry: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l4 4-4 4M10 6l4 4-4 4" opacity="0.5"/><path d="M17 6l-4 4 4 4"/></svg>`,
  se_overwhelmed: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 3v14M3 10l7-7 7 7"/><path d="M3 14l7-3 7 3" opacity="0.4"/></svg>`,
  se_frustrated: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l4 4-4 4M10 6l4 4-4 4" opacity="0.5"/><path d="M17 6l-4 4 4 4"/></svg>`, // Using Angry for Frustrated
  se_tense: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 16 Q10 2 16 16"/><path d="M7 11h6" opacity="0.4"/></svg>`,
  se_on_edge: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 16 Q10 2 16 16"/><path d="M7 11h6" opacity="0.4"/></svg>`, // Using Tense for On Edge
  se_panicked: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="2"/><path d="M10 4v2M10 14v2M4 10h2M14 10h2"/><path d="M5.8 5.8l1.4 1.4M12.8 12.8l1.4 1.4M5.8 14.2l1.4-1.4M12.8 7.2l1.4-1.4" opacity="0.5"/></svg>`,
  se_scattered: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="2"/><path d="M10 4v2M10 14v2M4 10h2M14 10h2"/><path d="M5.8 5.8l1.4 1.4M12.8 12.8l1.4 1.4M5.8 14.2l1.4-1.4M12.8 7.2l1.4-1.4" opacity="0.5"/></svg>`, // Using Panicked for Scattered
  se_excited: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 2v3M10 15v3M2 10h3M15 10h3"/><path d="M4.9 4.9l2.1 2.1M13 13l2.1 2.1M4.9 15.1l2.1-2.1M13 7l2.1-2.1" opacity="0.5"/></svg>`,
  se_racing_thoughts: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 2v3M10 15v3M2 10h3M15 10h3"/><path d="M4.9 4.9l2.1 2.1M13 13l2.1 2.1M4.9 15.1l2.1-2.1M13 7l2.1-2.1" opacity="0.5"/></svg>`, // Using Excited for Racing Thoughts

  // --- Foggy Subs ---
  se_exhausted: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="2" y="6" width="14" height="8" rx="1.5"/><path d="M16 9v2"/><rect x="3" y="7" width="2" height="6" rx="0.5" fill="currentColor" opacity="0.3"/></svg>`,
  se_numb: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 10h12"/><path d="M4 7h4M12 7h4" opacity="0.3"/><path d="M4 13h4M12 13h4" opacity="0.3"/></svg>`,
  se_disconnected: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M8 12l-1.5 1.5a3 3 0 0 1-4.24-4.24L4 7.5A3 3 0 0 1 8 8"/><path d="M12 8l1.5-1.5a3 3 0 0 1 4.24 4.24L16 12.5A3 3 0 0 1 12 12"/></svg>`,
  se_bored: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 8c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2 1.5 2 3 2"/><path d="M3 13h14" opacity="0.4"/></svg>`,
  se_heavy: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 3v9M6 9l4 4 4-4"/><path d="M5 16h10" opacity="0.4"/></svg>`,
  se_dissociated: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 10c2-4 4-4 6 0"/><path d="M12 10c2-4 4-4 6 0" opacity="0.4"/><path d="M10 10h0.01"/></svg>`,
  se_spaced_out: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 10c2-4 4-4 6 0"/><path d="M12 10c2-4 4-4 6 0" opacity="0.4"/><path d="M10 10h0.01"/></svg>`, // Using Dissociated for Spaced Out

  // --- Okay Subs ---
  se_calm: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 10c1.5-2 1.5 2 3 0s1.5-2 3 0 1.5 2 3 0 1.5-2 3 0"/></svg>`,
  se_focused: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><circle cx="10" cy="10" r="1" fill="currentColor"/></svg>`,
  se_grateful: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 9V5a1 1 0 0 1 2 0v4"/><path d="M8 8V4a1 1 0 0 1 2 0v4"/><path d="M10 8V5a1 1 0 0 1 2 0v3"/><path d="M12 9V7a1 1 0 0 1 2 0v4a5 5 0 0 1-10 0V9a1 1 0 0 1 2 0"/></svg>`,
  se_hopeful: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 14 Q10 4 16 8"/><path d="M13 6l3 2-1 3" /></svg>`,
  se_curious: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 3a5 5 0 0 1 2 9.5V14"/><circle cx="10" cy="17" r="0.5" fill="currentColor"/></svg>`,
  se_joyful: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 13c1.5-3 1.5 0 3-3s1.5 0 3-3 1.5 0 3-3 1.5 0 3-3"/><path d="M3 17h14" opacity="0.3"/></svg>`,
  se_content: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 10c1.5-2 1.5 2 3 0s1.5-2 3 0 1.5 2 3 0 1.5-2 3 0"/></svg>`, // Using Calm for Content
  se_neutral: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 10h12"/><path d="M4 7h4M12 7h4" opacity="0.3"/><path d="M4 13h4M12 13h4" opacity="0.3"/></svg>`, // Using Numb for Neutral
  se_grounded: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 17c0 0-7-4-7-9a7 7 0 0 1 14 0c0 5-7 9-7 9z"/><path d="M10 17V8" opacity="0.4"/></svg>`, // Using Okay for Grounded

  // --- Other ---
  se_other: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,

  // --- Mobile Dock Icons ---
  nav_home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" opacity="0.3"/><path d="M3 9h18M9 21V9"/></svg>`,
  nav_breathe: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.3"/><path d="M12 3v18M3 12h18"/></svg>`,
  nav_notes: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v16H4z" opacity="0.3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
  nav_insight: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20M2 12h20" opacity="0.3"/><circle cx="12" cy="12" r="5"/><path d="m12 7 2 5-2 5-2-5z"/></svg>`,
  nav_profile: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" opacity="0.3"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>`,

  // --- General UI ---
  sparkle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  lungs: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3c1.5 0 2.5 1 2.5 2.5V11a2.5 2.5 0 0 1-5 0V5.5C4.5 4 5.5 3 7 3Z"/><path d="M17 3c1.5 0 2.5 1 2.5 2.5V11a2.5 2.5 0 0 1-5 0V5.5C14.5 4 15.5 3 17 3Z"/><path d="M9.5 11c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5"/></svg>`,
  lotus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 6 8 10 8 10Z"/><path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 22V12"/></svg>`,
  helix: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 3 8 18"/><path d="m16 3-8 18"/><path d="M5 8h14"/><path d="M5 16h14"/></svg>`,
  wind: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4a2 2 0 1 0-1.4-3.4H2"/></svg>`,
  cloud_ui: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19a5.5 5.5 0 0 0 2.4-10.4 7.5 7.5 0 1 0-14.7 1.6A5 5 0 0 0 5 20h11l1.5-1z"/></svg>`,
  thought_ui: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1.5 0 2.5 1 2.5 2.5v1.5a2.5 2.5 0 1 1-5 0V5.5C9.5 4 10.5 3 12 3Z"/><circle cx="12" cy="12" r="10"/></svg>`,
  checkmark: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`
};
