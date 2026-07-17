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
import { initMeditations, renderMeditationsList, renderFilterChips, renderRecommendations, startMeditationBgAnimation, stopMeditationBgAnimation } from './js/components/meditations.js';
import { initExercise, stopExercise } from './js/components/exercise.js';
import { initSettings, updateSettingsView, syncNavVisibility } from './js/components/settings.js';
import { startOnboardingFlow } from './js/components/onboarding.js';
import { updateInsightView } from './js/components/insight.js';
import { initWelcomeScreen } from './js/components/welcome.js';
import { initAuth } from './js/components/auth.js';
import { handleRedirectResult } from './js/services/auth.js';
import { initFocus, exitImmersion } from './js/components/focus.js';
import { initAmbient } from './js/components/ambient.js';
import { initSleep } from './js/components/sleep.js';
import { initSwipeBreathing, startSwipeBreathingFlow, destroySwipeBreathingFlow } from './js/components/swipe-breathing.js';
import { initSwipeAmbient, startSwipeAmbientFlow, stopSwipePreviewIfAny, syncMiniPlayerState, destroySwipeAmbientFlow } from './js/components/swipe-ambient.js';
import { initGlobalCursorEffect } from './js/core/cursor-effect.js';
import { NotificationService } from './js/services/notifications.js';
import { initLiquidGlass } from './js/services/liquid-glass-webgl.js';

// Services
import { signInAsGuest, logoutUser } from './js/services/auth.js';

let fb;
let isNavigating = false;

/**
 * Triggers a beautiful GPU-accelerated portal transition overlay.
 * Expands a radial-gradient circle from the right edge, changes view under the cover,
 * and then smoothly fades out.
 */
export function triggerPortalTransition(targetViewId, colorRGB = '16, 185, 129', callback = null) {
  const portal = document.getElementById('portal-overlay');
  if (!portal) {
    if (callback) callback();
    else navigateTo(targetViewId);
    return;
  }

  // CSS custom property'ler ile renk ve pozisyon
  portal.style.setProperty('--portal-rgb', colorRGB);
  portal.classList.remove('closing');

  // Zen açılış sesi — yumuşak singing bowl
  if (typeof SensoryEngine !== 'undefined' && SensoryEngine.audioCtx && !SensoryEngine.isMuted) {
    const ctx = SensoryEngine.audioCtx;
    const now = ctx.currentTime;
    SensoryEngine.resumeAudio();

    // Kısa, ince singing bowl — portal açılış
    const freqs = [523, 784, 1046];
    const g = ctx.createGain();
    g.connect(SensoryEngine.masterGain);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.02, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = i * 3;
      const hG = ctx.createGain();
      hG.gain.value = 1.0 / (1 + i * 0.5);
      osc.connect(hG);
      hG.connect(g);
      osc.start(now);
      osc.stop(now + 2.0);
    });
  }

  // Aç
  portal.style.opacity = '1';
  portal.classList.add('active');

  // Navigate midway — portal tam açıldığında (550ms)
  setTimeout(() => {
    if (callback) callback();
    else navigateTo(targetViewId);
  }, 550);

  // Kapat — yumuşak fade-out
  setTimeout(() => {
    portal.classList.remove('active');
    portal.classList.add('closing');

    // Temizle
    setTimeout(() => {
      portal.classList.remove('closing');
      portal.style.opacity = '';
    }, 700);
  }, 1100);
}

/**
 * Global Routing System
 */
