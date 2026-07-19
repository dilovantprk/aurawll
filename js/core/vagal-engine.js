// js/core/vagal-engine.js
// Based on Thayer & Lane's Neurovisceral Integration Model (NIM, 2000)
// and Grossman et al. (2026) consensus on autonomic regulation.

export const SENSORY_CONFIG = {
  OKAY: { jitter: 0, haptic: null, opacity: 0.1, blur: 0 },
  WIRED: { jitter: 2, haptic: [30, 100, 30], opacity: 0.4, blur: 5 },
  FOGGY: { jitter: 8, haptic: [300, 200, 300], opacity: 0.6, blur: 15 }
};

/**
 * Calculates continuous autonomic regulation capacity index R in [0, 100].
 * Valence (v) is primary positive input; Arousal (a) acts as a modulator.
 * A low score (0) represents high regulation, a high score (100) represents low regulation/protection.
 */
export function calculateRegulationCapacity(a, v) {
  const R = (1 - v) * 70 + (1 - a) * 30;
  return Math.max(0, Math.min(100, R));
}

/**
 * Maps autonomic state proportions to a vertical coordinate on the Autonomic Coherence Ladder.
 * maps R (0 to 100) linearly to vertical axis (15% at top, 85% at bottom):
 * y = 15 + R * 0.70
 */
export function calculateVagalPoint(v, s, d) {
  let R = 50;
  if (typeof v === 'object' && v !== null) {
    const a = v.pre_arousal !== undefined ? v.pre_arousal : 0.5;
    const val = v.pre_valence !== undefined ? v.pre_valence : 0.5;
    R = calculateRegulationCapacity(a, val);
  } else if (s === undefined && d === undefined) {
    R = typeof v === 'number' ? v : 50;
  } else {
    const total = v + s + d || 1;
    const pV = v / total;
    const pS = s / total;
    const pD = d / total;
    R = pS * 50 + pD * 100;
  }
  
  const rNorm = R > 100 ? 100 : (R < 0 ? 0 : R);
  const x = 50; // Centered
  const y = 15 + (rNorm * 0.70); // R = 0 -> y = 15%, R = 100 -> y = 85%
  
  return { x: `${x}%`, y: `${y}%` };
}

/**
 * Calculates dominant active state and corresponding color codes under the NIM framework.
 */
export function calculateVagalState(v, s, d) {
  const total = v + s + d || 1;
  const weights = { wV: v/total, wS: s/total, wD: d/total };
  
  let color = '#6ee7c7'; // Coherence / Ventral Green
  if (weights.wS > weights.wV && weights.wS > weights.wD) color = '#f4a24a'; // Mobilization Orange
  if (weights.wD > weights.wV && weights.wD > weights.wS) color = '#7b9ccc'; // Immobilization Blue
  
  return { color, weights };
}

/**
 * Translates regulation state names into proportional weight profiles for visualization.
 */
export function getWeightsFromState(stateId) {
  const cleanId = stateId ? stateId.toLowerCase() : '';
  if (cleanId === 'wired' || cleanId === 'mobilization' || cleanId === 'sympathetic') {
    return { wV: 0.1, wS: 0.8, wD: 0.1 };
  }
  if (cleanId === 'foggy' || cleanId === 'immobilization' || cleanId === 'dorsal') {
    return { wV: 0.1, wS: 0.1, wD: 0.8 };
  }
  return { wV: 0.8, wS: 0.1, wD: 0.1 };
}

/**
 * Computes Autonomic Flexibility (Otonom Esneklik) score based on history.
 * Measures variance of regulation state shifts and speed of recovery back to coherence.
 */
export function calculatePlasticity(history) {
  if (!history || history.length === 0) return { score: 0, level: 'low' };
  
  const recent = history.slice(0, 10);
  
  // Calculate R for each entry in recent history (R is in [0, 100])
  const rValues = recent.map(h => {
    let a = h.pre_arousal !== undefined ? h.pre_arousal : 0.5;
    let v = h.pre_valence !== undefined ? h.pre_valence : 0.5;
    
    // Support legacy values if pre_arousal/pre_valence is missing
    if (h.pre_arousal === undefined && h.pre_valence === undefined) {
      const stateKey = h.regulation_state || h.polyvagal_state || h.state;
      if (stateKey === 'coherence' || stateKey === 'ventral' || stateKey === 'okay' || stateKey === 'Okay') {
        a = 0.25; v = 0.8;
      } else if (stateKey === 'mobilization' || stateKey === 'sympathetic' || stateKey === 'wired' || stateKey === 'Wired') {
        a = 0.8; v = 0.2;
      } else if (stateKey === 'immobilization' || stateKey === 'dorsal' || stateKey === 'foggy' || stateKey === 'Foggy') {
        a = 0.1; v = 0.2;
      }
    }
    
    return calculateRegulationCapacity(a, v);
  });
  
  if (rValues.length < 2) {
    const score = Math.round(100 - rValues[0]);
    return { score, level: score > 70 ? 'high' : (score > 40 ? 'medium' : 'low') };
  }
  
  // 1. Calculate variance of R values
  const mean = rValues.reduce((sum, r) => sum + r, 0) / rValues.length;
  const variance = rValues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rValues.length;
  
  // 2. Calculate recovery speed (downward shifts from high R > 55 to lower R)
  let recoveries = 0;
  let totalTransitions = 0;
  for (let i = rValues.length - 1; i > 0; i--) {
    const rPrev = rValues[i];
    const rNext = rValues[i - 1];
    
    if (rPrev > 55) {
      totalTransitions++;
      if (rNext < rPrev) {
        const recoveryMagnitude = (rPrev - rNext) / 100;
        recoveries += recoveryMagnitude; 
      }
    }
  }
  
  const recoveryScore = totalTransitions > 0 ? (recoveries / totalTransitions) : 0.5;
  
  // Autonomic flexibility score components
  const activityComponent = Math.min(1.0, rValues.length / 7);
  const varianceComponent = Math.min(1.0, (variance / 10000) * 8);
  const recoveryComponent = Math.min(1.0, recoveryScore * 1.5);
  
  let finalScore = (activityComponent * 0.3 + varianceComponent * 0.35 + recoveryComponent * 0.35) * 100;
  finalScore = Math.round(Math.max(10, Math.min(100, finalScore)));
  
  return { 
    score: finalScore, 
    level: finalScore > 70 ? 'high' : (finalScore > 40 ? 'medium' : 'low') 
  };
}

export function getPoeticTimeLabel(lang) {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return lang === 'tr' ? 'Sabah Işığı' : 'Morning Light';
    if (hour >= 12 && hour < 18) return lang === 'tr' ? 'Gün Ortası' : 'Noon Clarity';
    return lang === 'tr' ? 'Gece Huzuru' : 'Night Peace';
}
