/**
 * Aura | Swipe Ambient Component
 * Handles the Tinder-swipe interface and fullscreen player for Ambient Discovery.
 */

import { SwipeDeck } from './swipe-deck.js';
import { AMBIENT_SOUNDS, ICONS } from './ambient.js';
import { t } from '../core/i18n.js';
import { SensoryEngine } from '../services/sensory.js';
import { vibrate } from '../core/utils.js';

let configProps = {
  navigateTo: null
};

let deckInstance = null;
let currentActiveSound = null;
let isAudioPlaying = false;

export function initSwipeAmbient(config) {
  Object.assign(configProps, config);

  // Exit Fullscreen buttons (both capsuleCloseBtn and closeFsBtn)
  const closeFsBtn = document.getElementById('closeAmbientFullscreenBtn');
  const capsuleCloseBtn = document.getElementById('fullscreenCloseBtn');
  const closeAction = () => {
    vibrate('light');
    const player = document.getElementById('ambientFullscreenPlayer');
    if (player) player.classList.add('hidden');
  };
  if (closeFsBtn) closeFsBtn.addEventListener('click', closeAction);
  if (capsuleCloseBtn) capsuleCloseBtn.addEventListener('click', closeAction);

  // Fullscreen Capsule Play/Pause Button
  const playPauseBtn = document.getElementById('fullscreenPlayPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent trigger visualizer click
      if (isAudioPlaying) {
        pauseActiveAmbientSound();
      } else {
        resumeActiveAmbientSound();
      }
    });
  }

  // Toggle Play/Pause by tapping the central visualizer blob itself
  const visualizerEl = document.getElementById('fullscreenVisualizer');
  if (visualizerEl) {
    visualizerEl.style.cursor = 'pointer';
    visualizerEl.addEventListener('click', () => {
      if (isAudioPlaying) {
        pauseActiveAmbientSound();
      } else {
        resumeActiveAmbientSound();
      }
    });
  }

  // Mute/Unmute Toggle Button
  let isMuted = false;
  let preMuteVolume = 80;
  const muteBtn = document.getElementById('fullscreenMuteBtn');
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent trigger visualizer click
      vibrate('light');
      isMuted = !isMuted;
      if (isMuted) {
        preMuteVolume = SensoryEngine.appVolume;
        SensoryEngine.setVolume(0);
        const onIcon = muteBtn.querySelector('.volume-on-icon');
        const offIcon = muteBtn.querySelector('.volume-off-icon');
        if (onIcon) onIcon.style.display = 'none';
        if (offIcon) offIcon.style.display = 'block';
        muteBtn.classList.add('muted');
      } else {
        SensoryEngine.setVolume(preMuteVolume || 80);
        const onIcon = muteBtn.querySelector('.volume-on-icon');
        const offIcon = muteBtn.querySelector('.volume-off-icon');
        if (onIcon) onIcon.style.display = 'block';
        if (offIcon) offIcon.style.display = 'none';
        muteBtn.classList.remove('muted');
      }
    });
  }

  // Swipe gesture support to change tracks (swipe left/right to skip next/prev)
  const player = document.getElementById('ambientFullscreenPlayer');
  if (player) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    player.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    player.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      
      const swipeDistance = touchEndX - touchStartX;
      const threshold = 60; // minimum px to trigger
      
      if (Math.abs(swipeDistance) > threshold) {
        vibrate('medium');
        if (deckInstance) {
          deckInstance.swipe('left'); // skip next
        }
      }
    }, { passive: true });
  }
}

