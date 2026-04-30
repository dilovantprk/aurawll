import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState, safeSetItem } from '../core/state.js';
import { getWeightsFromState, calculateVagalState } from '../core/vagal-engine.js';
import { BADGES } from '../core/constants.js';
import { calculateEarnedBadges, vibrate } from '../core/utils.js';
import { openCommunityModal } from './modals.js';

import { NotificationService } from '../services/notifications.js';
import { deleteUserAccount } from '../services/auth.js';

let configProps = {};

export function initSettings(config) {
  Object.assign(configProps, config);
  
  if (elements.hapticToggle) {
    elements.hapticToggle.addEventListener('change', (e) => {
      AppState.hapticEnabled = e.target.checked;
      safeSetItem('aura_haptic', AppState.hapticEnabled);
      // Update engine immediately
      if (typeof SensoryEngine !== 'undefined') SensoryEngine.hapticEnabled = AppState.hapticEnabled;
    });
    elements.hapticToggle.checked = AppState.hapticEnabled;
  }

  if (elements.uiSoundsToggle) {
    elements.uiSoundsToggle.addEventListener('change', (e) => {
      AppState.uiSoundsEnabled = e.target.checked;
      safeSetItem('aura_ui_sounds', AppState.uiSoundsEnabled);
      // Update engine immediately
      if (typeof SensoryEngine !== 'undefined') SensoryEngine.uiSoundsEnabled = AppState.uiSoundsEnabled;
    });
    elements.uiSoundsToggle.checked = AppState.uiSoundsEnabled;
  }

  if (elements.droneToggle) {
    elements.droneToggle.addEventListener('change', (e) => {
      AppState.droneEnabled = e.target.checked;
      safeSetItem('aura_drone', AppState.droneEnabled);
      if (configProps.setDroneEnabled) configProps.setDroneEnabled(AppState.droneEnabled);
      
      // Toggle volume visibility
      const volContainer = document.getElementById('volumeContainer');
      if (volContainer) {
        if (AppState.droneEnabled) volContainer.classList.remove('hidden');
        else volContainer.classList.add('hidden');
      }
    });
    elements.droneToggle.checked = AppState.droneEnabled;
  }

  if (elements.volumeSlider) {
    elements.volumeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      AppState.appVolume = val;
      if (elements.volumeValLabel) elements.volumeValLabel.textContent = `${val}%`;
      safeSetItem('aura_volume', val);
      if (configProps.setVolume) configProps.setVolume(val);
    });
    elements.volumeSlider.value = AppState.appVolume;
    if (elements.volumeValLabel) elements.volumeValLabel.textContent = `${AppState.appVolume}%`;
  }

  // Notifications
  const savedNotif = localStorage.getItem('aura_notif') === 'true';
  const savedTime = localStorage.getItem('aura_notif_time') || '21:00';

  if (elements.notifToggleCheckbox) {
    elements.notifToggleCheckbox.checked = savedNotif;
    if (savedNotif && elements.nudgeTimeContainer) elements.nudgeTimeContainer.classList.remove('hidden');
    elements.notifToggleCheckbox.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      localStorage.setItem('aura_notif', enabled);
      if (elements.nudgeTimeContainer) {
        if (enabled) {
          elements.nudgeTimeContainer.classList.remove('hidden');
          // Ask for permission if enabling
          NotificationService.showModal();
        } else {
          elements.nudgeTimeContainer.classList.add('hidden');
        }
      }
    });
  }

  if (elements.nudgeTimePicker) {
    elements.nudgeTimePicker.value = savedTime;
    elements.nudgeTimePicker.addEventListener('change', (e) => {
      localStorage.setItem('aura_notif_time', e.target.value);
    });
  }

  // Export Data
  const downloadFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  elements.exportJsonBtn?.addEventListener('click', () => {
    const data = AppState.userHistory && AppState.userHistory.length > 0 ? AppState.userHistory : AppState.mockHistory;
    downloadFile('aura-wellness-data.json', JSON.stringify(data, null, 2), 'application/json');
  });

  elements.exportTxtBtn?.addEventListener('click', () => {
    const data = AppState.userHistory && AppState.userHistory.length > 0 ? AppState.userHistory : AppState.mockHistory;
    let txt = "Aura Wellness Report\n====================\n\n";
    data.forEach(item => {
      txt += `Date: ${new Date(item.timestamp).toLocaleString()}\n`;
      txt += `State: ${item.state} (${item.polyvagal_state || 'Unknown'})\n`;
      if (item.subEmotion) txt += `Emotion: ${item.subEmotion}\n`;
      if (item.customEmotion) txt += `Custom Emotion: ${item.customEmotion}\n`;
      if (item.somatic_selections) txt += `Somatic: ${item.somatic_selections.join(', ')}\n`;
      if (item.savoringText) txt += `Note: ${item.savoringText}\n`;
      txt += "--------------------\n";
    });
    downloadFile('aura-wellness-report.txt', txt, 'text/plain');
  });

  // Delete all data (local + Firebase)
  elements.resetMemoryBtn?.addEventListener('click', async () => {
    if (confirm(t('prof_reset_confirm'))) {
      if (configProps.eraseAllData) {
        elements.resetMemoryBtn.disabled = true;
        await configProps.eraseAllData();
      } else {
        localStorage.clear();
      }
      window.location.reload();
    }
  });

  // Logout
  elements.logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (configProps.logout) configProps.logout();
    else window.location.reload();
  });
  
  // Delete Account
  elements.deleteAccountBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (confirm(t('prof_delete_account_confirm'))) {
      try {
        elements.deleteAccountBtn.disabled = true;
        const success = await deleteUserAccount();
        if (success) {
          window.location.reload();
        }
      } catch (err) {
        elements.deleteAccountBtn.disabled = false;
        if (err.message === 'REAUTH_NEEDED') {
          alert(AppState.lang === 'tr' ? 'Bu işlem için tekrar giriş yapmanız gerekiyor.' : 'You need to log in again to perform this action.');
          if (configProps.logout) configProps.logout();
        } else {
          alert(AppState.lang === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.');
        }
      }
    }
  });

  // Guest → Login
  elements.settingsLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (configProps.navigateTo) configProps.navigateTo('view-auth');
  });


  elements.showNotebookToggle?.addEventListener('change', (e) => {
    AppState.showNotebook = e.target.checked;
    localStorage.setItem('aura_show_notebook', AppState.showNotebook);
    syncNavVisibility();
    vibrate('light');
  });

  elements.showFocusToggle?.addEventListener('change', (e) => {
    AppState.showFocus = e.target.checked;
    localStorage.setItem('aura_show_focus', AppState.showFocus);
    syncNavVisibility();
    vibrate('light');
  });

  elements.showSleepToggle?.addEventListener('change', (e) => {
    AppState.showSleep = e.target.checked;
    localStorage.setItem('aura_show_sleep', AppState.showSleep);
    syncNavVisibility();
    vibrate('light');
  });

  elements.showAmbientToggle?.addEventListener('change', (e) => {
    AppState.showAmbient = e.target.checked;
    localStorage.setItem('aura_show_ambient', AppState.showAmbient);
    syncNavVisibility();
    vibrate('light');
  });

  if (elements.langToggleBtn) {
    elements.langToggleBtn.addEventListener('click', () => {
      const nextLang = AppState.lang === 'tr' ? 'en' : 'tr';
      safeSetItem('aura_lang', nextLang);
      window.location.reload();
    });
    const indicator = elements.langToggleBtn.querySelector('span');
    if (indicator) indicator.textContent = AppState.lang.toUpperCase();
  }

  if (elements.auraCoreSphere) {
    elements.auraCoreSphere.addEventListener('click', () => {
      const history = (AppState.userHistory && AppState.userHistory.length > 0) ? AppState.userHistory : (AppState.mockHistory || []);
      openCommunityModal(history);
    });
  }
}

