import { elements } from '../core/dom.js';
import { AppState, saveHistoryToLocal } from '../core/state.js';
import { t } from '../core/i18n.js';
import { SOMATIC_MAP, EMOTION_OPTIONS, protocols, subEmotionMap, stateLegacyMap, PROTOCOL_META, EMOTION_PROTOCOL_MAP } from '../core/constants.js';
import { vibrate, getAutonomicClass } from '../core/utils.js';
import { CheckinAudio } from '../services/checkin-audio.js';


let configProps = {
  navigateTo: null,
  updateEmbodiedUI: null,
  SensoryEngine: null,
  calculateRegulationState: null,
  loadDashboard: null,
  resetBioFeedback: null,
  saveCheckinToFirebase: null,
  startMeditation: null,
  stopMeditation: null,
  get isTimerPaused() { return false; },
  set isTimerPaused(v) {},
  get exerciseParams() { return null; },
  set exerciseParams(v) {},
  get timeRemaining() { return 0; },
  set timeRemaining(v) {}
};

export function initCheckin(config) {
  Object.assign(configProps, config);
  
  if (elements.startCheckinBtn) {
    elements.startCheckinBtn.addEventListener('click', () => {
      vibrate('medium');
      AppState.isCheckIn = true; // Set flow context
      AppState.currentCheckIn = { 
        state: null, 
        regulation_state: null,
        pre_arousal: null,
        pre_valence: null,
        somatic_selections: [],
        selected_emotions: [],
        subEmotion: null, 
        customEmotion: '', 
        sensations: [], 
        savoringText: '', 
        timestamp: null 
      };
      
      if (isMorningCheckin()) {
        renderMorningCheckin();
      } else {
        renderSomaticEntry();
      }
    });
  }
}



function isMorningCheckin() {
  const now = new Date();
  const hour = now.getHours();
  // Sabah saat 5 ile 12 arasi
  if (hour < 5 || hour >= 12) return false;

  const history = (AppState.userHistory && AppState.userHistory.length > 0) ? AppState.userHistory : (AppState.mockHistory || []);
  if (history.length === 0) return true;
  
  const lastEntry = history[history.length - 1];
  const lastDate = new Date(lastEntry.timestamp);
  
  const isSameDay = lastDate.getDate() === now.getDate() && 
                    lastDate.getMonth() === now.getMonth() && 
                    lastDate.getFullYear() === now.getFullYear();
  
  return !isSameDay;
}

function renderMorningCheckin() {
  if (configProps.navigateTo) configProps.navigateTo('view-morning-checkin');
  CheckinAudio.playMorningOpen();
  
  const dreamBtns = document.querySelectorAll('#morningDreamBtns .morning-btn');
  const bodyBtns = document.querySelectorAll('#morningBodyBtns .morning-btn');
  
  let dreamVal = null;
  let bodyVal = null;

  AppState.currentCheckIn.sleep_data = {};

  const checkNext = () => {
    if (dreamVal && bodyVal) {
      setHUD('arrow', () => {
        CheckinAudio.playMorningNext();
        setHUD(null);
        renderSomaticEntry();
      });
    } else {
      setHUD(null);
    }
  };

  dreamBtns.forEach(btn => {
    btn.onclick = () => {
      dreamBtns.forEach(b => b.classList.remove('active', 'selected'));
      btn.classList.add('active', 'selected');
      dreamVal = btn.getAttribute('data-val');
      AppState.currentCheckIn.sleep_data.dream = dreamVal;
      CheckinAudio.playMorningSelect('dream');
      checkNext();
    };
  });

  bodyBtns.forEach(btn => {
    btn.onclick = () => {
      bodyBtns.forEach(b => b.classList.remove('active', 'selected'));
      btn.classList.add('active', 'selected');
      bodyVal = btn.getAttribute('data-val');
      AppState.currentCheckIn.sleep_data.body = bodyVal;
      CheckinAudio.playMorningSelect('body');
      checkNext();
    };
  });

  setHUD(null);
}

