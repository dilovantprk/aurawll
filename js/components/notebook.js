import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { getHumanizedTime, renderMiniDeltaSVG, vibrate } from '../core/utils.js';
import { deleteSingleCheckin } from '../services/auth.js';

let configProps = {
  fb: null,
  navigateTo: null
};

export function initNotebook(config) {
  Object.assign(configProps, config);
  
  // Delegate delete clicks
  elements.notebookEntries?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-entry-btn');
    if (!deleteBtn) return;
    
    const timestamp = parseInt(deleteBtn.getAttribute('data-ts'));
    if (!timestamp) return;
    
    if (confirm(t('notebook_delete_confirm'))) {
      try {
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.3';
        
        // 1. Delete from Cloud if authenticated
        if (AppState.user && !AppState.user.guest) {
          await deleteSingleCheckin(timestamp);
        }
        
        // 2. Delete from Local
        if (AppState.mockHistory) {
          AppState.mockHistory = AppState.mockHistory.filter(h => h.timestamp !== timestamp);
          localStorage.setItem('aura_history', JSON.stringify(AppState.mockHistory));
        }
        
        // 3. Refresh UI
        loadNotebook();
        vibrate('light');
      } catch (err) {
        console.error("Delete failed:", err);
        deleteBtn.disabled = false;
        deleteBtn.style.opacity = '1';
      }
    }
  });
}

export async function loadNotebook() {
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
    history.forEach(entry => {
      const timeStr = getHumanizedTime(entry.timestamp);
      const stateKey = entry.polyvagal_state || entry.state;
      const stateNameMap = { 
        'ventral': AppState.lang === 'tr' ? 'Ventral' : 'Ventral',
        'okay': AppState.lang === 'tr' ? 'Ventral' : 'Ventral',
        'sympathetic': AppState.lang === 'tr' ? 'Sempatik' : 'Sympathetic',
        'wired': AppState.lang === 'tr' ? 'Sempatik' : 'Sympathetic',
        'dorsal': AppState.lang === 'tr' ? 'Dorsal' : 'Dorsal',
        'foggy': AppState.lang === 'tr' ? 'Dorsal' : 'Dorsal'
      };
      const stateName = stateNameMap[stateKey] || '...';

      let emotionLabel = '';
      if (entry.selected_emotions && entry.selected_emotions.length > 0) {
        emotionLabel = entry.selected_emotions.map(e => t(e)).join(', ');
      } else {
        emotionLabel = entry.customEmotion || (entry.subEmotion ? t(entry.subEmotion) : '');
      }

      if (!emotionLabel || emotionLabel === 'null') emotionLabel = stateName;
      const tags = [];
      if (entry.somatic_selections) entry.somatic_selections.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
      if (entry.sensations) entry.sensations.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
      
      let somaticSummary = '';
      if (tags.length > 0) {
        const prefix = AppState.lang === 'tr' ? 'Odak: ' : 'Focus: ';
        if (tags.length <= 2) {
          somaticSummary = prefix + tags.join(', ');
        } else {
          const otherText = AppState.lang === 'tr' ? ' diğer' : ' others';
          somaticSummary = `${prefix}${tags[0]}, ${tags[1]} +${tags.length - 2}${otherText}`;
        }
      }

      html += `
        <div class="aura-card glow-card fade-in-pure">
          <div class="card-header">
            <div class="aura-orb ${entry.polyvagal_state || 'ventral'}"></div>
            <div class="time-meta">${timeStr}</div>
            <div class="state-label">${emotionLabel}</div>
            <button class="delete-entry-btn" data-ts="${entry.timestamp}" aria-label="Delete">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
          <div class="card-body">
            <p class="user-note">${entry.savoringText || '...'}</p>
          </div>
          ${somaticSummary ? `<div class="card-footer"><span class="somatic-summary">${somaticSummary}</span></div>` : ''}
        </div>`;
    });
  }
  elements.notebookEntries.innerHTML = html;
}
