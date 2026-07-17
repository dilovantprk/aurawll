/*
  Aura | Ambient Component V5
  Liquid Glass & Icon-Driven UI
*/

import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { vibrate } from '../core/utils.js';
import { SensoryEngine } from '../services/sensory.js';

export const ICONS = {
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16v4M12 18v4M16 16v4"/></svg>',
  waves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>',
  birds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><path d="M16 7c-1.5 0-3-1-4.5-1S8.5 7 7 7c-1.5 0-3-.5-4-1 .5 2 1.5 4 3 5 1.5 1 3 1 4.5 1s3 0 4.5-1c1.5-1 2.5-3 3-5-1 .5-2.5 1-4 1z"/><path d="M12 12v5m-4-3v3m8-3v3"/></svg>',
  jungle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8M9 11l3 3 3-3"/></svg>',
  whale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><path d="M2 16c5 0 7-4 10-4s5 4 10 4M2 12c5 0 7-4 10-4s5 4 10 4"/></svg>',
  focus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 7v2M12 15v2M17 12h-2M9 12H7"/></svg>',
  peace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  noise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"><path d="M2 12h2l2-9 4 18 4-18 4 18 2-9h2"/></svg>'
};

export const AMBIENT_SOUNDS = [
  { id: 'rain', titleKey: 'amb_rain', category: 'nature', icon: 'rain', visual: 'rain', url: 'assets/audio/ambient/soul_serenity_sounds-garden-ambience-236744.mp3' },
  { id: 'waves', titleKey: 'amb_waves', category: 'nature', icon: 'waves', visual: 'ocean', url: 'assets/audio/ambient/soul_serenity_sounds-water-noises-241049.mp3' },
  { id: 'forest_birds', titleKey: 'amb_forest_birds', category: 'nature', icon: 'birds', visual: 'rain', url: 'assets/audio/ambient/kalsstockmedia-ambient-forest-bird-sounds-280152.mp3' },
  { id: 'jungle', titleKey: 'amb_jungle', category: 'nature', icon: 'jungle', visual: 'rain', url: 'assets/audio/ambient/freesound_community-ambient-01_junglehillswav-14614.mp3' },
  { id: 'stream', titleKey: 'amb_stream', category: 'nature', icon: 'waves', visual: 'ocean', url: 'assets/audio/ambient/blendertimer-small-gentle-stream-loop-514373.mp3' },
  { id: 'whale', titleKey: 'amb_whale', category: 'nature', icon: 'whale', visual: 'ocean', url: 'assets/audio/ambient/saturn-3-music-underwater-whale-and-diving-sound-ambient-116185.mp3' },
  { id: 'spring_forest', titleKey: 'amb_spring', category: 'nature', icon: 'birds', visual: 'rain', url: 'assets/audio/ambient/soundreality-ambient-spring-forest-323801.mp3' },
  { id: 'frogs', titleKey: 'amb_frogs', category: 'nature', icon: 'birds', visual: 'night', url: 'assets/audio/ambient/freesound_community-frog-croak-ambient-70548.mp3' },
  { id: 'spaceship', titleKey: 'amb_spaceship', category: 'focus', icon: 'noise', visual: 'focus', url: 'assets/audio/ambient/freesound_community-spaceship-ambient-27988.mp3' },
  { id: 'pink_noise', titleKey: 'amb_pink', category: 'focus', icon: 'noise', visual: 'focus', type: 'noise' },
  { id: 'brown_noise', titleKey: 'amb_brown', category: 'focus', icon: 'noise', visual: 'focus', type: 'noise' },
  { id: 'bin_focus', titleKey: 'amb_bin_focus', category: 'focus', icon: 'focus', visual: 'focus', type: 'binaural', subtype: 'focus' },
  { id: 'bin_relax', titleKey: 'amb_bin_relax', category: 'peace', icon: 'peace', visual: 'night', type: 'binaural', subtype: 'relax' },
  { id: 'bin_sleep', titleKey: 'amb_bin_sleep', category: 'peace', icon: 'peace', visual: 'night', type: 'binaural', subtype: 'sleep' },
  { id: 'midnight', titleKey: 'amb_midnight', category: 'peace', icon: 'peace', visual: 'night', url: 'assets/audio/ambient/recordx_media-midnight-sound-effect-199863.mp3' },
  { id: 'storm', titleKey: 'amb_storm', category: 'nature', icon: 'rain', visual: 'rain', url: 'assets/audio/ambient/soul_serenity_sounds-garden-ambience-236744.mp3' }
];

let activeSoundId = null;
let configProps = {};

