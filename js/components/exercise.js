import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/state.js';

let configProps = {};
let isExerciseActive = false;
let breathTimerInterval = null;
let exerciseTimer = null;
let currentPhaseIndex = 0;
let timeRemaining = 0;

export function initExercise(config) {
  Object.assign(configProps, config);
  
  if (elements.breathCircle) {
    elements.breathCircle.onclick = () => {
      if (configProps.initAudio) configProps.initAudio();
      startExerciseEngine();
    };
  }
}

export function startExerciseEngine() {
  if (isExerciseActive) return;
  isExerciseActive = true;
  currentPhaseIndex = 0;
  timeRemaining = configProps.getExerciseParams().totalDuration;
  
  if (breathTimerInterval) clearInterval(breathTimerInterval);
  breathTimerInterval = setInterval(() => {
    timeRemaining--;
    if (timeRemaining <= 0) {
      stopExercise();
      if (configProps.onComplete) configProps.onComplete();
    }
  }, 1000);

  runPhase();
}

function runPhase() {
  const params = configProps.getExerciseParams();
  const phase = params.phases[currentPhaseIndex];
  const duration = phase.duration;

  elements.breathCircle.className = `breath-circle ${phase.class}`;
  elements.breathCircle.style.transitionDuration = `${duration / 1000}s`;
  elements.breathInstruction.textContent = t(`ex_${phase.name.toLowerCase().replace(' ', '_')}`);

  if (configProps.setBreathingPhase) {
    const pId = phase.name.toLowerCase();
    const mapped = pId.includes('in') ? 'inhale' : (pId.includes('out') ? 'exhale' : 'hold');
    configProps.setBreathingPhase(mapped, duration);
  }

  exerciseTimer = setTimeout(() => {
    currentPhaseIndex = (currentPhaseIndex + 1) % params.phases.length;
    runPhase();
  }, duration);
}

export function stopExercise() {
  isExerciseActive = false;
  clearInterval(breathTimerInterval);
  clearTimeout(exerciseTimer);
}