export function navigateTo(viewId, skipHistory = false) {
  if (isNavigating) return;
  
  const currentView = Array.from(elements.views).find(v => !v.classList.contains('hidden'));
  if (currentView && currentView.id === viewId) return;

  // Track previous view for smart back navigation
  if (currentView) {
    AppState.previousView = currentView.id;
  }

  // Stop swipe audio preview if navigating away from Swipe Ambient view
  if (currentView && currentView.id === 'view-swipe-ambient') {
    stopSwipePreviewIfAny();
    destroySwipeAmbientFlow();
  }
  if (currentView && currentView.id === 'view-swipe-breathing') {
    destroySwipeBreathingFlow();
  }
  if (currentView && currentView.id === 'view-meditations') {
    stopMeditationBgAnimation();
  }
  if (currentView && currentView.id === 'view-savoring') {
    SensoryEngine.stopAllSensory();
  }

  const target = document.getElementById(viewId);
  if (!target) return;

  if (!skipHistory) {
    SensoryEngine.triggerHaptic('medium');
  }

  // Restore UI from Focus Immersion
  exitImmersion();

  isNavigating = true;

  const newSlug = viewId.replace('view-', '');
  
  // Global HUD Reset
  setHUD(null);

  AppState.currentView = viewId;

  // Update Global Header Info Button for Check-in steps
  const globalInfoBtn = document.getElementById('globalInfoBtn');
  if (globalInfoBtn) {
    const checkinInfoKeys = {
      'view-somatic-entry': 'info_step1_desc',
      'view-affect-grid': 'info_step2_desc',
      'view-emotion-refinement': 'info_step2b_desc',
      'view-savoring': 'info_step4_desc',
    };
    
    if (checkinInfoKeys[viewId]) {
      globalInfoBtn.setAttribute('data-info', checkinInfoKeys[viewId]);
      globalInfoBtn.removeAttribute('data-type');
      globalInfoBtn.classList.remove('hidden');
    } else if (viewId === 'view-exercise') {
      const protocolId = AppState.currentExercise?.id || 'p_resonance';
      globalInfoBtn.setAttribute('data-type', protocolId);
      globalInfoBtn.removeAttribute('data-info');
      globalInfoBtn.classList.remove('hidden');
    } else {
      globalInfoBtn.classList.add('hidden');
    }
  }

  // Track visit stats
  const activeNavId = document.querySelector(`.nav-item[data-view="${viewId.replace('view-', '')}"]`)?.id;
  if (activeNavId) {
    AppState.navStats[activeNavId] = (AppState.navStats[activeNavId] || 0) + 1;
    localStorage.setItem('aura_nav_stats', JSON.stringify(AppState.navStats));
  }

  if (!skipHistory) {
    history.pushState({ view: viewId }, '', '#' + viewId.replace('view-', ''));
  }

  const checkinSteps = ['somatic-entry', 'affect-grid', 'emotion-refinement', 'exercise', 'savoring', 'completion', 'meditation-loading'];
  const isCurrentlyCheckin = checkinSteps.includes(AppState.currentView?.replace('view-', '') || '');
  const isTargetingCheckin = checkinSteps.includes(newSlug);
  
  // Standard Navigation Logic (Standard Mobile Wizard)
  // Forward (right) = Slide Out Left, In from Right
  // Backward (left) = Slide Out Right, In from Left
  
  // Update Header Title with Subtle Fade
  const island = elements.activeTabName?.closest('.header-island');
  const tabName = elements.activeTabName;
  const skipHeaderAnimation = isCurrentlyCheckin && isTargetingCheckin;

  if (tabName && !skipHeaderAnimation) {
    tabName.classList.remove('header-text-slide-out', 'header-text-slide-in');
    tabName.classList.add('header-text-slide-out');

    setTimeout(() => {
      let slug = newSlug;
      if (checkinSteps.includes(slug)) {
        const hasSpecificTranslation = t('nav_' + slug) !== ('nav_' + slug);
        if (!hasSpecificTranslation) slug = 'checkin';
      }
      if (slug === 'swipe-breathing') slug = 'breathe';
      if (slug === 'swipe-ambient') slug = 'ambient';
      if (slug === 'meditations') slug = 'breathe';
      
      // Dashboard: show only "Aura." — hide tab name entirely
      if (slug === 'dashboard') {
        tabName.textContent = '';
        tabName.style.display = 'none';
      } else {
        const tabLabel = t('nav_' + slug) || slug;
        tabName.textContent = tabLabel;
        tabName.style.display = '';
      }
      
      tabName.classList.remove('header-text-slide-out');
      tabName.classList.add('header-text-slide-in');
      
      setTimeout(() => tabName.classList.remove('header-text-slide-in'), 400);
    }, 200);
  } else if (tabName && skipHeaderAnimation) {
    let slug = newSlug;
    if (checkinSteps.includes(slug)) {
      const hasSpecificTranslation = t('nav_' + slug) !== ('nav_' + slug);
      if (!hasSpecificTranslation) slug = 'checkin';
    }
    if (slug === 'swipe-breathing') slug = 'breathe';
    if (slug === 'swipe-ambient') slug = 'ambient';
    if (slug === 'meditations') slug = 'breathe';
    if (slug === 'dashboard') {
      tabName.textContent = '';
      tabName.style.display = 'none';
    } else {
      const tabLabel = t('nav_' + slug) || slug;
      if (tabName.textContent !== tabLabel) {
        tabName.textContent = tabLabel;
      }
      tabName.style.display = '';
    }
  }

  // Handle View Transitions (Human Fade)
  if (currentView) {
    currentView.classList.add('view-human-out');
    target.classList.remove('hidden');
    target.classList.add('active', 'view-human-in');
    target.scrollTop = 0;
    
    syncMiniPlayerState();
    
    setTimeout(() => {
      currentView.classList.add('hidden');
      currentView.classList.remove('active', 'view-human-out');
      target.classList.remove('view-human-in');
      isNavigating = false;
      syncMiniPlayerState();
    }, 600);
  } else {
    if (elements.views) {
      Array.from(elements.views).forEach(v => v.classList.add('hidden'));
    }
    target.classList.remove('hidden');
    target.classList.add('active');
    isNavigating = false;
    syncMiniPlayerState();
  }

  // Feature Triggers
  if (viewId === 'view-dashboard') loadDashboard();
  if (viewId === 'view-meditations') { 
    renderMeditationsList(); 
    renderFilterChips(); 
    renderRecommendations(); 
    startMeditationBgAnimation();
  }
  if (viewId === 'view-notebook') loadNotebook();
  if (viewId === 'view-insight') updateInsightView(AppState.userHistory || AppState.mockHistory);
  if (viewId === 'view-settings') updateSettingsView();
  if (viewId === 'view-swipe-breathing') startSwipeBreathingFlow();
  if (viewId === 'view-swipe-ambient') startSwipeAmbientFlow();
  
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
      let slug = newSlug;
      if (slug === 'swipe-breathing') slug = 'breathe';
      if (slug === 'swipe-ambient') slug = 'ambient';
      if (slug === 'meditations') slug = 'breathe';
      const tabLabel = t('nav_' + slug) || slug;
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
  let activeSlug = slug;
  if (slug === 'swipe-breathing') activeSlug = 'meditations';
  if (slug === 'swipe-ambient') activeSlug = 'ambient';

  const navItems = elements.navItems ? Array.from(elements.navItems) : [];
  const navLinks = elements.navLinks ? Array.from(elements.navLinks) : [];
  const allNavs = [...navItems, ...navLinks];

  allNavs.forEach(btn => {
    if (!btn) return;
    if (btn.getAttribute('data-view') === activeSlug) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Sync Nav Slot logic (Dynamic Slot Swapping)
  const navContainer = document.getElementById('mobile-nav-container');
  const isCurrentlyExpanded = navContainer && navContainer.classList.contains('is-expanded');
  
  if (isCurrentlyExpanded) {
    // If expanded, delay the swap to happen while/after it shrinks
    setTimeout(() => {
      if (typeof syncNavVisibility !== 'undefined') syncNavVisibility();
    }, 450);
  } else {
    if (typeof syncNavVisibility !== 'undefined') syncNavVisibility();
  }

  // Sync back button visibility
  if (typeof syncBackBtnVisibility !== 'undefined') syncBackBtnVisibility();

  requestAnimationFrame(() => {
    // Nav pill updates removed for cleaner look
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
  syncNavVisibility();
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
    if (fb) {
      initModals({ fb });
      if (fb.isInitialized && fb.auth) {
        fb.onAuthStateChanged(fb.auth, (user) => {
          if (user) startAppFlow(user);
        });

        // Also check for redirect result explicitly
        handleRedirectResult().then(user => {
          if (user) startAppFlow(user);
        }).catch(err => {
          console.error("[Aura] Bootstrap Redirect Error:", err);
        });
      }
    }
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
  initNotebook({ fb, navigateTo, setHUD });
  initMeditationFlow({ fb, navigateTo, resetBioFeedback: () => SensoryEngine.stopHaptics(), AudioEngine: MeditationAudio, setHUD, loadDashboard });
  initMeditations({ 
    navigateTo,
    prepareExercise: (id) => {
      AppState.isCheckIn = false; 
      prepareExercise(id); 
      navigateTo('view-exercise'); 
    } 
  });
  initExercise({ 
    getExerciseParams: () => AppState.currentExercise, 
    initAudio: () => SensoryEngine.initAudio(),
    setBreathingPhase: (phase, duration) => SensoryEngine.setBreathingPhase(phase, duration),
    onComplete: () => advanceFromExercise()
  });
  initAuth({
    navigateTo,
    onAuthenticated: (user) => startAppFlow(user)
  });
  initFocus();
  initAmbient({ navigateTo });
  initSwipeBreathing({ navigateTo, triggerPortalTransition });
  initSwipeAmbient({ navigateTo });
  initSleep({ navigateTo });
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

  window.addEventListener('aura-modules-updated', () => {
    syncNavVisibility();
    updateSettingsView();
  });

  // Initialize WebGL Liquid Glass shader for header + buttons
  requestAnimationFrame(() => initLiquidGlass());

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
        
        navigateTo('view-' + targetSlug);

        // Auto-collapse expanded nav if on mobile
        const navContainer = document.getElementById('mobile-nav-container');
        if (navContainer && navContainer.classList.contains('is-expanded')) {
          navContainer.classList.remove('is-expanded');
          const moreBtnIcon = document.querySelector('#navMore svg');
          if (moreBtnIcon) moreBtnIcon.style.transform = '';
        }
      }
    };
  });

  initGlobalCursorEffect();
  initGlobalHeaderBackBtn();
  startAppFlow(null);

  initSwipeNavigation();
}

