import { SENSORY_CONFIG } from './vagal-logic.js';

export const SensoryEngine = {
  audioCtx: null,
  masterGain: null,
  biquadFilter: null,
  
  // Oscillators for Drone
  ventralOsc: null,
  sympOsc: null,
  dorsalOsc: null,
  
  // Modulation nodes
  sympTremoloGain: null,
  sympTremoloLFO: null,
  dorsalGain: null,
  dorsalLFO: null,
  
  // Breath Sync Nodes
  breathNoise: null,
  breathGain: null,
  breathFilter: null,
  
  hapticInterval: null,
  currentPattern: null,
  isMuted: false,
  droneEnabled: true,
  appVolume: 50, // 0-100 scale

  initAudio() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      console.warn("AudioContext not supported.");
      return;
    }
    
    // Master Chain
    this.masterGain = this.audioCtx.createGain();
    const volScale = (this.appVolume / 100) * 0.6; // Increased from 0.2 to 0.6 for higher base volume
    this.masterGain.gain.value = (this.isMuted || !this.droneEnabled) ? 0 : volScale;
    
    // Safety: ensure context is resumed
    this.resumeAudio();
    
    // Biquad Filter for Breathing Sync
    this.biquadFilter = this.audioCtx.createBiquadFilter();
    this.biquadFilter.type = 'lowpass';
    this.biquadFilter.frequency.value = 1000; // Default natural state
    this.biquadFilter.Q.value = 1.0;
    
    this.masterGain.connect(this.biquadFilter);
    this.biquadFilter.connect(this.audioCtx.destination);

    // 1. Ventral (Pure 432Hz Sine)
    this.ventralOsc = this.audioCtx.createOscillator();
    this.ventralOsc.type = 'sine';
    this.ventralOsc.frequency.value = 216; // 432 / 2 for an ear-pleasing base
    
    const ventralGain = this.audioCtx.createGain();
    ventralGain.gain.value = 0; // Starts silent
    this.ventralOsc.connect(ventralGain);
    ventralGain.connect(this.masterGain);
    this.ventralGain = ventralGain;

    // 2. Sympathetic (Tremolo + 15 cents detune)
    this.sympOsc = this.audioCtx.createOscillator();
    this.sympOsc.type = 'sine';
    this.sympOsc.frequency.value = 216;
    this.sympOsc.detune.value = 15; // 15 cents discord
    
    this.sympTremoloGain = this.audioCtx.createGain();
    this.sympTremoloGain.gain.value = 0; // Starts silent
    
    // Tremolo LFO (fast pulsing)
    this.sympTremoloLFO = this.audioCtx.createOscillator();
    this.sympTremoloLFO.type = 'sine';
    this.sympTremoloLFO.frequency.value = 5; // 5Hz jitter
    const tremoloDepth = this.audioCtx.createGain();
    tremoloDepth.gain.value = 0.5; // Tremolo depth
    this.sympTremoloLFO.connect(tremoloDepth);
    tremoloDepth.connect(this.sympTremoloGain.gain);
    
    this.sympOsc.connect(this.sympTremoloGain);
    this.sympTremoloGain.connect(this.masterGain);

    // 3. Dorsal (Heavy Sub-bass + Slow LFO)
    this.dorsalOsc = this.audioCtx.createOscillator();
    this.dorsalOsc.type = 'sine';
    this.dorsalOsc.frequency.value = 108; // Deep octave
    
    this.dorsalGain = this.audioCtx.createGain();
    this.dorsalGain.gain.value = 0; // Starts silent

    // Slow LFO for dorsal swamp feeling
    this.dorsalLFO = this.audioCtx.createOscillator();
    this.dorsalLFO.type = 'sine';
    this.dorsalLFO.frequency.value = 0.2; // 0.2Hz very slow
    const dorsalDepth = this.audioCtx.createGain();
    dorsalDepth.gain.value = 0.8;
    this.dorsalLFO.connect(dorsalDepth);
    dorsalDepth.connect(this.dorsalGain.gain);

    this.dorsalOsc.connect(this.dorsalGain);
    this.dorsalGain.connect(this.masterGain);

    // Start all nodes
    this.ventralOsc.start();
    this.sympOsc.start();
    this.sympTremoloLFO.start();
    this.dorsalOsc.start();
    this.dorsalLFO.start();

    // 4. Breath Noise Layer (Wind/Breath Effect)
    this.breathGain = this.audioCtx.createGain();
    this.breathGain.gain.value = 0;
    
    this.breathFilter = this.audioCtx.createBiquadFilter();
    this.breathFilter.type = 'lowpass';
    this.breathFilter.frequency.value = 1000;
    
    // Create soft noise buffer
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    this.breathNoise = this.audioCtx.createBufferSource();
    this.breathNoise.buffer = noiseBuffer;
    this.breathNoise.loop = true;
    
    this.breathNoise.connect(this.breathFilter);
    this.breathFilter.connect(this.breathGain);
    this.breathGain.connect(this.masterGain);
    
    this.breathNoise.start();
  },

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  },

  update(stateId) {
    if (this.isMuted) return;
    const config = SENSORY_CONFIG[stateId.toUpperCase()] || SENSORY_CONFIG.OKAY;
    this.resumeAudio();

    if (this.audioCtx) {
      const now = this.audioCtx.currentTime;
      // Crossfade between states based on dominance
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
    }

    // Proximity Haptics (Active only if wired/foggy)
    if (this.hapticInterval) clearInterval(this.hapticInterval);
    this.currentPattern = config.haptic;
    if (this.currentPattern && 'vibrate' in navigator && (stateId === 'wired' || stateId === 'foggy')) {
      const fullCycle = this.currentPattern.reduce((a, b) => a + b, 0);
      this.hapticInterval = setInterval(() => {
        try { navigator.vibrate([...this.currentPattern]); } catch(e) {}
      }, fullCycle + 100);
    } else {
        this.stopHaptics();
    }

    // Jitter UI
    if (document.documentElement) {
      document.documentElement.style.setProperty('--jitter-strength', `${config.jitter}px`);
      document.documentElement.style.setProperty('--jitter-active', config.jitter > 0 ? 'aw-jitter 0.15s infinite linear' : 'none');
    }
  },

  setBreathingPhase(phase, durationMs = 2000) {
      if (!this.audioCtx || this.isMuted) return;
      const now = this.audioCtx.currentTime;
      const durationSec = durationMs / 1000;

      if (phase === 'inhale') {
          // Increase Filter Cutoff & Volume for "Inhale" (Swell)
          this.biquadFilter.frequency.exponentialRampToValueAtTime(3500, now + durationSec);
          this.breathFilter.type = 'bandpass'; // Bandpass for more focused "air" sound
          this.breathFilter.frequency.exponentialRampToValueAtTime(2800, now + durationSec);
          this.breathGain.gain.linearRampToValueAtTime(0.12, now + durationSec);
          
          // Subtle Ventral Drone Swell
          if (this.ventralGain) this.ventralGain.gain.linearRampToValueAtTime(1.0, now + durationSec);
      } else if (phase === 'exhale') {
          // Decrease Filter Cutoff & Volume for "Exhale" (Release)
          this.biquadFilter.frequency.exponentialRampToValueAtTime(300, now + durationSec);
          this.breathFilter.type = 'lowpass';
          this.breathFilter.frequency.exponentialRampToValueAtTime(800, now + durationSec);
          this.breathGain.gain.linearRampToValueAtTime(0.02, now + durationSec);
          
          // Subtle Ventral Drone Dip
          if (this.ventralGain) this.ventralGain.gain.linearRampToValueAtTime(0.4, now + durationSec);
      } else {
          // Hold / Empty (Neutral Static)
          this.breathGain.gain.linearRampToValueAtTime(0.01, now + 0.5);
          if (this.ventralGain) this.ventralGain.gain.linearRampToValueAtTime(0.6, now + 0.5);
      }
  },

  triggerResolutionChord() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    
    // Silence existing drones
    if (this.ventralGain) this.ventralGain.gain.setTargetAtTime(0, now, 0.5);
    if (this.sympTremoloGain) this.sympTremoloGain.gain.setTargetAtTime(0, now, 0.5);
    if (this.dorsalGain) this.dorsalGain.gain.setTargetAtTime(0, now, 0.5);

    // Play Perfect Fifth Resolution Chord (F + C)
    const chordGain = this.audioCtx.createGain();
    chordGain.gain.value = 0;
    chordGain.connect(this.masterGain);

    const fOsc = this.audioCtx.createOscillator();
    fOsc.type = 'sine';
    fOsc.frequency.value = 349.23; // F4
    
    const cOsc = this.audioCtx.createOscillator();
    cOsc.type = 'sine';
    cOsc.frequency.value = 523.25; // C5

    fOsc.connect(chordGain);
    cOsc.connect(chordGain);

    fOsc.start(now);
    cOsc.start(now);

    // Envelope
    chordGain.gain.setValueAtTime(0, now);
    chordGain.gain.linearRampToValueAtTime(0.6, now + 0.5); // Quick rise
    chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0); // 3-second gentle fade

    setTimeout(() => {
        fOsc.stop();
        cOsc.stop();
        chordGain.disconnect();
    }, 4000);
  },

  playUnlock() {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // Quick upward sweep
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2); // Gentle crystal fade
    
    osc.connect(gain);
    gain.connect(this.masterGain || this.audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 1.4);
  },

  stopHaptics() {
    if (this.hapticInterval) clearInterval(this.hapticInterval);
    if ('vibrate' in navigator) { try { navigator.vibrate(0); } catch(e) {} }
  },
  
  stopProtocol() {
    // Reset any active breathing/meditation audio parameters if needed
    // For now, ensure haptics stop as they are the primary background protocol
    this.stopHaptics();
    if (this.audioCtx) {
      const now = this.audioCtx.currentTime;
      // Reset breath gains to silence
      if (this.breathGain) this.breathGain.gain.setTargetAtTime(0, now, 0.1);
    }
  },

  mute(state) {
    this.isMuted = state;
    this.applyMasterGain();
  },

  setVolume(val) {
    this.appVolume = val;
    this.applyMasterGain();
  },

  setDroneEnabled(state) {
    this.droneEnabled = state;
    this.applyMasterGain();
  },

  applyMasterGain() {
    if (!this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const target = (this.isMuted || !this.droneEnabled) ? 0 : (this.appVolume / 100) * 0.2;
    this.masterGain.gain.setTargetAtTime(target, now, 0.2);
  }
}
