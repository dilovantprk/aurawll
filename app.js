/**
 * AURA V4 — ORCHESTRATOR HUB
 * 100% Modular Architecture — ES Modules
 */

// Core Services & Logic
import { AppState, safeGetItem, safeSetItem, saveHistoryToLocal } from './js/core/state.js';
import { elements } from './js/core/dom.js';
import { t, renderLocalization } from './js/core/i18n.js';
import { normalizeCheckinData, calculatePolyvagalState } from './js/core/utils.js';
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

// Services
import { signInAsGuest, logoutUser } from './authService.js';

let fb;

/**
 * Global Routing System
 */
export function navigateTo(viewId, skipHistory = false) {
  const currentView = Array.from(elements.views).find(v => !v.classList.contains('hidden'));
  if (currentView && currentView.id === viewId) return;

  const target = document.getElementById(viewId);
  if (!target) return;

  // Global HUD Reset
  setHUD(null);

  if (!skipHistory) {
    history.pushState({ view: viewId }, '', '#' + viewId.replace('view-', ''));
  }

  // Update Active Tab Name in Header
  if (elements.activeTabName) {
    let slug = viewId.replace('view-', '');
    
    // Map check-in steps to "Check-in"
    const checkinSteps = ['somatic-entry', 'affect-grid', 'emotion-refinement', 'exercise', 'savoring', 'completion', 'meditation-loading'];
    if (checkinSteps.includes(slug)) slug = 'checkin';
    
    const tabLabel = t('nav_' + slug) || slug;
    elements.activeTabName.textContent = tabLabel;
  }

  elements.views.forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active', 'opacity-100', 'translate-y-0');
  });

  target.classList.remove('hidden');
  target.scrollTop = 0;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.classList.add('active', 'opacity-100', 'translate-y-0');
    });
  });

  // Feature Triggers
  if (viewId === 'view-dashboard') loadDashboard();
  if (viewId === 'view-meditations') { renderMeditationsList(); renderFilterChips(); renderRecommendations(); }
  if (viewId === 'view-notebook') loadNotebook();
  if (viewId === 'view-insight') updateInsightView(AppState.userHistory || AppState.mockHistory);
  if (viewId === 'view-settings') updateSettingsView();
  
  // Push physical translations to static DOM elements
  renderLocalization();

  const hideMobileHeaderViews = ['view-welcome', 'view-auth', 'view-onboarding'];
  const hideImmersionNavViews = ['view-welcome', 'view-auth', 'view-onboarding', 'view-somatic-entry', 'view-affect-grid', 'view-emotion-refinement', 'view-exercise', 'view-savoring', 'view-meditation-loading', 'view-completion'];
  
  const shouldHideMobileHeader = hideMobileHeaderViews.includes(viewId);
  const shouldHideImmersionNav = hideImmersionNavViews.includes(viewId);
  
  // Mobile Header Visibility (#mobile-header)
  if (elements.header) {
    if (shouldHideMobileHeader) {
      elements.header.classList.add('hidden');
    } else {
      elements.header.classList.remove('hidden');
    }
  }

  // Desktop Nav Visibility (Immersive behavior)
  if (elements.desktopNav) {
    if (shouldHideImmersionNav) {
      elements.desktopNav.classList.add('hidden');
      elements.desktopNav.style.display = 'none';
    } else {
      elements.desktopNav.classList.remove('hidden');
      elements.desktopNav.style.display = ''; // Let CSS handle desktop/mobile display rules
    }
  }

  // Mobile Nav Visibility (Immersive behavior)
  if (elements.mobileNav) {
    if (shouldHideImmersionNav) {
      elements.mobileNav.classList.add('nav-hidden');
      elements.mobileNav.classList.remove('nav-visible');
      document.body.classList.add('nav-hidden');
      document.body.classList.remove('has-nav');
    } else {
      elements.mobileNav.classList.remove('nav-hidden');
      elements.mobileNav.classList.add('nav-visible');
      document.body.classList.remove('nav-hidden');
      document.body.classList.add('has-nav');
    }
  }
  if (elements.desktopNav) {
    if (shouldHideImmersionNav) elements.desktopNav.classList.add('nav-hidden');
    else elements.desktopNav.classList.remove('nav-hidden');
  }

  // Sync Nav Active States
  const slug = viewId.replace('view-', '');
  const allNavs = [...(elements.navItems || []), ...(elements.navLinks || [])];
  allNavs.forEach(btn => {
    if (btn.getAttribute('data-view') === slug) btn.classList.add('active');
    else btn.classList.remove('active');
  });
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

  navigateTo('view-welcome');

  initWelcomeScreen({
    user: AppState.user,
    onGesture: () => SensoryEngine.initAudio(),
    onComplete: async ({ mode }) => {
      if (mode === 'guest' || (mode === 'login' && AppState.user)) {
        if (!AppState.user) AppState.user = await signInAsGuest();
        setTimeout(() => {
          if (!safeGetItem('aura_onboarded')) startOnboardingFlow({ navigateTo });
          else loadDashboard();
        }, 800);
      } else if (mode === 'login') { navigateTo('view-auth'); }
    },
    t, lang: AppState.lang
  });
}

