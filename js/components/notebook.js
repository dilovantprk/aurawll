import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { getHumanizedTime, renderMiniDeltaSVG, vibrate } from '../core/utils.js';

let configProps = {
  fb: null,
  navigateTo: null
};

export function initNotebook(config) {
  Object.assign(configProps, config);
}

export async function loadNotebook() {
  if (configProps.navigateTo) configProps.navigateTo('view-notebook');
  if (!elements.notebookEntries) return;

  elements.notebookEntries.innerHTML = `
    <div class="skeleton-card skeleton" style="margin-bottom: 1rem;"></div>
    <div class="skeleton-card skeleton" style="margin-bottom: 1rem;"></div>
    <div class="skeleton-card skeleton"></div>
  `;

  let localEntries = AppState.mockHistory || [];
  let cloudEntries = [];
  
  const fb = configProps.fb;
  try {
    if (fb && fb.isInitialized && AppState.user && !AppState.user.guest) {
      const q = fb.query(fb.collection(fb.db, 'checkins'), fb.where('uid', '==', AppState.user.uid));
      const snapshot = await fb.getDocs(q);
      snapshot.forEach(doc => cloudEntries.push(doc.data()));
    }
  } catch(e) {
    console.warn('Cloud notebook load error:', e);
  }

  // Merge & Deduplicate by timestamp
  const merged = [...localEntries];
  const cloudTimestamps = new Set(localEntries.map(e => e.timestamp));
  cloudEntries.forEach(ce => { if (!cloudTimestamps.has(ce.timestamp)) merged.push(ce); });
  merged.sort((a, b) => b.timestamp - a.timestamp);
  renderNotebook(merged);
}

export function renderNotebook(providedEntries) {
  if (!elements.notebookEntries) return;
  const history = providedEntries || (AppState.user && AppState.user.history ? AppState.user.history : (AppState.mockHistory || []));
  let html = '';

  if (history.length === 0) {
    html = `<div class="empty-state">${t('notebook_empty')}</div>`;
  } else {
    html = `<div class="notebook-list">`;
    history.forEach(entry => {
      const timeStr = getHumanizedTime(entry.timestamp);
      const stateName = { 'wired': AppState.lang === 'tr' ? 'Sempatik' : 'Sympathetic', 'foggy': AppState.lang === 'tr' ? 'Dorsal' : 'Dorsal', 'okay': AppState.lang === 'tr' ? 'Ventral' : 'Ventral' }[entry.state] || '...';
      let emotionLabel = entry.customEmotion || (entry.subEmotion ? t(entry.subEmotion) : '');
      if (emotionLabel === 'null' || !emotionLabel || emotionLabel === entry.subEmotion) emotionLabel = stateName; 
      const tags = [];
      if (entry.somatic_selections) entry.somatic_selections.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
      if (entry.sensations) entry.sensations.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
      
      html += `
        <div class="aura-card fade-in-up">
          <div class="card-header">
            <div class="aura-orb ${entry.polyvagal_state || 'ventral'}"></div>
            <div class="time-meta">${timeStr}</div>
            <div class="state-label">${emotionLabel}</div>
          </div>
          <div class="card-body">
            <p class="user-note">${entry.savoringText ? `"${entry.savoringText}"` : '...'}</p>
            <div class="delta-mini-grid">${renderMiniDeltaSVG(entry)}</div>
          </div>
          ${tags.length > 0 ? `<div class="card-footer">${tags.map(tag => `<span class="somatic-tag">${tag}</span>`).join('')}</div>` : ''}
        </div>`;
    });
    html += '</div>';
  }
  elements.notebookEntries.innerHTML = html;
}
