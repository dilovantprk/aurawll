import { t } from './i18n.js';

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
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return t('time_just_now');
  if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('time_mins_ago')}`;
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function renderMiniDeltaSVG(entry) {
  if (!entry) return '';
  const a = entry.pre_arousal || 0.5;
  const v = entry.pre_valence || 0.5;
  const color = (v >= 0.5) ? 'rgb(100, 228, 159)' : (a >= 0.5 ? 'rgb(255, 107, 107)' : 'rgb(98, 164, 255)');
  return `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="${v * 24}" cy="${(1 - a) * 24}" r="3" fill="${color}" /></svg>`;
}