/**
 * Bootstrapping
 */
async function initAppBootstrap() {
  SensoryEngine.appVolume = AppState.appVolume;
  SensoryEngine.droneEnabled = AppState.droneEnabled;
  SensoryEngine.isMuted = AppState.isMuted;

  initModals({ 
    navigateTo, 
    AppState, 
    showInfoModal,
    getExerciseParams: () => AppState.currentExercise
  });
  renderLocalization(); // Apply to static elements on boot
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
      AppState.isCheckIn = false; // Standalone session
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
    onAuthenticated: (user) => {
      AppState.user = user;
      migrateGuestData(user.uid);
      const onboarded = localStorage.getItem('aura_onboarded');
      if (!onboarded) {
        startOnboardingFlow({ navigateTo });
      } else {
        loadDashboard();
      }
    }
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
    },
    eraseAllData: async () => {
      try {
        if (fb && fb.isInitialized && AppState.user) {
          const q = fb.query(fb.collection(fb.db, 'checkins'), fb.where('uid', '==', AppState.user.uid));
          const snapshot = await fb.getDocs(q);
          const deletePromises = [];
          snapshot.forEach(doc => {
            deletePromises.push(fb.deleteDoc(doc.ref));
          });
          await Promise.all(deletePromises);
        }
      } catch (err) {
        console.error("[Aura] Failed to delete Firebase data", err);
      }
      localStorage.clear();
    }
  });

  // Navigation Setup
  const allNavs = [...(elements.navItems || []), ...(elements.navLinks || [])];
  allNavs.forEach(btn => {
    btn.onclick = () => {
      const view = btn.getAttribute('data-view');
      if (view) {
        if (view === 'dashboard') loadDashboard();
        else navigateTo('view-' + view);
      }
    };
  });

  try {
    fb = await Promise.race([
      import('./firebase.js'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 3000))
    ]);
    if (fb.isInitialized && fb.auth) {
      fb.onAuthStateChanged(fb.auth, (user) => startAppFlow(user));
    } else { startAppFlow(null); }
  } catch (err) { startAppFlow(null); }

  initSwipeNavigation();
}

/**
 * Swipe to Navigate Logic
 */
function initSwipeNavigation() {
  const tabs = ['dashboard', 'meditations', 'notebook', 'settings'];
  let touchStartX = 0;
  let touchStartY = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
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
    
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        const nextTab = tabs[currentIndex + 1];
        if (nextTab === 'dashboard') loadDashboard();
        else navigateTo(`view-${nextTab}`);
      } else if (deltaX > 0 && currentIndex > 0) {
        const prevTab = tabs[currentIndex - 1];
        if (prevTab === 'dashboard') loadDashboard();
        else navigateTo(`view-${prevTab}`);
      }
    }
  }, { passive: true });
}

function updateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

// Global Startup
document.addEventListener('DOMContentLoaded', initAppBootstrap);
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) navigateTo(e.state.view, true);
});