export function updateSettingsView() {
  const localHistory = AppState.mockHistory || [];
  const name = AppState.user?.displayName || localStorage.getItem('aura_guest_name');
  const earnedBadgeIds = calculateEarnedBadges(localHistory);
  
  let displayTitle = AppState.lang === 'tr' ? 'Kaşif' : 'Explorer';
  if (earnedBadgeIds.length > 0) {
    const lastBadgeId = earnedBadgeIds[earnedBadgeIds.length - 1];
    const lastBadge = BADGES[lastBadgeId];
    if (lastBadge) displayTitle = t(lastBadge.titleKey);
  }

  const finalName = name || (AppState.lang === 'tr' ? 'Misafir' : 'Guest');
  if (elements.userDisplayName) elements.userDisplayName.textContent = finalName;
  
  if (elements.identityRank) {
    elements.identityRank.textContent = displayTitle;
  }
  
  if (elements.uniqueDaysStats) {
    const uniqueDays = new Set(localHistory.map(h => new Date(h.timestamp).toDateString())).size || 0;
    elements.uniqueDaysStats.textContent = t('prof_active_days').replace('{count}', uniqueDays);
  }

  const latest = localHistory[localHistory.length - 1]; // Get most recent
  if (latest && elements.auraCoreSphere) {
    const colors = { okay: '#64E49F', wired: '#FBA044', foggy: '#62A4FF', ventral: '#64E49F', sympathetic: '#FBA044', dorsal: '#62A4FF' };
    const stateKey = latest.polyvagal_state || latest.state;
    const color = colors[stateKey] || colors.okay;
    elements.auraCoreSphere.style.setProperty('--vagal-accent', color);
  }

  // Render Badges in Bio-Identity
  if (elements.identityBadges) {
    const earnedBadgeIds = calculateEarnedBadges(localHistory);
    const badgeIconsHtml = earnedBadgeIds.map(id => {
      const badge = BADGES[id];
      if (!badge) return '';
      return `<div class="id-badge-icon" title="${t(badge.titleKey)}" style="width: 24px; height: 24px; cursor: help; color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center;">${badge.icon}</div>`;
    }).join('');
    elements.identityBadges.innerHTML = badgeIconsHtml;
  }

  // Update Biometric Signature & Serial
  const serialEl = document.getElementById('neural-id-serial');
  if (serialEl) {
    const uid = AppState.user?.uid || 'GUEST-492';
    const shortUid = uid.substring(0, 6).toUpperCase();
    serialEl.textContent = `AUR-${shortUid}-X${localHistory.length}`;
  }

  const sigPath = document.querySelector('#vagal-signature-svg path');
  if (sigPath && localHistory.length > 0) {
    const states = localHistory.slice(-10).map(h => {
      const s = h.polyvagal_state || h.state;
      if (s === 'ventral') return 10;
      if (s === 'sympathetic') return 30;
      return 20; // dorsal
    });
    
    if (states.length < 10) {
      const filler = new Array(10 - states.length).fill(20);
      states.unshift(...filler);
    }
    
    let d = `M 0 20`;
    states.forEach((y, i) => {
      const x = (i + 1) * 20;
      d += ` L ${x} ${y}`;
    });
    sigPath.setAttribute('d', d);
  }

  // Show/hide logout vs login button based on guest status
  const isGuest = !AppState.user || AppState.user.isAnonymous || AppState.user.guest;
  if (elements.logoutBtn) elements.logoutBtn.style.display = isGuest ? 'none' : '';
  if (elements.deleteAccountBtn) {
    elements.deleteAccountBtn.style.display = isGuest ? 'none' : 'block';
    elements.deleteAccountBtn.classList.toggle('hidden', isGuest);
  }

  if (elements.showNotebookToggle) elements.showNotebookToggle.checked = AppState.showNotebook !== false;
  
  if (elements.showFocusToggle) {
    const row = elements.showFocusToggle.closest('.settings-row');
    if (AppState.unlockedFocus) {
      if (row) row.style.display = 'flex';
      elements.showFocusToggle.checked = AppState.showFocus === true;
    } else {
      if (row) row.style.display = 'none';
    }
  }
  
  if (elements.showAmbientToggle) {
    const row = elements.showAmbientToggle.closest('.settings-row');
    if (AppState.unlockedAmbient) {
      if (row) row.style.display = 'flex';
      elements.showAmbientToggle.checked = AppState.showAmbient === true;
    } else {
      if (row) row.style.display = 'none';
    }
  }
  
  if (elements.showSleepToggle) {
    const row = elements.showSleepToggle.closest('.settings-row');
    // Sleep is default true or unlocked? Usually Sleep is internal, let's keep it visible or handle it
    if (row) row.style.display = 'flex'; 
    elements.showSleepToggle.checked = AppState.showSleep === true;
  }
  
  syncNavVisibility();

  if (elements.syncCtaText) elements.syncCtaText.classList.toggle('hidden', !isGuest);
  if (elements.settingsLoginBtn) {
    elements.settingsLoginBtn.style.display = isGuest ? 'flex' : 'none';
    elements.settingsLoginBtn.classList.toggle('hidden', !isGuest);
  }

  // Handle volume visibility on view load
  const volContainer = document.getElementById('volumeContainer');
  if (volContainer) {
    if (AppState.droneEnabled) volContainer.classList.remove('hidden');
    else volContainer.classList.add('hidden');
  }
}

