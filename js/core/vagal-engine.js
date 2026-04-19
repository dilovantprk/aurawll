// js/core/vagal-engine.js
// Extracted from vagal-logic.js

export const SENSORY_CONFIG = {
  OKAY: { jitter: 0, haptic: null, opacity: 0.1, blur: 0 },
  WIRED: { jitter: 2, haptic: [30, 100, 30], opacity: 0.4, blur: 5 },
  FOGGY: { jitter: 8, haptic: [300, 200, 300], opacity: 0.6, blur: 15 }
};

export function calculateVagalPoint(v, s, d) {
  const total = v + s + d || 100;
  const pV = v / total;
  const pS = s / total;
  const pD = d / total;
  
  // Barycentric to Cartesian (Triangle map)
  const x = (0.5 * pV + 1.0 * pS + 0.0 * pD) * 100;
  const y = (0.0 * pV + 0.866 * pS + 0.866 * pD) * 100;
  
  return { x: `${x}%`, y: `${y}%` };
}

export function calculateVagalState(v, s, d) {
  const total = v + s + d || 1;
  const weights = { wV: v/total, wS: s/total, wD: d/total };
  
  let color = '#6ee7c7'; // Ventral
  if (weights.wS > weights.wV && weights.wS > weights.wD) color = '#f4a24a';
  if (weights.wD > weights.wV && weights.wD > weights.wS) color = '#7b9ccc';
  
  return { color, weights };
}

export function getWeightsFromState(stateId) {
  if (stateId === 'wired') return { wV: 0.1, wS: 0.8, wD: 0.1 };
  if (stateId === 'foggy') return { wV: 0.1, wS: 0.1, wD: 0.8 };
  return { wV: 0.8, wS: 0.1, wD: 0.1 };
}

export function calculatePlasticity(history) {
    if (!history || history.length === 0) return { score: 0, level: 'low' };
    const recent = history.slice(0, 7);
    const score = Math.min(100, recent.length * 15);
    return { score, level: score > 70 ? 'high' : (score > 40 ? 'medium' : 'low') };
}

export function getPoeticTimeLabel(lang) {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return lang === 'tr' ? 'Sabah Işığı' : 'Morning Light';
    if (hour >= 12 && hour < 18) return lang === 'tr' ? 'Gün Ortası' : 'Noon Clarity';
    return lang === 'tr' ? 'Gece Huzuru' : 'Night Peace';
}
