import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState, safeSetItem } from '../core/state.js';
import { getWeightsFromState, calculateVagalState } from '../core/vagal-engine.js';
import { BADGES } from '../core/constants.js';
import { calculateEarnedBadges, vibrate, normalizeEntry, getRegulationColor } from '../core/utils.js';
import { calculateRegulationCapacity } from '../core/vagal-engine.js';
import { openCommunityModal, showConfirm } from './modals.js';
import { openAuthSheet } from './auth.js';

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

  const customTimeBtn = document.getElementById('customTimeBtn');
  const customTimeVal = document.getElementById('customTimeVal');
  const customTimeDropdown = document.getElementById('customTimeDropdown');
  const timeHoursCol = document.getElementById('timeHoursCol');
  const timeMinutesCol = document.getElementById('timeMinutesCol');

  if (elements.nudgeTimePicker) {
    elements.nudgeTimePicker.value = savedTime;
    elements.nudgeTimePicker.addEventListener('change', (e) => {
      localStorage.setItem('aura_notif_time', e.target.value);
      if (customTimeVal) customTimeVal.textContent = e.target.value;
    });

    if (customTimeVal) customTimeVal.textContent = savedTime;

    // Build custom dropdown columns dynamically
    if (timeHoursCol && timeMinutesCol) {
      // Hours (00-23)
      for (let h = 0; h < 24; h++) {
        const hStr = h.toString().padStart(2, '0');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-item';
        btn.textContent = hStr;
        btn.dataset.val = hStr;
        timeHoursCol.appendChild(btn);
      }

      // Minutes (00-59)
      for (let m = 0; m < 60; m++) {
        const mStr = m.toString().padStart(2, '0');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-item';
        btn.textContent = mStr;
        btn.dataset.val = mStr;
        timeMinutesCol.appendChild(btn);
      }

      const updateSelectedStates = (hVal, mVal) => {
        timeHoursCol.querySelectorAll('.time-item').forEach(el => {
          el.classList.toggle('selected', el.dataset.val === hVal);
        });
        timeMinutesCol.querySelectorAll('.time-item').forEach(el => {
          el.classList.toggle('selected', el.dataset.val === mVal);
        });
      };

      const scrollToSelected = () => {
        const selectedHour = timeHoursCol.querySelector('.time-item.selected');
        const selectedMinute = timeMinutesCol.querySelector('.time-item.selected');
        if (selectedHour) {
          timeHoursCol.scrollTop = selectedHour.offsetTop - timeHoursCol.clientHeight / 2 + selectedHour.clientHeight / 2;
        }
        if (selectedMinute) {
          timeMinutesCol.scrollTop = selectedMinute.offsetTop - timeMinutesCol.clientHeight / 2 + selectedMinute.clientHeight / 2;
        }
      };

      // Toggle dropdown visibility
      customTimeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !customTimeDropdown.classList.contains('hidden');
        if (isOpen) {
          customTimeDropdown.classList.add('hidden');
        } else {
          // Open & scroll to currently selected
          const [currH, currM] = (elements.nudgeTimePicker.value || '21:00').split(':');
          updateSelectedStates(currH, currM);
          customTimeDropdown.classList.remove('hidden');
          // Delay scroll slightly to allow rendering
          setTimeout(scrollToSelected, 50);
        }
      });

      // Handle hour click
      timeHoursCol.addEventListener('click', (e) => {
        const btn = e.target.closest('.time-item');
        if (!btn) return;
        const [currH, currM] = (elements.nudgeTimePicker.value || '21:00').split(':');
        const newTime = `${btn.dataset.val}:${currM}`;
        elements.nudgeTimePicker.value = newTime;
        elements.nudgeTimePicker.dispatchEvent(new Event('change'));
        updateSelectedStates(btn.dataset.val, currM);
      });

      // Handle minute click
      timeMinutesCol.addEventListener('click', (e) => {
        const btn = e.target.closest('.time-item');
        if (!btn) return;
        const [currH, currM] = (elements.nudgeTimePicker.value || '21:00').split(':');
        const newTime = `${currH}:${btn.dataset.val}`;
        elements.nudgeTimePicker.value = newTime;
        elements.nudgeTimePicker.dispatchEvent(new Event('change'));
        updateSelectedStates(currH, btn.dataset.val);
      });

      // Click outside to close dropdown
      document.addEventListener('click', (e) => {
        if (customTimeDropdown && !customTimeDropdown.classList.contains('hidden')) {
          if (!e.target.closest('.custom-time-wrapper')) {
            customTimeDropdown.classList.add('hidden');
          }
        }
      });
    }
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
      const normalized = normalizeEntry(item);
      txt += `Date: ${normalized.timestamp ? new Date(normalized.timestamp).toLocaleString() : '...'}\n`;
      txt += `State: ${normalized.state} (${normalized.regulation_state || normalized.polyvagal_state || 'Unknown'})\n`;
      if (normalized.subEmotion) txt += `Emotion: ${normalized.subEmotion}\n`;
      if (item.customEmotion) txt += `Custom Emotion: ${item.customEmotion}\n`;
      if (item.somatic_selections) txt += `Somatic: ${item.somatic_selections.join(', ')}\n`;
      if (item.savoringText) txt += `Note: ${item.savoringText}\n`;
      txt += "--------------------\n";
    });
    downloadFile('aura-wellness-report.txt', txt, 'text/plain');
  });

  // Delete all data (local + Firebase)
  elements.resetMemoryBtn?.addEventListener('click', async () => {
    const ok = await showConfirm({
      title: t('warn_title') || 'Uyarı',
      message: t('prof_reset_confirm') || 'Emin misiniz?',
      confirmText: t('btn_yes') || 'Evet',
      cancelText: t('btn_cancel') || 'Vazgeçtim'
    });
    if (ok) {
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
  elements.logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const ok = await showConfirm({
      title: t('warn_title') || 'Uyarı',
      message: t('logout_confirm') || 'Çıkış yapmak istediğinizden emin misiniz?',
      confirmText: t('btn_logout') || 'Çıkış Yap',
      cancelText: t('btn_cancel') || 'Vazgeçtim'
    });
    if (ok) {
      if (configProps.logout) configProps.logout();
      else window.location.reload();
    }
  });
  
  // Delete Account
  elements.deleteAccountBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const ok = await showConfirm({
      title: t('warn_title') || 'Uyarı',
      message: t('prof_delete_account_confirm') || 'Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Emin misiniz?',
      confirmText: t('btn_yes') || 'Evet',
      cancelText: t('btn_cancel') || 'Vazgeçtim'
    });
    if (ok) {
      try {
        elements.deleteAccountBtn.disabled = true;
        const success = await deleteUserAccount();
        if (success) {
          window.location.reload();
        }
      } catch (err) {
        elements.deleteAccountBtn.disabled = false;
        if (err.message === 'REAUTH_NEEDED') {
          await showConfirm({
            title: t('warn_title') || 'Uyarı',
            message: AppState.lang === 'tr' ? 'Bu işlem için tekrar giriş yapmanız gerekiyor.' : 'You need to log in again to perform this action.',
            confirmText: t('btn_ok') || 'Tamam',
            isAlert: true
          });
          if (configProps.logout) configProps.logout();
        } else {
          await showConfirm({
            title: t('warn_title') || 'Uyarı',
            message: AppState.lang === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.',
            confirmText: t('btn_ok') || 'Tamam',
            isAlert: true
          });
        }
      }
    }
  });

  // Guest → Login (card button + data subpage button)
  elements.settingsLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (configProps.navigateTo) configProps.navigateTo('view-auth');
  });

  elements.cardLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.innerWidth < 1024) {
      openAuthSheet();
    } else {
      if (configProps.navigateTo) configProps.navigateTo('view-auth');
    }
  });

  // Render modules market
  renderModuleMarket();

  if (elements.langToggleBtn) {
    const langDropdownMenu = document.getElementById('langDropdownMenu');
    
    elements.langToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      vibrate('light');
      if (langDropdownMenu) langDropdownMenu.classList.toggle('show');
    });

    const indicator = elements.langToggleBtn.querySelector('span');
    if (indicator) indicator.textContent = AppState.lang.toUpperCase();

    if (langDropdownMenu) {
      const activeItem = langDropdownMenu.querySelector(`.lang-dropdown-item[data-lang="${AppState.lang}"]`);
      if (activeItem) activeItem.classList.add('active');

      const dropdownItems = langDropdownMenu.querySelectorAll('.lang-dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          vibrate('light');
          const selectedLang = item.getAttribute('data-lang');
          if (selectedLang && selectedLang !== AppState.lang) {
            safeSetItem('aura_lang', selectedLang);
            window.location.reload();
          } else {
            langDropdownMenu.classList.remove('show');
          }
        });
      });
    }

    // Close on click outside
    document.addEventListener('click', () => {
      if (langDropdownMenu) langDropdownMenu.classList.remove('show');
    });
  }

  if (elements.auraCoreSphere) {
    elements.auraCoreSphere.addEventListener('click', () => {
      const history = (AppState.userHistory && AppState.userHistory.length > 0) ? AppState.userHistory : (AppState.mockHistory || []);
      openCommunityModal(history);
    });
  }

  // Nested Settings Subpages Navigation
  const menuRows = document.querySelectorAll('.settings-menu-row');
  const subpages = document.querySelectorAll('.settings-subpage');
  const mainMenu = document.getElementById('settings-main-menu');
  const idCard = document.querySelector('.identity-card-v2');

  menuRows.forEach(row => {
    row.addEventListener('click', () => {
      const target = row.getAttribute('data-target');
      const targetId = `settings-subpage-${target}`;
      const targetPage = document.getElementById(targetId);
      if (targetPage) {
        vibrate('light');

        // Hide main menu & ID Card with animation classes
        mainMenu?.classList.add('hidden');
        idCard?.classList.add('hidden');

        // Update view header description text dynamically
        const key = 'settings_sub_' + target;
        const viewHeaderDesc = document.querySelector('#view-settings .view-header p');
        if (viewHeaderDesc) {
          viewHeaderDesc.setAttribute('data-i18n', key);
          const trans = t(key);
          viewHeaderDesc.textContent = trans ? trans.toLocaleLowerCase(AppState.lang) + '.' : '';
        }

        // Show target page
        targetPage.classList.remove('hidden');
        setTimeout(() => {
          targetPage.classList.add('active');
        }, 50);
      }
    });
  });

  const backButtons = document.querySelectorAll('.settings-back-btn');
  backButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      vibrate('light');
      
      const activeSubpage = btn.closest('.settings-subpage');
      if (activeSubpage) {
        activeSubpage.classList.remove('active');
        
        // Restore view header description to original state
        const viewHeaderDesc = document.querySelector('#view-settings .view-header p');
        if (viewHeaderDesc) {
          viewHeaderDesc.setAttribute('data-i18n', 'settings_desc');
          viewHeaderDesc.textContent = t('settings_desc');
        }

        setTimeout(() => {
          activeSubpage.classList.add('hidden');
          mainMenu?.classList.remove('hidden');
          idCard?.classList.remove('hidden');
        }, 350); // Match transition duration (0.35s)
      }
    });
  });

  // MutationObserver to reset settings view when navigating back to it
  const settingsResetObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.id === 'view-settings') {
        if (!mutation.target.classList.contains('hidden')) {
          // View became active - reset subpages
          subpages.forEach(page => {
            page.classList.remove('active');
            page.classList.add('hidden');
          });
          mainMenu?.classList.remove('hidden');
          idCard?.classList.remove('hidden');

          // Restore view header description to original state
          const viewHeaderDesc = document.querySelector('#view-settings .view-header p');
          if (viewHeaderDesc) {
            viewHeaderDesc.setAttribute('data-i18n', 'settings_desc');
            viewHeaderDesc.textContent = t('settings_desc');
          }
        }
      }
    });
  });

  const settingsView = document.getElementById('view-settings');
  if (settingsView) {
    settingsResetObserver.observe(settingsView, { attributes: true, attributeFilter: ['class'] });
  }

  // Initialize profile edit bottom sheet
  initProfileEdit();
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

  const latest = localHistory[localHistory.length - 1];
  if (latest && elements.auraCoreSphere) {
    const normalized = normalizeEntry(latest);
    const a = normalized?.pre_arousal ?? 0.5;
    const v = normalized?.pre_valence ?? 0.5;
    const R = calculateRegulationCapacity(a, v);
    const color = getRegulationColor(R);

    // Parse hex -> r,g,b for glow animations
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    elements.auraCoreSphere.style.setProperty('--vagal-accent', color);
    elements.auraCoreSphere.style.setProperty('--vagal-accent-rgb', `${r}, ${g}, ${b}`);
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
      const normalized = normalizeEntry(h);
      const s = normalized.regulation_state || normalized.state;
      if (s === 'coherence' || s === 'ventral') return 10;
      if (s === 'mobilization' || s === 'sympathetic') return 30;
      return 20; // immobilization / dorsal
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
  renderModuleMarket();
  
  syncNavVisibility();

  if (elements.syncCtaText) elements.syncCtaText.classList.toggle('hidden', !isGuest);
  if (elements.settingsLoginBtn) {
    elements.settingsLoginBtn.style.display = 'none';
    elements.settingsLoginBtn.classList.add('hidden');
  }
  if (elements.cardLoginBtn) {
    elements.cardLoginBtn.classList.toggle('hidden', !isGuest);
  }
  
  // Populate Profile & Account subpage fields
  const profileNameInput = document.getElementById('profileNameInput');
  if (profileNameInput) {
    profileNameInput.value = AppState.user?.displayName || localStorage.getItem('aura_guest_name') || '';
  }

  const profileEmailInput = document.getElementById('profileEmailInput');
  if (profileEmailInput) {
    profileEmailInput.value = AppState.user?.email || '';
  }

  const providerBadge = document.getElementById('profileProviderBadge');
  if (providerBadge) {
    const providerId = AppState.user?.providerData?.[0]?.providerId || 'password';
    if (providerId.includes('google')) providerBadge.textContent = 'GOOGLE';
    else if (providerId.includes('twitter')) providerBadge.textContent = 'TWITTER';
    else if (isGuest) providerBadge.textContent = 'GUEST';
    else providerBadge.textContent = 'EMAIL';
  }

  const guestNoticeRow = document.getElementById('profileGuestNoticeRow');
  if (guestNoticeRow) guestNoticeRow.classList.toggle('hidden', !isGuest);

  const profileDeleteRow = document.getElementById('profileDeleteAccountRow');
  if (profileDeleteRow) profileDeleteRow.classList.toggle('hidden', isGuest);

function setBtnSpanText(btn, text) {
  if (!btn) return;
  const span = btn.querySelector('span');
  if (span) span.textContent = text;
  else btn.textContent = text;
}

  // Update Connected Accounts (Google & X) Statuses
  const googleStatus = document.getElementById('googleAccountStatus');
  const googleBtn = document.getElementById('profileLinkGoogleBtn');
  const googleData = AppState.user?.providerData?.find(p => p.providerId === 'google.com');

  if (googleStatus && googleBtn) {
    if (googleData) {
      googleStatus.textContent = `${t('profile_linked')}: ${googleData.email || googleData.displayName || ''}`;
      googleStatus.style.color = '#64E49F';
      setBtnSpanText(googleBtn, t('profile_unlink_btn'));
    } else {
      googleStatus.textContent = t('profile_not_linked');
      googleStatus.style.color = 'rgba(255, 255, 255, 0.4)';
      setBtnSpanText(googleBtn, t('profile_link_btn'));
    }
  }

  const xStatus = document.getElementById('xAccountStatus');
  const xBtn = document.getElementById('profileLinkXBtn');
  const xData = AppState.user?.providerData?.find(p => p.providerId === 'twitter.com');

  if (xStatus && xBtn) {
    if (xData) {
      xStatus.textContent = `${t('profile_linked')}: ${xData.displayName || xData.email || ''}`;
      xStatus.style.color = '#64E49F';
      setBtnSpanText(xBtn, t('profile_unlink_btn'));
    } else {
      xStatus.textContent = t('profile_not_linked');
      xStatus.style.color = 'rgba(255, 255, 255, 0.4)';
      setBtnSpanText(xBtn, t('profile_link_btn'));
    }
  }

  // Handle volume visibility on view load
  const volContainer = document.getElementById('volumeContainer');
  if (volContainer) {
    if (AppState.droneEnabled) volContainer.classList.remove('hidden');
    else volContainer.classList.add('hidden');
  }
}