export function startSwipeAmbientFlow() {
  const container = document.getElementById('swipeAmbientDeck');
  if (!container) return;

  // Shuffle ambient sounds
  let shuffledSounds = [...AMBIENT_SOUNDS].sort(() => Math.random() - 0.5);

  // If there's an active sound already playing, move it to the front of the list
  if (currentActiveSound && isAudioPlaying) {
    shuffledSounds = [
      currentActiveSound,
      ...shuffledSounds.filter(s => s.id !== currentActiveSound.id)
    ];
  }

  deckInstance = new SwipeDeck(container, {
    badgeLeftText: t('lang') === 'tr' ? 'GEÇ' : 'SKIP',
    badgeRightText: t('lang') === 'tr' ? 'DİNLE' : 'LISTEN',
    dismissOnSwipeRight: false,
    renderCardContent: (item) => {
      const categoryLabel = item.category || 'peace';
      const title = t(item.titleKey) || item.id;
      const soundIcon = ICONS[item.icon] || ICONS.noise;

      // Soft colored glowing backgrounds based on visual category
      let glowColor = 'rgba(133, 141, 255, 0.07)';
      if (item.id === 'rain' || item.id === 'storm') glowColor = 'rgba(98, 164, 255, 0.08)';
      if (item.id === 'ocean' || item.id === 'waves') glowColor = 'rgba(100, 228, 159, 0.08)';
      if (item.id === 'focus' || item.id === 'binaural_focus') glowColor = 'rgba(170, 120, 255, 0.08)';
      if (item.id === 'night' || item.id === 'sleep') glowColor = 'rgba(80, 100, 255, 0.08)';

      return `
        <!-- Decorative Glow Blob -->
        <div class="card-glow" style="position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; background: radial-gradient(circle at 20% 20%, ${glowColor} 0%, transparent 60%); pointer-events: none; z-index: -1;"></div>

        <!-- TOP ROW: category tag & type -->
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
          <span style="background: rgba(255, 255, 255, 0.05); padding: 5px 12px; border-radius: 20px; font-size: 0.65rem; text-transform: uppercase; border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.65); font-weight: 600; letter-spacing: 1px;">
            ${categoryLabel}
          </span>
          <span style="font-size: 0.75rem; opacity: 0.55; font-weight: 500; letter-spacing: 0.5px;">
            Ambiyans
          </span>
        </div>
        
        <!-- MIDDLE AREA: Title, Subtitle, Description -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: left; width: 100%; padding: 10px 0;">
          <h3 style="font-size: 1.45rem; font-weight: 700; margin: 0 0 6px 0; background: linear-gradient(135deg, #ffffff, rgba(255, 255, 255, 0.7)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.25; font-family: var(--font-family);">
            ${title}
          </h3>
          <span style="font-size: 0.8rem; opacity: 0.5; font-weight: 500; margin-bottom: 16px; display: block; letter-spacing: 0.5px;">
            Atmospheric Sounds
          </span>
          <p style="font-size: 0.85rem; opacity: 0.7; line-height: 1.5; margin: 0; max-height: 110px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; font-weight: 300;">
            ${t('lang') === 'tr' ? 'Zihninizi dinlendirmek, odaklanmak veya derin bir uykuya geçiş yapmak için tasarlanmış frekans ve doğal ses bütünlüğü.' : 'A fusion of natural acoustics and neural frequencies designed to soothe, focus, or guide you into sleep.'}
          </p>
        </div>
        
        <!-- FOOTER: Icon on left, interactive play pill button on right -->
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 16px; margin-top: 8px;">
          <!-- Sleek app-like icon container -->
          <div style="background: rgba(255, 255, 255, 0.04); border-radius: 12px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255,255,255,0.85); box-shadow: 0 8px 16px rgba(0,0,0,0.15);">
            <div style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; opacity: 0.9;">
              ${soundIcon}
            </div>
          </div>
          
          <!-- Elegant action pill button -->
          <div style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 6px 16px; font-size: 0.75rem; font-weight: 600; color: #fff; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); cursor: pointer;">
            <span>${t('lang') === 'tr' ? 'DİNLE' : 'LISTEN'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          </div>
        </div>
      `;
    },
    onCardChange: (item) => {
      // Auto-preview when card comes to top, unless already playing
      if (currentActiveSound?.id === item.id && isAudioPlaying) {
        updateFullscreenUI(item);
      } else {
        playAmbientSound(item);
        updateFullscreenUI(item);
      }
    },
    onSwipeLeft: (item) => {
      vibrate('light');
    },
    onSwipeRight: (item) => {
      // Open fullscreen mode
      vibrate('medium');
      const player = document.getElementById('ambientFullscreenPlayer');
      if (player) {
        player.classList.remove('hidden');
      }
    }
  });

  deckInstance.init(shuffledSounds);
}

/**
 * Handles playing the audio for a selected sound object
 */
