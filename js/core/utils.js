import { t } from './i18n.js';
import { AppState } from './state.js';
import { protocols } from './constants.js';

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
    const state = history[i].polyvagal_state || history[i].state;
    if (state === 'ventral' || state === 'okay') {
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

export function normalizeCheckinData(data) {
  if (!data) return data;
  if (data.pre_arousal === undefined) {
    const legacyMap = {
      "Wired": { a: 0.8, v: 0.2, state: "sympathetic" },
      "Foggy": { a: 0.2, v: 0.2, state: "dorsal" },
      "Okay":  { a: 0.5, v: 0.8, state: "ventral" }
    };
    const mapped = legacyMap[data.state] || legacyMap["Okay"];
    return {
      ...data,
      pre_arousal: mapped.a,
      pre_valence: mapped.v,
      polyvagal_state: mapped.state,
      is_legacy: true
    };
  }
  return data;
}

export function calculatePolyvagalState(a, v) {
  if (v >= 0.5) return "ventral";
  return a >= 0.5 ? "sympathetic" : "dorsal";
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
  const a = entry.pre_arousal || 0.5;
  const v = entry.pre_valence || 0.5;
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
