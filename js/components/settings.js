import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState, safeSetItem } from '../core/state.js';
import { getWeightsFromState, calculateVagalState } from '../core/vagal-engine.js';

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

  if (elements.droneToggle) {
    elements.droneToggle.addEventListener('change', (e) => {
      AppState.droneEnabled = e.target.checked;
      safeSetItem('aura_drone', AppState.droneEnabled);
      if (configProps.setDroneEnabled) configProps.setDroneEnabled(AppState.droneEnabled);
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

  elements.resetMemoryBtn?.addEventListener('click', () => {
    if (confirm(t('prof_reset_confirm'))) {
      localStorage.clear();
      window.location.reload();
    }
  });

  elements.logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (configProps.logout) configProps.logout();
    else window.location.reload();
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
}

export function updateSettingsView() {
  const localHistory = AppState.mockHistory || [];
  const name = AppState.user?.displayName || localStorage.getItem('aura_guest_name') || (AppState.lang === 'tr' ? 'Kaşif' : 'Explorer');
  
  if (elements.userDisplayName) elements.userDisplayName.textContent = name;
  
  if (elements.uniqueDaysStats) {
    const uniqueDays = new Set(localHistory.map(h => new Date(h.timestamp).toDateString())).size || 0;
    elements.uniqueDaysStats.textContent = t('prof_active_days').replace('{count}', uniqueDays);
  }

  const latest = localHistory[0];
  if (latest && elements.auraCoreSphere) {
    const weights = getWeightsFromState(latest.state);
    const stateData = calculateVagalState(0.5, 0.5); // Fallback if calculateVagalPoint is needed
    // In this context, we use the simpler state mapping
    const colors = { ventral: '#64E49F', sympathetic: '#FBA044', dorsal: '#62A4FF' };
    const color = colors[latest.polyvagal_state] || colors.ventral;
    elements.auraCoreSphere.style.background = `radial-gradient(circle at 35% 35%, ${color} 0%, rgba(255,255,255,0.4) 40%, transparent 80%)`;
  }
}
