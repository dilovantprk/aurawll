import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { getHumanizedTime, renderMiniDeltaSVG, vibrate, normalizeEntry, getAutonomicClass, getRegulationStateLabel } from '../core/utils.js';
import { calculateRegulationCapacity } from '../core/vagal-engine.js';
import { deleteSingleCheckin } from '../services/auth.js';
import { showInfoModal, showConfirm } from './modals.js';

let configProps = {
  fb: null,
  navigateTo: null,
  setHUD: null
};

let loadedEntries = [];
let openOrigin = null; // 'dashboard' or 'notebook'

export function initNotebook(config) {
  Object.assign(configProps, config);
  
  // Delegate delete clicks
  elements.notebookEntries?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-entry-btn');
    if (!deleteBtn) return;
    
    e.stopPropagation(); // Prevent card click trigger
    
    const timestamp = parseInt(deleteBtn.getAttribute('data-ts'));
    if (!timestamp) return;
    
    const ok = await showConfirm({
      title: t('warn_title') || 'Uyarı',
      message: t('notebook_delete_confirm') || 'Bu günlüğü silmek istediğinizden emin misiniz?',
      confirmText: t('btn_delete') || 'Sil',
      cancelText: t('btn_cancel') || 'Vazgeçtim'
    });
    if (ok) {
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
        
        // 3. Refresh UI globally
        window.dispatchEvent(new CustomEvent('aura-history-updated'));
        vibrate('light');
      } catch (err) {
        console.error("Delete failed:", err);
        deleteBtn.disabled = false;
        deleteBtn.style.opacity = '1';
      }
    }
  });

  // Card click details (subpage reader)
  elements.notebookEntries?.addEventListener('click', (e) => {
    if (e.target.closest('.delete-entry-btn')) return;
    
    const card = e.target.closest('.aura-card');
    if (!card) return;

    const timestamp = parseInt(card.getAttribute('data-ts'));
    if (!timestamp) return;

    const entry = loadedEntries.find(h => h.timestamp === timestamp);
    if (entry && entry.savoringText && entry.savoringText.length > 120) {
      openArticleSubpage(entry);
    }
  });

  // Subpage Back Button
  elements.notebookBackBtn?.addEventListener('click', () => {
    closeArticleSubpage();
  });

  // Writing Subpage Back Button
  elements.notebookWriteBackBtn?.addEventListener('click', () => {
    closeWriteSubpage();
  });

  // MutationObserver to reset notebook view back to list when navigating away
  const notebookView = document.getElementById('view-notebook');
  if (notebookView) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('hidden')) {
          // View became hidden - reset subpages
          elements.notebookSubpageDetail?.classList.remove('active');
          elements.notebookSubpageDetail?.classList.add('hidden');
          elements.notebookSubpageWrite?.classList.remove('active');
          elements.notebookSubpageWrite?.classList.add('hidden');
          elements.notebookMainMenu?.classList.remove('hidden');
        }
      });
    });
    observer.observe(notebookView, { attributes: true, attributeFilter: ['class'] });
  }

  // Quick Action Card Handlers
  const quickNoteBtn = document.getElementById('notebookQuickNoteBtn');
  if (quickNoteBtn) {
    quickNoteBtn.addEventListener('click', () => {
      openWriteSubpage();
    });
  }

  const articleBtn = document.getElementById('notebookArticleBtn');
  if (articleBtn) {
    articleBtn.addEventListener('click', () => {
      vibrate('light');
      showInfoModal('notebook');
    });
  }

  // Input Character Count Handler + HUD integration
  elements.notebookWriteInput?.addEventListener('input', () => {
    const len = elements.notebookWriteInput.value.length;
    if (elements.notebookWriteCharCount) {
      elements.notebookWriteCharCount.textContent = `${len} / 1000`;
    }
    // HUD save button logic
    if (configProps.setHUD) {
      const text = elements.notebookWriteInput.value.trim();
      if (text.length > 0) {
        configProps.setHUD('check', () => {
          elements.notebookSaveNoteBtn?.click();
        });
      } else {
        configProps.setHUD(null);
      }
    }
  });

  // Save Note Handler
  elements.notebookSaveNoteBtn?.addEventListener('click', async () => {
    const text = elements.notebookWriteInput?.value.trim() || '';
    if (text) {
      const entry = {
        state: 'okay', 
        regulation_state: 'coherence',
        pre_arousal: 5,
        pre_valence: 5,
        somatic_selections: [],
        selected_emotions: [],
        subEmotion: 'se_neutral', 
        customEmotion: AppState.lang === 'tr' ? 'Hızlı Günlük' : 'Quick Journal', 
        sensations: [],
        savoringText: text,
        timestamp: Date.now()
      };
      
      // Save locally
      if (!AppState.mockHistory) AppState.mockHistory = [];
      AppState.mockHistory.unshift(entry);
      localStorage.setItem('aura_history', JSON.stringify(AppState.mockHistory));

      // Save to cloud in background if authenticated
      const fb = configProps.fb;
      if (fb && fb.isInitialized && AppState.user && !AppState.user.guest) {
        try {
          await fb.addDoc(fb.collection(fb.db, "checkins"), { uid: AppState.user.uid, ...entry });
        } catch(e) {
          console.warn("Quick journal cloud save failed", e);
        }
      }
      
      if (elements.notebookWriteInput) {
        elements.notebookWriteInput.value = '';
      }
      
      vibrate('medium');
      // Reload history globally
      window.dispatchEvent(new CustomEvent('aura-history-updated'));
    }
    
    closeWriteSubpage();
  });

  // Global listener to open writing subpage
  window.addEventListener('aura-open-write-notebook', () => {
    openWriteSubpage('dashboard');
  });

  // Handle updates dynamically
  window.addEventListener('aura-history-updated', loadNotebook);
}

