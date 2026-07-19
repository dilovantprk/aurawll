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
  const dots = elements.onbScreensContainer.querySelectorAll('.onb-dot');
  const nextBtn = document.getElementById('onbNextBtn');
  
  const track = elements.onbScreensContainer.querySelector('.onb-track');
  
  const showScreen = (idx) => {
    if (track) {
      track.style.transform = `translateX(-${idx * 100}%)`;
    }

    dots.forEach((d, i) => {
      if (i === idx) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });

    if (nextBtn) {
      if (idx === screens.length - 1) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = '';
      }
    }
  };

  // Set initial screen
  currentOnbScreen = 0;
  showScreen(currentOnbScreen);

  // Setup Next button listener
  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      if (currentOnbScreen < screens.length - 1) {
        currentOnbScreen++;
        showScreen(currentOnbScreen);
      }
    };
  }

  // Setup dot navigation listeners
  dots.forEach(d => {
    d.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(d.getAttribute('data-index') || '0');
      currentOnbScreen = idx;
      showScreen(idx);
    };
  });

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
