import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState, safeSetItem } from '../core/state.js';
import { getWeightsFromState, calculateVagalState } from '../core/vagal-engine.js';
import { BADGES } from '../core/constants.js';
import { calculateEarnedBadges } from '../core/utils.js';
import { openCommunityModal } from './modals.js';

import { NotificationService } from '../services/notifications.js';

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

  // Guest → Login
  elements.settingsLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (configProps.navigateTo) configProps.navigateTo('view-auth');
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

  const finalName = name ? `${name} | ${displayTitle}` : displayTitle;
  
  if (elements.userDisplayName) elements.userDisplayName.textContent = finalName;
  
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
      return `<div class="id-badge-icon" title="${t(badge.titleKey)}" style="width: 20px; height: 20px; cursor: help; color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center;">${badge.icon}</div>`;
    }).join('');
    elements.identityBadges.innerHTML = badgeIconsHtml;
  }

  // Show/hide logout vs login button based on guest status
  const isGuest = !AppState.user || AppState.user.isAnonymous || AppState.user.guest;
  if (elements.logoutBtn) elements.logoutBtn.style.display = isGuest ? 'none' : '';
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
