export const MeditationAudio = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  setBreathingPhase(phase, durationMs = 2000) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const durationSec = durationMs / 1000;

      // Simplistic placeholder logic for now, similar to what was in app.js
      // Can be expanded as needed.
  },
  playBell(type = 'soft') {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    let baseFreq = type === 'start' ? 261.63 : 196.00; 

    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq + 1.5, now);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 4.1);
    osc2.stop(now + 4.1);
  }
};
