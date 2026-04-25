/**
 * AURA V4 — ORCHESTRATOR HUB
 * 100% Modular Architecture — ES Modules
 */

// Core Services & Logic
import { AppState, safeGetItem, safeSetItem, saveHistoryToLocal } from './js/core/state.js';
import { elements } from './js/core/dom.js';
import { t, renderLocalization } from './js/core/i18n.js';
import { normalizeCheckinData, calculatePolyvagalState, syncGlobalTheme } from './js/core/utils.js';
import { SensoryEngine } from './js/services/sensory.js';
import { MeditationAudio } from './js/services/meditation-audio.js';

// Components
import { initModals, showInfoModal } from './js/components/modals.js';
import { initCheckin, renderSomaticEntry, setHUD, prepareExercise, advanceFromExercise } from './js/components/checkin.js';
import { initDashboard, loadDashboard } from './js/components/dashboard.js';
import { initNotebook, loadNotebook } from './js/components/notebook.js';
import { initMeditationFlow, startMeditationLoading } from './js/components/meditation-flow.js';
import { initMeditations, renderMeditationsList, renderFilterChips, renderRecommendations } from './js/components/meditations.js';
import { initExercise, stopExercise } from './js/components/exercise.js';
import { initSettings, updateSettingsView } from './js/components/settings.js';
import { startOnboardingFlow } from './js/components/onboarding.js';
import { updateInsightView } from './js/components/insight.js';
import { initWelcomeScreen } from './js/components/welcome.js';
import { initAuth } from './js/components/auth.js';
import { NotificationService } from './js/services/notifications.js';

// Services
import { signInAsGuest, logoutUser } from './authService.js';

let fb;
let isNavigating = false;

/**
 * Global Routing System
 */
