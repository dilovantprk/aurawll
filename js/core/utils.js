import { t } from './i18n.js';
import { AppState } from './state.js';
import { protocols } from './constants.js';
import { calculateRegulationCapacity } from './vagal-engine.js';

export function calculateEarnedBadges(history) {
  const earned = new Set();
  if (!history || history.length === 0) return Array.from(earned);

  const usedProtocols = new Set(history.map(h => h.protocolId).filter(id => id));
  const allProtocols = Object.keys(protocols);
  if (allProtocols.every(p => usedProtocols.has(p))) earned.add('explorer');

  history.forEach(h => {
    const hour = new Date(h.timestamp).getHours();
    if (hour >= 5 && hour < 10) earned.add('earlybird');
    if (hour >= 23 || hour < 4) earned.add('nightowl');
  });

  if (history.length >= 50) earned.add('master');

  let ventralCount = 0;
  for (let i = 0; i < history.length; i++) {
    const entry = normalizeEntry({ ...history[i] });
    const state = entry.regulation_state || entry.state;
    if (state === 'coherence' || state === 'ventral' || state === 'okay' || state === 'Okay') {
      ventralCount++;
      if (ventralCount >= 5) { earned.add('zen'); break; }
    } else {
      ventralCount = 0;
    }
  }

  // Simple streak check (simulated as we already have comm_streak in UI)
  if (history.length >= 7) earned.add('streak7');
  
  return Array.from(earned);
}

export function getAutonomicClass(state) {
  const map = {
    coherence: 'ventral',
    mobilization: 'sympathetic',
    immobilization: 'dorsal',
    ventral: 'ventral',
    sympathetic: 'sympathetic',
    dorsal: 'dorsal'
  };
  return map[state] || 'ventral';
}

export function normalizeEntry(entry) {
  if (!entry) return null;
  // If entry uses old polyvagal_state key, map to regulation_state
  if (entry.polyvagal_state && !entry.regulation_state) {
    entry.regulation_state = entry.polyvagal_state;
  }
  // Normalize old state values to new NIM state values
  if (entry.regulation_state === 'ventral') entry.regulation_state = 'coherence';
  if (entry.regulation_state === 'sympathetic') entry.regulation_state = 'mobilization';
  if (entry.regulation_state === 'dorsal') entry.regulation_state = 'immobilization';
  
  // Normalize entry.state legacy display values if they are old strings
  if (entry.state === 'ventral' || entry.state === 'coherence' || entry.state === 'Okay' || entry.state === 'okay') entry.state = 'okay';
  if (entry.state === 'sympathetic' || entry.state === 'mobilization' || entry.state === 'Wired' || entry.state === 'wired') entry.state = 'wired';
  if (entry.state === 'dorsal' || entry.state === 'immobilization' || entry.state === 'Foggy' || entry.state === 'foggy') entry.state = 'foggy';

  return entry;
}

export function normalizeCheckinData(data) {
  if (!data) return data;
  
  // Normalize key names
  if (data.polyvagal_state && !data.regulation_state) {
    data.regulation_state = data.polyvagal_state;
  }
  
  if (data.pre_arousal === undefined) {
    const legacyMap = {
      "Wired": { a: 0.8, v: 0.2, state: "mobilization" },
      "Foggy": { a: 0.2, v: 0.2, state: "immobilization" },
      "Okay":  { a: 0.5, v: 0.8, state: "coherence" }
    };
    const mapped = legacyMap[data.state] || legacyMap["Okay"];
    data.pre_arousal = mapped.a;
    data.pre_valence = mapped.v;
    data.regulation_state = mapped.state;
    data.is_legacy = true;
  }
  
  // Ensure regulation_state is mapped correctly
  if (data.regulation_state === 'ventral') data.regulation_state = 'coherence';
  if (data.regulation_state === 'sympathetic') data.regulation_state = 'mobilization';
  if (data.regulation_state === 'dorsal') data.regulation_state = 'immobilization';
  
  return data;
}