function openArticleSubpage(entry) {
  if (!elements.notebookSubpageDetail || !elements.notebookMainMenu) return;

  vibrate('light');

  // Populate subpage elements
  const normalized = normalizeEntry(entry);
  const stateKey = normalized.regulation_state || normalized.state || 'coherence';
  if (elements.articleOrb) elements.articleOrb.className = `aura-orb ${getAutonomicClass(stateKey)}`;
  if (elements.articleTime) elements.articleTime.textContent = getHumanizedTime(normalized.timestamp);

  const a = normalized.pre_arousal !== undefined ? normalized.pre_arousal : 0.5;
  const v = normalized.pre_valence !== undefined ? normalized.pre_valence : 0.5;
  const R = calculateRegulationCapacity(a, v);
  const stateName = getRegulationStateLabel(R, a, AppState.lang);
  let emotionLabel = '';
  if (entry.selected_emotions && entry.selected_emotions.length > 0) {
    emotionLabel = entry.selected_emotions.map(e => t(e)).join(', ');
  } else {
    emotionLabel = entry.customEmotion || (entry.subEmotion ? t(entry.subEmotion) : '');
  }
  if (!emotionLabel || emotionLabel === 'null') emotionLabel = stateName;
  if (elements.articleState) elements.articleState.textContent = emotionLabel;

  // Somatic Tags
  const tags = [];
  if (entry.somatic_selections) entry.somatic_selections.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
  if (entry.sensations) entry.sensations.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
  
  if (elements.articleSomaticTags) {
    if (tags.length > 0) {
      elements.articleSomaticTags.innerHTML = tags.map(tag => `<span class="notebook-sensation-tag">${tag}</span>`).join('');
      elements.articleSomaticTags.style.display = 'flex';
    } else {
      elements.articleSomaticTags.innerHTML = '';
      elements.articleSomaticTags.style.display = 'none';
    }
  }

  if (elements.articleBody) elements.articleBody.textContent = entry.savoringText || '...';

  // Toggle visibility with transition class
  elements.notebookMainMenu.classList.add('hidden');
  elements.notebookSubpageDetail.classList.remove('hidden');
  setTimeout(() => {
    elements.notebookSubpageDetail.classList.add('active');
  }, 50);
}

function closeArticleSubpage() {
  if (!elements.notebookSubpageDetail || !elements.notebookMainMenu) return;

  vibrate('light');

  elements.notebookSubpageDetail.classList.remove('active');
  setTimeout(() => {
    elements.notebookSubpageDetail.classList.add('hidden');
    elements.notebookMainMenu.classList.remove('hidden');
  }, 350); // Match transition duration (0.35s)
}