function initSwipeNavigation() {
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;
  let startedOnScrollable = false;
  
  // Get active tabs based on what's visible in the navbar
  const getVisibleTabs = () => {
    const mainItems = Array.from(document.querySelectorAll('.nav-main-row .nav-item:not(.hidden)'));
    const extraItems = Array.from(document.querySelectorAll('.nav-extra-row .nav-item:not(.hidden)'));
    
    const allItems = [...mainItems, ...extraItems];
    return allItems
      .filter(item => getComputedStyle(item).display !== 'none')
      .map(item => item.getAttribute('data-view'))
      .filter(Boolean);
  };

  document.addEventListener('touchstart', (e) => {
    if (isNavigating) return;
    
    // Check if we started on a scrollable element
    const scrollable = e.target.closest('.filter-chips, .rec-scroll-row, .meditation-grid-scroll, [data-no-swipe], #savoringNote, textarea, .vagal-triangle-container, .module-market-grid');
    const slider = e.target.closest('.focus-slider');
    
    startedOnScrollable = !!scrollable;
    
    // Special handling for sliders: only block global swipe if we're not at the edge
    if (slider) {
      const atStart = slider.scrollLeft <= 5;
      const atEnd = slider.scrollLeft + slider.offsetWidth >= slider.scrollWidth - 5;
      // We'll decide later in touchend if we should navigate
      startedOnScrollable = false; 
    }

    if (startedOnScrollable) return;

    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    isSwiping = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isSwiping || startedOnScrollable) return;
    
    const touchX = e.changedTouches[0].screenX;
    const touchY = e.changedTouches[0].screenY;
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;

    // Detect horizontal intent
    if (Math.abs(deltaX) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
      isSwiping = false;
    }
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!isSwiping || startedOnScrollable) return;
    isSwiping = false;

    const touchEndX = e.changedTouches[0].screenX;
    const deltaX = touchEndX - touchStartX;
    const threshold = 70; 

    if (Math.abs(deltaX) < threshold) return;

    // Check if we are on a slider and if we should allow global navigation
    const slider = e.target.closest('.focus-slider');
    if (slider) {
      const atStart = slider.scrollLeft <= 10;
      const atEnd = slider.scrollLeft + slider.offsetWidth >= slider.scrollWidth - 10;
      
      // If swiping right at start or left at end, allow global nav
      const swipingRight = deltaX > 0;
      const swipingLeft = deltaX < 0;
      
      if (!((swipingRight && atStart) || (swipingLeft && atEnd))) {
        return; // Stay within internal slider
      }
    }

    const currentView = Array.from(elements.views).find(v => v.classList.contains('active') && !v.classList.contains('hidden'));
    if (!currentView) return;
    
    const currentTab = currentView.id.replace('view-', '');
    const visibleTabs = getVisibleTabs();
    const currentIndex = visibleTabs.indexOf(currentTab);
    if (currentIndex === -1) return;

    const direction = deltaX < 0 ? 1 : -1; 
    const targetIndex = currentIndex + direction;
    
    if (targetIndex >= 0 && targetIndex < visibleTabs.length) {
      navigateTo(`view-${visibleTabs[targetIndex]}`);
    }
  }, { passive: true });
}

