/*
  Aura | Ambient Component V5
  Liquid Glass & Icon-Driven UI
*/

import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { vibrate } from '../core/utils.js';
import { SensoryEngine } from '../services/sensory.js';

const ICONS = {
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16v4M12 18v4M16 16v4"/></svg>',
  waves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>',
  birds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 7c-1.5 0-3-1-4.5-1S8.5 7 7 7c-1.5 0-3-.5-4-1 .5 2 1.5 4 3 5 1.5 1 3 1 4.5 1s3 0 4.5-1c1.5-1 2.5-3 3-5-1 .5-2.5 1-4 1z"/><path d="M12 12v5m-4-3v3m8-3v3"/></svg>',
  jungle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8M9 11l3 3 3-3"/></svg>',
  whale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 16c5 0 7-4 10-4s5 4 10 4M2 12c5 0 7-4 10-4s5 4 10 4"/></svg>',
  focus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 7v2M12 15v2M17 12h-2M9 12H7"/></svg>',
  peace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3a9 9 0 1 0 9 9 9.75 9.75 0 0 0-6.74-9.31 3 3 0 0 1-5.07 1.31 1 1 0 1 1-2.02-1A1 1 0 0 1 12 3z"/></svg>',
  noise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12h2l2-9 4 18 4-18 4 18 2-9h2"/></svg>'
};

const AMBIENT_SOUNDS = [
  { id: 'rain', titleKey: 'amb_rain', category: 'nature', icon: 'rain', visual: 'rain', url: 'assets/audio/ambient/rain.mp3' },
  { id: 'waves', titleKey: 'amb_waves', category: 'nature', icon: 'waves', visual: 'ocean', url: 'assets/audio/ambient/waves.mp3' },
  { id: 'forest_birds', titleKey: 'amb_forest_birds', category: 'nature', icon: 'birds', visual: 'rain', url: 'assets/audio/ambient/kalsstockmedia-ambient-forest-bird-sounds-280152.mp3' },
  { id: 'jungle', titleKey: 'amb_jungle', category: 'nature', icon: 'jungle', visual: 'rain', url: 'assets/audio/ambient/freesound_community-ambient-01_junglehillswav-14614.mp3' },
  { id: 'stream', titleKey: 'amb_stream', category: 'nature', icon: 'waves', visual: 'ocean', url: 'assets/audio/ambient/blendertimer-small-gentle-stream-loop-514373.mp3' },
  { id: 'whale', titleKey: 'amb_whale', category: 'nature', icon: 'whale', visual: 'ocean', url: 'assets/audio/ambient/saturn-3-music-underwater-whale-and-diving-sound-ambient-116185.mp3' },
  { id: 'pink_noise', titleKey: 'amb_pink', category: 'focus', icon: 'noise', visual: 'focus', type: 'noise' },
  { id: 'brown_noise', titleKey: 'amb_brown', category: 'focus', icon: 'noise', visual: 'focus', type: 'noise' },
  { id: 'bin_focus', titleKey: 'amb_bin_focus', category: 'focus', icon: 'focus', visual: 'focus', type: 'binaural', subtype: 'focus' },
  { id: 'bin_relax', titleKey: 'amb_bin_relax', category: 'peace', icon: 'peace', visual: 'night', type: 'binaural', subtype: 'relax' },
  { id: 'bin_sleep', titleKey: 'amb_bin_sleep', category: 'peace', icon: 'peace', visual: 'night', type: 'binaural', subtype: 'sleep' },
  { id: 'midnight', titleKey: 'amb_midnight', category: 'peace', icon: 'peace', visual: 'night', url: 'assets/audio/ambient/recordx_media-midnight-sound-effect-199863.mp3' },
  { id: 'storm', titleKey: 'amb_storm', category: 'nature', icon: 'rain', visual: 'rain', url: 'assets/audio/ambient/storm.mp3' }
];

let activeSoundId = null;

export function initAmbient() {
  renderAmbientGrid();
  if (elements.ambientMasterVolume) {
    elements.ambientMasterVolume.oninput = (e) => SensoryEngine.setVolume(parseInt(e.target.value));
  }
}

function renderAmbientGrid() {
  if (!elements.ambientList) return;

  elements.ambientList.innerHTML = AMBIENT_SOUNDS.map(sound => `
    <div class="ambient-card-v2 liquid-glass glow-card ${activeSoundId === sound.id ? 'active' : ''}" data-id="${sound.id}" data-visual="${sound.visual || ''}">
      <div class="card-visual"></div>
      
      <!-- Aesthetic Liquid Wave Visualizer -->
      <div class="ambient-liquid-wave">
        <div class="wave-layer"></div>
        <div class="wave-layer"></div>
        <div class="wave-layer"></div>
      </div>

      <div class="ambient-card-content">
        <div class="ambient-card-top">
          <div class="ambient-card-icon">${ICONS[sound.icon] || ICONS.noise}</div>
          
          <!-- Top Right Play/Hold Button -->
          <div class="play-hold-btn">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </div>
        </div>

        <div class="card-info-v2">
          <span class="card-tag-v2">${sound.category}</span>
          <h3 class="card-title-v2">${t(sound.titleKey)}</h3>
        </div>
      </div>
    </div>
  `).join('');

  elements.ambientList.querySelectorAll('.ambient-card-v2').forEach(card => {
    card.onclick = () => toggleSound(card.getAttribute('data-id'), card);
  });
}

function toggleSound(id, card) {
  if (activeSoundId === id) {
    activeSoundId = null;
    SensoryEngine.stopAllSensory();
    card.classList.remove('active');
    vibrate('light');
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
  }
}