let deckState = {
  keys: [],
  currentIndex: 0,
  historyStack: []
};

export function renderSomaticEntry() {
  if (configProps.navigateTo) configProps.navigateTo('view-somatic-entry');
  CheckinAudio.playSomaticOpen();
  const container = elements.somaticContainer;
  if (!container) return;

  const shuffledKeys = Object.keys(SOMATIC_MAP).sort(() => Math.random() - 0.5);
  deckState = {
    keys: shuffledKeys,
    currentIndex: 0,
    historyStack: []
  };

  renderTinderDeck(container);
  setHUD(null);
}

const SOMATIC_ICONS = {
  // Ventral / Coherence
  "bs_ventral_shoulders": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  "bs_ventral_belly": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path><path d="M8 12c.5 1.5 2 2.5 4 2.5s3.5-1 4-2.5"></path></svg>`,
  "bs_ventral_settling": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="m8 11 4 4 4-4"></path><path d="M4 21h16"></path></svg>`,
  "bs_ventral_belong": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`,
  "bs_ventral_jaw": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,

  // Sympathetic / Mobilization
  "bs_symp_jaw": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 15h8"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
  "bs_symp_shoulders": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path><path d="M12 21V9"></path></svg>`,
  "bs_symp_chest": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v8M8 12h8"></path></svg>`,
  "bs_symp_hands": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6V9"></path></svg>`,
  "bs_symp_legs": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4v16M17 4v16M7 4v16"></path></svg>`,
  "bs_symp_heart": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
  "bs_symp_spring": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,

  // Dorsal / Immobilization
  "bs_dorsal_distant": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 14.14 14.14"></path></svg>`,
  "bs_dorsal_heavy": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="m8 11 4 4 4-4"></path><path d="M3 21h18"></path></svg>`,
  "bs_dorsal_numb": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>`,
  "bs_dorsal_eyes": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  "bs_dorsal_vulnerable": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
  "bs_dorsal_voice": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>`,

  // Neutral
  "bs_neutral_deep": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path><path d="M12 6v6l4 2"></path></svg>`,
  "bs_neutral_weight": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  "bs_neutral_cold": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"></path></svg>`,
  "bs_neutral_face": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,

  // Digestion / Head
  "bs_digest_throat": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v8M8 12h8"></path></svg>`,
  "bs_digest_appetite": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
  "bs_digest_stomach": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 8v8M8 12h8"></path></svg>`,
  "bs_digest_head": `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
};

const DEFAULT_SOMATIC_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v8M8 12h8"></path></svg>`;

function renderTinderDeck(container) {
  const selectedCount = AppState.currentCheckIn.somatic_selections.length;
  
  if (deckState.currentIndex >= deckState.keys.length) {
    if (selectedCount > 0) {
      CheckinAudio.playStepTransition();
      renderAffectGrid();
      return;
    }
  }

  const currentKey = deckState.keys[deckState.currentIndex];
  const nextKey = deckState.keys[deckState.currentIndex + 1];
  const item = SOMATIC_MAP[currentKey];
  const stateClass = item ? getAutonomicClass(item.state) : 'ventral';
  const promptIcon = SOMATIC_ICONS[currentKey] || DEFAULT_SOMATIC_ICON;

  const tagsHtml = AppState.currentCheckIn.somatic_selections.map(k => {
    const s = SOMATIC_MAP[k]?.state;
    const cls = s ? getAutonomicClass(s) : 'ventral';
    return `<span class="selected-tag-pill ${cls}" data-key="${k}" title="İptal et">${t(k)} <span class="tag-remove-icon">&times;</span></span>`;
  }).join('');

  const finishBtnHtml = `
    <div class="somatic-finish-slot">
      <button id="swipeFinishBtn" class="tinder-finish-btn ${selectedCount > 0 ? '' : 'hidden'}" title="İlerle" aria-label="İlerle">
        <span>İlerle (${selectedCount})</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  `;

  container.innerHTML = `
    <div class="somatic-tinder-wrapper">
      <div class="somatic-tinder-header">
        <div class="somatic-count-badge">
          <span>SEÇİLEN HİSLER:</span>
          <span id="somaticCountNum" class="count-accent">${selectedCount}</span>
        </div>
        <div class="somatic-selected-tags">${tagsHtml}</div>
      </div>

      <div class="somatic-card-stack">
        <div id="activeSomaticCard" class="somatic-swipe-card state-${stateClass} liquid-glass">
          <!-- Full-Card Overlay Indicators for Tinder Drag -->
          <div class="swipe-overlay-indicator pass-overlay">
            <div class="indicator-badge-circle pass">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <span class="indicator-overlay-text">PAS</span>
          </div>
          <div class="swipe-overlay-indicator select-overlay">
            <div class="indicator-badge-circle select">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span class="indicator-overlay-text">HİSSET</span>
          </div>

          <div class="card-somatic-body">
            <div class="somatic-icon-badge ${stateClass}">
              ${promptIcon}
            </div>
            <h3 class="somatic-card-text">${t(currentKey)}</h3>
          </div>
        </div>
      </div>

      <div class="somatic-tinder-controls">
        <button id="swipePassBtn" class="tinder-btn pass-btn" title="Pas (Sola Kaydır)" aria-label="Pas">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <button id="swipeUndoBtn" class="tinder-btn undo-btn" title="Geri Al" aria-label="Geri Al">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path></svg>
        </button>
        <button id="swipeSelectBtn" class="tinder-btn select-btn" title="Hisset (Sağa Kaydır)" aria-label="Hisset">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>
      ${finishBtnHtml}
    </div>
  `;

  setHUD(null);

  bindTinderEvents(container, currentKey);
}

function bindTinderEvents(container, currentKey) {
  const card = container.querySelector('#activeSomaticCard');
  const passBtn = container.querySelector('#swipePassBtn');
  const selectBtn = container.querySelector('#swipeSelectBtn');
  const undoBtn = container.querySelector('#swipeUndoBtn');
  const finishBtn = container.querySelector('#swipeFinishBtn');

  if (!card) return;

  const passOverlay = card.querySelector('.pass-overlay');
  const selectOverlay = card.querySelector('.select-overlay');

  let isDragging = false;
  let startX = 0, startY = 0;
  let currentX = 0, currentY = 0;

  const onStart = (e) => {
    isDragging = true;
    startX = e.clientX || e.touches?.[0]?.clientX || 0;
    startY = e.clientY || e.touches?.[0]?.clientY || 0;
    card.style.transition = 'none';
    if (passOverlay) {
      passOverlay.style.transition = 'none';
      passOverlay.style.opacity = 0;
    }
    if (selectOverlay) {
      selectOverlay.style.transition = 'none';
      selectOverlay.style.opacity = 0;
    }
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    const y = e.clientY || e.touches?.[0]?.clientY || 0;
    currentX = x - startX;
    currentY = y - startY;

    const rotate = currentX * 0.08;
    card.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${rotate}deg)`;

    if (currentX < 0) {
      if (passOverlay) passOverlay.style.opacity = Math.min(Math.abs(currentX) / 100, 0.95);
      if (selectOverlay) selectOverlay.style.opacity = 0;
    } else {
      if (selectOverlay) selectOverlay.style.opacity = Math.min(currentX / 100, 0.95);
      if (passOverlay) passOverlay.style.opacity = 0;
    }
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;

    const threshold = 90;
    if (currentX > threshold) {
      triggerSwipe('right');
    } else if (currentX < -threshold) {
      triggerSwipe('left');
    } else {
      card.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      if (passOverlay) {
        passOverlay.style.transition = 'opacity 0.3s ease';
        passOverlay.style.opacity = 0;
      }
      if (selectOverlay) {
        selectOverlay.style.transition = 'opacity 0.3s ease';
        selectOverlay.style.opacity = 0;
      }
    }
  };

  const triggerSwipe = (direction) => {
    card.style.transition = 'transform 0.4s ease, opacity 0.3s ease';
    vibrate('light');

    if (direction === 'right') {
      card.style.transform = 'translate3d(400px, 0, 0) rotate(30deg)';
      card.style.opacity = '0';
      
      const item = SOMATIC_MAP[currentKey];
      AppState.currentCheckIn.somatic_selections.push(currentKey);
      CheckinAudio.playChipSelect(item?.state || 'ventral');
      deckState.historyStack.push({ key: currentKey, action: 'selected' });
    } else {
      card.style.transform = 'translate3d(-400px, 0, 0) rotate(-30deg)';
      card.style.opacity = '0';
      
      CheckinAudio.playChipDeselect();
      deckState.historyStack.push({ key: currentKey, action: 'passed' });
    }

    deckState.currentIndex++;
    updatePrediction();

    setTimeout(() => {
      renderTinderDeck(container);
    }, 250);
  };

  card.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  card.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onEnd);

  const tagPills = container.querySelectorAll('.selected-tag-pill');
  tagPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      vibrate('light');
      const key = pill.getAttribute('data-key');
      const idx = AppState.currentCheckIn.somatic_selections.indexOf(key);
      if (idx !== -1) {
        AppState.currentCheckIn.somatic_selections.splice(idx, 1);
        CheckinAudio.playChipDeselect();
        updatePrediction();
        renderTinderDeck(container);
      }
    });
  });

  passBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    triggerSwipe('left');
  });

  selectBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    triggerSwipe('right');
  });

  finishBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (AppState.currentCheckIn.somatic_selections.length > 0) {
      CheckinAudio.playStepTransition();
      renderAffectGrid();
    }
  });

  undoBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (deckState.historyStack.length > 0 && deckState.currentIndex > 0) {
      vibrate('medium');
      const last = deckState.historyStack.pop();
      deckState.currentIndex--;
      if (last.action === 'selected') {
        const idx = AppState.currentCheckIn.somatic_selections.indexOf(last.key);
        if (idx !== -1) AppState.currentCheckIn.somatic_selections.splice(idx, 1);
      }
      updatePrediction();
      renderTinderDeck(container);
    }
  });
}

function updatePrediction() {
  const selected = AppState.currentCheckIn.somatic_selections;
  if (!selected.length || !elements.suggestionDot) {
    if (elements.suggestionDot) elements.suggestionDot.classList.add('hidden');
    return;
  }
  let sumA = 0, sumV = 0;
  selected.forEach(k => { sumA += SOMATIC_MAP[k]?.a || 0.5; sumV += SOMATIC_MAP[k]?.v || 0.5; });
  const avgA = sumA / selected.length;
  const avgV = sumV / selected.length;
  elements.suggestionDot.style.left = `${avgV * 100}%`;
  elements.suggestionDot.style.top = `${(1 - avgA) * 100}%`;
  elements.suggestionDot.classList.remove('hidden');
}

function applyDynamicFilter(chips, container) {
  const selectedKeys = AppState.currentCheckIn.somatic_selections;
  container.classList.remove('has-selection', 'selected-category-ventral', 'selected-category-sympathetic', 'selected-category-dorsal');
  
  // Reset orders
  chips.forEach(c => {
    const wrapper = c.closest('.neural-node-wrapper');
    if (wrapper) wrapper.style.order = "0";
  });

  if (selectedKeys.length > 0) {
    container.classList.add('has-selection');
    const activeStates = [...new Set(selectedKeys.map(k => SOMATIC_MAP[k]?.state).filter(Boolean))];
    activeStates.forEach(state => container.classList.add(`selected-category-${getAutonomicClass(state)}`));
    
    // Neural Clustering Logic: Prioritize SPECIFICALLY selected chips
    chips.forEach(chip => {
      const chipState = chip.getAttribute('data-state');
      const isSelected = chip.classList.contains('selected');
      const wrapper = chip.closest('.neural-node-wrapper');
      const target = wrapper || chip;
      
      if (isSelected) {
        target.style.order = "-2"; // Absolute top for selected
      } else if (activeStates.includes(chipState)) {
        target.style.order = "-1"; // Near top for related
      } else {
        target.style.order = "1"; // Push to back
      }
    });

    // Scroll to focus on selection
    const scrollTarget = container.closest('.view') || container;
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function renderAffectGrid() {
  if (configProps.navigateTo) configProps.navigateTo('view-affect-grid');
  CheckinAudio.playGridOpen();
  const area = elements.gridTouchArea;
  const userDot = elements.userDot;
  if (!area || !userDot) return;
  userDot.classList.add('hidden');
  area.onclick = (e) => {
    vibrate('medium');
    const rect = area.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const a = Math.max(0, Math.min(1, 1 - ((e.clientY - rect.top) / rect.height)));
    AppState.currentCheckIn.pre_arousal = a;
    AppState.currentCheckIn.pre_valence = v;
    CheckinAudio.playGridTouch(a, v);

    userDot.style.left = `${v * 100}%`;
    userDot.style.top = `${(1 - a) * 100}%`;
    userDot.classList.remove('hidden');

    // Update Quadrant Labels (Active State)
    document.querySelectorAll('.grid-quadrant-label').forEach(lbl => lbl.classList.remove('active'));
    let quadClass = '';
    if (v > 0.5 && a > 0.5) quadClass = '.grid-quad_tr';
    else if (v < 0.5 && a > 0.5) quadClass = '.grid-quad_tl';
    else if (v < 0.5 && a < 0.5) quadClass = '.grid-quad_bl';
    else if (v > 0.5 && a < 0.5) quadClass = '.grid-quad_br';
    const activeLbl = document.querySelector(quadClass);
    if (activeLbl) activeLbl.classList.add('active');

    if (elements.suggestionDot) elements.suggestionDot.style.opacity = '0.3';
    
    setHUD('arrow', () => {
      CheckinAudio.playStepTransition();
      const state = configProps.calculateRegulationState(a, v);
      AppState.currentCheckIn.regulation_state = state;
      AppState.currentCheckIn.state = stateLegacyMap[state]; 
      renderEmotionRefinement(state);
    });
  };

  // Initial Label Population
  const quads = { tr: 'grid_quad_tr', tl: 'grid_quad_tl', bl: 'grid_quad_bl', br: 'grid_quad_br' };
  Object.entries(quads).forEach(([q, key]) => {
    const el = document.querySelector(`.grid-quad_${q}`);
    if (el) el.textContent = t(key);
  });

  setHUD(null);
}

export function renderEmotionRefinement(state) {
  if (configProps.navigateTo) configProps.navigateTo('view-emotion-refinement');
  CheckinAudio.playEmotionOpen(state);
  const container = elements.emotionRefinementContainer;
  container.className = 'rhizome-container nebula-cluster'; // Apply new layout
  const cssClass = getAutonomicClass(state);
  container.innerHTML = EMOTION_OPTIONS[state].map(emoKey => `<button class="rhizome-chip ${cssClass}" data-emo="${emoKey}">${t(emoKey)}</button>`).join('');
  AppState.currentCheckIn.selected_emotions = [];
  const chips = container.querySelectorAll('.rhizome-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const emo = chip.getAttribute('data-emo');
      const idx = AppState.currentCheckIn.selected_emotions.indexOf(emo);
      if (idx === -1) {
        if (AppState.currentCheckIn.selected_emotions.length < 3) {
          AppState.currentCheckIn.selected_emotions.push(emo);
          chip.classList.add('selected');
          CheckinAudio.playEmotionSelect(state, AppState.currentCheckIn.selected_emotions.length);
        }
      } else {
        AppState.currentCheckIn.selected_emotions.splice(idx, 1);
        chip.classList.remove('selected');
        CheckinAudio.playChipDeselect();
      }
      
      if (AppState.currentCheckIn.selected_emotions.length > 0) {
        setHUD('arrow', () => {
          CheckinAudio.playStepTransition();
          // Diversity logic: Use the first selected emotion's specific protocol
          const firstEmotion = AppState.currentCheckIn.selected_emotions[0];
          const protocolId = EMOTION_PROTOCOL_MAP[firstEmotion] || (state === 'sympathetic' || state === 'mobilization' ? 'p_478' : (state === 'dorsal' || state === 'immobilization' ? 'p_bellows' : 'p_resonance'));
          prepareExercise(protocolId);
        });
      } else {
        setHUD(null);
      }
    });
  });
  // Default HUD: HIDDEN
  setHUD(null);
}

export function prepareExercise(protocolId) {
  const ex = protocols[protocolId];
  AppState.currentExercise = { ...ex, id: protocolId }; // Fix for exercise.js:27
  configProps.exerciseParams = AppState.currentExercise;
  elements.exerciseTitle.textContent = t(ex.titleKey);
  if(elements.exerciseMicrocopy) elements.exerciseMicrocopy.textContent = t(`mc_${protocolId}`);
  
  // Hide step indicator if NOT in check-in flow
  if (elements.exerciseStepIndicator) {
    elements.exerciseStepIndicator.style.display = AppState.isCheckIn ? 'block' : 'none';
  }
  
  // HARD BIND: Ensure the info button knows exactly which protocol we are in
  const exerciseInfoBtn = document.querySelector('#view-exercise .checkin-info-btn');
  if (exerciseInfoBtn) {
    exerciseInfoBtn.setAttribute('data-type', protocolId);
    exerciseInfoBtn.removeAttribute('data-info');
  }
  const globalInfoBtn = document.getElementById('globalInfoBtn');
  if (globalInfoBtn) {
    globalInfoBtn.setAttribute('data-type', protocolId);
    globalInfoBtn.removeAttribute('data-info');
  }

  configProps.timeRemaining = ex.totalDuration;
  if (configProps.navigateTo) configProps.navigateTo('view-exercise');
  setTimeout(() => {
    setHUD('skip', () => advanceFromExercise(), true);
    if (elements.globalHUD) elements.globalHUD.classList.add('active');
  }, 1000);
}

export function advanceFromExercise() {
  if (configProps.stopExercise) configProps.stopExercise();
  
  // If standalone (from Breathe page), show completion
  if (AppState.isCheckIn === false) {
    setHUD(null);
    if (configProps.navigateTo) configProps.navigateTo('view-completion');
    vibrate('success');
    CheckinAudio.playCompletion();
    // Hide the old button and use HUD instead
    if (elements.returnHomeBtn) elements.returnHomeBtn.style.display = 'none';
    
    setHUD('home', () => {
      CheckinAudio.playLanding();
      if (configProps.loadDashboard) configProps.loadDashboard();
      if (configProps.navigateTo) configProps.navigateTo('view-dashboard', 'left');
    });
    return;
  }

  startMarinationFlow();
}

function startMarinationFlow() {
  const protocolId = AppState.currentExercise?.id || 'p_resonance';
  if (configProps.startMeditationLoading) {
    configProps.startMeditationLoading(protocolId);
  } else if (configProps.loadDashboard) {
    configProps.loadDashboard();
  }
}

export function setHUD(mode, onClick, isMinimal = false) {
  if (!elements.globalHUD || !elements.globalHUDBtn) return;
  if (!mode) {
    elements.globalHUD.classList.remove('active', 'hud-minimal');
    elements.globalHUDBtn.innerHTML = '';
    elements.globalHUDBtn.onclick = null;
    return;
  }
  const svgs = {
    arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    skip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`
  };
  elements.globalHUDBtn.innerHTML = svgs[mode] || '';
  elements.globalHUD.classList.add('active');
  if (isMinimal) {
    elements.globalHUD.classList.add('hud-minimal');
  } else {
    elements.globalHUD.classList.remove('hud-minimal');
  }
  elements.globalHUDBtn.onclick = (e) => { e.preventDefault(); if (onClick) onClick(); };
}