function playAmbientSound(sound) {
  if (!sound) return;

  // If already playing this exact sound, just make sure state is sync'd
  if (currentActiveSound?.id === sound.id && isAudioPlaying) {
    updateFullscreenUI(sound);
    return;
  }

  currentActiveSound = sound;
  isAudioPlaying = true;

  // Visual wave colors matching sound theme
  const colors = {
    rain: 'rgba(100, 160, 240, 0.35)',
    ocean: 'rgba(40, 200, 230, 0.35)',
    focus: 'rgba(170, 120, 255, 0.35)',
    night: 'rgba(100, 120, 230, 0.35)'
  };
  const activeColor = colors[sound.visual] || 'rgba(255, 255, 255, 0.2)';
  document.documentElement.style.setProperty('--wave-glow', activeColor);

  // Play through SensoryEngine
  if (sound.type === 'binaural') {
    SensoryEngine.playBinaural(sound.subtype);
  } else if (sound.url) {
    SensoryEngine.playAtmosphere(sound.id, sound.url);
  } else {
    SensoryEngine.playNoise(sound.id === 'brown_noise' ? 'brown' : sound.id === 'pink_noise' ? 'pink' : 'white');
  }

  SensoryEngine.update(sound.id === 'storm' ? 'wired' : sound.id === 'night' ? 'foggy' : 'okay');

  // Update Play/Pause button state in UI (handled by event sync, but sync'd here as well)
  const playPauseBtn = document.getElementById('fullscreenPlayPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.classList.remove('paused');
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
  }

  window.dispatchEvent(new CustomEvent('aura-ambient-sync', { detail: { id: sound.id, isPlaying: true } }));
}

function stopActiveAmbientSound() {
  SensoryEngine.stopAllSensory();
  isAudioPlaying = false;
  
  if (currentActiveSound) {
    window.dispatchEvent(new CustomEvent('aura-ambient-sync', { detail: { id: currentActiveSound.id, isPlaying: false } }));
  }
}

function pauseActiveAmbientSound() {
  vibrate('light');
  SensoryEngine.stopAllSensory();
  isAudioPlaying = false;

  const playPauseBtn = document.getElementById('fullscreenPlayPauseBtn');
  if (playPauseBtn) {
    playPauseBtn.classList.add('paused');
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
  }

  if (currentActiveSound) {
    window.dispatchEvent(new CustomEvent('aura-ambient-sync', { detail: { id: currentActiveSound.id, isPlaying: false } }));
  }
}

function resumeActiveAmbientSound() {
  vibrate('light');
  if (currentActiveSound) {
    const sound = currentActiveSound;
    isAudioPlaying = true;

    // Play through SensoryEngine
    if (sound.type === 'binaural') {
      SensoryEngine.playBinaural(sound.subtype);
    } else if (sound.url) {
      SensoryEngine.playAtmosphere(sound.id, sound.url);
    } else {
      SensoryEngine.playNoise(sound.id === 'brown_noise' ? 'brown' : sound.id === 'pink_noise' ? 'pink' : 'white');
    }

    SensoryEngine.update(sound.id === 'storm' ? 'wired' : sound.id === 'night' ? 'foggy' : 'okay');

    // Update UI
    const playPauseBtn = document.getElementById('fullscreenPlayPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.classList.remove('paused');
      const playIcon = playPauseBtn.querySelector('.play-icon');
      const pauseIcon = playPauseBtn.querySelector('.pause-icon');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
    }

    window.dispatchEvent(new CustomEvent('aura-ambient-sync', { detail: { id: sound.id, isPlaying: true } }));
  }
}

/**
 * Updates Fullscreen Player labels, visualizer themes, backgrounds, and particles
 */
