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
  appVolume: 50,

  initAudio() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      console.warn("AudioContext not supported.");
      return;
    }
    
    this.masterGain = this.audioCtx.createGain();
    const volScale = (this.appVolume / 100) * 0.6;
    this.masterGain.gain.value = (this.isMuted || !this.droneEnabled) ? 0 : volScale;
    this.resumeAudio();
    
    this.biquadFilter = this.audioCtx.createBiquadFilter();
    this.biquadFilter.type = 'lowpass';
    this.biquadFilter.frequency.value = 1000;
    this.biquadFilter.Q.value = 1.0;
    
    this.masterGain.connect(this.biquadFilter);
    this.biquadFilter.connect(this.audioCtx.destination);

    this._initDrones();
    this._initBreathNoise();
  },

  _initDrones() {
    this.ventralOsc = this.audioCtx.createOscillator();
    this.ventralOsc.type = 'sine';
    this.ventralOsc.frequency.value = 216;
    const vG = this.audioCtx.createGain(); vG.gain.value = 0;
    this.ventralOsc.connect(vG); vG.connect(this.masterGain);
    this.ventralGain = vG;

    this.sympOsc = this.audioCtx.createOscillator();
    this.sympOsc.type = 'sine';
    this.sympOsc.frequency.value = 216; this.sympOsc.detune.value = 15;
    this.sympTremoloGain = this.audioCtx.createGain(); this.sympTremoloGain.gain.value = 0;
    this.sympTremoloLFO = this.audioCtx.createOscillator(); this.sympTremoloLFO.type = 'sine';
    this.sympTremoloLFO.frequency.value = 5;
    const tD = this.audioCtx.createGain(); tD.gain.value = 0.5;
    this.sympTremoloLFO.connect(tD); tD.connect(this.sympTremoloGain.gain);
    this.sympOsc.connect(this.sympTremoloGain); this.sympTremoloGain.connect(this.masterGain);

    this.dorsalOsc = this.audioCtx.createOscillator();
    this.dorsalOsc.type = 'sine';
    this.dorsalOsc.frequency.value = 108;
    this.dorsalGain = this.audioCtx.createGain(); this.dorsalGain.gain.value = 0;
    this.dorsalLFO = this.audioCtx.createOscillator(); this.dorsalLFO.type = 'sine';
    this.dorsalLFO.frequency.value = 0.2;
    const dD = this.audioCtx.createGain(); dD.gain.value = 0.8;
    this.dorsalLFO.connect(dD); dD.connect(this.dorsalGain.gain);
    this.dorsalOsc.connect(this.dorsalGain); this.dorsalGain.connect(this.masterGain);

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
      this.audioCtx.resume().catch(() => {});
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
  setVolume(val) { this.appVolume = val; this.applyMasterGain(); },
  setDroneEnabled(state) { this.droneEnabled = state; this.applyMasterGain(); },
  applyMasterGain() {
    if (!this.audioCtx || !this.masterGain) return;
    const now = this.audioCtx.currentTime;
    const target = (this.isMuted || !this.droneEnabled) ? 0 : (this.appVolume / 100) * 0.2;
    this.masterGain.gain.setTargetAtTime(target, now, 0.2);
  },
  stopHaptics() {
    if (this.hapticInterval) clearInterval(this.hapticInterval);
    if ('vibrate' in navigator) { try { navigator.vibrate(0); } catch(e) {} }
  }
};