export function navigateTo(viewId, skipHistory = false) {
  if (isNavigating) return;
  
  const currentView = Array.from(elements.views).find(v => !v.classList.contains('hidden'));
  if (currentView && currentView.id === viewId) return;

  const target = document.getElementById(viewId);
  if (!target) return;

  isNavigating = true;

  // Determine Direction
  const tabs = ['dashboard', 'meditations', 'notebook', 'settings'];
  const oldSlug = currentView ? currentView.id.replace('view-', '') : 'dashboard';
  const newSlug = viewId.replace('view-', '');
  const oldIndex = tabs.indexOf(oldSlug);
  const newIndex = tabs.indexOf(newSlug);
  
  const direction = (newIndex > oldIndex) ? 'left' : 'right';

  // Global HUD Reset
  setHUD(null);

  if (!skipHistory) {
    history.pushState({ view: viewId }, '', '#' + viewId.replace('view-', ''));
  }

  // Update Header with Physical Glass Slide Effect
  const island = elements.activeTabName?.closest('.header-island');
  const checkinSteps = ['somatic-entry', 'affect-grid', 'emotion-refinement', 'exercise', 'savoring', 'completion', 'meditation-loading'];
  
  const isCurrentlyCheckin = checkinSteps.includes(AppState.currentView?.replace('view-', '') || '');
  const isTargetingCheckin = checkinSteps.includes(newSlug);
  const skipHeaderAnimation = isCurrentlyCheckin && isTargetingCheckin;

  if (island && !skipHeaderAnimation) {
    const headerOutClass = direction === 'left' ? 'header-island-slide-out-left' : 'header-island-slide-out-right';
    const headerInClass = direction === 'left' ? 'header-island-slide-in-right' : 'header-island-slide-in-left';
    
    island.classList.remove('header-island-slide-out-left', 'header-island-slide-out-right', 'header-island-slide-in-left', 'header-island-slide-in-right');
    island.classList.add(headerOutClass);
    
    setTimeout(() => {
      let slug = newSlug;
      const checkinSteps = ['somatic-entry', 'affect-grid', 'emotion-refinement', 'exercise', 'savoring', 'completion', 'meditation-loading'];
      if (checkinSteps.includes(slug)) slug = 'checkin';
      const tabLabel = t('nav_' + slug) || slug;
      
      if (elements.activeTabName) elements.activeTabName.textContent = tabLabel;
      
      island.classList.remove(headerOutClass);
      island.classList.add(headerInClass);
      
      // Pulse effect on arrival
      island.classList.remove('liquid-pulse-animate');
      void island.offsetWidth;
      island.classList.add('liquid-pulse-animate');
      
      setTimeout(() => island.classList.remove(headerInClass), 400);
    }, 250);
  } else if (island && skipHeaderAnimation) {
    // Just ensure text is synced if needed, but no slide
    let slug = newSlug;
    if (checkinSteps.includes(slug)) slug = 'checkin';
    const tabLabel = t('nav_' + slug) || slug;
    if (elements.activeTabName && elements.activeTabName.textContent !== tabLabel) {
      elements.activeTabName.textContent = tabLabel;
    }
  }

  // Handle View Transitions (Physical Slide)
  if (currentView) {
    const outClass = direction === 'left' ? 'view-slide-out-left' : 'view-slide-out-right';
    currentView.classList.add(outClass);
    
    const inClass = direction === 'left' ? 'view-slide-in-right' : 'view-slide-in-left';
    target.classList.remove('hidden');
    target.classList.add('active', inClass);
    target.scrollTop = 0;
    
    setTimeout(() => {
      currentView.classList.add('hidden');
      currentView.classList.remove('active', 'view-slide-out-left', 'view-slide-out-right');
      target.classList.remove('view-slide-in-right', 'view-slide-in-left');
      isNavigating = false;
    }, 500);
  } else {
    if (elements.views) {
      Array.from(elements.views).forEach(v => v.classList.add('hidden'));
    }
    target.classList.remove('hidden');
    target.classList.add('active');
    isNavigating = false;
  }

  // Feature Triggers
  if (viewId === 'view-dashboard') loadDashboard();
  if (viewId === 'view-meditations') { renderMeditationsList(); renderFilterChips(); renderRecommendations(); }
  if (viewId === 'view-notebook') loadNotebook();
  if (viewId === 'view-insight') updateInsightView(AppState.userHistory || AppState.mockHistory);
  if (viewId === 'view-settings') updateSettingsView();
  
  renderLocalization();

  const hideMobileHeaderViews = ['view-welcome', 'view-auth', 'view-onboarding'];
  const hideImmersionNavViews = ['view-welcome', 'view-auth', 'view-onboarding', 'view-somatic-entry', 'view-affect-grid', 'view-emotion-refinement', 'view-exercise', 'view-savoring', 'view-meditation-loading', 'view-completion'];
  
  const shouldHideMobileHeader = hideMobileHeaderViews.includes(viewId);
  const shouldHideImmersionNav = hideImmersionNavViews.includes(viewId);
  
  // Desktop Nav Visibility
  if (elements.desktopNav) {
    if (shouldHideImmersionNav) elements.desktopNav.classList.add('hidden', 'nav-hidden');
    else elements.desktopNav.classList.remove('hidden', 'nav-hidden');
  }

  // Mobile Header Visibility
  if (elements.header) {
    if (shouldHideMobileHeader) elements.header.classList.add('hidden');
    else elements.header.classList.remove('hidden');
  }

  // Desktop Sync Tab Name
  const desktopActiveName = document.getElementById('desktop-active-tab-name');
  if (desktopActiveName) {
    desktopActiveName.classList.remove('visible');
    setTimeout(() => {
      const tabLabel = t('nav_' + newSlug) || newSlug;
      if (tabLabel) desktopActiveName.textContent = tabLabel;
      desktopActiveName.classList.add('visible');
    }, 50);
  }

  // Nav Visibility
  if (elements.mobileNav) {
    if (shouldHideImmersionNav) {
      elements.mobileNav.classList.add('nav-hidden');
      document.body.classList.add('nav-hidden');
    } else {
      elements.mobileNav.classList.remove('nav-hidden');
      document.body.classList.remove('nav-hidden');
    }
  }

  const slug = viewId.replace('view-', '');
  const navItems = elements.navItems ? Array.from(elements.navItems) : [];
  const navLinks = elements.navLinks ? Array.from(elements.navLinks) : [];
  const allNavs = [...navItems, ...navLinks];

  allNavs.forEach(btn => {
    if (!btn) return;
    if (btn.getAttribute('data-view') === slug) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  const updatePill = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.nav-item') || []);
    const activeItem = items.find(item => item.classList.contains('active'));
    const indicator = container.querySelector('.nav-indicator');
    
    if (activeItem && indicator) {
      const oldLeft = parseFloat(container.style.getPropertyValue('--nav-left')) || 0;
      const newLeft = activeItem.offsetLeft;
      const distance = Math.abs(newLeft - oldLeft);

      if (distance > 20) {
        indicator.classList.add('nav-pill-stretch');
        setTimeout(() => indicator.classList.remove('nav-pill-stretch'), 400);
      }

      container.style.setProperty('--nav-width', activeItem.offsetWidth + 'px');
      container.style.setProperty('--nav-left', newLeft + 'px');
    }
  };

  requestAnimationFrame(() => {
    updatePill('desktop-nav-links');
    updatePill('mobile-nav');
  });

  if (!skipHistory) {
    SensoryEngine.triggerHaptic('medium');
    SensoryEngine.playSwipe();
  }
}

/**
 * Guest Data Migration
 */
async function migrateGuestData(uid) {
  if (!fb?.isInitialized || !uid) return;
  const localHistory = AppState.mockHistory || [];
  const unSynced = localHistory.filter(e => !e.synced);
  if (unSynced.length === 0) return;

  for (const entry of unSynced) {
    try {
      await fb.addDoc(fb.collection(fb.db, "checkins"), { uid, ...entry, migrated: true });
      entry.synced = true;
    } catch(err) { console.warn("Migration failed", err); }
  }
  saveHistoryToLocal();
}

/**
 * Application Lifecycle
 */
function startAppFlow(user) {
  if (user && AppState.user && AppState.user.uid === user.uid) return;
  
  if (user) { 
    AppState.user = user; 
    migrateGuestData(user.uid); 
    document.body.classList.add('is-authenticated');
  } else {
    document.body.classList.remove('is-authenticated');
  }

  syncGlobalTheme();

  const currentView = elements.views ? Array.from(elements.views).find(v => !v.classList.contains('hidden')) : null;
  const isOnWelcome = currentView && currentView.id === 'view-welcome';

  if (user && !isOnWelcome) {
    if (safeGetItem('aura_onboarded')) {
      loadDashboard();
      navigateTo('view-dashboard');
    } else {
      startOnboardingFlow({ navigateTo });
    }
    return;
  } else if (!user && !isOnWelcome) {
    navigateTo('view-welcome');
  }

  initWelcomeScreen({
    user: AppState.user,
    onGesture: () => SensoryEngine.initAudio(),
    onComplete: async ({ mode }) => {
      if (mode === 'guest' || (mode === 'login' && AppState.user)) {
        if (!AppState.user) AppState.user = await signInAsGuest();
        setTimeout(() => {
          if (!safeGetItem('aura_onboarded')) startOnboardingFlow({ navigateTo });
          else navigateTo('view-dashboard');
        }, 800);
      } else if (mode === 'login') { navigateTo('view-auth'); }
    },
    t, lang: AppState.lang
  });
}

async function initAppBootstrap() {
  SensoryEngine.appVolume = AppState.appVolume;
  SensoryEngine.droneEnabled = AppState.droneEnabled;
  SensoryEngine.isMuted = AppState.isMuted;
  SensoryEngine.hapticEnabled = AppState.hapticEnabled;
  SensoryEngine.uiSoundsEnabled = AppState.uiSoundsEnabled;

  initModals({ 
    navigateTo, 
    AppState, 
    showInfoModal,
    getExerciseParams: () => AppState.currentExercise
  });
  renderLocalization(); 
  NotificationService.init();

  try {
    fb = await Promise.race([
      import('./firebase.js'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 3000))
    ]);
    if (fb) initModals({ fb });
  } catch (err) {
    console.error("[Aura] Firebase load failed", err);
  }
  initCheckin({ 
    navigateTo, 
    resetBioFeedback: () => SensoryEngine.stopHaptics(), 
    loadDashboard, 
    renderSomaticEntry,
    stopExercise,
    startMeditationLoading,
    calculatePolyvagalState
  });
  initDashboard({ fb, navigateTo });
  initNotebook({ fb, navigateTo });
  initMeditationFlow({ fb, navigateTo, resetBioFeedback: () => SensoryEngine.stopHaptics(), AudioEngine: MeditationAudio, setHUD, loadDashboard });
  initMeditations({ 
    prepareExercise: (id) => {
      AppState.isCheckIn = false; 
      prepareExercise(id); 
      navigateTo('view-exercise'); 
    } 
  });
  initExercise({ 
    getExerciseParams: () => AppState.currentExercise, 
    initAudio: () => SensoryEngine.initAudio(),
    onComplete: () => advanceFromExercise()
  });
  initAuth({
    navigateTo,
    onAuthenticated: (user) => startAppFlow(user)
  });
  initSettings({ 
    navigateTo,
    setVolume: (v) => SensoryEngine.setVolume(v), 
    setDroneEnabled: (s) => SensoryEngine.setDroneEnabled(s),
    logout: async () => {
      await logoutUser();
      AppState.user = null;
      localStorage.removeItem('aura_history');
      localStorage.removeItem('aura_guest_name');
      localStorage.removeItem('aura_onboarded');
      window.location.reload();
    }
  });

  window.addEventListener('aura-haptic', (e) => {
    if (SensoryEngine) SensoryEngine.triggerHaptic(e.detail || 'light');
  });

  let scrollTicking = false;
  if (elements.app) {
    elements.app.addEventListener('scroll', () => {
      if (!scrollTicking && document.getElementById('view-dashboard')?.classList.contains('active')) {
        window.requestAnimationFrame(() => {
          const scrollY = elements.app.scrollTop;
          document.documentElement.style.setProperty('--vagal-y', `${40 + (scrollY * 0.05)}%`);
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
  }

  const navItems = elements.navItems ? Array.from(elements.navItems) : [];
  const navLinks = elements.navLinks ? Array.from(elements.navLinks) : [];
  const allNavs = [...navItems, ...navLinks];

  const tabsOrder = ['dashboard', 'meditations', 'notebook', 'settings'];

  allNavs.forEach(btn => {
    if (!btn) return;
    btn.onclick = () => {
      const targetSlug = btn.getAttribute('data-view');
      if (targetSlug) {
        SensoryEngine.triggerHaptic('light');
        SensoryEngine.playTick();
        
        const currentSlug = AppState.currentView?.replace('view-', '') || '';
        const currentIndex = tabsOrder.indexOf(currentSlug);
        const targetIndex = tabsOrder.indexOf(targetSlug);
        
        let direction = 'right';
        // If coming from a deep view (not in main tabs) to a main tab, always treat as 'left'
        if (currentIndex === -1 && targetIndex !== -1) {
          direction = 'right'; // Inverted
        } else if (targetIndex < currentIndex) {
          direction = 'right'; // Inverted
        } else {
          direction = 'left'; // Inverted
        }
        
        navigateTo('view-' + targetSlug, direction);
      }
    };
  });

  startAppFlow(null);

  try {
    fb = await Promise.race([
      import('./firebase.js'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 3000))
    ]);
    if (fb && fb.isInitialized && fb.auth) {
      fb.onAuthStateChanged(fb.auth, (user) => {
        if (user) startAppFlow(user);
      });
    }
  } catch (err) {
    console.error("[Aura] Firebase load failed", err);
  }

  initSwipeNavigation();
}

function initSwipeNavigation() {
  const tabs = ['dashboard', 'meditations', 'notebook', 'settings'];
  let touchStartX = 0;
  let touchStartY = 0;
  let currentDeltaX = 0;
  let isSwiping = false;
  let currentView = null;
  let targetView = null;
  let currentIndex = -1;
  let targetIndex = -1;
  let startedOnScrollable = false;
  
  document.addEventListener('touchstart', (e) => {
    if (isNavigating) return;
    const scrollable = e.target.closest('.filter-chips, .filter-chips-container, .rec-scroll-row, .meditation-grid-scroll, [data-no-swipe], #savoringNote, textarea');
    startedOnScrollable = !!scrollable;
    if (startedOnScrollable) return;

    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    currentDeltaX = 0;
    
    currentView = Array.from(elements.views).find(v => v.classList.contains('active') && !v.classList.contains('hidden'));
    if (!currentView) return;
    
    const currentTab = currentView.id.replace('view-', '');
    currentIndex = tabs.indexOf(currentTab);
    if (currentIndex === -1) return;
    
    isSwiping = true;
    currentView.style.transition = 'none';
    currentView.style.willChange = 'transform';
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isSwiping || startedOnScrollable) return;
    
    const touchX = e.changedTouches[0].screenX;
    const touchY = e.changedTouches[0].screenY;
    currentDeltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;

    // Detect horizontal intent
    if (Math.abs(currentDeltaX) < 10) return;
    if (Math.abs(deltaY) > Math.abs(currentDeltaX)) {
      isSwiping = false;
      return;
    }

    // Determine target view
    const direction = currentDeltaX < 0 ? 1 : -1; // -1 for right swipe (prev), 1 for left swipe (next)
    const newTargetIndex = currentIndex + direction;
    
    if (newTargetIndex >= 0 && newTargetIndex < tabs.length) {
      const newTargetView = document.getElementById(`view-${tabs[newTargetIndex]}`);
      if (newTargetView !== targetView) {
        if (targetView) {
          targetView.classList.add('hidden');
          targetView.style.transform = '';
        }
        targetView = newTargetView;
        targetIndex = newTargetIndex;
        if (targetView) {
          targetView.classList.remove('hidden');
          targetView.style.transition = 'none';
          targetView.style.willChange = 'transform';
        }
      }
      
      // Move both views - SYNCED WITH INVERTED LOGIC
      currentView.style.transform = `translateX(${currentDeltaX}px)`;
      if (targetView) {
        // In the new inverted logic: Next page (direction > 0) is physically on the LEFT (-100%)
        const offset = direction > 0 ? '-100%' : '100%';
        targetView.style.transform = `translateX(calc(${offset} + ${currentDeltaX}px))`;
      }
    } else {
      currentView.style.transform = `translateX(${currentDeltaX * 0.3}px)`;
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    const threshold = window.innerWidth * 0.2;
    const success = Math.abs(currentDeltaX) > threshold && targetView;

    if (success) {
      const direction = currentDeltaX < 0 ? 'right' : 'left'; // Match button logic: swipe left -> forward (right)
      // Cleanup inline styles and navigate
      currentView.style.transition = 'transform 0.4s var(--spring-easing), opacity 0.4s ease';
      if (targetView) targetView.style.transition = 'transform 0.4s var(--spring-easing), opacity 0.4s ease';
      
      const finalX = currentDeltaX < 0 ? '-100%' : '100%'; // Swipe left completes to left (but triggers 'right' navigation)
      currentView.style.transform = `translateX(${finalX})`;
      currentView.style.opacity = '0';
      if (targetView) {
        targetView.style.transform = 'translateX(0)';
        targetView.style.opacity = '1';
      }

      setTimeout(() => {
        // Reset styles and let navigateTo handle state
        currentView.style.transform = '';
        currentView.style.transition = '';
        currentView.style.opacity = '';
        if (targetView) {
          targetView.style.transform = '';
          targetView.style.transition = '';
          targetView.style.opacity = '';
        }
        navigateTo(`view-${tabs[targetIndex]}`, direction);
        targetView = null;
      }, 400);
    } else {
      // Snap back
      currentView.style.transition = 'transform 0.5s var(--spring-easing)';
      currentView.style.transform = 'translateX(0)';
      if (targetView) {
        targetView.style.transition = 'transform 0.5s var(--spring-easing)';
        const offset = targetIndex > currentIndex ? '100%' : '-100%';
        targetView.style.transform = `translateX(${offset})`;
        setTimeout(() => {
          if (!isSwiping && targetView) {
            targetView.classList.add('hidden');
            targetView.style.transform = '';
            targetView = null;
          }
        }, 500);
      }
      setTimeout(() => {
        currentView.style.transition = '';
        currentView.style.transform = '';
      }, 500);
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initAppBootstrap);
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) navigateTo(e.state.view, true);
});