export function calculateRegulationState(a, v) {
  const R = calculateRegulationCapacity(a, v);
  if (R < 45) return "coherence";
  return a >= 0.5 ? "mobilization" : "immobilization";
}

export function getRegulationStateLabel(R, a, lang = 'tr') {
  if (R < 30) {
    return lang === 'tr' ? 'Sosyal uyum ve prefrontal regülasyon' : 'Social coherence & prefrontal regulation';
  }
  if (R < 45) {
    return lang === 'tr' ? 'Regülasyona yakın geçiş' : 'Near-regulation transition';
  }
  if (R < 55) {
    return lang === 'tr' ? 'Aktif mobilizasyon' : 'Active mobilization';
  }
  if (R < 70) {
    return lang === 'tr' ? 'Korumaya yakın geçiş' : 'Near-protection transition';
  }
  return lang === 'tr' ? 'Koruyucu enerji tasarrufu (kapanma)' : 'Protective energy conservation (shutdown)';
}

export function getRegulationColor(R) {
  if (R < 30) return '#64E49F'; // Green
  if (R < 45) return '#85E3B3'; // Light Green
  if (R < 55) return '#FBA044'; // Orange
  if (R < 70) return '#E0A96D'; // Light Orange
  return '#62A4FF'; // Blue
}

export function calculatePolyvagalState(a, v) {
  const state = calculateRegulationState(a, v);
  const legacyMap = { coherence: 'ventral', mobilization: 'sympathetic', immobilization: 'dorsal' };
  return legacyMap[state] || state;
}

export function getHumanizedTime(timestamp) {
  if (!timestamp) return '...';
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  
  const isToday = now.toDateString() === date.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diff < 60000) return t('time_just_now');
  if (isToday) return `${t('time_today')} ${timeStr}`;
  if (isYesterday) return `${t('time_yesterday')} ${timeStr}`;
  
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days <= 1 || isYesterday) return `${t('time_yesterday')} ${timeStr}`;
    return `${days} ${t('time_days_ago')}`;
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function renderMiniDeltaSVG(entry) {
  if (!entry) return '';
  const normalized = normalizeEntry({ ...entry });
  const a = normalized.pre_arousal || 0.5;
  const v = normalized.pre_valence || 0.5;
  const color = (v >= 0.5) ? 'rgb(100, 228, 159)' : (a >= 0.5 ? 'rgb(255, 107, 107)' : 'rgb(98, 164, 255)');
  return `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="${v * 24}" cy="${(1 - a) * 24}" r="3" fill="${color}" /></svg>`;
}

export function vibrate(type = 'light') {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) return;
  if (AppState && AppState.hapticEnabled === false) return;
  
  const patterns = {
    light: [10],
    medium: [15],
    heavy: [25],
    success: [10, 30, 10],
    error: [50, 50, 50],
    impact: [20]
  };
  
  window.navigator.vibrate(patterns[type] || patterns.light);
}

/**
 * Synchronizes the global application theme (background gradient & accents).
 * Pinned to Aura's fixed, high-fidelity dark obsidian & muted slate aesthetic.
 */
export function syncGlobalTheme() {
  // Fixed calm obsidian & neutral slate accent palette matching user preference
  const theme = { rgb: '134, 137, 156', hex: '#86899c' };
  
  const root = document.documentElement;
  root.style.setProperty('--vagal-color-rgb', theme.rgb);
  root.style.setProperty('--accent-primary', theme.hex);
  root.style.setProperty('--vagal-accent', theme.hex);
  root.style.setProperty('--accent-primary-hover', theme.hex);

  // Dispatch custom event for WebGL or other listeners to update without layout thrashing
  window.dispatchEvent(new CustomEvent('aura-theme-updated', { detail: { rgb: theme.rgb } }));
}
