export const elements = {
  header: document.getElementById('mobile-header'),
  activeTabName: document.getElementById('active-tab-name'),
  headerActions: document.getElementById('headerActions'),
  langToggleBtn: document.getElementById('langToggleBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  get views() { return document.querySelectorAll('.view'); },
  
  // Auth
  viewAuth: document.getElementById('view-auth'),
  tabLogin: document.getElementById('tabLogin'),
  tabRegister: document.getElementById('tabRegister'),
  tabsPill: document.getElementById('tabs-pill'),
  authForm: document.getElementById('authForm'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  nameInput: document.getElementById('nameInput'),
  authError: document.getElementById('authError'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  skipAuthBtn: document.getElementById('skipAuthBtn'),
  authLegalGroup: document.getElementById('authLegalGroup'),
  legalCheckbox: document.getElementById('legalCheckbox'),

  // Somatic & Grid
  viewSomaticEntry: document.getElementById('view-somatic-entry'),
  somaticContainer: document.getElementById('somaticContainer'),
  somaticNextBtn: document.getElementById('somaticNextBtn'),
  viewAffectGrid: document.getElementById('view-affect-grid'),
  gridTouchArea: document.getElementById('grid-touch-area'),
  suggestionDot: document.getElementById('suggestion-dot'),
  userDot: document.getElementById('user-dot'),
  gridNextBtn: document.getElementById('gridNextBtn'),
  viewEmotionRefinement: document.getElementById('view-emotion-refinement'),
  emotionRefinementContainer: document.getElementById('emotionRefinementContainer'),
  emotionNextBtn: document.getElementById('emotionNextBtn'),

  // Dashboard
  greetingText: document.getElementById('greetingText'),
  startCheckinBtn: document.getElementById('startCheckinBtn'),
  historyList: document.getElementById('historyList'),
  weeklyTimeline: document.getElementById('weeklyTimeline'),
  weeklyInsight: document.getElementById('weeklyInsight'),
  insightText: document.getElementById('insightText'),
  weeklyExercise: document.getElementById('weeklyExercise'),
  insightExText: document.getElementById('insightExText'),
  weeklyEmpty: document.getElementById('weeklyEmpty'),
  
  // Vagal Heatmap
  vagalHeatmapCard: document.getElementById('vagalHeatmapCard'),
  vagalBlob: document.getElementById('vagalBlob'),
  vagalTraces: document.getElementById('vagalTraces'),
  vagalModal: document.getElementById('vagalModal'),
  resilienceScore: document.getElementById('resilienceScore'),
  resilienceStatus: document.getElementById('resilienceStatus'),
  resilienceFill: document.getElementById('resilienceFill'),
  vagalModalTitle: document.getElementById('vagalModalTitle'),
  vagalModalAnalysis: document.getElementById('vagalModalAnalysis'),
  vagalModalRec: document.getElementById('vagalModalRec'),
  vagalModalHeatmap: document.getElementById('vagalModalHeatmap'),
  closeVagalModal: document.getElementById('closeVagalModal'),

  // Step 1: Picker
  stateCards: document.querySelectorAll('.state-card'),

  // Step 3: Exercise
  exerciseTitle: document.getElementById('exerciseTitle'),
  exerciseMicrocopy: document.getElementById('exerciseMicrocopy'),
  exerciseDesc: document.getElementById('exerciseDesc'),
  savoringSubmitBtn: document.getElementById('savoringSubmitBtn'),
  skipSavoringBtn: document.getElementById('skipSavoringBtn'),
  breathCircle: document.getElementById('breathCircle'),
  breathInstruction: document.getElementById('breathInstruction'),
  startExerciseBtn: document.getElementById('startExerciseBtn'),
  skipExerciseBtn: document.getElementById('skipExerciseBtn'),

  // Step 4: Savoring & Marination
  marPhase1: document.getElementById('marPhase1'),
  marPhase2: document.getElementById('marPhase2'),
  marPhaseOffer: document.getElementById('marPhaseOffer'),
  offerContinueBtn: document.getElementById('offerContinueBtn'),
  offerDoneBtn: document.getElementById('offerDoneBtn'),
  marPhaseScan: document.getElementById('marPhaseScan'),
  scanExitBtn: document.getElementById('scanExitBtn'),
  scanText: document.getElementById('scanText'),
  marPhase3: document.getElementById('marPhase3'),
  marContinueBtn: document.getElementById('marContinueBtn'),
  marSensationContainer: document.getElementById('marSensationContainer'),
  marinationHUD: document.getElementById('marinationHUD'),
  savoringForm: document.getElementById('savoringForm'),
  savoringInput: document.getElementById('savoringInput'),
  savoringInfoBtn: document.getElementById('savoringInfoBtn'),

  // Step 2.5: Meditation Loading
  viewMeditationLoading: document.getElementById('view-meditation-loading'),
  meditationLoadingTitle: document.getElementById('meditationLoadingTitle'),
  loadingCircleProgress: document.getElementById('loadingCircleProgress'),
  skipLoadingBtn: document.getElementById('skipLoadingBtn'),

  // Onboarding
  onbSkipBtn: document.getElementById('onbSkipBtn'),
  onbLetsGoBtn: document.getElementById('onbLetsGoBtn'),
  onbScreensContainer: document.getElementById('onbScreensContainer'),

  // Completion
  returnHomeBtn: document.getElementById('returnHomeBtn'),
  globalHUD: document.getElementById('globalHUD'),
  globalHUDBtn: document.getElementById('globalHUDBtn'),

  // Notifications
  notifToggleCheckbox: document.getElementById('notifToggleCheckbox'),
  nudgeTimeContainer: document.getElementById('nudgeTimeContainer'),
  nudgeTimePicker: document.getElementById('nudgeTimePicker'),
  notifModal: document.getElementById('notifModal'),
  notifAcceptBtn: document.getElementById('notifAcceptBtn'),
  notifDenyBtn: document.getElementById('notifDenyBtn'),

  // Cockpit / Profile
  auraCoreSphere: document.getElementById('aura-core-sphere'),
  userDisplayName: document.getElementById('user-display-name'),
  uniqueDaysStats: document.getElementById('unique-days-stats'),
  guestCtaBox: document.getElementById('guest-cta-box'),
  guestCtaRegisterBtn: document.getElementById('guest-cta-register-btn'),
  hapticToggle: document.getElementById('hapticToggle'),
  droneToggle: document.getElementById('droneToggle'),
  volumeSlider: document.getElementById('volumeSlider'),
  volumeValLabel: document.getElementById('volume-val-label'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportTxtBtn: document.getElementById('exportTxtBtn'),
  resetMemoryBtn: document.getElementById('resetMemoryBtn'),
  settingsLoginBtn: document.getElementById('settingsLoginBtn'),
  
  // Scientific Info Modal
  infoModal: document.getElementById('infoModal'),
  infoBackdrop: document.getElementById('infoBackdrop'),
  closeInfoBtn: document.getElementById('closeInfoBtn'),
  infoIcon: document.getElementById('infoIcon'),
  infoTitle: document.getElementById('infoTitle'),
  infoBody: document.getElementById('infoBody'),
  infoRef: document.getElementById('infoRef'),
  globalInfoBtn: document.getElementById('globalInfoBtn'),
  globalMuteBtn: document.getElementById('globalMuteBtn'),
  muteIconOn: document.getElementById('muteIconOn'),
  muteIconOff: document.getElementById('muteIconOff'),

  // Navigation
  mobileNav: document.getElementById('mobile-nav'),
  desktopNav: document.getElementById('desktop-header-nav'),
  get navLinks() { return document.querySelectorAll('.nav-link'); },
  get navItems() { return document.querySelectorAll('.nav-item'); },
  navHome: document.getElementById('navHome'),
  navMeditations: document.getElementById('navMeditations'),
  navNotebook: document.getElementById('navNotebook'),
  navInsight: document.getElementById('navInsight'),
  navProfile: document.getElementById('navProfile'),

  // Community Modal
  communityModal: document.getElementById('communityModal'),
  communityBackdrop: document.getElementById('communityBackdrop'),
  closeCommunityBtn: document.getElementById('closeCommunityBtn'),
  get commTabBtns() { return document.querySelectorAll('.comm-tab-btn'); },
  get commTabPanes() { return document.querySelectorAll('.comm-tab-pane'); },
  personalStatsGrid: document.getElementById('personalStatsGrid'),
  galaxyCanvas: document.getElementById('galaxyCanvas'),
  commCheckinCount: document.getElementById('commCheckinCount'),
  distVentral: document.getElementById('distVentral'),
  distSympathetic: document.getElementById('distSympathetic'),
  distDorsal: document.getElementById('distDorsal'),
  commTopProtocol: document.getElementById('commTopProtocol'),
  commActiveNow: document.getElementById('commActiveNow'),

  // Meditations View
  meditationsList: document.getElementById('meditationsList'),
  filterChips: document.getElementById('filterChips'),
  recommendationsContainer: document.getElementById('recommendationsContainer'),

  // Notebook View
  notebookEntries: document.getElementById('notebookEntries')
};