export function syncNavVisibility() {
  const showNote = AppState.showNotebook !== false;
  const showFocus = AppState.showFocus === true;
  const showSleep = AppState.showSleep === true;
  const showAmbient = AppState.showAmbient === true;

  // Mobile elements
  const navHome = document.getElementById('navHome');
  const navBreathe = document.getElementById('navBreathe');
  const navMore = document.getElementById('navMore');
  const navExtraRow = document.getElementById('navExtraRow');
  const navMainRow = document.querySelector('.nav-main-row');
  const navContainer = document.getElementById('mobile-nav-container');

  if (!navHome || !navBreathe || !navMainRow || !navExtraRow) return;

  // Dynamic items (everything except fixed Home & Breathe)
  const dynamicItems = ['navNotebook', 'navFocus', 'navSleep', 'navAmbient', 'navProfile'];
  const visibilityMap = {
    'navNotebook': showNote,
    'navFocus': showFocus,
    'navSleep': showSleep,
    'navAmbient': showAmbient,
    'navProfile': true // Profile always available
  };
  const visibleDynamicItems = dynamicItems.filter(id => visibilityMap[id]);

  // Clear all dynamic items first
  dynamicItems.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Clear rows for reconstruction
  while (navMainRow.firstChild) navMainRow.removeChild(navMainRow.firstChild);
  while (navExtraRow.firstChild) navExtraRow.removeChild(navExtraRow.firstChild);

  // Detect current active dynamic tab
  const activeView = AppState.currentView?.replace('view-', '');
  let activeDynamicId = null;
  dynamicItems.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getAttribute('data-view') === activeView) {
      activeDynamicId = id;
      // Persist only non-Profile tabs for slot memory
      if (id !== 'navProfile') {
        AppState.lastActiveDynamicId = id;
        localStorage.setItem('aura_last_dynamic_nav', id);
      }
    }
  });

  // Total visible count: Home + Breathe + dynamic items
  const totalVisible = 2 + visibleDynamicItems.length;

  if (totalVisible <= 4) {
    // === FIXED ROW MODE (≤ 4 tabs) — No More button needed ===
    if (navMore) navMore.classList.add('hidden');
    if (navContainer) navContainer.classList.remove('is-expanded');

    navMainRow.appendChild(navHome);
    navBreathe.style.display = '';
    navMainRow.appendChild(navBreathe);

    visibleDynamicItems.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = '';
        navMainRow.appendChild(el);
      }
    });

  } else {
    // === DYNAMIC SLOT MODE (> 4 tabs) — Slot 3 + More ===
    const persistedId = AppState.lastActiveDynamicId;
    const isPersistValid = persistedId && visibleDynamicItems.includes(persistedId);

    // Slot 3: current active > persisted > Profile (default)
    let slot3Id = activeDynamicId
      || (isPersistValid ? persistedId : null)
      || 'navProfile';

    // Build main row
    navMainRow.appendChild(navHome);
    navBreathe.style.display = '';
    navMainRow.appendChild(navBreathe);

    if (slot3Id) {
      const s3El = document.getElementById(slot3Id);
      if (s3El) {
        s3El.style.display = '';
        navMainRow.appendChild(s3El);
      }
    }

    if (navMore) {
      navMore.classList.remove('hidden');
      navMainRow.appendChild(navMore);
    }

    // Build extra row (everything not in main)
    visibleDynamicItems.forEach(id => {
      if (id === slot3Id) return;
      const el = document.getElementById(id);
      if (el) {
        el.style.display = '';
        navExtraRow.appendChild(el);
      }
    });
  }

  // Collapse expanded state when navigating
  if (navContainer) navContainer.classList.remove('is-expanded');

  // Toggle listener for More button
  if (navMore && !navMore.dataset.listenerSet) {
    navMore.onclick = (e) => {
      e.stopPropagation();
      navContainer.classList.toggle('is-expanded');
      const icon = navMore.querySelector('svg');
      if (icon) icon.style.transform = navContainer.classList.contains('is-expanded') ? 'rotate(180deg)' : '';
      if (typeof vibrate !== 'undefined') vibrate('light');
    };
    navMore.dataset.listenerSet = 'true';
  }

  // Desktop sync
  const desktopNav = document.getElementById('desktop-nav-links');
  if (desktopNav) {
    const items = desktopNav.querySelectorAll('.nav-item');
    items.forEach(item => {
      const view = item.getAttribute('data-view');
      if (view === 'meditations') item.style.display = '';
      if (view === 'notebook') item.style.display = showNote ? '' : 'none';
      if (view === 'focus') item.style.display = showFocus ? '' : 'none';
      if (view === 'sleep') item.style.display = showSleep ? '' : 'none';
      if (view === 'ambient') item.style.display = showAmbient ? '' : 'none';
    });
  }
}
