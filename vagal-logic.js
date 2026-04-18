export const VAGAL_VERTICES = {
  VENTRAL: { x: 50, y: 10, color: { r: 16, g: 185, b: 129 }, label: 'ventral' },
  SYMP: { x: 10, y: 90, color: { r: 245, g: 158, b: 11 }, label: 'symp' },
  DORSAL: { x: 90, y: 90, color: { r: 59, g: 130, b: 246 }, label: 'dorsal' }
};

export function calculateVagalState(wV, wS, wD) {
  const x = (wV * VAGAL_VERTICES.VENTRAL.x) + (wS * VAGAL_VERTICES.SYMP.x) + (wD * VAGAL_VERTICES.DORSAL.x);
  const y = (wV * VAGAL_VERTICES.VENTRAL.y) + (wS * VAGAL_VERTICES.SYMP.y) + (wD * VAGAL_VERTICES.DORSAL.y);

  const r = Math.round((wV * VAGAL_VERTICES.VENTRAL.color.r) + (wS * VAGAL_VERTICES.SYMP.color.r) + (wD * VAGAL_VERTICES.DORSAL.color.r));
  const g = Math.round((wV * VAGAL_VERTICES.VENTRAL.color.g) + (wS * VAGAL_VERTICES.SYMP.color.g) + (wD * VAGAL_VERTICES.DORSAL.color.g));
  const b = Math.round((wV * VAGAL_VERTICES.VENTRAL.color.b) + (wS * VAGAL_VERTICES.SYMP.color.b) + (wD * VAGAL_VERTICES.DORSAL.color.b));

  return { x, y, color: `rgb(${r}, ${g}, ${b})`, colorRgb: `${r}, ${g}, ${b}`, weights: { wV, wS, wD } };
}

export function calculateVagalPoint(vW, sW, dW) {
  const total = (vW || 0) + (sW || 0) + (dW || 0) || 100;
  const v = (vW || 0) / total;
  const s = (sW || 0) / total;
  const d = (dW || 0) / total;

  const x = (50 * v) + (10 * s) + (90 * d);
  const y = (10 * v) + (90 * s) + (90 * d);

  return { x: `${x}%`, y: `${y}%` };
}

export function getWeightsFromState(state) {
  switch(state) {
    case 'wired': return { wV: 0.1, wS: 0.8, wD: 0.1 };
    case 'foggy': return { wV: 0.1, wS: 0.1, wD: 0.8 };
    case 'okay':  return { wV: 0.8, wS: 0.1, wD: 0.1 };
    default:      return { wV: 0.33, wS: 0.33, wD: 0.33 };
  }
}

export function calculatePlasticity(weeklyData) {
  if (weeklyData.length < 2) return { level: 'low', score: 0, transitions: 0, uniqueStates: 0 };
  
  const sorted = [...weeklyData].sort((a, b) => a.timestamp - b.timestamp);
  const uniqueStates = new Set(sorted.map(d => d.state)).size;
  
  let transitions = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].state !== sorted[i - 1].state) transitions++;
  }
  
  let level = 'low';
  let score = 20;
  if (uniqueStates >= 3 || transitions >= 3) {
    level = 'high';
    score = Math.min(100, 60 + (transitions * 10));
  } else if (uniqueStates >= 2) {
    level = 'medium';
    score = 40 + (transitions * 10);
  }
  
  return { level, score: Math.min(100, score), transitions, uniqueStates };
}

export function getPoeticTimeLabel(timestamp, state) {
  const hour = new Date(timestamp).getHours();
  let timeStr = "";
  
  if (hour >= 5 && hour < 8) timeStr = "Dawn Chorus";
  else if (hour >= 17 && hour < 19) timeStr = "Golden Hour";
  else if (hour >= 19 && hour < 21) timeStr = "Blue Hour";
  else if (hour >= 21 || hour < 5) timeStr = "Deep Night";
  else timeStr = "Daylight Flow";

  let stateStr = "";
  if (state === 'okay') stateStr = "Ventral Flow";
  else if (state === 'wired') stateStr = "Sympathetic Alert";
  else if (state === 'foggy') stateStr = "Dorsal Fog";

  return `${timeStr} / ${stateStr}`;
}

export const SENSORY_CONFIG = {
  WIRED: {
    haptic: [30, 50, 30], // Fast, light pulses
    audioFreq: 6,         // (Legacy) 6Hz Theta 
    jitter: 2             // CSS Jitter strength
  },
  FOGGY: {
    haptic: [100, 400, 100], // Deep, slow pulses (Heartbeat)
    audioFreq: 12,           // (Legacy) 12Hz Alpha
    jitter: 0
  },
  OKAY: {
    haptic: [10],
    audioFreq: 10,
    jitter: 0
  }
};
