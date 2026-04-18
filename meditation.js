import { locales } from './translations.js';

let currentSession = {
  timers: [],
  startTime: null,
  protocol: null,
  phaseIndex: 0,
  isPaused: false,
  remainingPhaseTime: 0,
  phaseStartedAt: null
};

// Access standard app state/utils via globals or indirect imports
// Assume AppState and t() are managed in app.js and passed or accessible
const getLang = () => localStorage.getItem('aura_lang') || 'tr';
const t = (key) => locales[getLang()][key] || key;

export const MEDITATION_PROTOCOLS = {
  m_nsdr: {
    id: 'm_nsdr',
    title: 'NSDR (Recover)',
    durationLabel: '10 min',
    totalDuration: 600000,
    intensity: 0.8,
    phases: [
      { prompt: 'med_nsdr_1', duration: 30000, intensity: 0.4 },
      { prompt: 'med_nsdr_2', duration: 60000, intensity: 0.6 },
      { prompt: 'med_nsdr_3', duration: 120000, intensity: 0.8 },
      { prompt: 'med_nsdr_4', duration: 180000, intensity: 0.9 },
      { prompt: 'med_nsdr_5', duration: 150000, intensity: 0.7 },
      { prompt: 'med_nsdr_6', duration: 60000, intensity: 0.4 }
    ]
  },
  m_vagal_tone: {
    id: 'm_vagal_tone',
    title: 'Vagal Tone (Balance)',
    durationLabel: '5 min',
    totalDuration: 300000,
    intensity: 0.6,
    phases: [
      { prompt: 'med_vagal_1', duration: 30000, intensity: 0.3 },
      { prompt: 'med_vagal_2', duration: 90000, intensity: 0.5 },
      { prompt: 'med_vagal_3', duration: 120000, intensity: 0.7 },
      { prompt: 'med_vagal_4', duration: 60000, intensity: 0.4 }
    ]
  },
  m_presence: {
    id: 'm_presence',
    title: 'Mindful Presence (Expand)',
    durationLabel: '3 min',
    totalDuration: 180000,
    intensity: 0.4,
    phases: [
      { prompt: 'med_presence_1', duration: 30000, intensity: 0.3 },
      { prompt: 'med_presence_2', duration: 120000, intensity: 0.5 },
      { prompt: 'med_presence_3', duration: 30000, intensity: 0.2 }
    ]
  }
};

export function startMeditation(protocolId, { onPhase, onComplete, onPause, onResume, SensoryEngine }) {
  const protocol = MEDITATION_PROTOCOLS[protocolId];
  if (!protocol) return;

  stopMeditation({ SensoryEngine }); // Cleanup previous

  currentSession = {
    timers: [],
    startTime: Date.now(),
    protocol,
    phaseIndex: 0,
    isPaused: false,
    onPhase,
    onComplete,
    SensoryEngine
  };

  runPhase();
}

function runPhase(remainingTime = null) {
  const { protocol, phaseIndex, timers, SensoryEngine, onPhase, isPaused } = currentSession;
  if (isPaused) return;

  const phase = protocol.phases[phaseIndex];
  if (!phase) {
    finishSession();
    return;
  }

  const duration = remainingTime !== null ? remainingTime : phase.duration;
  currentSession.phaseStartedAt = Date.now();
  currentSession.remainingPhaseTime = duration;

  // Update UI through callback
  if (onPhase) onPhase(phase, phaseIndex, protocol.phases.length);

  // Update Audio Intensity
  if (SensoryEngine && typeof SensoryEngine.setMeditationIntensity === 'function') {
    SensoryEngine.setMeditationIntensity(phase.intensity);
  }

  // Phase transition timer
  const nextTimer = setTimeout(() => {
    currentSession.phaseIndex++;
    runPhase();
  }, duration);

  timers.push(nextTimer);
}

export function pauseMeditation() {
  if (currentSession.isPaused || !currentSession.protocol) return;

  currentSession.isPaused = true;
  currentSession.timers.forEach(clearTimeout);
  currentSession.timers = [];

  const elapsed = Date.now() - currentSession.phaseStartedAt;
  currentSession.remainingPhaseTime = Math.max(0, currentSession.remainingPhaseTime - elapsed);
}

export function resumeMeditation() {
  if (!currentSession.isPaused || !currentSession.protocol) return;

  currentSession.isPaused = false;
  runPhase(currentSession.remainingPhaseTime);
}

export function stopMeditation({ SensoryEngine }) {
  currentSession.timers.forEach(clearTimeout);
  currentSession.timers = [];
  
  const timeSpent = currentSession.startTime ? Date.now() - currentSession.startTime : 0;
  const protocol = currentSession.protocol;

  // Reset Audio
  if (SensoryEngine) {
    if (typeof SensoryEngine.setMeditationIntensity === 'function') {
        SensoryEngine.setMeditationIntensity(0); // Fade to baseline
    }
    if (typeof SensoryEngine.stopHaptics === 'function') SensoryEngine.stopHaptics();
  }

  const result = {
      protocol: protocol,
      timeSpent: timeSpent,
      completed: currentSession.phaseIndex >= (protocol?.phases.length || 0)
  };

  currentSession.protocol = null; 
  return result;
}

function finishSession() {
  const { onComplete, SensoryEngine } = currentSession;
  const result = stopMeditation({ SensoryEngine });
  if (onComplete) onComplete(result);
}
