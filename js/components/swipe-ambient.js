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

// Canvas Visualizer & Breathing Guide Globals
let canvas = null;
let ctx = null;
let orbs = [];
let animationFrameId = null;
let globalSpeedMultiplier = 1.0;
let breathIntervalId = null;

// Center Canvas Visualizer Globals
let centerCanvas = null;
let centerCtx = null;
let centerAnimationId = null;
let centerRotation = 0;
let centerMorph = 0;
let targetRotationSpeed = 0.003;
let currentRotationSpeed = 0.003;
let targetMorphSpeed = 0.008;
let currentMorphSpeed = 0.008;

function initCanvasVisualizer() {
  canvas = document.getElementById('ambientFullscreenCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  function resize() {
    if (canvas) {
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight / 2;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // Initialize 3 orbs with random position/velocity
  orbs = [
    { x: Math.random() * (window.innerWidth / 2), y: Math.random() * (window.innerHeight / 2), r: 100, vx: 0.25, vy: 0.2, color: '#8a2be2' },
    { x: Math.random() * (window.innerWidth / 2), y: Math.random() * (window.innerHeight / 2), r: 130, vx: -0.2, vy: 0.25, color: '#ff007f' },
    { x: Math.random() * (window.innerWidth / 2), y: Math.random() * (window.innerHeight / 2), r: 110, vx: 0.15, vy: -0.3, color: '#ffb703' }
  ];
}

function animateOrbs() {
  if (!ctx || !canvas) return;

  ctx.fillStyle = '#06060a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  orbs.forEach(orb => {
    orb.x += orb.vx * globalSpeedMultiplier;
    orb.y += orb.vy * globalSpeedMultiplier;

    if (orb.x < 0 || orb.x > canvas.width) orb.vx *= -1;
    if (orb.y < 0 || orb.y > canvas.height) orb.vy *= -1;

    let gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    gradient.addColorStop(0, orb.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  });

  animationFrameId = requestAnimationFrame(animateOrbs);
}

function initCenterVisualizer() {
  centerCanvas = document.getElementById('visualizerCanvas');
  if (!centerCanvas) return;
  centerCtx = centerCanvas.getContext('2d');

  function resizeCenter() {
    if (centerCanvas) {
      const container = document.getElementById('fullscreenVisualizer');
      const rect = container ? container.getBoundingClientRect() : { width: 280, height: 280 };
      const dpr = window.devicePixelRatio || 1;
      
      let wVal = rect.width || 280;
      let hVal = rect.height || 280;
      
      centerCanvas.width = wVal * dpr;
      centerCanvas.height = hVal * dpr;
      
      centerCtx.setTransform(1, 0, 0, 1, 0, 0);
      centerCtx.scale(dpr, dpr);
    }
  }

  window.addEventListener('resize', resizeCenter);
  resizeCenter();
}

function animateCenterVisualizer() {
  if (!centerCtx || !centerCanvas) return;

  const dpr = window.devicePixelRatio || 1;
  const container = document.getElementById('fullscreenVisualizer');
  const rect = container ? container.getBoundingClientRect() : { width: 280, height: 280 };
  
  let wVal = rect.width || 280;
  let hVal = rect.height || 280;
  
  const targetW = Math.round(wVal * dpr);
  const targetH = Math.round(hVal * dpr);
  
  if (centerCanvas.width !== targetW || centerCanvas.height !== targetH) {
    if (targetW > 0 && targetH > 0) {
      centerCanvas.width = targetW;
      centerCanvas.height = targetH;
      centerCtx.setTransform(1, 0, 0, 1, 0, 0);
      centerCtx.scale(dpr, dpr);
    }
  }

  const w = centerCanvas.width / dpr;
  const h = centerCanvas.height / dpr;

  centerCtx.clearRect(0, 0, w, h);

  // Smoothly adjust speeds based on whether audio is playing
  if (isAudioPlaying) {
    targetRotationSpeed = 0.005;
    targetMorphSpeed = 0.008;
  } else {
    targetRotationSpeed = 0.001; // slow resting drift
    targetMorphSpeed = 0.002;
  }

  currentRotationSpeed += (targetRotationSpeed - currentRotationSpeed) * 0.05;
  currentMorphSpeed += (targetMorphSpeed - currentMorphSpeed) * 0.05;

  centerRotation += currentRotationSpeed;
  centerMorph += currentMorphSpeed;

  const visualTheme = currentActiveSound ? currentActiveSound.visual : 'focus';
  
  // Center coordinates and radius
  const cx = w / 2;
  const cy = h / 2;
  const maxRadius = Math.min(w, h) * 0.44;

  if (visualTheme === 'rain') {
    // Morphing Rose Curve (sacred geometry flower)
    centerCtx.save();
    centerCtx.translate(cx, cy);
    centerCtx.rotate(centerRotation);
    
    const layers = 3;
    for (let l = 0; l < layers; l++) {
      const k = 6 + Math.sin(centerMorph * 0.8 + l * 0.5) * 1.5;
      const amp = maxRadius * (0.75 - l * 0.12 + Math.sin(centerMorph * 0.4 + l) * 0.05);
      
      centerCtx.beginPath();
      centerCtx.strokeStyle = l === 0 ? '#00f5d4' : l === 1 ? '#00bbf9' : 'rgba(0, 245, 212, 0.4)';
      centerCtx.lineWidth = l === 0 ? 2 : 1.2;
      
      if (l === 0) {
        centerCtx.shadowBlur = 12;
        centerCtx.shadowColor = '#00f5d4';
      } else {
        centerCtx.shadowBlur = 0;
      }

      for (let theta = 0; theta < Math.PI * 2; theta += 0.02) {
        const r = amp * Math.cos(k * theta);
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        if (theta === 0) centerCtx.moveTo(x, y);
        else centerCtx.lineTo(x, y);
      }
      centerCtx.closePath();
      centerCtx.stroke();
    }
    centerCtx.restore();
  } else if (visualTheme === 'ocean') {
    // Concentric Wavy Ripple Rings
    centerCtx.save();
    centerCtx.translate(cx, cy);
    centerCtx.rotate(centerRotation * 0.4);

    const ringCount = 4;
    for (let rIdx = 0; rIdx < ringCount; rIdx++) {
      const baseRadius = maxRadius * (0.28 + (rIdx / ringCount) * 0.68);
      const amp = 7 + Math.sin(centerMorph * 0.8 + rIdx) * 4;
      const waveCount = 5 + rIdx;
      const phase = centerMorph * 1.8 + rIdx * (Math.PI / 2);

      centerCtx.beginPath();
      centerCtx.strokeStyle = `rgba(0, 180, 216, ${0.95 - rIdx * 0.18})`;
      centerCtx.lineWidth = 1.8;
      
      if (rIdx === 0) {
        centerCtx.shadowBlur = 10;
        centerCtx.shadowColor = '#00b4d8';
      } else {
        centerCtx.shadowBlur = 0;
      }

      for (let theta = 0; theta <= Math.PI * 2 + 0.05; theta += 0.04) {
        const r = baseRadius + Math.sin(waveCount * theta - phase) * amp;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        if (theta === 0) centerCtx.moveTo(x, y);
        else centerCtx.lineTo(x, y);
      }
      centerCtx.stroke();
    }
    centerCtx.restore();
  } else if (visualTheme === 'focus') {
    // Rotating Hypotrochoid (crystalline star spirograph)
    centerCtx.save();
    centerCtx.translate(cx, cy);
    centerCtx.rotate(centerRotation * 1.1);

    const R = maxRadius * 0.72;
    const r = R * (0.58 + Math.sin(centerMorph * 0.35) * 0.08);
    const d = maxRadius * (0.38 + Math.cos(centerMorph * 0.55) * 0.12);

    centerCtx.beginPath();
    centerCtx.strokeStyle = '#ffb703';
    centerCtx.lineWidth = 1.6;
    centerCtx.shadowBlur = 12;
    centerCtx.shadowColor = '#fb8500';

    const loops = 10;
    let first = true;
    for (let theta = 0; theta < Math.PI * 2 * loops; theta += 0.04) {
      const factor = (R - r) / r;
      const x = (R - r) * Math.cos(theta) + d * Math.cos(factor * theta);
      const y = (R - r) * Math.sin(theta) - d * Math.sin(factor * theta);
      
      if (first) {
        centerCtx.moveTo(x, y);
        first = false;
      } else {
        centerCtx.lineTo(x, y);
      }
    }
    centerCtx.stroke();
    centerCtx.restore();
  } else {
    // Night: Logarithmic galaxy spiral wireframe
    centerCtx.save();
    centerCtx.translate(cx, cy);
    centerCtx.rotate(centerRotation * 0.6);

    const arms = 3;
    const pointsPerArm = 70;
    const armCoords = Array.from({ length: arms }, () => []);

    // Compute coordinates
    for (let a = 0; a < arms; a++) {
      const startAngle = (a / arms) * Math.PI * 2;
      for (let i = 0; i < pointsPerArm; i++) {
        const tVal = i / pointsPerArm;
        const angle = startAngle + tVal * Math.PI * 2.8 + centerMorph * 0.4;
        const radius = maxRadius * Math.pow(tVal, 1.45) * (0.96 + Math.sin(centerMorph * 0.9 + i * 0.08) * 0.04);
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        armCoords[a].push({ x, y });
      }
    }

    // Draw main arms
    for (let a = 0; a < arms; a++) {
      centerCtx.beginPath();
      centerCtx.strokeStyle = '#b5179e';
      centerCtx.lineWidth = 2.0;
      centerCtx.shadowBlur = 10;
      centerCtx.shadowColor = '#7209b7';
      
      for (let i = 0; i < pointsPerArm; i++) {
        const pt = armCoords[a][i];
        if (i === 0) centerCtx.moveTo(pt.x, pt.y);
        else centerCtx.lineTo(pt.x, pt.y);
      }
      centerCtx.stroke();

      // Draw wireframe connecting links between arms
      centerCtx.beginPath();
      centerCtx.strokeStyle = 'rgba(114, 9, 183, 0.16)';
      centerCtx.lineWidth = 0.9;
      centerCtx.shadowBlur = 0;
      
      const nextArm = (a + 1) % arms;
      for (let i = 8; i < pointsPerArm; i += 4) {
        const pt1 = armCoords[a][i];
        const pt2 = armCoords[nextArm][i - 6];
        if (pt1 && pt2) {
          centerCtx.moveTo(pt1.x, pt1.y);
          centerCtx.lineTo(pt2.x, pt2.y);
        }
      }
      centerCtx.stroke();
    }

    centerCtx.restore();
  }

  centerAnimationId = requestAnimationFrame(animateCenterVisualizer);
}

function startBreathingGuide() {
  const textEl = document.getElementById('breathGuidanceText');
  if (!textEl) return;

  let cycleTime = 0;
  if (breathIntervalId) clearInterval(breathIntervalId);

  const isTR = t('lang') === 'tr';
  const txtIn = isTR ? 'Nefes Al' : 'Breathe In';
  const txtOut = isTR ? 'Nefes Ver' : 'Breathe Out';
  const txtHold = isTR ? 'Tut' : 'Hold';

  textEl.textContent = txtIn;

  breathIntervalId = setInterval(() => {
    cycleTime = (cycleTime + 1) % 10;
    if (cycleTime === 1) {
      textEl.textContent = txtIn;
    } else if (cycleTime === 5) {
      textEl.textContent = txtOut;
    } else if (cycleTime === 9 || cycleTime === 0) {
      textEl.textContent = txtHold;
    }
  }, 1000);
}

function stopBreathingGuide() {
  if (breathIntervalId) {
    clearInterval(breathIntervalId);
    breathIntervalId = null;
  }
}

export function initSwipeAmbient(config) {
  Object.assign(configProps, config);

  // Initialize canvas visualizers
  initCanvasVisualizer();
  initCenterVisualizer();

  // Exit Fullscreen buttons (both capsuleCloseBtn and closeFsBtn)
  const closeFsBtn = document.getElementById('closeAmbientFullscreenBtn');
  const capsuleCloseBtn = document.getElementById('fullscreenCloseBtn');
  const closeAction = () => {
    vibrate('light');
    const player = document.getElementById('ambientFullscreenPlayer');
    if (player) player.classList.add('hidden');
    // Stop canvas animations and breathing guide to save resources
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (centerAnimationId) {
      cancelAnimationFrame(centerAnimationId);
      centerAnimationId = null;
    }
    stopBreathingGuide();
    syncMiniPlayerState();
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

  // Toggle Play/Pause by tapping the central visualizer canvas itself
  const visualizerEl = document.getElementById('fullscreenVisualizer');
  if (visualizerEl) {
    visualizerEl.style.cursor = 'pointer';
    visualizerEl.style.pointerEvents = 'auto'; // ensure click events trigger
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

  // Mini Player Event Handlers: Tap to restore Fullscreen
  const miniOpenBtn = document.getElementById('miniPlayerOpenBtn');
  if (miniOpenBtn) {
    miniOpenBtn.addEventListener('click', () => {
      vibrate('medium');
      const player = document.getElementById('ambientFullscreenPlayer');
      if (player) {
        player.classList.remove('hidden');
      }
      // Start canvas animations and breathing guide
      if (!animationFrameId) {
        animateOrbs();
      }
      if (!centerAnimationId) {
        animateCenterVisualizer();
      }
      startBreathingGuide();
      syncMiniPlayerState(); // hides mini player since isPlayerOpen will be true
    });
  }

  // Mini Player: Play/Pause Button click
  const miniPlayPauseBtn = document.getElementById('miniPlayerPlayPauseBtn');
  if (miniPlayPauseBtn) {
    miniPlayPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isAudioPlaying) {
        pauseActiveAmbientSound();
      } else {
        resumeActiveAmbientSound();
      }
    });
  }

  // Mini Player: Stop/Close Button click
  const miniCloseBtn = document.getElementById('miniPlayerCloseBtn');
  if (miniCloseBtn) {
    miniCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      vibrate('light');
      stopActiveAmbientSound();
    });
  }
}

