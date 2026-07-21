import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { PROTOCOL_META, BADGES, protocols } from '../core/constants.js';
import { AppState } from '../core/state.js';
import { vibrate, calculateEarnedBadges, getRegulationStateLabel, getRegulationColor, normalizeEntry } from '../core/utils.js';
import { calculateRegulationCapacity } from '../core/vagal-engine.js';
import { SensoryEngine } from '../services/sensory.js';

let galaxyAnimationId = null;

let isModalOpen = false;
let lastInfoBtn = null;
let isInitialized = false;
let currentProtocolId = null;

let configProps = {
  pauseExercise: null,
  pauseMeditation: null,
  resumeExercise: null,
  resumeMeditation: null,
  getExerciseParams: null,
  isTimerPaused: false,
  isMeditationPaused: false
};

export function initModals(config) {
  Object.assign(configProps, config);
  if (isInitialized) return;
  isInitialized = true;
  
  const closeAll = () => {
    hideInfoModal();
    hideCommunityModal();
    hideVagalModal();
    lastInfoBtn = null;
  };

  // Global Info Support & Close Buttons
  document.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.cockpit-info-btn, .info-icon, .info-trigger');
    const isCloseBtn = e.target.closest('.info-close-btn');
    const isBackdrop = e.target.classList.contains('info-backdrop') || 
                       e.target.classList.contains('modal-backdrop');

    if (infoBtn) {
      const infoKey = infoBtn.getAttribute('data-info') || infoBtn.getAttribute('data-type');
      const isCurrentlyActive = elements.infoModal.classList.contains('active') || elements.vagalModal.classList.contains('active');
      
      // Play glass slide sound
      try {
        SensoryEngine.playGlassSlide();
      } catch(e) {}

      if (isCurrentlyActive && lastInfoBtn === infoBtn) {
        closeAll();
      } else {
        if (infoKey) {
          openInfoArchive(infoKey, infoBtn);
          lastInfoBtn = infoBtn;
        }
      }
    } else if (isCloseBtn || isBackdrop) {
      closeAll();
    }
    
    // Also handle clicking the outer container of the modal
    if (e.target.classList.contains('modal')) {
      closeAll();
    }
  });

  // Start Button inside Info Modal (Desktop alternative)
  if (elements.infoStartBtn) {
    elements.infoStartBtn.onclick = () => {
      const AppState = configProps.AppState;
      if (AppState && AppState.currentView === 'view-meditations') {
        const protocolId = currentProtocolId || AppState.currentExercise?.id || 'p_resonance';
        hideInfoModal();
        if (typeof configProps.prepareExercise === 'function') {
          configProps.prepareExercise(protocolId);
        }
      }
    };
  }

  initCommunityModal();
  initDataSovereigntyActions();
}

