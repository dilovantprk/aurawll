// welcomeScreen.js (Antigravity v2 - Optimized)
import { SensoryEngine } from './audio-engine.js';
/**
 * Initializes the v2 welcome screen with stabilized long-press interaction.
 */
export function initWelcomeScreen({ onComplete, onGesture, t, lang, user = null }) {
  const screen = document.getElementById('view-welcome');
  const welcomeBack = document.getElementById('awWelcomeBack');
  const core = screen?.querySelector('.aw-core');
  const prompt = document.getElementById('awGesturePrompt');

  if (!screen || !core) return;

  // Cleanup existing focusing text to prevent duplicates
  const oldText = core.querySelector('.focusing-text');
  if (oldText) oldText.remove();

  // Inject Focusing Text (v2 Glow)
  const focusingText = document.createElement('div');
  focusingText.className = 'focusing-text';
  focusingText.textContent = (t && typeof t === 'function') ? t('meditation_loading_desc') : 'Focusing...';
  core.appendChild(focusingText);

  // --- State Setup ---
  if (user && welcomeBack) {
    welcomeBack.classList.remove('hidden');
    welcomeBack.innerHTML = `Tekrar hoş geldin, <strong>${user.displayName || (lang === 'tr' ? 'Dostum' : 'Friend')}</strong>`;
  } else if (welcomeBack) {
    welcomeBack.classList.add('hidden');
  }

  // --- Antigravity Focus Logic (Long Press) ---
  let focusTimer = null;
  let hapticInterval = null;
  let focusActive = false;
  const FOCUS_DURATION = 3000;

  const onStart = (e) => {
    if (focusActive) return;
    if (e.cancelable) e.preventDefault();

    focusActive = true;
    core.classList.add('focusing');
    
    // Notify audio engine safely + resume for iOS Safari
    if (onGesture && typeof onGesture === 'function') {
      try { onGesture(); } catch(e) {}
    }
    if (typeof SensoryEngine !== 'undefined' && SensoryEngine.resumeAudio) {
      SensoryEngine.resumeAudio();
    }

    // Initial Haptic Pulse
    if ('vibrate' in navigator) { try { navigator.vibrate(12); } catch(e) {} }

    // 1. Success Timer
    focusTimer = setTimeout(() => {
      completeFocus();
    }, FOCUS_DURATION);

    // 2. Progressive Haptic Tension
    let startTime = Date.now();
    hapticInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / FOCUS_DURATION, 1);
      
      if (navigator.vibrate && focusActive) {
        // Tension increases: pulses get shorter and more frequent
        const pulseFreq = Math.max(80, 400 - (progress * 320));
        if (Math.floor(elapsed / pulseFreq) % 2 === 0) {
          navigator.vibrate(5 + (progress * 15));
        }
      }
    }, 100);
  };

  const onEnd = () => {
    focusActive = false;
    core.classList.remove('focusing');
    
    if (focusTimer) clearTimeout(focusTimer);
    if (hapticInterval) clearInterval(hapticInterval);
    
    focusTimer = null;
    hapticInterval = null;

    if (navigator.vibrate) navigator.vibrate(0);
  };

  const completeFocus = async () => {
    const wasActive = focusActive;
    onEnd(); // Clear timers immediately
    
    if (!wasActive) return;

    // Transition Animation
    core.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease';
    core.style.transform = 'scale(0)';
    core.style.opacity = '0';
    
    if (navigator.vibrate) navigator.vibrate([40, 80, 40]);
    if (SensoryEngine && typeof SensoryEngine.playUnlock === 'function') {
      SensoryEngine.playUnlock();
    }

    if (onComplete && typeof onComplete === 'function') {
      try {
        await onComplete({ mode: 'guest' });
      } catch (err) {
        console.error('[Aura] Entry failed', err);
        // Reset if failed
        core.style.transform = 'scale(1)';
        core.style.opacity = '1';
      }
    }
  };

  // --- Event Listeners (Zero Error Approach) ---
  core.addEventListener('mousedown', onStart);
  core.addEventListener('touchstart', onStart, { passive: false });
  
  // Global resets to prevent "sticky" haptics
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
  window.addEventListener('touchcancel', onEnd);
  core.addEventListener('mouseleave', onEnd);
}