export function startSwipeAmbientFlow() {
  if (deckInstance) {
    deckInstance.destroy();
    deckInstance = null;
  }

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
    badgeLeftText: t('btn_skip_badge'),
    badgeRightText: t('btn_listen_badge'),
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
            ${t('nav_ambient')}
          </span>
        </div>
        
        <!-- MIDDLE AREA: Title, Subtitle, Description -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: left; width: 100%; padding: 10px 0;">
          <h3 style="font-size: 1.45rem; font-weight: 700; margin: 0 0 6px 0; background: linear-gradient(135deg, #ffffff, rgba(255, 255, 255, 0.7)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.25; font-family: var(--font-family);">
            ${title}
          </h3>
          <span style="font-size: 0.8rem; opacity: 0.5; font-weight: 500; margin-bottom: 16px; display: block; letter-spacing: 0.5px;">
            ${t('dash_ambient_desc')}
          </span>
          <p style="font-size: 0.85rem; opacity: 0.7; line-height: 1.5; margin: 0; max-height: 110px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; font-weight: 300;">
            ${t('swipe_ambient_card_desc')}
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
      if (!animationFrameId) {
        animateOrbs();
      }
      if (!centerAnimationId) {
        animateCenterVisualizer();
      }
      startBreathingGuide();
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
  currentActiveSound = null;
  syncMiniPlayerState();
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
  const bgBlurEl = document.getElementById('fullscreenBgBlur');
  const particlesEl = document.getElementById('visualizerParticles');

  if (titleEl) titleEl.textContent = t(sound.titleKey) || sound.id;

  // Update visualizer theme class
  const themeClass = sound.visual || 'focus';
  if (visualizerEl) {
    const isPaused = visualizerEl.classList.contains('paused');
    visualizerEl.className = `fullscreen-visualizer-container theme-${themeClass}${isPaused ? ' paused' : ''}`;
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

  // Ensure loops are running if the player is open
  const player = document.getElementById('ambientFullscreenPlayer');
  if (player && !player.classList.contains('hidden')) {
    if (!animationFrameId) {
      animateOrbs();
    }
    if (!centerAnimationId) {
      animateCenterVisualizer();
    }
    startBreathingGuide();
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

  // Ensure loops are running if the player is open
  const player = document.getElementById('ambientFullscreenPlayer');
  if (player && !player.classList.contains('hidden')) {
    if (!animationFrameId) {
      animateOrbs();
    }
    if (!centerAnimationId) {
      animateCenterVisualizer();
    }
    startBreathingGuide();
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

  // Sync mini player visibility and states
  syncMiniPlayerState();
});

export function syncMiniPlayerState() {
  const miniPlayer = document.getElementById('ambientMiniPlayer');
  const player = document.getElementById('ambientFullscreenPlayer');
  const navContainer = document.getElementById('mobile-nav-container');
  const mobileNav = document.getElementById('mobile-nav');
  if (!miniPlayer) return;

  const isPlayerOpen = player && !player.classList.contains('hidden');

  // Do not show mini player if currently in Ambient view or Swipe Ambient view
  const ambientView = document.getElementById('view-ambient');
  const swipeAmbientView = document.getElementById('view-swipe-ambient');
  const isAmbientActive = (ambientView && !ambientView.classList.contains('hidden')) || 
                          (swipeAmbientView && !swipeAmbientView.classList.contains('hidden'));

  if (currentActiveSound && !isPlayerOpen && !isAmbientActive) {
    // Show mini player
    miniPlayer.classList.remove('hidden');
    if (navContainer) navContainer.classList.add('has-mini-player');
    if (mobileNav) mobileNav.classList.add('has-mini-player-active');
    
    // Update labels and artwork
    const titleEl = document.getElementById('miniPlayerTitle');
    const artEl = document.getElementById('miniPlayerArtwork');
    if (titleEl) titleEl.textContent = t(currentActiveSound.titleKey) || currentActiveSound.id;
    
    const themeClass = currentActiveSound.visual || 'focus';
    if (artEl) artEl.src = `assets/images/ambient/${themeClass}.png`;

    // Update play/pause state
    const playIcon = miniPlayer.querySelector('.play-icon');
    const pauseIcon = miniPlayer.querySelector('.pause-icon');
    if (isAudioPlaying) {
      miniPlayer.classList.remove('paused');
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
    } else {
      miniPlayer.classList.add('paused');
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
    }
  } else {
    // Hide mini player
    miniPlayer.classList.add('hidden');
    if (navContainer) navContainer.classList.remove('has-mini-player');
    if (mobileNav) mobileNav.classList.remove('has-mini-player-active');
  }
}

export function destroySwipeAmbientFlow() {
  if (deckInstance) {
    deckInstance.destroy();
    deckInstance = null;
  }
}

