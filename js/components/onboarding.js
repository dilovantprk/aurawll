import { elements } from '../core/dom.js';
import { safeSetItem, AppState } from '../core/state.js';

let currentOnbScreen = 0;
let configProps = {
    navigateTo: null
};

export function startOnboardingFlow(config) {
  if (config) Object.assign(configProps, config);
  
  if (!elements.onbScreensContainer) return;
  const screens = elements.onbScreensContainer.querySelectorAll('.onb-screen');
  const dots = document.querySelectorAll('.onb-dot');
  
  const showScreen = (idx) => {
    screens.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('hidden', i !== idx);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };

  showScreen(0);

  elements.onbScreensContainer.onclick = () => {
    if (currentOnbScreen < screens.length - 1) {
      currentOnbScreen++;
      showScreen(currentOnbScreen);
    }
  };

  const finish = () => {
    safeSetItem('aura_onboarded', 'true');
    AppState.currentCheckIn = { 
        state: null, 
        selected_emotions: [], 
        sensations: [], 
        timestamp: null 
    };
    if (configProps.navigateTo) configProps.navigateTo('view-somatic-entry');
  };

  if (elements.onbSkipBtn) elements.onbSkipBtn.onclick = finish;
  if (elements.onbLetsGoBtn) elements.onbLetsGoBtn.onclick = finish;
}
