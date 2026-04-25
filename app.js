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
  if (island) {
    const headerOutClass = direction === 'left' ? 'header-island-slide-out-right' : 'header-island-slide-out-left';
    const headerInClass = direction === 'left' ? 'header-island-slide-in-left' : 'header-island-slide-in-right';
    
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
  }

  // Handle View Transitions (Physical Slide)
  if (currentView) {
    const outClass = direction === 'left' ? 'view-slide-out-right' : 'view-slide-out-left';
    currentView.classList.add(outClass);
    
    const inClass = direction === 'left' ? 'view-slide-in-left' : 'view-slide-in-right';
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

  allNavs.forEach(btn => {
    if (!btn) return;
    btn.onclick = () => {
      const view = btn.getAttribute('data-view');
      if (view) {
        SensoryEngine.triggerHaptic('light');
        SensoryEngine.playTick();
        navigateTo('view-' + view);
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
  let startedOnScrollable = false;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    const scrollable = e.target.closest('.filter-chips, .filter-chips-container, .rec-scroll-row, .meditation-grid-scroll, [data-no-swipe]');
    startedOnScrollable = !!scrollable;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (startedOnScrollable) return;
    const currentView = Array.from(elements.views).find(v => !v.classList.contains('hidden'));
    if (!currentView) return;
    const currentTab = currentView.id.replace('view-', '');
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex === -1) return;
    if (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'range') return;
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        navigateTo(`view-${tabs[currentIndex + 1]}`);
      } else if (deltaX > 0 && currentIndex > 0) {
        navigateTo(`view-${tabs[currentIndex - 1]}`);
      }
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initAppBootstrap);
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) navigateTo(e.state.view, true);
});