export function initCommunityModal() {
  elements.commTabBtns.forEach(btn => {
    btn.onclick = () => {
      const tab = btn.getAttribute('data-tab');
      elements.commTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      elements.commTabPanes.forEach(pane => {
        const paneId = pane.getAttribute('id');
        const expectedId = tab === 'ben' ? 'commTabBen' : (tab === 'topluluk' ? 'commTabTopluluk' : 'commTabVeri');
        if (paneId === expectedId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      if (tab === 'topluluk') startGalaxy();
      else stopGalaxy();

      updateTabIndicator();
    };
  });

  initSwipeToDismiss(elements.communityModal, elements.communityBackdrop, hideCommunityModal);
  initSwipeToDismiss(elements.vagalModal, elements.vagalBackdrop, hideVagalModal);
  initSwipeToDismiss(elements.infoModal, elements.infoBackdrop, hideInfoModal, handleInfoModalSwipeUp);
}

function handleInfoModalSwipeUp() {
  const AppState = configProps.AppState;
  if (!AppState) return;
  
  const protocolId = currentProtocolId || AppState.currentExercise?.id || 'p_resonance';
  
  if (AppState.currentView === 'view-meditations') {
    hideInfoModal();
    if (typeof configProps.prepareExercise === 'function') {
      configProps.prepareExercise(protocolId);
    }
  } else if (AppState.currentView === 'view-exercise') {
    if (typeof configProps.stopExercise === 'function') {
      configProps.stopExercise();
    }
    
    hideInfoModal();
    
    if (typeof configProps.startMeditationLoading === 'function') {
      configProps.startMeditationLoading(protocolId);
    }
  }
}

export function initSwipeToDismiss(modal, backdrop, closeFn, swipeUpFn = null) {
  if (!modal || !backdrop) return;

  const content = modal.querySelector('.modal-content') || modal;
  const handle = modal.querySelector('.modal-handle') || modal.querySelector('.auth-sheet-handle');
  
  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  let startTf = '';
  let activeDragIsHandle = false;
  let targetView = null;

  const startDrag = (y, isHandle = false) => {
    // Only allow swipe if at top of scroll OR if dragging by the handle
    if (!isHandle && modal.scrollTop > 0) return;
    
    activeDragIsHandle = isHandle;
    startY = y;
    currentY = y;
    isDragging = true;
    startTf = window.getComputedStyle(content).transform;
    if (startTf === 'none') startTf = '';
    content.style.transition = 'none';
    if (handle) handle.style.background = 'rgba(255, 255, 255, 0.4)';

    // Find and prepare adjacent targetView for swipe-up animation if on mobile
    const isMobile = window.innerWidth < 1024;
    const AppState = configProps.AppState;
    if (swipeUpFn && isMobile && AppState) {
      if (AppState.currentView === 'view-meditations') {
        targetView = document.getElementById('view-exercise');
      } else if (AppState.currentView === 'view-exercise') {
        targetView = document.getElementById('view-meditation-loading');
      }
      
      if (targetView) {
        backdrop.style.zIndex = '999999'; // Push backdrop below targetView
        targetView.classList.remove('hidden');
        targetView.classList.add('swiping-up');
        targetView.style.position = 'fixed';
        targetView.style.top = '0';
        targetView.style.left = '0';
        targetView.style.width = '100%';
        targetView.style.height = '100%';
        targetView.style.zIndex = '1000000'; // Right below infoModal (1000001)
        targetView.style.transform = 'translateY(100%)';
        targetView.style.transition = 'none';
        targetView.style.opacity = '1';
        targetView.style.visibility = 'visible';
        targetView.style.pointerEvents = 'auto';
      }
    }
  };

  const moveDrag = (y) => {
    if (!isDragging) return;
    currentY = y;
    const deltaY = currentY - startY;

    if (deltaY > 0) {
      // Swiping DOWN
      const atTop = modal.scrollTop <= 0;
      if (activeDragIsHandle || atTop) {
        content.style.transform = `${startTf} translateY(${deltaY}px)`;
        backdrop.style.opacity = 1 - (deltaY / 600);
      } else {
        content.style.transform = startTf;
      }
    } else {
      // Swiping UP
      const isMobile = window.innerWidth < 1024;
      if (swipeUpFn && isMobile) {
        const atBottom = modal.scrollTop + modal.clientHeight >= modal.scrollHeight - 5;
        const isNotScrollable = modal.scrollHeight <= modal.clientHeight + 5;
        if (activeDragIsHandle || atBottom || isNotScrollable) {
          content.style.transform = `${startTf} translateY(${deltaY}px)`;
          if (targetView) {
            targetView.style.transform = `translateY(calc(100% + ${deltaY}px))`;
          }
        } else {
          content.style.transform = startTf;
          if (targetView) targetView.style.transform = 'translateY(100%)';
        }
      } else {
        content.style.transform = startTf;
      }
    }
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    
    const deltaY = currentY - startY;

    const cleanupTargetView = () => {
      backdrop.style.zIndex = '';
      if (targetView) {
        targetView.classList.remove('swiping-up');
        targetView.style.position = '';
        targetView.style.top = '';
        targetView.style.left = '';
        targetView.style.width = '';
        targetView.style.height = '';
        targetView.style.zIndex = '';
        targetView.style.transform = '';
        targetView.style.transition = '';
        targetView.style.opacity = '';
        targetView.style.visibility = '';
        targetView.style.pointerEvents = '';
        targetView = null;
      }
    };

    if (deltaY > 100) { 
      // Successful swipe down
      content.style.transform = '';
      content.style.transition = '';
      backdrop.style.opacity = '';
      backdrop.style.transition = '';
      if (targetView) {
        targetView.classList.add('hidden');
        cleanupTargetView();
      }
      if (closeFn) closeFn();
    } else if (deltaY < -80 && swipeUpFn && window.innerWidth < 1024) {
      // Successful swipe up
      const atBottom = modal.scrollTop + modal.clientHeight >= modal.scrollHeight - 5;
      const isNotScrollable = modal.scrollHeight <= modal.clientHeight + 5;
      if (activeDragIsHandle || atBottom || isNotScrollable) {
        const AppState = configProps.AppState;
        if (AppState) {
          AppState.skipNextTransition = true;
        }

        if (targetView) {
          targetView.classList.add('skip-entry-animation');
        }

        content.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease-out';
        content.style.transform = `translateY(${deltaY - 100}px)`;
        content.style.opacity = '0';

        backdrop.style.transition = 'opacity 0.4s ease-out';
        backdrop.style.opacity = '0';

        if (targetView) {
          targetView.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
          targetView.style.transform = 'translateY(0)';
        }

        setTimeout(() => {
          content.style.transform = '';
          content.style.transition = '';
          content.style.opacity = '';
          backdrop.style.opacity = '';
          backdrop.style.transition = '';
          cleanupTargetView();
          swipeUpFn();
        }, 400);
      } else {
        // Snap back
        content.style.transition = 'transform 0.5s var(--spring-easing)';
        content.style.transform = '';
        backdrop.style.opacity = '';
        backdrop.style.transition = 'opacity 0.5s ease';
        if (targetView) {
          targetView.style.transition = 'transform 0.5s var(--spring-easing)';
          targetView.style.transform = 'translateY(100%)';
        }
        setTimeout(() => {
          content.style.transition = '';
          backdrop.style.transition = '';
          if (targetView) {
            targetView.classList.add('hidden');
            cleanupTargetView();
          }
        }, 500);
      }
    } else {
      // Aborted swipe - snap back
      content.style.transition = 'transform 0.5s var(--spring-easing)';
      content.style.transform = '';
      backdrop.style.opacity = '';
      backdrop.style.transition = 'opacity 0.5s ease';
      if (targetView) {
        targetView.style.transition = 'transform 0.5s var(--spring-easing)';
        targetView.style.transform = 'translateY(100%)';
      }
      
      // Cleanup inline transitions after snapping back
      setTimeout(() => {
        content.style.transition = '';
        backdrop.style.transition = '';
        if (targetView) {
          targetView.classList.add('hidden');
          cleanupTargetView();
        }
      }, 500);
    }
    
    if (handle) handle.style.background = 'rgba(255, 255, 255, 0.15)';
    startY = 0;
    currentY = 0;
    activeDragIsHandle = false;
  };

  // Touch Events
  modal.addEventListener('touchstart', (e) => {
    const isHandle = e.target.classList.contains('modal-handle') || e.target.classList.contains('auth-sheet-handle');
    startDrag(e.touches[0].clientY, isHandle);
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    moveDrag(e.touches[0].clientY);
  }, { passive: true });

  modal.addEventListener('touchend', endDrag);

  // Mouse Events
  modal.addEventListener('mousedown', (e) => {
    const isInteractive = e.target.closest('button, a, input, select, textarea, .comm-tab-btn');
    const isHandle = e.target.classList.contains('modal-handle') || e.target.classList.contains('auth-sheet-handle');
    
    if (!isInteractive || isHandle) {
      startDrag(e.clientY, isHandle);
    }
  });
  window.addEventListener('mousemove', (e) => moveDrag(e.clientY));
  window.addEventListener('mouseup', endDrag);
}

function updateTabIndicator() {
  const activeBtn = Array.from(elements.commTabBtns).find(b => b.classList.contains('active'));
  const indicator = document.querySelector('.comm-tab-indicator');
  if (activeBtn && indicator) {
    indicator.style.width = `${activeBtn.offsetWidth}px`;
    indicator.style.left = `${activeBtn.offsetLeft}px`;
  }
}

function initDataSovereigntyActions() {
  const downloadFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  elements.exportJsonBtnModal?.addEventListener('click', () => {
    const data = AppState.userHistory && AppState.userHistory.length > 0 ? AppState.userHistory : (AppState.mockHistory || []);
    downloadFile('aura-wellness-data.json', JSON.stringify(data, null, 2), 'application/json');
  });

  elements.exportTxtBtnModal?.addEventListener('click', () => {
    const data = AppState.userHistory && AppState.userHistory.length > 0 ? AppState.userHistory : (AppState.mockHistory || []);
    let txt = "Aura Wellness Report\n====================\n\n";
    data.forEach(item => {
      txt += `Date: ${new Date(item.timestamp).toLocaleString()}\n`;
      txt += `State: ${item.state} (${item.regulation_state || item.polyvagal_state || 'Unknown'})\n`;
      if (item.subEmotion) txt += `Emotion: ${item.subEmotion}\n`;
      if (item.customEmotion) txt += `Custom Emotion: ${item.customEmotion}\n`;
      if (item.somatic_selections) txt += `Somatic: ${item.somatic_selections.join(', ')}\n`;
      if (item.savoringText) txt += `Note: ${item.savoringText}\n`;
      txt += "--------------------\n";
    });
    downloadFile('aura-wellness-report.txt', txt, 'text/plain');
  });

  elements.resetMemoryBtnModal?.addEventListener('click', async () => {
    const ok = await showConfirm({
      title: t('warn_title') || 'Uyarı',
      message: t('prof_reset_confirm') || 'Emin misiniz?',
      confirmText: t('btn_yes') || 'Evet',
      cancelText: t('btn_cancel') || 'Vazgeçtim'
    });
    if (ok) {
      if (configProps.eraseAllData) {
        elements.resetMemoryBtnModal.disabled = true;
        await configProps.eraseAllData();
      } else {
        localStorage.clear();
      }
      window.location.reload();
    }
  });
}

function positionModalNearButton(modal, btn) {
  if (window.innerWidth < 1024 || !btn || !modal) {
    modal.style.removeProperty('--modal-x');
    modal.style.removeProperty('--modal-y');
    modal.style.removeProperty('--modal-translate');
    modal.style.removeProperty('--modal-translate-active');
    modal.style.removeProperty('--modal-origin');
    return;
  }
  
  const rect = btn.getBoundingClientRect();
  const modalWidth = 380; 
  const modalHeight = 450; 
  
  let left = rect.right - modalWidth + 10;
  let originX = 'right';
  if (left < 20) {
    left = rect.left - 10;
    originX = 'left';
    if (left < 20) left = 20;
  }
  
  let top = rect.bottom + 10;
  let originY = 'top';
  if (top + modalHeight > window.innerHeight) {
    top = rect.top - modalHeight - 10;
    originY = 'bottom';
    if (top < 20) top = 20;
  }

  modal.style.setProperty('--modal-x', `${left}px`);
  modal.style.setProperty('--modal-y', `${top}px`);
  modal.style.setProperty('--modal-translate', `translate(0, 15px)`);
  modal.style.setProperty('--modal-translate-active', `translate(0, 0)`);
  modal.style.setProperty('--modal-origin', `${originY} ${originX}`);
}

export function openCommunityModal(history, triggerBtn) {
  if (!elements.communityModal) return;
  
  // Clear any active info/vagal modals
  hideInfoModal();
  hideVagalModal();
  
  renderPersonalStats(history);
  renderCommunityStats();
  
  positionModalNearButton(elements.communityModal, triggerBtn);
  
  elements.communityModal.classList.add('active');
  if (elements.communityBackdrop) elements.communityBackdrop.classList.add('active');
  
  // Default tab
  const benTab = Array.from(elements.commTabBtns).find(b => b.getAttribute('data-tab') === 'ben');
  if (benTab) {
    benTab.click();
    setTimeout(updateTabIndicator, 100);
  }
}

export function hideCommunityModal() {
  if (typeof vibrate === 'function') vibrate('light');
  if (elements.communityModal) {
    elements.communityModal.classList.remove('active');
    elements.communityModal.style.transform = '';
    elements.communityModal.style.transition = '';
  }
  if (elements.communityBackdrop) {
    elements.communityBackdrop.classList.remove('active');
    elements.communityBackdrop.style.opacity = '';
    elements.communityBackdrop.style.transition = '';
  }
  if (typeof stopGalaxy === 'function') stopGalaxy();
  if (statsUnsubscribe) {
    statsUnsubscribe();
    statsUnsubscribe = null;
  }
  if (simulatedGrowthInterval) {
    clearInterval(simulatedGrowthInterval);
    simulatedGrowthInterval = null;
  }
}





function renderPersonalStats(history = []) {
  if (!elements.personalStatsGrid) return;
  
  const stats = { wired: 0, foggy: 0, okay: 0 };
  const sensationsMap = {};
  let totalSessions = history.length;
  
  history.forEach(h => {
    if (h.state && stats[h.state] !== undefined) stats[h.state]++;
    
    // Support both old (sensations) and new (somatic_selections) history formats
    const signals = h.somatic_selections || h.sensations || [];
    if (Array.isArray(signals)) {
      signals.forEach(s => {
        sensationsMap[s] = (sensationsMap[s] || 0) + 1;
      });
    }
  });

  // Find most frequent sensation
  let topSensation = '-';
  let topCount = 0;
  for (const [key, count] of Object.entries(sensationsMap)) {
    if (count > topCount) {
      topCount = count;
      topSensation = t(key);
    }
  }

  const earnedBadgeIds = calculateEarnedBadges(history);
  const badgeHtml = Object.values(BADGES).map(badge => {
    const isEarned = earnedBadgeIds.includes(badge.id);
    return `
      <div class="badge-item ${isEarned ? 'active' : 'locked'}">
        <div class="badge-inner">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-tooltip">
            <strong>${t(badge.titleKey)}</strong>
            <span>${t(badge.descKey)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  elements.personalStatsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">${t('vagal_ventral')}</div>
      <div class="stat-value" style="color: #7d917b;">${stats.okay}</div>
      <div class="stat-sub">${t('stat_ventral_desc')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${t('vagal_symp')}</div>
      <div class="stat-value" style="color: #c48b71;">${stats.wired}</div>
      <div class="stat-sub">${t('stat_symp_desc')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${t('vagal_dorsal')}</div>
      <div class="stat-value" style="color: #6d7f94;">${stats.foggy}</div>
      <div class="stat-sub">${t('stat_dorsal_desc')}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${t('stat_total_sessions')}</div>
      <div class="stat-value">${totalSessions}</div>
      <div class="stat-sub">${totalSessions > 0 ? t('comm_streak').replace('{count}', totalSessions) : '-'}</div>
    </div>
    
    <div class="badges-container" style="grid-column: span 2; margin-top: 0.5rem;">
      <div class="stat-label" style="margin-bottom: 0.8rem; opacity: 0.6;">Aura Başarıları</div>
      <div class="badges-grid">
        ${badgeHtml}
      </div>
    </div>

    <div class="stat-card" style="grid-column: span 2; background: rgba(255, 255, 255, 0.03); margin-top: 0.5rem;">
      <div class="stat-label">${t('stat_top_signal')}</div>
      <div class="stat-value" style="font-size: 1.1rem; text-transform: capitalize; color: #fff;">${topSensation}</div>
      <div class="stat-sub">Somatic farkındalık lideri</div>
    </div>
  `;
}

let statsUnsubscribe = null;
let simulatedGrowthInterval = null;

async function renderCommunityStats() {
  const fb = configProps.fb;
  const baseLegacyCount = 0; // Purely real data from Firestore
  
  const updateUI = (cloudCount) => {
    const total = baseLegacyCount + cloudCount;
    // Active now is estimated based on recent cloud activity or a small organic floor
    const activeNow = cloudCount > 0 ? Math.max(1, Math.min(12, Math.floor(cloudCount / 10) + 1)) : 1;
    
    if (elements.commCheckinCount) {
      elements.commCheckinCount.innerHTML = t('comm_checkin_count').replace('{count}', `<span>${total.toLocaleString()}</span>`);
    }
    if (elements.commActiveNow) elements.commActiveNow.textContent = activeNow;
    
    // Distribution (using real cloud ratios would be ideal, but for now we use a stable real feel)
    const v = 60, s = 25, d = 15;
    if (elements.distVentral) elements.distVentral.style.width = `${v}%`;
    if (elements.distSympathetic) elements.distSympathetic.style.width = `${s}%`;
    if (elements.distDorsal) elements.distDorsal.style.width = `${d}%`;
    
    if (elements.commTopProtocol) elements.commTopProtocol.textContent = t('title_p_resonance');
  };

  // Initial render
  updateUI(0);

  if (fb && fb.isInitialized) {
    try {
      if (statsUnsubscribe) statsUnsubscribe();
      const statsRef = fb.doc(fb.db, "stats", "community");
      statsUnsubscribe = fb.onSnapshot(statsRef, (doc) => {
        if (doc.exists()) {
          const cloudCount = doc.data().totalCheckins || 0;
          updateUI(cloudCount);
        }
      }, (err) => console.warn("Live stats failed", err));
    } catch (e) {
      console.warn("Could not fetch community stats:", e);
    }
  }
}

function startGalaxy() {
  const canvas = elements.galaxyCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  resize();

  const particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: 0.2 + Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.5
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y -= p.speed;
      if (p.y < 0) p.y = canvas.height;
      ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    galaxyAnimationId = requestAnimationFrame(animate);
  };
  
  stopGalaxy();
  animate();
}

function stopGalaxy() {
  if (galaxyAnimationId) {
    cancelAnimationFrame(galaxyAnimationId);
    galaxyAnimationId = null;
  }
  const canvas = elements.galaxyCanvas;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function updateModalState(state) {
  Object.assign(configProps, state);
}

function getAuraSVGIcon(type) {
  const iconMap = {
    'heatmap': `<rect x="18" y="18" width="8" height="8" rx="1" fill="white" opacity="0.6"/><rect x="28" y="18" width="8" height="8" rx="1" fill="white" opacity="0.3"/><rect x="38" y="18" width="8" height="8" rx="1" fill="white" opacity="0.8"/><rect x="18" y="28" width="8" height="8" rx="1" fill="white" opacity="0.2"/><rect x="28" y="28" width="8" height="8" rx="1" fill="white" opacity="0.9"/><rect x="38" y="28" width="8" height="8" rx="1" fill="white" opacity="0.4"/><rect x="18" y="38" width="8" height="8" rx="1" fill="white" opacity="0.5"/><rect x="28" y="38" width="8" height="8" rx="1" fill="white" opacity="0.1"/><rect x="38" y="38" width="8" height="8" rx="1" fill="white" opacity="0.7"/>`,
    'resilience': `<path d="M12 32 C 18 12, 26 52, 32 32 C 38 12, 46 52, 52 32" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/><path d="M12 32 L 52 32" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'insight': `<circle cx="32" cy="32" r="12" stroke="white" stroke-width="1.5"/><circle cx="32" cy="32" r="22" stroke="white" stroke-width="0.5" stroke-dasharray="2 4"/><path d="M32 20V12M32 52V44M44 32H52M12 32H20" stroke="white" stroke-width="1" opacity="0.6"/>`,
    'exercise': `<path d="M22 32L28 32L32 20L36 44L40 32L46 32" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="32" cy="32" r="25" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'step1': `<circle cx="32" cy="32" r="6" fill="white" opacity="0.9"><animate attributeName="r" values="6;10;6" dur="3s" repeatCount="indefinite"/></circle><path d="M32 10V54M10 32H54" stroke="white" stroke-width="0.5" opacity="0.3"/>`,
    'step2': `<path d="M32 12V52M12 32H52" stroke="white" stroke-width="1" opacity="0.4"/><rect x="22" y="22" width="20" height="20" stroke="white" stroke-width="1.5"/><circle cx="37" cy="27" r="3" fill="white"/>`,
    'step2b': `<path d="M20 20H44V36H28L20 44V20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="28" r="1" fill="white"/><circle cx="28" cy="28" r="1" fill="white"/><circle cx="36" cy="28" r="1" fill="white"/>`,
    'step3': `<path d="M18 48C18 48 12 40 12 30C12 20 20 12 32 12C44 12 52 20 52 30C52 40 46 48 46 48" stroke="white" stroke-width="1.5" fill="none"/><path d="M32 28V44" stroke="white" stroke-width="1" opacity="0.5"/>`,
    'step4': `<circle cx="32" cy="32" r="4" fill="white"/><circle cx="32" cy="32" r="12" stroke="white" stroke-width="1" opacity="0.4"/><circle cx="32" cy="32" r="24" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'step5': `<path d="M20 44L32 20L44 44H20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="34" r="2" fill="white"/>`,
    'step6': `<path d="M32 48C32 48 12 36 12 24C12 16 18 12 24 12C28 12 32 15 32 15C32 15 36 12 40 12C46 12 52 16 52 24C52 36 32 48 32 48Z" stroke="white" stroke-width="1.5" fill="none"/><path d="M22 24H42" stroke="white" stroke-width="0.5" opacity="0.4"/>`,
    'vagal_analysis': `<circle cx="32" cy="32" r="12" stroke="white" stroke-width="1.5"/><path d="M32 10V20M32 44V54M10 32H20M44 32H54" stroke="white" stroke-width="1.5" opacity="0.6"/><circle cx="32" cy="32" r="22" stroke="white" stroke-width="0.5" stroke-dasharray="2 4"/>`,
    'breathing': `<circle cx="32" cy="32" r="14" stroke="white" stroke-width="1.5" fill="none"><animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite"/></circle><circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.2)" stroke-width="1" fill="none"/>`,
    'meditations': `<circle cx="32" cy="32" r="14" stroke="white" stroke-width="1.5" fill="none"><animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite"/></circle><circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.2)" stroke-width="1" fill="none"/>`,
    'notebook': `<path d="M18 12h28v40H18z" stroke="white" stroke-width="1.5"/><path d="M18 22h28M18 32h28M18 42h28" stroke="white" stroke-width="1" opacity="0.5"/><path d="M12 16v32" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`,
    'focus': `<circle cx="32" cy="32" r="20" stroke="white" stroke-width="1.5"/><path d="M32 18V32L42 38" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`,
    'ambient': `<path d="M32 6v4M32 54v4m-21.21-43.07 2.82 2.82m25.46 25.46 2.82 2.82M2 32h4m40 0h4m-38.66 17.66 2.82-2.82m25.46-25.46 2.82-2.82" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`,
    'sleep': `<path d="M52 35.58A18 18 0 1 1 32.42 12a14 14 0 0 0 19.58 23.58z" stroke="white" stroke-width="1.5" fill="none"/>`
  };
  
  if (iconMap[type]) {
    const innerContent = iconMap[type];
    return `
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="auraGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g filter="url(#auraGlow)">
          ${innerContent}
        </g>
      </svg>
    `;
  } else {
    // Protocol or other: Use stylized background with the SVG icon
    const meta = PROTOCOL_META[type] || { icon: '' };
    return `
      <div class="stylized-protocol-icon" style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 50%; box-shadow: 0 0 30px rgba(255,255,255,0.05); backdrop-filter: blur(10px);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${meta.icon}
        </svg>
      </div>
    `;
  }
}

export function openInfoArchive(key, triggerBtn) {
  // console.log("Aura Modal Triggered with key:", key);
  if (!elements.infoModal) return;

  // Close any existing modals first to prevent "ghosting" or layering issues
  hideCommunityModal();
  hideInfoModal();
  hideVagalModal();

  // Cleanup key and identify type
  const cleanKey = key.replace('info_', '').replace('_desc', '').replace('_title', '').replace('_body', '');
  
  let title, body, ref, iconType = cleanKey;
  
  // Resolve exercise context
  const activeEx = (configProps.AppState && configProps.AppState.currentExercise) || 
                   (typeof configProps.getExerciseParams === 'function' ? configProps.getExerciseParams() : null);

  // Helper for reliable translation
  const getT = (k) => {
    const val = t(k);
    return (val && val !== k) ? val : null;
  };

  // Determine pId (Protocol ID)
  let pId = (cleanKey.startsWith('p_') || PROTOCOL_META[cleanKey]) ? cleanKey : null;
  
  // If we are in breathing/exercise context, try to resolve pId from active exercise
  if (!pId && (cleanKey === 'breathing' || cleanKey === 'step3' || cleanKey === 'exercise') && activeEx) {
    pId = activeEx.id;
  }

  currentProtocolId = pId;

  // Show or hide the swipe-up hint
  const swipeHint = document.getElementById('infoSwipeHint');
  if (swipeHint) {
    const isExerciseView = configProps.AppState && configProps.AppState.currentView === 'view-exercise';
    const isMeditationsView = configProps.AppState && configProps.AppState.currentView === 'view-meditations';
    const isMobile = window.innerWidth < 1024;
    if ((isExerciseView || isMeditationsView) && pId && isMobile) {
      swipeHint.classList.remove('hidden');
    } else {
      swipeHint.classList.add('hidden');
    }
  }

  // Show or hide the desktop start button
  if (elements.infoStartBtn) {
    const isMeditationsView = configProps.AppState && configProps.AppState.currentView === 'view-meditations';
    const isDesktop = window.innerWidth >= 1024;
    if (isMeditationsView && pId && isDesktop) {
      elements.infoStartBtn.classList.remove('hidden');
    } else {
      elements.infoStartBtn.classList.add('hidden');
    }
  }

  // 1. Try Specific Scientific Content
  if (pId) {
    const sTitle = getT(`sci_${pId}_title`);
    const sBody = getT(`sci_${pId}_desc`);
    const sRef = getT(`sci_${pId}_ref`);
    
    if (sTitle && sBody) {
      title = sTitle;
      body = sBody;
      ref = sRef || 'Aura Scientific Archive';
      iconType = pId;
    }
  }

  // 2. Fallback to Generic Content
  if (!title) {
    title = t(`info_${cleanKey}_title`);
    body = t(`info_${cleanKey}_body`);
    ref = t(`info_${cleanKey}_ref`);
    iconType = cleanKey;
  }

  // 2b. Heatmap card: inject current state block
  if (cleanKey === 'heatmap') {
    try {
      const history = JSON.parse(localStorage.getItem('vagal_history') || '[]');
      const latest = history[0];
      if (latest) {
        const norm = normalizeEntry(latest);
        const a = norm?.pre_arousal ?? 0.5;
        const v = norm?.pre_valence ?? 0.5;
        const R = calculateRegulationCapacity(a, v);
        const rScore = Math.round(R);
        const lang = AppState?.lang || 'tr';
        const stateLabel = getRegulationStateLabel(R, a, lang);
        const stateColor = getRegulationColor(R);
        const labelNow = lang === 'tr' ? 'Mevcut Durumun' : 'Your Current State';
        const labelScore = lang === 'tr' ? 'R skoru' : 'R score';
        const labelDesc = lang === 'tr'
          ? 'Bu skor son check-in\'ine dayanmaktadır.'
          : 'This score is based on your latest check-in.';

        const bandDescriptions = {
          tr: [
            { max: 30, desc: 'Prefrontal otonom regülasyon güçlü — güvenlik ve sosyal bağlantı kapasitesi yüksek.' },
            { max: 45, desc: 'Regülasyon kapasitesi iyi — sınıra yaklaşıyor ama hâlâ dengeli.' },
            { max: 55, desc: 'Aktif stres tepkisi devrede — sistem mobilize, dikkat ve enerji tüketimi yüksek.' },
            { max: 70, desc: 'Enerji korumaya kayış başlıyor — sistem yavaşlamaya çalışıyor.' },
            { max: 101, desc: 'Koruyucu kapanma bölgesi — sistem enerji tasarrufu modunda.' }
          ],
          en: [
            { max: 30, desc: 'Strong prefrontal autonomic regulation — high safety and social connection capacity.' },
            { max: 45, desc: 'Good regulation capacity — approaching the boundary but still balanced.' },
            { max: 55, desc: 'Active stress response engaged — system mobilized, high attention and energy use.' },
            { max: 70, desc: 'Shifting toward energy conservation — system beginning to slow down.' },
            { max: 101, desc: 'Protective shutdown zone — system in energy conservation mode.' }
          ]
        };
        const bands = bandDescriptions[lang] || bandDescriptions['en'];
        const bandDesc = (bands.find(b => rScore < b.max) || bands[bands.length - 1]).desc;

        body = `${body}<div style="margin-top:1.2rem; padding:1rem; border-radius:12px; border:1px solid ${stateColor}30; background:${stateColor}10;">
  <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:1px; margin-bottom:0.5rem;">${labelNow}</div>
  <div style="font-size:1rem; font-weight:700; color:${stateColor}; margin-bottom:0.25rem;">${stateLabel}</div>
  <div style="font-size:0.7rem; color:rgba(255,255,255,0.35); margin-bottom:0.6rem;">${labelScore}: ${rScore} / 100</div>
  <div style="font-size:0.78rem; color:rgba(255,255,255,0.6); line-height:1.5;">${bandDesc}</div>
  <div style="font-size:0.65rem; color:rgba(255,255,255,0.25); margin-top:0.5rem;">${labelDesc}</div>
</div>`;
      }
    } catch(_) {}
  }

  // 3. UI STATE MANAGEMENT: Reset & Visibility
  if (elements.vagalModalHeatmap) elements.vagalModalHeatmap.style.display = 'none';
  if (elements.vagalModalAnalysis) elements.vagalModalAnalysis.style.display = 'none';
  if (elements.vagalModalRec) elements.vagalModalRec.style.display = 'none';
  
  if (elements.infoBody) {
    elements.infoBody.style.display = 'block';
    elements.infoBody.innerHTML = body || '...';
  }

  if (elements.infoTitle) elements.infoTitle.textContent = title;
  if (elements.infoRef) {
    if (ref) {
      const prefix = (AppState && AppState.language === 'tr') ? 'Kaynak: ' : 'Source: ';
      elements.infoRef.textContent = prefix + ref;
      elements.infoRef.style.display = 'block';
    } else {
      elements.infoRef.textContent = '';
      elements.infoRef.style.display = 'none';
    }
  }
  if (elements.infoIcon) elements.infoIcon.innerHTML = getAuraSVGIcon(iconType);

  positionModalNearButton(elements.infoModal, triggerBtn);

  // Finalize display
  if (elements.infoModal) elements.infoModal.classList.add('active');
  if (elements.infoBackdrop) elements.infoBackdrop.classList.add('active');
  
  // Pause any active timers
  if (!configProps.isTimerPaused && configProps.pauseExercise) configProps.pauseExercise();
  if (!configProps.isMeditationPaused && configProps.pauseMeditation) configProps.pauseMeditation();
}

export function showInfoModal(type) {
  openInfoArchive(`info_${type}`);
}

export function hideVagalModal() {
  hideInfoModal();
}

export function hideInfoModal() {
  if (typeof vibrate === 'function') vibrate('light');
  isModalOpen = false;
  
  if (elements.infoBackdrop) {
    elements.infoBackdrop.classList.remove('active');
    elements.infoBackdrop.style.opacity = '';
    elements.infoBackdrop.style.transition = '';
  }
  if (elements.infoModal) {
    elements.infoModal.classList.remove('active');
    elements.infoModal.style.transform = '';
    elements.infoModal.style.transition = '';
  }
  if (elements.communityBackdrop) {
    elements.communityBackdrop.classList.remove('active');
    elements.communityBackdrop.style.opacity = '';
    elements.communityBackdrop.style.transition = '';
  }
  if (elements.communityModal) {
    elements.communityModal.classList.remove('active');
    elements.communityModal.style.transform = '';
    elements.communityModal.style.transition = '';
  }

  // Safety checks for resume functions
  if (configProps.isTimerPaused && typeof configProps.resumeExercise === 'function') {
    configProps.resumeExercise();
  }
  if (configProps.isMeditationPaused && typeof configProps.resumeMeditation === 'function') {
    configProps.resumeMeditation();
  }
}

/**
 * Custom confirm modal (Promise-based) to replace browser's native confirm() dialog.
 * Uses the same HTML layout and styles as the notification permission card.
 */
export function showConfirm({ title, message, confirmText, cancelText, isAlert = false, type = 'warning', customIconSvg = null, iconColor = null }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('alertModal');
    const titleEl = document.getElementById('alertTitle');
    const descEl = document.getElementById('alertDesc');
    const confirmBtn = document.getElementById('alertConfirmBtn');
    const cancelBtn = document.getElementById('alertCancelBtn');
    const iconContainer = modal?.querySelector('.notif-icon');
    const iconSvg = document.getElementById('alertIconSvg');

    if (!modal) {
      resolve(false);
      return;
    }

    // Set contextual icon and color
    let svgContent = '';
    let color = '#F59E0B';

    if (customIconSvg) {
      svgContent = customIconSvg;
      if (iconColor) color = iconColor;
    } else {
      switch (type) {
        case 'download':
          color = '#858DFF';
          svgContent = `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>`;
          break;
        case 'email':
        case 'security':
          color = '#64E49F';
          svgContent = `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>`;
          break;
        case 'logout':
          color = 'rgba(255, 255, 255, 0.85)';
          svgContent = `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>`;
          break;
        case 'danger':
          color = '#FF6B6B';
          svgContent = `<path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>`;
          break;
        case 'warning':
          color = '#F59E0B';
          svgContent = `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
          break;
        case 'info':
        default:
          color = '#858DFF';
          svgContent = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>`;
          break;
      }
    }

    if (iconContainer) iconContainer.style.color = color;
    if (iconSvg) iconSvg.innerHTML = svgContent;

    // Set texts
    if (titleEl) titleEl.textContent = title || 'Uyarı';
    if (descEl) descEl.textContent = message || '';
    if (confirmBtn) confirmBtn.textContent = confirmText || 'Evet';
    
    if (cancelBtn) {
      if (isAlert) {
        cancelBtn.classList.add('hidden');
      } else {
        cancelBtn.classList.remove('hidden');
        cancelBtn.textContent = cancelText || 'Vazgeçtim';
      }
    }

    // Show modal
    modal.classList.remove('hidden');

    const cleanUp = () => {
      modal.classList.add('hidden');
      if (confirmBtn) confirmBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
    };

    if (confirmBtn) {
      confirmBtn.onclick = () => {
        cleanUp();
        resolve(true);
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        cleanUp();
        resolve(false);
      };
    }
  });
}

