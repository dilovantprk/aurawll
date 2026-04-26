import { SENSORY_CONFIG } from '../core/vagal-engine.js';

export const SensoryEngine = {
  audioCtx: null,
  masterGain: null,
  biquadFilter: null,
  ventralOsc: null,
  sympOsc: null,
  dorsalOsc: null,
  sympTremoloGain: null,
  sympTremoloLFO: null,
  dorsalGain: null,
  dorsalLFO: null,
  breathNoise: null,
  breathGain: null,
  breathFilter: null,
  hapticInterval: null,
  currentPattern: null,
  isMuted: false,
  droneEnabled: true,
  hapticEnabled: true,
  uiSoundsEnabled: false,
  appVolume: 50,
  droneGain: null, // Dedicated gain for drones

  initAudio() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      console.warn("AudioContext not supported.");
      return;
    }
    
    // Master Howler setup
    Howler.autoUnlock = true;
    
    this.masterGain = this.audioCtx.createGain();
    const volScale = (this.appVolume / 100) * 0.6;
    this.masterGain.gain.value = this.isMuted ? 0 : volScale;
    this.resumeAudio();
    
    this.biquadFilter = this.audioCtx.createBiquadFilter();
    this.biquadFilter.type = 'lowpass';
    this.biquadFilter.frequency.value = 1000;
    this.biquadFilter.Q.value = 1.0;
    
    this.masterGain.connect(this.biquadFilter);
    this.biquadFilter.connect(this.audioCtx.destination);

    this._initDrones();
    this._initBreathNoise();
    this._initNoiseGenerators();
    this._initProceduralAtmospheres();
  },

  _initNoiseGenerators() {
    const bufferSize = 2 * this.audioCtx.sampleRate;
    
    // White Noise
    const whiteBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const whiteData = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) whiteData[i] = Math.random() * 2 - 1;
    this.whiteNoiseBuffer = whiteBuffer;

    // Pink Noise
    const pinkBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const pinkData = pinkBuffer.getChannelData(0);
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      let white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      pinkData[i] *= 0.11; 
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = pinkBuffer;

    // Brown Noise
    const brownBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const brownData = brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + (0.02 * white)) / 1.002;
      lastOut = brownData[i];
      brownData[i] *= 3.5;
    }
    this.brownNoiseBuffer = brownBuffer;

    this.activeNoiseSource = null;
    this.activeNoiseGain = this.audioCtx.createGain();
    this.activeNoiseGain.gain.value = 0;
    this.activeNoiseGain.connect(this.masterGain);
  },

  _initProceduralAtmospheres() {
    // Atmosphere Master Gain
    this.atmosGain = this.audioCtx.createGain();
    this.atmosGain.gain.value = 0;
    this.atmosGain.connect(this.masterGain);

    // Texture Gain (for drops, ripples etc)
    this.textureGain = this.audioCtx.createGain();
    this.textureGain.gain.value = 0;
    this.textureGain.connect(this.masterGain);

    // Binaural Gain
    this.binauralGain = this.audioCtx.createGain();
    this.binauralGain.gain.value = 0;
    this.binauralGain.connect(this.masterGain);

    this.isAtmosActive = false;
  },

  _initDrones() {
    this.droneGain = this.audioCtx.createGain();
    this.droneGain.gain.value = this.droneEnabled ? 1 : 0;
    this.droneGain.connect(this.masterGain);

    this.ventralOsc = this.audioCtx.createOscillator();
    this.ventralOsc.type = 'sine';
    this.ventralOsc.frequency.value = 216;
    const vG = this.audioCtx.createGain(); vG.gain.value = 0;
    this.ventralOsc.connect(vG); vG.connect(this.droneGain);
    this.ventralGain = vG;

    this.sympOsc = this.audioCtx.createOscillator();
    this.sympOsc.type = 'sine';
    this.sympOsc.frequency.value = 216; this.sympOsc.detune.value = 15;
    this.sympTremoloGain = this.audioCtx.createGain(); this.sympTremoloGain.gain.value = 0;
    this.sympTremoloLFO = this.audioCtx.createOscillator(); this.sympTremoloLFO.type = 'sine';
    this.sympTremoloLFO.frequency.value = 5;
    const tD = this.audioCtx.createGain(); tD.gain.value = 0.5;
    this.sympTremoloLFO.connect(tD); tD.connect(this.sympTremoloGain.gain);
    this.sympOsc.connect(this.sympTremoloGain); this.sympTremoloGain.connect(this.droneGain);

    this.dorsalOsc = this.audioCtx.createOscillator();
    this.dorsalOsc.type = 'sine';
    this.dorsalOsc.frequency.value = 108;
    this.dorsalGain = this.audioCtx.createGain(); this.dorsalGain.gain.value = 0;
    this.dorsalLFO = this.audioCtx.createOscillator(); this.dorsalLFO.type = 'sine';
    this.dorsalLFO.frequency.value = 0.2;
    const dD = this.audioCtx.createGain(); dD.gain.value = 0.8;
    this.dorsalLFO.connect(dD); dD.connect(this.dorsalGain.gain);
    this.dorsalOsc.connect(this.dorsalGain); this.dorsalGain.connect(this.droneGain);

    this.ventralOsc.start(); this.sympOsc.start(); this.sympTremoloLFO.start();
    this.dorsalOsc.start(); this.dorsalLFO.start();
  },

  _initBreathNoise() {
    this.breathGain = this.audioCtx.createGain(); this.breathGain.gain.value = 0;
    this.breathFilter = this.audioCtx.createBiquadFilter();
    this.breathFilter.type = 'lowpass'; this.breathFilter.frequency.value = 1000;
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    this.breathSource = this.audioCtx.createBufferSource();
    this.breathSource.buffer = noiseBuffer; this.breathSource.loop = true;
    this.breathSource.connect(this.breathFilter);
    this.breathFilter.connect(this.breathGain);
    this.breathGain.connect(this.masterGain);
    this.breathSource.start();
  },

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      // Browsers often log a warning even with .catch(), but this is the correct way to handle it
      this.audioCtx.resume().then(() => {
        // Successfully resumed
      }).catch(err => {
        // Silently fail if interaction policy blocks it
      });
    }
  },

  update(stateId) {
    if (this.isMuted || !this.audioCtx) return;
    const config = SENSORY_CONFIG[stateId.toUpperCase()] || SENSORY_CONFIG.OKAY;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;
    if (stateId === 'okay') {
       this.ventralGain.gain.setTargetAtTime(1.0, now, 1.0);
       this.sympTremoloGain.gain.setTargetAtTime(0.0, now, 1.0);
       this.dorsalGain.gain.setTargetAtTime(0.0, now, 1.0);
    } else if (stateId === 'wired') {
       this.ventralGain.gain.setTargetAtTime(0.2, now, 1.0);
       this.sympTremoloGain.gain.setTargetAtTime(0.8, now, 1.0);
       this.dorsalGain.gain.setTargetAtTime(0.0, now, 1.0);
    } else if (stateId === 'foggy') {
       this.ventralGain.gain.setTargetAtTime(0.2, now, 1.0);
       this.sympTremoloGain.gain.setTargetAtTime(0.0, now, 1.0);
       this.dorsalGain.gain.setTargetAtTime(0.8, now, 1.0);
    }

    if (document.documentElement) {
      document.documentElement.style.setProperty('--jitter-strength', `${config.jitter}px`);
      document.documentElement.style.setProperty('--jitter-active', config.jitter > 0 ? 'aw-jitter 0.15s infinite linear' : 'none');
    }
  },

  playUnlock() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(now); osc.stop(now + 1.4);
  },

  playTick() {
    if (!this.audioCtx || this.isMuted || !this.uiSoundsEnabled) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.06);
  },

  playSwipe() {
    if (!this.audioCtx || this.isMuted || !this.uiSoundsEnabled) return;
    this.resumeAudio();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.2);
  },

  triggerHaptic(type = 'light') {
    if (!this.hapticEnabled || !('vibrate' in navigator)) return;
    const patterns = {
      light: [15],
      medium: [30],
      heavy: [50],
      success: [15, 30, 20],
      error: [60, 40, 60]
    };
    try {
      navigator.vibrate(patterns[type] || patterns.light);
    } catch(e) {
      console.warn("Haptic failed", e);
    }
  },

  stopHaptics() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch(e) {}
    }
  },

  triggerResolutionChord() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    if (this.ventralGain) this.ventralGain.gain.setTargetAtTime(0, now, 0.5);
    if (this.sympTremoloGain) this.sympTremoloGain.gain.setTargetAtTime(0, now, 0.5);
    const chordGain = this.audioCtx.createGain(); chordGain.gain.value = 0;
    chordGain.connect(this.masterGain);
    [349.23, 523.25].forEach(freq => {
      const osc = this.audioCtx.createOscillator(); osc.frequency.value = freq;
      osc.connect(chordGain); osc.start(now); osc.stop(now + 4);
    });
    chordGain.gain.linearRampToValueAtTime(0.6, now + 0.5);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
  },

  setBreathingPhase(phase, durationMs = 2000) {
      if (!this.audioCtx || this.isMuted) return;
      const now = this.audioCtx.currentTime;
      const durationSec = durationMs / 1000;
      if (phase === 'inhale') {
          this.biquadFilter.frequency.exponentialRampToValueAtTime(3500, now + durationSec);
          this.breathGain.gain.linearRampToValueAtTime(0.12, now + durationSec);
      } else if (phase === 'exhale') {
          this.biquadFilter.frequency.exponentialRampToValueAtTime(300, now + durationSec);
          this.breathGain.gain.linearRampToValueAtTime(0.02, now + durationSec);
      } else {
          this.breathGain.gain.linearRampToValueAtTime(0.01, now + 0.5);
      }
  },

  mute(state) { this.isMuted = state; this.applyMasterGain(); },
  setVolume(val) { 
    this.appVolume = val; 
    this.applyMasterGain(); 
    if (window.Howler) {
      Howler.volume(val / 100);
    }
  },
  setDroneEnabled(state) { 
    this.droneEnabled = state; 
    if (this.droneGain) {
      const target = state ? 1 : 0;
      this.droneGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.5);
    }
  },
  applyMasterGain() {
    if (!this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const target = (this.isMuted) ? 0 : (this.appVolume / 100) * 0.4;
    this.masterGain.gain.setTargetAtTime(target, now, 0.2);
  },
  playNoise(type) {
    if (!this.audioCtx) this.initAudio();
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    // Fade out previous noise
    if (this.activeNoiseSource) {
      this.activeNoiseGain.gain.setTargetAtTime(0, now, 0.5);
      const oldSource = this.activeNoiseSource;
      setTimeout(() => { try { oldSource.stop(); } catch(e){} }, 1000);
    }

    if (type === 'none') {
      this.activeNoiseSource = null;
      return;
    }

    let buffer;
    if (type === 'pink') buffer = this.pinkNoiseBuffer;
    else if (type === 'brown') buffer = this.brownNoiseBuffer;
    else buffer = this.whiteNoiseBuffer;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.activeNoiseGain);
    source.start(now);
    this.activeNoiseSource = source;
    // Lower volume for focus noises to allow samples to shine
    this.activeNoiseGain.gain.setTargetAtTime(0.2, now, 1.0);
  },

  atmospheres: {},
  playAtmosphere(id, url, onload) {
    if (!this.audioCtx) this.initAudio();
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    // Layer 1: Procedural Foundation (The Focus Core)
    if (id === 'rain' || id === 'storm') this.playNoise('pink');
    else if (id === 'waves' || id === 'night') this.playNoise('brown');
    else if (!id) this.playNoise('none');

    // Layer 2: Organic Texture (Howler)
    // Stop existing Howls with a smooth fade
    Object.values(this.atmospheres).forEach(h => {
      h.fade(h.volume(), 0, 1000);
      setTimeout(() => h.stop(), 1100);
    });

    if (!url) return;

    if (!this.atmospheres[id]) {
      this.atmospheres[id] = new Howl({
        src: [url],
        loop: true,
        volume: 0,
        preload: true,
        html5: true, // Bypass CORS/Security issues for external samples
        format: ['ogg', 'mp3'],
        onload: () => {
          console.log("[Sensory] HQ Sample Loaded:", id);
          if (onload) onload();
        },
        onplayerror: (sid, error) => {
           console.warn("[Sensory] Howl play error:", error);
           if (onload) onload();
           // Attempt to unlock if it's an autoplay issue
           Howler.unload(); 
        }
      });
    } else {
      if (onload) onload();
    }

    const sound = this.atmospheres[id];
    sound.play();
    sound.fade(0, 0.7, 2500);
    
    // Also trigger procedural texture if we want extra richness
    this._startTextureSynthesis(id);
  },

  _startTextureSynthesis(id) {
    if (this.textureInterval) clearInterval(this.textureInterval);
    
    this.textureInterval = setInterval(() => {
      if (!this.isAtmosActive) {
        clearInterval(this.textureInterval);
        return;
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();
      
      if (id === 'rain' || id === 'storm') {
        // Rain drop simulation
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = this.whiteNoiseBuffer;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + Math.random() * 3000;
        filter.Q.value = 10;
        
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.textureGain);
        
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.1, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        noise.start(now);
        noise.stop(now + 0.2);
      } else if (id === 'waves') {
        // Wave ripple/foam simulation
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = this.whiteNoiseBuffer;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.textureGain);
        
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.02, now + 0.5);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        
        noise.start(now);
        noise.stop(now + 2.5);
      }
    }, id === 'waves' ? 4000 : (id === 'storm' ? 150 : 400));
  },

  playBinaural(type) {
    if (!this.audioCtx) this.initAudio();
    this.resumeAudio();
    const now = this.audioCtx.currentTime;

    // Stop previous binaural
    this.binauralGain.gain.setTargetAtTime(0, now, 0.5);
    if (this.binauralOscL) {
      try {
        this.binauralOscL.stop(now + 1);
        this.binauralOscR.stop(now + 1);
      } catch(e) {}
    }

    if (!type || type === 'none') return;

    let baseFreq = 200;
    let offset = 10; // Alpha default

    if (type === 'focus') { baseFreq = 160; offset = 20; } // Beta
    if (type === 'relax') { baseFreq = 200; offset = 10; } // Alpha
    if (type === 'sleep') { baseFreq = 100; offset = 2.5; } // Delta

    this.binauralOscL = this.audioCtx.createOscillator();
    this.binauralOscR = this.audioCtx.createOscillator();
    
    this.binauralOscL.frequency.value = baseFreq;
    this.binauralOscR.frequency.value = baseFreq + offset;

    const pannerL = this.audioCtx.createStereoPanner();
    const pannerR = this.audioCtx.createStereoPanner();
    pannerL.pan.value = -1;
    pannerR.pan.value = 1;

    this.binauralOscL.connect(pannerL);
    this.binauralOscR.connect(pannerR);
    pannerL.connect(this.binauralGain);
    pannerR.connect(this.binauralGain);

    this.binauralOscL.start();
    this.binauralOscR.start();
    this.binauralGain.gain.setTargetAtTime(0.12, now, 2.0);
  },

  stopAllSensory() {
    this.playNoise('none');
    this.playBinaural('none');
    Object.values(this.atmospheres).forEach(h => {
      h.fade(h.volume(), 0, 1000);
      setTimeout(() => h.stop(), 1100);
    });
    this.setDroneEnabled(false);
  }
};