/**
 * Synchronize the global header back button visibility
 */
export function syncBackBtnVisibility() {
  const backBtn = elements.globalHeaderBackBtn;
  if (!backBtn) return;

  const settingsView = document.getElementById('view-settings');
  const notebookView = document.getElementById('view-notebook');

  const settingsActive = settingsView && !settingsView.classList.contains('hidden') &&
    settingsView.querySelector('.settings-subpage.active');
  const notebookActive = notebookView && !notebookView.classList.contains('hidden') &&
    notebookView.querySelector('.notebook-subpage.active');

  const currentViewId = AppState.currentView;
  const isSpecialView = currentViewId === 'view-swipe-breathing' || 
                        currentViewId === 'view-swipe-ambient' || 
                        currentViewId === 'view-insight';

  if (settingsActive || notebookActive || isSpecialView) {
    backBtn.classList.add('show');
  } else {
    backBtn.classList.remove('show');
  }
}

/**
 * Global Header Back Button
 * Watches for active subpages and toggles the header back button visibility.
 * Only shows when a subpage or special view is active.
 */
function initGlobalHeaderBackBtn() {
  const backBtn = elements.globalHeaderBackBtn;
  if (!backBtn) return;

  // Click handler: find and click the original hidden back button, or navigate to previous view
  backBtn.addEventListener('click', () => {
    SensoryEngine.triggerHaptic('light');
    SensoryEngine.playTick();

    // 1. Settings subpage (only if settings view is visible)
    const settingsView = document.getElementById('view-settings');
    if (settingsView && !settingsView.classList.contains('hidden')) {
      const sub = settingsView.querySelector('.settings-subpage.active');
      if (sub) {
        const btn = sub.querySelector('.settings-back-btn');
        if (btn) {
          btn.click();
        } else {
          sub.classList.remove('active');
          syncBackBtnVisibility();
        }
        return;
      }
    }

    // 2. Notebook subpage (only if notebook view is visible)
    const notebookView = document.getElementById('view-notebook');
    if (notebookView && !notebookView.classList.contains('hidden')) {
      const sub = notebookView.querySelector('.notebook-subpage.active');
      if (sub) {
        const btn = sub.querySelector('.back-circle-btn');
        if (btn) {
          btn.click();
        } else {
          sub.classList.remove('active');
          syncBackBtnVisibility();
        }
        return;
      }
    }

    // 3. Special views
    const currentViewId = AppState.currentView;
    if (currentViewId === 'view-swipe-breathing' || currentViewId === 'view-swipe-ambient' || currentViewId === 'view-insight') {
      if (AppState.previousView) {
        navigateTo(AppState.previousView);
      } else {
        navigateTo('view-dashboard');
      }
    }
  });

  // Observe subpage class changes
  const observer = new MutationObserver(() => syncBackBtnVisibility());
  const allSubpages = document.querySelectorAll('.settings-subpage, .notebook-subpage');
  allSubpages.forEach(sp => {
    observer.observe(sp, { attributes: true, attributeFilter: ['class'] });
  });

  // Also observe parent view visibility to hide droplet when navigating away
  const parentViews = document.querySelectorAll('#view-settings, #view-notebook');
  parentViews.forEach(v => {
    observer.observe(v, { attributes: true, attributeFilter: ['class'] });
  });
  
  // Initial check
  syncBackBtnVisibility();
}

document.addEventListener('DOMContentLoaded', initAppBootstrap);
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) navigateTo(e.state.view, true);
});