function openWriteSubpage(origin = 'notebook') {
  if (!elements.notebookSubpageWrite || !elements.notebookMainMenu) return;

  openOrigin = origin;
  vibrate('light');

  // Reset textarea & char count
  if (elements.notebookWriteInput) {
    elements.notebookWriteInput.value = '';
  }
  if (elements.notebookWriteCharCount) {
    elements.notebookWriteCharCount.textContent = `0 / 1000`;
  }

  // Toggle visibility with transition class
  elements.notebookMainMenu.classList.add('hidden');
  elements.notebookSubpageWrite.classList.remove('hidden');
  setTimeout(() => {
    elements.notebookSubpageWrite.classList.add('active');
    if (elements.notebookWriteInput) {
      elements.notebookWriteInput.focus();
    }
  }, 50);
}

function closeWriteSubpage() {
  if (!elements.notebookSubpageWrite || !elements.notebookMainMenu) return;

  vibrate('light');
  if (configProps.setHUD) configProps.setHUD(null);

  elements.notebookSubpageWrite.classList.remove('active');
  setTimeout(() => {
    elements.notebookSubpageWrite.classList.add('hidden');
    // Smart navigation: go back to dashboard if opened from there
    if (openOrigin === 'dashboard' && configProps.navigateTo) {
      configProps.navigateTo('view-dashboard');
    } else {
      elements.notebookMainMenu.classList.remove('hidden');
    }
    openOrigin = null;
  }, 350); // Match transition duration (0.35s)
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
  loadedEntries = history;
  let html = '';

  if (history.length === 0) {
    html = `<div class="empty-state">${t('notebook_empty')}</div>`;
  } else {
    history.forEach(entry => {
      const normalized = normalizeEntry(entry);
      const timeStr = getHumanizedTime(normalized.timestamp);
      const stateKey = normalized.regulation_state || normalized.state;
      const a = normalized.pre_arousal !== undefined ? normalized.pre_arousal : 0.5;
      const v = normalized.pre_valence !== undefined ? normalized.pre_valence : 0.5;
      const R = calculateRegulationCapacity(a, v);
      const stateName = getRegulationStateLabel(R, a, AppState.lang);

      let emotionLabel = '';
      if (normalized.selected_emotions && normalized.selected_emotions.length > 0) {
        emotionLabel = normalized.selected_emotions.map(e => t(e)).join(', ');
      } else {
        emotionLabel = normalized.customEmotion || (normalized.subEmotion ? t(normalized.subEmotion) : '');
      }

      if (!emotionLabel || emotionLabel === 'null') emotionLabel = stateName;
      const tags = [];
      if (normalized.somatic_selections) normalized.somatic_selections.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
      if (normalized.sensations) normalized.sensations.forEach(s => { const trans = t(s); if (trans && trans !== s && trans !== 'null') tags.push(trans); });
      
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

      const isLong = normalized.savoringText && normalized.savoringText.length > 120;
      const cardText = isLong ? `${normalized.savoringText.substring(0, 120)}...` : (normalized.savoringText || '...');
      const cardClass = isLong ? 'aura-card glow-card fade-in-pure has-long-note' : 'aura-card glow-card fade-in-pure';

      html += `
        <div class="${cardClass}" data-ts="${normalized.timestamp}">
          <div class="card-header">
            <div class="aura-orb ${getAutonomicClass(normalized.regulation_state)}"></div>
            <div class="time-meta">${timeStr}</div>
            <div class="state-label">${emotionLabel}</div>
            <button class="delete-entry-btn" data-ts="${entry.timestamp}" aria-label="Delete">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
          <div class="card-body">
            <p class="user-note">${cardText}</p>
            ${isLong ? `<span class="read-more-btn">${t('notebook_read_more')}</span>` : ''}
          </div>
          ${somaticSummary ? `<div class="card-footer"><span class="somatic-summary">${somaticSummary}</span></div>` : ''}
        </div>`;
    });
  }
  elements.notebookEntries.innerHTML = html;
}