function initProfileEdit() {
  const saveNameBtn = document.getElementById('profileSaveNameBtn');
  const nameInput = document.getElementById('profileNameInput');
  const nameStatus = document.getElementById('profileNameStatus');

  const saveEmailBtn = document.getElementById('profileSaveEmailBtn');
  const emailInput = document.getElementById('profileEmailInput');
  const emailStatus = document.getElementById('profileEmailStatus');

  const resetPasswordBtn = document.getElementById('profileResetPasswordBtn');
  const passwordStatus = document.getElementById('profilePasswordStatus');

  const connectAccountBtn = document.getElementById('profileConnectAccountBtn');

  // 1. Save Display Name
  if (saveNameBtn && nameInput && !saveNameBtn.dataset.init) {
    saveNameBtn.dataset.init = '1';
    saveNameBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (!newName) {
        if (nameStatus) {
          nameStatus.textContent = AppState.lang === 'tr' ? 'İsim boş olamaz.' : 'Name cannot be empty.';
          nameStatus.style.color = '#ff6b6b';
          nameStatus.classList.remove('hidden');
         saveNameBtn.disabled = true;
      setBtnSpanText(saveNameBtn, AppState.lang === 'tr' ? 'Kaydediliyor...' : 'Saving...');
      if (nameStatus) nameStatus.classList.add('hidden');

      try {
        const isGuest = !AppState.user || AppState.user.isAnonymous || AppState.user.guest;

        if (!isGuest && AppState.user) {
          const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js");
          const { auth } = await import('../../firebase.js');
          await updateProfile(auth.currentUser, { displayName: newName });
          if (AppState.user) AppState.user.displayName = newName;
        } else {
          localStorage.setItem('aura_guest_name', newName);
        }

        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.textContent = newName;

        if (nameStatus) {
          nameStatus.textContent = AppState.lang === 'tr' ? 'İsim başarıyla güncellendi.' : 'Name updated successfully.';
          nameStatus.style.color = '#64E49F';
          nameStatus.classList.remove('hidden');
          setTimeout(() => nameStatus.classList.add('hidden'), 3000);
        }
      } catch (err) {
        console.error('Name update error:', err);
        if (nameStatus) {
          nameStatus.textContent = AppState.lang === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.';
          nameStatus.style.color = '#ff6b6b';
          nameStatus.classList.remove('hidden');
        }
      } finally {
        saveNameBtn.disabled = false;
        setBtnSpanText(saveNameBtn, AppState.lang === 'tr' ? 'Kaydet' : 'Save');
      }
    });
  }

  // 2. Update Email Address
  if (saveEmailBtn && emailInput && !saveEmailBtn.dataset.init) {
    saveEmailBtn.dataset.init = '1';
    saveEmailBtn.addEventListener('click', async () => {
      const newEmail = emailInput.value.trim();
      if (!newEmail || !newEmail.includes('@')) {
        if (emailStatus) {
          emailStatus.textContent = AppState.lang === 'tr' ? 'Geçerli bir e-posta girin.' : 'Enter a valid email.';
          emailStatus.style.color = '#ff6b6b';
          emailStatus.classList.remove('hidden');
        }
        return;
      }

      saveEmailBtn.disabled = true;
      setBtnSpanText(saveEmailBtn, AppState.lang === 'tr' ? 'Güncelleniyor...' : 'Updating...');
      if (emailStatus) emailStatus.classList.add('hidden');

      try {
        const { verifyBeforeUpdateEmail, updateEmail } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js");
        const { auth } = await import('../../firebase.js');

        if (auth.currentUser) {
          if (typeof verifyBeforeUpdateEmail === 'function') {
            await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
            if (emailStatus) {
              emailStatus.textContent = AppState.lang === 'tr' 
                ? 'Yeni e-postaya doğrulama bağlantısı gönderildi.' 
                : 'Verification link sent to new email.';
              emailStatus.style.color = '#64E49F';
              emailStatus.classList.remove('hidden');
            }
          } else {
            await updateEmail(auth.currentUser, newEmail);
            if (emailStatus) {
              emailStatus.textContent = AppState.lang === 'tr' ? 'E-posta güncellendi.' : 'Email updated.';
              emailStatus.style.color = '#64E49F';
              emailStatus.classList.remove('hidden');
            }
          }
        }
      } catch (err) {
        console.error('Email update error:', err);
        if (emailStatus) {
          if (err.code === 'auth/requires-recent-login') {
            emailStatus.textContent = AppState.lang === 'tr'
              ? 'Güvenlik gereği yeniden giriş yapmalısınız.'
              : 'Please re-authenticate and try again.';
          } else {
            emailStatus.textContent = AppState.lang === 'tr' ? 'E-posta güncellenemedi.' : 'Failed to update email.';
          }
          emailStatus.style.color = '#ff6b6b';
          emailStatus.classList.remove('hidden');
        }
      } finally {
        saveEmailBtn.disabled = false;
        setBtnSpanText(saveEmailBtn, AppState.lang === 'tr' ? 'Güncelle' : 'Update');
      }
    });
  }

  // 3. Reset Password Email
  if (resetPasswordBtn && !resetPasswordBtn.dataset.init) {
    resetPasswordBtn.dataset.init = '1';
    resetPasswordBtn.addEventListener('click', async () => {
      const email = AppState.user?.email || emailInput?.value?.trim();
      if (!email) return;

      resetPasswordBtn.disabled = true;
      setBtnSpanText(resetPasswordBtn, AppState.lang === 'tr' ? 'Gönderiliyor...' : 'Sending...');
      if (passwordStatus) passwordStatus.classList.add('hidden');

      try {
        const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js");
        const { auth } = await import('../../firebase.js');

        await sendPasswordResetEmail(auth, email);

        if (passwordStatus) {
          passwordStatus.textContent = AppState.lang === 'tr' 
            ? 'Şifre sıfırlama e-postası gönderildi.' 
            : 'Password reset email sent.';
          passwordStatus.style.color = '#64E49F';
          passwordStatus.classList.remove('hidden');
        }
      } catch (err) {
        console.error('Password reset error:', err);
        if (passwordStatus) {
          passwordStatus.textContent = AppState.lang === 'tr' ? 'E-posta gönderilemedi.' : 'Failed to send email.';
          passwordStatus.style.color = '#ff6b6b';
          passwordStatus.classList.remove('hidden');
        }
      } finally {
        resetPasswordBtn.disabled = false;
        setBtnSpanText(resetPasswordBtn, AppState.lang === 'tr' ? 'E-posta Gönder' : 'Send Email');
      }
    });
  }

  // 4. Connect Account for Guests
  if (connectAccountBtn && !connectAccountBtn.dataset.init) {
    connectAccountBtn.dataset.init = '1';
    connectAccountBtn.addEventListener('click', () => {
      openAuthSheet();
    });
  }

  // 5. Google Provider Link / Unlink
  const googleLinkBtn = document.getElementById('profileLinkGoogleBtn');
  const connectedStatus = document.getElementById('profileConnectedStatus');

  if (googleLinkBtn && !googleLinkBtn.dataset.init) {
    googleLinkBtn.dataset.init = '1';
    googleLinkBtn.addEventListener('click', async () => {
      if (!AppState.user) return;
      googleLinkBtn.disabled = true;
      if (connectedStatus) connectedStatus.classList.add('hidden');

      try {
        const { linkWithPopup, unlink, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js");
        const { auth } = await import('../../firebase.js');

        const isLinked = AppState.user.providerData?.some(p => p.providerId === 'google.com');

        if (isLinked) {
          if (AppState.user.providerData.length <= 1) {
            throw new Error('ONLY_PROVIDER');
          }
          await unlink(auth.currentUser, 'google.com');
          if (connectedStatus) {
            connectedStatus.textContent = AppState.lang === 'tr' ? 'Google hesabı kaldırıldı.' : 'Google account unlinked.';
            connectedStatus.style.color = '#64E49F';
            connectedStatus.classList.remove('hidden');
          }
        } else {
          const provider = new GoogleAuthProvider();
          await linkWithPopup(auth.currentUser, provider);
          if (connectedStatus) {
            connectedStatus.textContent = AppState.lang === 'tr' ? 'Google hesabı bağlandı.' : 'Google account linked.';
            connectedStatus.style.color = '#64E49F';
            connectedStatus.classList.remove('hidden');
          }
        }
        updateSettingsView();
      } catch (err) {
        console.error('Google link/unlink error:', err);
        if (connectedStatus) {
          if (err.message === 'ONLY_PROVIDER') {
            connectedStatus.textContent = AppState.lang === 'tr'
              ? 'Tek giriş yönteminiz bu hesap. Önce e-posta/şifre veya başka hesap ekleyin.'
              : 'Cannot unlink your only sign-in method.';
          } else {
            connectedStatus.textContent = AppState.lang === 'tr' ? 'İşlem başarısız.' : 'Operation failed.';
          }
          connectedStatus.style.color = '#ff6b6b';
          connectedStatus.classList.remove('hidden');
        }
      } finally {
        googleLinkBtn.disabled = false;
      }
    });
  }

  // 6. X (Twitter) Provider Link / Unlink
  const xLinkBtn = document.getElementById('profileLinkXBtn');
  if (xLinkBtn && !xLinkBtn.dataset.init) {
    xLinkBtn.dataset.init = '1';
    xLinkBtn.addEventListener('click', async () => {
      if (!AppState.user) return;
      xLinkBtn.disabled = true;
      if (connectedStatus) connectedStatus.classList.add('hidden');

      try {
        const { linkWithPopup, unlink, TwitterAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js");
        const { auth } = await import('../../firebase.js');

        const isLinked = AppState.user.providerData?.some(p => p.providerId === 'twitter.com');

        if (isLinked) {
          if (AppState.user.providerData.length <= 1) {
            throw new Error('ONLY_PROVIDER');
          }
          await unlink(auth.currentUser, 'twitter.com');
          if (connectedStatus) {
            connectedStatus.textContent = AppState.lang === 'tr' ? 'X hesabı kaldırıldı.' : 'X account unlinked.';
            connectedStatus.style.color = '#64E49F';
            connectedStatus.classList.remove('hidden');
          }
        } else {
          const provider = new TwitterAuthProvider();
          await linkWithPopup(auth.currentUser, provider);
          if (connectedStatus) {
            connectedStatus.textContent = AppState.lang === 'tr' ? 'X hesabı bağlandı.' : 'X account linked.';
            connectedStatus.style.color = '#64E49F';
            connectedStatus.classList.remove('hidden');
          }
        }
        updateSettingsView();
      } catch (err) {
        console.error('X link/unlink error:', err);
        if (connectedStatus) {
          if (err.message === 'ONLY_PROVIDER') {
            connectedStatus.textContent = AppState.lang === 'tr'
              ? 'Tek giriş yönteminiz bu hesap.'
              : 'Cannot unlink your only sign-in method.';
          } else {
            connectedStatus.textContent = AppState.lang === 'tr' ? 'İşlem başarısız.' : 'Operation failed.';
          }
          connectedStatus.style.color = '#ff6b6b';
          connectedStatus.classList.remove('hidden');
        }
      } finally {
        xLinkBtn.disabled = false;
      }
    });
  }

  // 7. Delete Account Row
  const profileDeleteRow = document.getElementById('profileDeleteAccountRow');
  if (profileDeleteRow && !profileDeleteRow.dataset.init) {
    profileDeleteRow.dataset.init = '1';
    profileDeleteRow.addEventListener('click', (e) => {
      e.preventDefault();
      elements.deleteAccountBtn?.click();
    });
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

  // Dynamic items (anything except fixed ones)
  const dynamicItems = ['navNotebook', 'navFocus', 'navSleep', 'navAmbient', 'navProfile'];
  const visibilityMap = {
    'navNotebook': showNote,
    'navFocus': showFocus,
    'navSleep': showSleep,
    'navAmbient': showAmbient,
    'navProfile': true
  };

  const visibleDynamicItems = dynamicItems.filter(id => visibilityMap[id]);
  const totalVisibleCount = 2 + visibleDynamicItems.length; // Home + Breathe + others

  if (totalVisibleCount <= 4) {
    // Standard Single Row Layout - Compact & Minimal
    if (navMore) navMore.classList.add('hidden');
    if (navContainer) navContainer.classList.remove('is-expanded');
    
    // Clear all dynamic first
    dynamicItems.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    if (navBreathe) navBreathe.style.display = 'none';

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

    if (navMore) navMainRow.appendChild(navMore);
  } else {
    // Dynamic Slot Layout (> 4 Items)
    if (navMore) navMore.classList.remove('hidden');

    const activeView = AppState.currentView?.replace('view-', '');
    let activeDynamicId = null;
    dynamicItems.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.getAttribute('data-view') === activeView) {
        activeDynamicId = id;
        AppState.lastActiveDynamicId = id;
        localStorage.setItem('aura_last_dynamic_nav', id);
      }
      if (el) el.style.display = 'none';
    });
    if (navBreathe) navBreathe.style.display = 'none';

    // Slot Assignments
    const slot1 = navHome;
    let slot2 = navBreathe;
    let slot3 = null;

    // Determine the "Most Visited" dynamic item
    const getMostVisited = () => {
      let maxCount = -1;
      let mostVisited = visibleDynamicItems[0];
      visibleDynamicItems.forEach(id => {
        const count = AppState.navStats[id] || 0;
        if (count > maxCount) {
          maxCount = count;
          mostVisited = id;
        }
      });
      return mostVisited;
    };

    const mostVisitedId = getMostVisited();

    // Resolve persistent slot 3: use stored lastActiveDynamicId if it's still visible
    const persistedSlot3 = AppState.lastActiveDynamicId;
    const isPersisted3Visible = persistedSlot3 && visibleDynamicItems.includes(persistedSlot3);
    // The definitive slot 3 value: active dynamic > persisted > mostVisited fallback
    const resolvedSlot3 = activeDynamicId || (isPersisted3Visible ? persistedSlot3 : null);

    slot3 = resolvedSlot3 || mostVisitedId;

    // Reconstruct Main Row Safely
    navMainRow.appendChild(slot1);
    
    if (slot2) {
      const s2El = (typeof slot2 === 'string') ? document.getElementById(slot2) : slot2;
      if (s2El) { s2El.style.display = ''; navMainRow.appendChild(s2El); }
    }
    
    if (slot3) {
      const s3Id = (typeof slot3 === 'string') ? slot3 : slot3.id;
      // Ensure we don't show the same item twice if slot2 and slot3 accidentally match
      const s2Id = (typeof slot2 === 'string') ? slot2 : slot2.id;
      if (s3Id !== s2Id) {
        const s3El = document.getElementById(s3Id);
        if (s3El) { s3El.style.display = ''; navMainRow.appendChild(s3El); }
      }
    }
    
    navMainRow.appendChild(navMore);

    // Reconstruct Extra Row
    const s2Id = (typeof slot2 === 'string') ? slot2 : slot2?.id;
    const s3Id = (typeof slot3 === 'string') ? slot3 : slot3?.id;

    visibleDynamicItems.forEach(id => {
      if (id === s2Id || id === s3Id) return;
      const el = document.getElementById(id);
      if (el) { el.style.display = ''; navExtraRow.appendChild(el); }
    });
  }

  // Toggle listener
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

  // Desktop sync (remains standard list)
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

export function renderModuleMarket() {
  const marketGrid = document.getElementById('moduleMarketGrid');
  if (!marketGrid) return;
  
  const modules = [
    {
      id: 'notebook',
      title: t('market_notebook_title'),
      desc: t('market_notebook_desc'),
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z" /><path d="M16 8 2 22" /><path d="M17.5 15H9" /></svg>',
      isInstalled: true,
      isActive: AppState.showNotebook
    },
    {
      id: 'focus',
      title: t('market_focus_title'),
      desc: t('market_focus_desc'),
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      isInstalled: AppState.unlockedFocus,
      isActive: AppState.showFocus
    },
    {
      id: 'ambient',
      title: t('market_ambient_title'),
      desc: t('market_ambient_desc'),
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>',
      isInstalled: AppState.unlockedAmbient,
      isActive: AppState.showAmbient
    },
    {
      id: 'sleep',
      title: t('market_sleep_title'),
      desc: t('market_sleep_desc'),
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
      isInstalled: AppState.unlockedSleep,
      isActive: AppState.showSleep
    }
  ];

  marketGrid.innerHTML = modules.map(mod => `
    <div class="market-list-item info-trigger" data-info="${mod.id}">
      <div class="market-item-icon">${mod.icon}</div>
      <div class="market-item-title-row">
        <span class="market-item-title">${mod.title}</span>
        <span class="market-item-status ${mod.isInstalled ? 'installed' : ''}">
          ${mod.isInstalled ? (mod.isActive ? t('market_status_active') : t('market_status_inactive')) : t('market_status_locked')}
        </span>
      </div>
      <p class="market-item-desc">${mod.desc}</p>
      <div class="market-item-right">
        <button class="market-btn ${mod.isInstalled ? (mod.isActive ? 'market-btn-active' : 'market-btn-inactive') : 'market-btn-install'}" 
                data-mod="${mod.id}">
          ${mod.isInstalled ? (mod.isActive ? t('market_btn_disable') : t('market_btn_enable')) : t('market_btn_install')}
        </button>
      </div>
    </div>
  `).join('');

  marketGrid.querySelectorAll('.market-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modId = e.currentTarget.getAttribute('data-mod');
      handleModuleAction(modId);
    });
  });
}

