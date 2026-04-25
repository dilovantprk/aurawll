import { elements } from '../core/dom.js';
import { safeSetItem, AppState } from '../core/state.js';

import { loadDashboard } from './dashboard.js';

let currentOnbScreen = 0;
let configProps = {
    navigateTo: null
};

export function startOnboardingFlow(config) {
  if (config) Object.assign(configProps, config);
  
  if (configProps.navigateTo) {
    configProps.navigateTo('view-onboarding');
  }

  if (!elements.onbScreensContainer) return;
  const screens = elements.onbScreensContainer.querySelectorAll('.onb-screen');
  const dots = document.querySelectorAll('.onb-dot');
  
  const showScreen = (idx) => {
    screens.forEach((s, i) => {
      if (i === idx) {
        s.classList.remove('hidden');
        s.style.position = 'relative';
        s.style.pointerEvents = 'auto';
        setTimeout(() => { s.style.opacity = '1'; }, 20);
      } else {
        s.style.opacity = '0';
        s.style.pointerEvents = 'none';
        setTimeout(() => {
          s.classList.add('hidden');
          s.style.position = 'absolute';
        }, 400);
      }
    });
    dots.forEach((d, i) => {
      d.style.background = i === idx ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)';
    });
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
    if (configProps.navigateTo) {
      configProps.navigateTo('view-dashboard');
    } else {
      loadDashboard();
    }
  };

  if (elements.onbSkipBtn) elements.onbSkipBtn.onclick = (e) => { e.stopPropagation(); finish(); };
  if (elements.onbLetsGoBtn) elements.onbLetsGoBtn.onclick = (e) => { e.stopPropagation(); finish(); };
}
