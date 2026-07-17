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
  activeBreathSource: null,
  activeBreathGain: null,
  hapticInterval: null,
  currentPattern: null,
  isMuted: false,
  droneEnabled: false,
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
    this.droneGain.gain.value = this.droneEnabled ? 0.08 : 0;
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
    // Continuous breath background sound disabled per user preference
    this.breathGain = null;
    this.breathFilter = null;
    this.breathOscs = [];
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
    } else if (stateId === 'savoring') {
       // Warm, slow-evolving ventral pad for deep savoring integration
       this.ventralGain.gain.setTargetAtTime(1.1, now, 1.5);
       this.sympTremoloGain.gain.setTargetAtTime(0.0, now, 1.5);
       this.dorsalGain.gain.setTargetAtTime(0.0, now, 1.5);
    }

    if (document.documentElement) {
      document.documentElement.style.setProperty('--jitter-strength', `${config.jitter}px`);
      document.documentElement.style.setProperty('--jitter-active', config.jitter > 0 ? 'aw-jitter 0.15s infinite linear' : 'none');
    }
  },

  playUnlock() {
    if (!this.audioCtx || this.isMuted) return;
    this.resumeAudio();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const dur = 4.0; // Rich, warm, lingering decay

    // Master gain for the chord swell
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.09, now + 0.25); // Warm, quick but smooth swell
    g.gain.setValueAtTime(0.09, now + 0.5); // Hold briefly
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    g.connect(this.masterGain);

    // Warm, lush G Major 9 chord (grounding root + rich harmonics)
    const freqs = [98.0, 146.83, 196.0, 246.94, 369.99, 440.0];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      // Detune each voice slightly to create a beautiful, rich analog chorus effect
      osc.detune.setValueAtTime((i * 4) - 10 + (Math.random() * 2), now);

      // Higher frequencies fade slightly quicker
      const voiceGain = ctx.createGain();
      const level = 1.0 / (1 + i * 0.4);
      voiceGain.gain.setValueAtTime(level, now);
      
      osc.connect(voiceGain);
      voiceGain.connect(g);
      
      osc.start(now);
      osc.stop(now + dur + 0.1);
    });
    
    // Add a very subtle, sparkling high shimmer to crown the transition
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.015, now + 0.4);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    shimmerGain.connect(this.masterGain);

    const shimmerFreqs = [587.33, 783.99, 1174.66]; // D5, G5, D6 - Sparkling pentatonic extensions
    shimmerFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
      
      osc.connect(shimmerGain);
      osc.start(now + 0.1);
      osc.stop(now + 2.6);
    });
  },

  playTick() {
    if (!this.audioCtx) this.initAudio();
    if (!this.audioCtx || this.isMuted || !this.uiSoundsEnabled) return;
    this.resumeAudio();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // ── Kristal darbe fiziği ──
    // Gerçek cam/kristal nesnelerin inharmonik partial dizisi:
    // f, 2.76f, 5.4f, 8.93f — tam tam oktav değil, biraz kaymış

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.065, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(this.masterGain);

    // Darbe transient'i — çok kısa gürültü patlaması
    const impSize = Math.ceil(0.012 * ctx.sampleRate);
    const impBuf = ctx.createBuffer(1, impSize, ctx.sampleRate);
    const impData = impBuf.getChannelData(0);
    for (let i = 0; i < impSize; i++) {
      impData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (impSize * 0.3));
    }
    const imp = ctx.createBufferSource();
    imp.buffer = impBuf;
    const impF = ctx.createBiquadFilter();
    impF.type = 'highpass';
    impF.frequency.value = 3000;
    const impG = ctx.createGain();
    impG.gain.setValueAtTime(0.9, now);
    impG.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
    imp.connect(impF); impF.connect(impG); impG.connect(master);
    imp.start(now); imp.stop(now + 0.015);

    // İnharmonik partial'lar — her biri farklı hızda söner (gerçek cam fiziği)
    const base = 1100;
    const partials = [
      { ratio: 1.0,   decayT: 0.50, vol: 1.0    },  // fundamental
      { ratio: 2.756, decayT: 0.28, vol: 0.55   },  // 2. partial (inharmonik)
      { ratio: 5.404, decayT: 0.14, vol: 0.28   },  // 3. partial
      { ratio: 8.933, decayT: 0.07, vol: 0.12   },  // 4. partial (çok kısa)
    ];

    partials.forEach(p => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * p.ratio;
      // Hafif detune — fiziksel belirsizlik
      osc.detune.value = (Math.random() - 0.5) * 8;

      const g = ctx.createGain();
      g.gain.setValueAtTime(p.vol * 0.9, now + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.decayT);

      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + p.decayT + 0.02);
    });
  },

  playSwipe() {
    if (!this.audioCtx) this.initAudio();
    if (!this.audioCtx || this.isMuted || !this.uiSoundsEnabled) return;
    this.resumeAudio();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // ── Shakuhachi / bambu nefes fiziği ──
    // Shakuhachi = Japon bambu flütü: hollow pipe + nefes gürültüsü + embouchure vibrato

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.055, now + 0.06);  // nefes dolumu
    master.gain.setValueAtTime(0.055, now + 0.22);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(this.masterGain);

    // Hollow pipe resonance — fundamental + 3. harmonik (flüt karakteristiği)
    const fundamental = 370; // F#4 — mistik, biraz tuhaf
    [1, 3].forEach((harmonic, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = fundamental * harmonic;

      // Embouchure vibrato — nefes basıncı kaymasını simüle eder
      const vibLFO = ctx.createOscillator();
      vibLFO.type = 'sine';
      vibLFO.frequency.value = 5.2; // ~5Hz insan nefes vibratosu
      const vibDepth = ctx.createGain();
      vibDepth.gain.value = 6 + (i * 3); // üst harmoniklerde daha derin vibrato
      vibLFO.connect(vibDepth);
      vibDepth.connect(osc.detune);

      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1.0 : 0.35;

      osc.connect(g); g.connect(master);
      vibLFO.start(now + 0.05); // vibrato biraz geç başlar
      osc.start(now);
      osc.stop(now + 0.6);
      vibLFO.stop(now + 0.6);
    });

    // Nefes türbülansı — flütün "hava" katmanı
    const breathSize = Math.ceil(0.55 * ctx.sampleRate);
    const breathBuf = ctx.createBuffer(1, breathSize, ctx.sampleRate);
    const breathData = breathBuf.getChannelData(0);
    for (let i = 0; i < breathSize; i++) breathData[i] = Math.random() * 2 - 1;
    const breath = ctx.createBufferSource();
    breath.buffer = breathBuf;

    // Bandpass filter — flüt embouchure hole rezonansı
    const breathF = ctx.createBiquadFilter();
    breathF.type = 'bandpass';
    breathF.frequency.setValueAtTime(fundamental * 2, now);
    breathF.frequency.exponentialRampToValueAtTime(fundamental * 0.8, now + 0.5);
    breathF.Q.value = 2.5;

    const breathG = ctx.createGain();
    breathG.gain.setValueAtTime(0, now);
    breathG.gain.linearRampToValueAtTime(0.022, now + 0.08);
    breathG.gain.linearRampToValueAtTime(0.012, now + 0.35);
    breathG.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    breath.connect(breathF); breathF.connect(breathG); breathG.connect(master);
    breath.start(now); breath.stop(now + 0.58);
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

  playBreathCue(type, durationMs = 2000) {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    
    // Stop any existing active breath sources and oscillators immediately to prevent overlaps and pops
    if (this.activeBreathSource) {
      const oldSource = this.activeBreathSource;
      const oldGain = this.activeBreathGain;
      if (oldGain) {
        try {
          oldGain.gain.cancelScheduledValues(now);
          oldGain.gain.setValueAtTime(oldGain.gain.value, now);
          oldGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15); // smooth fadeout
        } catch(e) {}
      }
      setTimeout(() => {
        try { oldSource.stop(); } catch(e) {}
      }, 200);
    }

    if (this.activeBreathPadGain) {
      const oldPadGain = this.activeBreathPadGain;
      try {
        oldPadGain.gain.cancelScheduledValues(now);
        oldPadGain.gain.setValueAtTime(oldPadGain.gain.value, now);
        oldPadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15); // smooth fadeout
      } catch(e) {}
    }

    if (this.activeBreathOscs) {
      this.activeBreathOscs.forEach(osc => {
        try {
          osc.frequency.cancelScheduledValues(now);
          osc.stop(now + 0.15);
        } catch(e) {}
      });
    }
    this.activeBreathOscs = [];

    if (type !== 'inhale' && type !== 'exhale') {
      this.activeBreathSource = null;
      this.activeBreathGain = null;
      this.activeBreathPadGain = null;
      return;
    }

    const durationSec = durationMs / 1000;
    
    // ── Layer 1: Ambient Brown Noise (Ocean wave simulation) ──
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.brownNoiseBuffer || this.whiteNoiseBuffer;
    noise.loop = true;
    
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8; // Very soft, warm filter
    
    const noiseGain = this.audioCtx.createGain();
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    this.activeBreathSource = noise;
    this.activeBreathGain = noiseGain;

    // ── Layer 2: Soothing Sine Wave Pad Swell ──
    const padGain = this.audioCtx.createGain();
    padGain.connect(this.masterGain);
    this.activeBreathPadGain = padGain;

    const baseFreq = 220; // A3 - Deep, grounding musical center
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.detune.setValueAtTime(-6, now);
    osc2.detune.setValueAtTime(6, now);
    
    osc1.connect(padGain);
    osc2.connect(padGain);
    
    this.activeBreathOscs.push(osc1, osc2);

    if (type === 'inhale') {
      // Inhale: Filter opens up, volume swells, pitch shifts up slightly (feeling of expansion)
      filter.frequency.setValueAtTime(140, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + durationSec);
      
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.04, now + durationSec * 0.7);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.linearRampToValueAtTime(baseFreq + 10, now + durationSec);
      osc2.frequency.setValueAtTime(baseFreq, now);
      osc2.frequency.linearRampToValueAtTime(baseFreq + 10, now + durationSec);

      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.02, now + durationSec * 0.8);
      padGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    } else if (type === 'exhale') {
      // Exhale: Filter closes down, volume decays, pitch shifts down (feeling of release)
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + durationSec);
      
      noiseGain.gain.setValueAtTime(0.04, now);
      noiseGain.gain.setValueAtTime(0.04, now + 0.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc1.frequency.setValueAtTime(baseFreq + 10, now);
      osc1.frequency.linearRampToValueAtTime(baseFreq - 10, now + durationSec);
      osc2.frequency.setValueAtTime(baseFreq + 10, now);
      osc2.frequency.linearRampToValueAtTime(baseFreq - 10, now + durationSec);

      padGain.gain.setValueAtTime(0.02, now);
      padGain.gain.setValueAtTime(0.02, now + 0.1);
      padGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    }
    
    noise.start(now);
    noise.stop(now + durationSec + 0.05);
    osc1.start(now);
    osc1.stop(now + durationSec + 0.05);
    osc2.start(now);
    osc2.stop(now + durationSec + 0.05);
  },

  setBreathingPhase(phase, durationMs = 2000) {
      if (!this.audioCtx || this.isMuted) return;

      if (phase === 'inhale') {
          this.playBreathCue('inhale', durationMs);
      } else if (phase === 'exhale') {
          this.playBreathCue('exhale', durationMs);
      } else {
          this.playBreathCue(phase, durationMs);
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
      const target = state ? 0.08 : 0;
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

    let baseFreq = 400;
    let offset = 10; // Alpha default

    if (type === 'focus') { baseFreq = 380; offset = 20; } // Beta
    if (type === 'relax') { baseFreq = 400; offset = 10; } // Alpha
    if (type === 'sleep') { baseFreq = 390; offset = 2.5; } // Delta
    if (type === 'savoring') { baseFreq = 432; offset = 8; } // 8Hz Theta/Alpha bridge, 432Hz tuning

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

  /** 'i' info butonlarına özel cam kaydırma (glass sliding) fiziksel modeli */
  playGlassSlide() {
    if (!this.audioCtx) this.initAudio();
    if (!this.audioCtx || this.isMuted || !this.uiSoundsEnabled) return;
    this.resumeAudio();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const dur = 0.45; // 450ms slide

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.04, now + 0.05); // Smooth slide fade-in
    master.gain.setValueAtTime(0.04, now + 0.2);
    master.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    master.connect(this.masterGain);

    // 1. Friction Noise (Camın yüzeye sürtünmesi)
    const bufSize = Math.ceil(dur * ctx.sampleRate);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Envelope for white noise to simulate uneven friction surface
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (0.8 + Math.random() * 0.2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    // Slide movement: speed increases slightly then slows down
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(900, now + dur - 0.05);
    filter.Q.value = 3.5; // High Q to make it sound thin/cam-like

    noise.connect(filter);
    filter.connect(master);
    noise.start(now);
    noise.stop(now + dur);

    // 2. Glass Resonance Ring (Sürtünmeyle uyarılan cam rezonansı)
    // Non-integer high frequency partials representing glass vibration
    const baseFreq = 880;
    const partials = [1.0, 2.76, 5.4];
    partials.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      // Pitch shifts slightly with speed
      osc.frequency.exponentialRampToValueAtTime(baseFreq * ratio * 1.1, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * ratio * 0.9, now + dur);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.015 / (i + 1), now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur - (i * 0.05));

      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + dur);
    });
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