export function initAmbient(config = {}) {
  Object.assign(configProps, config);
  renderAmbientGrid();
  if (elements.ambientMasterVolume) {
    elements.ambientMasterVolume.oninput = (e) => SensoryEngine.setVolume(parseInt(e.target.value));
  }

  const openSwipeBtn = document.getElementById('openSwipeAmbientBtn');
  if (openSwipeBtn) {
    openSwipeBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('aura-haptic', {detail: 'medium'}));
      if (configProps.navigateTo) {
        configProps.navigateTo('view-swipe-ambient');
      }
    });
  }
}

function renderAmbientGrid() {
  if (!elements.ambientList) return;

  elements.ambientList.innerHTML = AMBIENT_SOUNDS.map(sound => `
    <div class="ambient-card-v2 liquid-glass glow-card ${activeSoundId === sound.id ? 'active' : ''}" data-id="${sound.id}" data-visual="${sound.visual || ''}">
      
      <!-- Psychedelic glow layer (active state) -->
      <div class="ambient-liquid-wave"></div>

      <!-- SVG wave visualizer (shows when active) -->
      <div class="ambient-wave-vis" aria-hidden="true">
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path class="wave-path wave-path-1"
            d="M0 40 C20 20, 40 55, 60 38 C80 20, 100 50, 120 35 C140 18, 160 48, 180 32 C190 24, 196 38, 200 35 L200 60 L0 60 Z"/>
          <path class="wave-path wave-path-2"
            d="M0 48 C25 30, 45 58, 70 44 C95 28, 115 54, 140 42 C160 30, 175 50, 200 40 L200 60 L0 60 Z"/>
        </svg>
      </div>

      <div class="ambient-card-content">
        <!-- TOP: category tag + title -->
        <div class="ambient-card-top">
          <span class="card-tag-v2">${t('cat_' + sound.category.toLowerCase())}</span>
          <h3 class="card-title-v2">${t(sound.titleKey)}</h3>
        </div>

        <!-- BOTTOM: icon left + play/pause right -->
        <div class="ambient-card-bottom">
          <div class="ambient-card-icon">${ICONS[sound.icon] || ICONS.noise}</div>

          <div class="play-hold-btn">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  elements.ambientList.querySelectorAll('.ambient-card-v2').forEach(card => {
    const playBtn = card.querySelector('.play-hold-btn');
    const id = card.getAttribute('data-id');

    if (playBtn) {
      playBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent opening fullscreen
        toggleSound(id, card);
      };
    }

    card.onclick = () => {
      vibrate('medium');
      const player = document.getElementById('ambientFullscreenPlayer');
      if (player) {
        player.classList.remove('hidden');
      }

      // Play if not already active
      if (activeSoundId !== id) {
        toggleSound(id, card);
      } else {
        // Already active, manually trigger event to sync UI and start canvas
        window.dispatchEvent(new CustomEvent('aura-ambient-sync', { detail: { id, isPlaying: true } }));
      }
    };
  });
}

function toggleSound(id, card) {
  if (activeSoundId === id) {
    activeSoundId = null;
    SensoryEngine.stopAllSensory();
    card.classList.remove('active');
    vibrate('light');
    
    window.dispatchEvent(new CustomEvent('aura-ambient-sync', { detail: { id, isPlaying: false } }));
  } else {
    const prevCard = elements.ambientList.querySelector('.ambient-card-v2.active');
    if (prevCard) prevCard.classList.remove('active');

    activeSoundId = id;
    card.classList.add('active');
    vibrate('medium');

    const soundData = AMBIENT_SOUNDS.find(s => s.id === id);
    if (!soundData) return;

    if (soundData.type === 'binaural') {
      SensoryEngine.playBinaural(soundData.subtype);
    } else if (soundData.url) {
      card.classList.add('loading');
      SensoryEngine.playAtmosphere(id, soundData.url, () => card.classList.remove('loading'));
    } else {
      SensoryEngine.playNoise(id === 'brown_noise' ? 'brown' : id === 'pink_noise' ? 'pink' : 'white');
    }

    SensoryEngine.update(id === 'storm' ? 'wired' : id === 'night' ? 'foggy' : 'okay');

    window.dispatchEvent(new CustomEvent('aura-ambient-sync', { detail: { id, isPlaying: true } }));
  }
}

// Listen for sync events from the Swipe Ambient fullscreen player or other modules
window.addEventListener('aura-ambient-sync', (e) => {
  const { id, isPlaying } = e.detail;
  activeSoundId = isPlaying ? id : null;

  if (elements.ambientList) {
    const cards = elements.ambientList.querySelectorAll('.ambient-card-v2');
    cards.forEach(card => {
      const cardId = card.getAttribute('data-id');
      if (isPlaying && cardId === id) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
        card.classList.remove('loading');
      }
    });
  }
});