export function handleModuleAction(modId) {
  if (typeof vibrate !== 'undefined') vibrate('light');
  
  if (modId === 'notebook') {
    AppState.showNotebook = !AppState.showNotebook;
    localStorage.setItem('aura_show_notebook', AppState.showNotebook);
  } else if (modId === 'focus') {
    if (!AppState.unlockedFocus) {
      AppState.unlockedFocus = true;
      AppState.showFocus = true;
      localStorage.setItem('aura_unlocked_focus', 'true');
    } else {
      AppState.showFocus = !AppState.showFocus;
    }
    localStorage.setItem('aura_show_focus', AppState.showFocus);
  } else if (modId === 'ambient') {
    if (!AppState.unlockedAmbient) {
      AppState.unlockedAmbient = true;
      AppState.showAmbient = true;
      localStorage.setItem('aura_unlocked_ambient', 'true');
    } else {
      AppState.showAmbient = !AppState.showAmbient;
    }
    localStorage.setItem('aura_show_ambient', AppState.showAmbient);
  } else if (modId === 'sleep') {
    if (!AppState.unlockedSleep) {
      AppState.unlockedSleep = true;
      AppState.showSleep = true;
      localStorage.setItem('aura_unlocked_sleep', 'true');
    } else {
      AppState.showSleep = !AppState.showSleep;
    }
    localStorage.setItem('aura_show_sleep', AppState.showSleep);
  }
  
  renderModuleMarket(); // Re-render marketplace
  
  // Update UI navigation instantly
  const appEvent = new CustomEvent('aura-modules-updated');
  window.dispatchEvent(appEvent);
}