function updateFullscreenUI(sound) {
  if (!sound) return;

  const titleEl = document.getElementById('fullscreenTrackTitle');
  const visualizerEl = document.getElementById('fullscreenVisualizer');
  const centerIconEl = document.getElementById('visualizerCenterIcon');
  const bgBlurEl = document.getElementById('fullscreenBgBlur');
  const particlesEl = document.getElementById('visualizerParticles');

  if (titleEl) titleEl.textContent = t(sound.titleKey) || sound.id;

  // Update visualizer theme class
  const themeClass = sound.visual || 'focus';
  if (visualizerEl) {
    const isPaused = visualizerEl.classList.contains('paused');
    visualizerEl.className = `fullscreen-visualizer-container theme-${themeClass}${isPaused ? ' paused' : ''}`;
  }

  // Update center icon based on play state
  if (centerIconEl) {
    if (isAudioPlaying) {
      centerIconEl.innerHTML = ICONS[sound.icon] || ICONS.noise;
    } else {
      centerIconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 30px; height: 30px; margin-left: 3px;"><path d="M8 5v14l11-7z"/></svg>`;
    }
  }

  // Update blurred background artwork
  if (bgBlurEl) {
    const coverPath = `assets/images/ambient/${themeClass}.png`;
    bgBlurEl.style.backgroundImage = `url(${coverPath})`;
    bgBlurEl.classList.add('active');
  }

  // Generate dynamic, theme-specific particles
  if (particlesEl) {
    particlesEl.innerHTML = '';
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'vis-particle';
      
      // Random delay to offset starting times
      const delay = (Math.random() * 6).toFixed(2);
      p.style.animationDelay = `${delay}s`;
      
      // Set random custom properties for positioning
      if (themeClass === 'rain') {
        const x = Math.floor(Math.random() * 240) - 20; // -20px to 220px
        p.style.setProperty('--p-x', `${x}px`);
        p.style.animationDuration = `${(4 + Math.random() * 3).toFixed(1)}s`;
      } else if (themeClass === 'ocean') {
        const x = Math.floor(Math.random() * 220) - 10;
        const y = Math.floor(Math.random() * 220) - 10;
        p.style.setProperty('--p-x', `${x}px`);
        p.style.setProperty('--p-y', `${y}px`);
        p.style.animationDuration = `${(6 + Math.random() * 4).toFixed(1)}s`;
      } else if (themeClass === 'focus') {
        const angle = Math.floor(Math.random() * 360);
        const radius = Math.floor(Math.random() * 30) + 110; // 110px to 140px orbit
        p.style.setProperty('--p-angle', `${angle}deg`);
        p.style.setProperty('--p-radius', `${radius}px`);
        p.style.animationDuration = `${(8 + Math.random() * 6).toFixed(1)}s`;
      } else if (themeClass === 'night') {
        const x = Math.floor(Math.random() * 230) - 15;
        const y = Math.floor(Math.random() * 230) - 15;
        p.style.setProperty('--p-x', `${x}px`);
        p.style.setProperty('--p-y', `${y}px`);
        p.style.animationDuration = `${(5 + Math.random() * 4).toFixed(1)}s`;
      }
      
      particlesEl.appendChild(p);
    }
  }

  // Update volume slider in Fullscreen to match SensoryEngine current volume
  const volumeRange = document.getElementById('fullscreenVolumeRange');
  if (volumeRange) {
    volumeRange.value = SensoryEngine.appVolume;
  }
}

export function stopSwipePreviewIfAny() {
  const player = document.getElementById('ambientFullscreenPlayer');
  const isPlayerOpen = player && !player.classList.contains('hidden');
  if (isAudioPlaying && !isPlayerOpen) {
    stopActiveAmbientSound();
  }
}

// Listen for sync events from the standard ambient list or other modules
window.addEventListener('aura-ambient-sync', (e) => {
  const { id, isPlaying } = e.detail;

  const sound = AMBIENT_SOUNDS.find(s => s.id === id);
  if (sound) {
    currentActiveSound = sound;
  }
  isAudioPlaying = isPlaying;

  if (sound) {
    updateFullscreenUI(sound);
  }

  // Toggle visualizer paused states
  const visualizerEl = document.getElementById('fullscreenVisualizer');
  if (visualizerEl) {
    if (isPlaying) {
      visualizerEl.classList.remove('paused');
    } else {
      visualizerEl.classList.add('paused');
    }
  }

  // Update center icon
  const centerIconEl = document.getElementById('visualizerCenterIcon');
  if (centerIconEl && sound) {
    if (isPlaying) {
      centerIconEl.innerHTML = ICONS[sound.icon] || ICONS.noise;
    } else {
      centerIconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 30px; height: 30px; margin-left: 3px;"><path d="M8 5v14l11-7z"/></svg>`;
    }
  }

  // Update play/pause button state in fullscreen overlay
  const playPauseBtn = document.getElementById('fullscreenPlayPauseBtn');
  if (playPauseBtn) {
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    if (isPlaying) {
      playPauseBtn.classList.remove('paused');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
    } else {
      playPauseBtn.classList.add('paused');
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
    }
  }
});

