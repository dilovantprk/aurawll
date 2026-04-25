import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState, safeSetItem } from '../core/state.js';
import { getWeightsFromState, calculateVagalState } from '../core/vagal-engine.js';
import { openCommunityModal } from './modals.js';

let configProps = {};

export function initSettings(config) {
  Object.assign(configProps, config);
  
  if (elements.hapticToggle) {
    elements.hapticToggle.addEventListener('change', (e) => {
      AppState.hapticEnabled = e.target.checked;
      safeSetItem('aura_haptic', AppState.hapticEnabled);
    });
    elements.hapticToggle.checked = AppState.hapticEnabled;
  }

  if (elements.uiSoundsToggle) {
    elements.uiSoundsToggle.addEventListener('change', (e) => {
      AppState.uiSoundsEnabled = e.target.checked;
      safeSetItem('aura_ui_sounds', AppState.uiSoundsEnabled);
      // Directly update engine
      if (typeof SensoryEngine !== 'undefined') SensoryEngine.uiSoundsEnabled = AppState.uiSoundsEnabled;
      else if (configProps.setUISoundsEnabled) configProps.setUISoundsEnabled(AppState.uiSoundsEnabled);
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

  // Notifications — auto-detect most frequent check-in time
  function getMostFrequentCheckinTime() {
    const data = AppState.userHistory && AppState.userHistory.length > 0 ? AppState.userHistory : AppState.mockHistory;
    if (!data || data.length === 0) return '21:00';
    const hourCounts = {};
    let maxCount = 0;
    let mostFrequentHour = 21;
    data.forEach(item => {
      const hour = new Date(item.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      if (hourCounts[hour] > maxCount) { maxCount = hourCounts[hour]; mostFrequentHour = hour; }
    });
    return `${mostFrequentHour.toString().padStart(2, '0')}:00`;
  }

  const savedNotif = localStorage.getItem('aura_notif') === 'true';
  const autoTime = getMostFrequentCheckinTime();

  if (elements.notifToggleCheckbox) {
    elements.notifToggleCheckbox.checked = savedNotif;
    if (savedNotif && elements.nudgeTimeContainer) elements.nudgeTimeContainer.classList.remove('hidden');
    elements.notifToggleCheckbox.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      localStorage.setItem('aura_notif', enabled);
      if (elements.nudgeTimeContainer) {
        if (enabled) elements.nudgeTimeContainer.classList.remove('hidden');
        else elements.nudgeTimeContainer.classList.add('hidden');
      }
    });
  }

  if (elements.nudgeTimePicker) {
    elements.nudgeTimePicker.value = autoTime;
    elements.nudgeTimePicker.disabled = true;
    elements.nudgeTimePicker.style.opacity = '0.7';
    elements.nudgeTimePicker.style.cursor = 'default';
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
  const name = AppState.user?.displayName || localStorage.getItem('aura_guest_name') || (AppState.lang === 'tr' ? 'Kaşif' : 'Explorer');
  
  if (elements.userDisplayName) elements.userDisplayName.textContent = name;
  
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
