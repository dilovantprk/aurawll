// js/services/checkin-audio.js
// Check-in flow prosedürel ses motoru — polyvagal-aware sonic design
// Her check-in adımına özel, Web Audio API ile üretilen sesler.
// SensoryEngine.audioCtx'i paylaşır, ayrı AudioContext açmaz.

import { SensoryEngine } from './sensory.js';

export const CheckinAudio = {

  /** @returns {AudioContext|null} */
  get _ctx() { return SensoryEngine.audioCtx; },
  get _master() { return SensoryEngine.masterGain; },
  get _ok() { return !SensoryEngine.isMuted && SensoryEngine.uiSoundsEnabled; },

  /** AudioContext hazır mı kontrol et, yoksa başlat */
  _init() {
    if (!this._ctx) SensoryEngine.initAudio();
    SensoryEngine.resumeAudio();
    return !!this._ctx && this._ok;
  },


  // ═══════════════════════════════════════════════════════
  //  PRIMITIVE HELPERS
  // ═══════════════════════════════════════════════════════

  /**
   * Tek osilatör chime/tone
   * @param {number} freq      - Başlangıç frekansı (Hz)
   * @param {number} dur       - Süre (saniye)
   * @param {string} type      - Dalga tipi: sine, triangle, square, sawtooth
   * @param {number} vol       - Peak gain (0-1)
   * @param {object} opts      - { freqEnd, detune, attack, delay }
   */
  _chime(freq, dur, type = 'sine', vol = 0.08, opts = {}) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const t0 = ctx.currentTime + (opts.delay || 0);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + dur);
    }
    if (opts.detune) osc.detune.value = opts.detune;

    const atk = opts.attack || 0.01;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(this._master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  /**
   * Çoklu osilatör pad/chord
   * @param {number[]} freqs   - Frekans dizisi
   * @param {number}   dur     - Toplam süre (saniye)
   * @param {number}   vol     - Peak gain
   * @param {object}   opts    - { attack, type }
   */
  _pad(freqs, dur, vol = 0.06, opts = {}) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const g = ctx.createGain();
    g.connect(this._master);

    const atk = opts.attack || 0.8;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + Math.min(atk, dur * 0.4));
    // Sustain bölgesi, sonra decay
    if (dur > atk + 0.5) {
      g.gain.setValueAtTime(vol, now + dur - 1.0);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = opts.type || 'sine';
      osc.frequency.value = f;
      // Her osilatöre hafif detune → warmth
      if (i > 0) osc.detune.value = i * 3;
      osc.connect(g);
      osc.start(now);
      osc.stop(now + dur + 0.1);
    });
  },


  // ═══════════════════════════════════════════════════════
  //  STEP 0 — MORNING CHECK-IN  (gün doğumu, uyanış)
  // ═══════════════════════════════════════════════════════

  /** Sabah check-in ekranı açılışı — sıcak pad swell */
  playMorningOpen() {
    this._pad([220, 277, 330], 3.0, 0.05, { attack: 1.5 });
  },

  /** Dream / Body buton seçimi — Organik kalimba tınısı */
  playMorningSelect(type) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    
    // Kalimba physical structure (fundamental + odd harmonic detune)
    const baseFreq = type === 'dream' ? 660 : 440;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 5.4, now); // Kalimba metal tırnak rezonansı
    
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    
    const hG = ctx.createGain();
    hG.gain.setValueAtTime(0.015, now);
    hG.gain.exponentialRampToValueAtTime(0.0001, now + 0.06); // Metalik çınlama hızlı söner
    
    osc1.connect(g);
    osc2.connect(hG);
    hG.connect(g);
    g.connect(this._master);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  },

  /** Morning → Somatic geçiş (Next) — Esen yumuşak rüzgar filtresi */
  playMorningNext() {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const bufSize = Math.ceil(0.35 * ctx.sampleRate);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.3);
    filter.Q.value = 1.2;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this._master);
    noise.start(now);
    noise.stop(now + 0.4);
  },


  // ═══════════════════════════════════════════════════════
  //  STEP 1 — SOMATIC ENTRY  (bedene dönüş, farkındalık)
  // ═══════════════════════════════════════════════════════

  /** Somatic ekranı açılışı — derin body awareness */
  playSomaticOpen() {
    this._pad([108, 162], 2.0, 0.03, { attack: 1.0 });
  },

  /**
   * Rhizome chip seçimi — polyvagal state'e göre farklı akustik tınılar
   * @param {'ventral'|'sympathetic'|'dorsal'} state
   */
  playChipSelect(state) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    if (state === 'ventral') {
      // Ventral: Zen Rüzgar Çanı (Koshibell)
      // Solfeggio 528Hz + inharmonik kristal kısmi sesler
      const freqs = [528, 792, 1056, 1584];
      const g = ctx.createGain();
      g.connect(this._master);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.05, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.value = (Math.random() - 0.5) * 6;

        const branchGain = ctx.createGain();
        branchGain.gain.setValueAtTime(1.0 / (i + 1), now);
        branchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8 - (i * 0.15));

        osc.connect(branchGain);
        branchGain.connect(g);
        osc.start(now);
        osc.stop(now + 0.9);
      });

    } else if (state === 'sympathetic') {
      // Sympathetic: Ahşap Tapınak Bloku (Resonant Woodblock / Mokugyo)
      // Elektronik triangle cızlaması yerine organik ahşap vuruşu
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      // Çok hızlı pitch kayması ahşap vuruş karakterini oluşturur
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.04);

      // Gövde rezonansı için noise burst
      const bufSize = Math.ceil(0.03 * ctx.sampleRate);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 4.0;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.05, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      const nG = ctx.createGain();
      nG.gain.setValueAtTime(0.015, now);
      nG.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(g);
      noise.connect(filter);
      filter.connect(nG);
      nG.connect(g);
      g.connect(this._master);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.08);
      noise.stop(now + 0.08);

    } else {
      // Dorsal: Udu / Toprak Kil Davul vuruşu
      // Derin, karanlık, oyuk akustik bas rezonansı
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.18);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.08, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this._master);

      osc.start(now);
      osc.stop(now + 0.5);
    }
  },

  /** Chip kaldırma — Küçük ahşap sürtünme sesi */
  playChipDeselect() {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.1);
  },

  /** 3 chip doldu — doygunluk cluster chord'u */
  playChipSaturation() {
    this._pad([300, 375, 450], 0.4, 0.05, { attack: 0.05 });
  },

  /** Savoring adımında sensation seçimi — yükselen pentatonik kalimba/mallet tınısı */
  playSensationSelect(count) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 Pentatonic
    const freq = scale[Math.min(count - 1, scale.length - 1)] || 523.25;

    // Softer Kalimba-mallet blend
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Tırnak çınlaması
    const oscHarmonic = ctx.createOscillator();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 3.14, now); // inharmonic mallet frequency

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    const hG = ctx.createGain();
    hG.gain.setValueAtTime(0.015, now);
    hG.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(g);
    oscHarmonic.connect(hG);
    hG.connect(g);
    g.connect(this._master);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + 0.4);
    oscHarmonic.stop(now + 0.4);
  },

  /** Sensation kartlarının ekranda beliriş/yükleniş arpeji — staggered pentatonik kaskad */
  playSensationCascade() {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 pentatonic
    scale.forEach((freq, i) => {
      const delay = i * 0.1; // 100ms stagger delay, matching CSS animation delay
      const t0 = now + delay;

      // Mallet/bell synthesis
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);

      // High metallic shimmer harmonic
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 3.14, t0);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.025, t0 + 0.008); // Softer volume than user clicks
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);

      const hG = ctx.createGain();
      hG.gain.setValueAtTime(0.006, t0);
      hG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

      osc.connect(g);
      osc2.connect(hG);
      hG.connect(g);
      g.connect(this._master);

      osc.start(t0);
      osc2.start(t0);
      osc.stop(t0 + 0.45);
      osc2.stop(t0 + 0.45);
    });
  },


  // ═══════════════════════════════════════════════════════
  //  STEP 2 — AFFECT GRID  (duygusal harita, keşif)
  // ═══════════════════════════════════════════════════════

  /** Affect Grid ekranı açılışı — hafif binaural-ish pad */
  playGridOpen() {
    // 220Hz + 225Hz = 5Hz beat → alpha bandı
    this._pad([220, 225], 2.5, 0.03, { attack: 1.2 });
  },

  /**
   * Grid'e dokunma — arousal/valence'a göre sürekli parametrik ses
   * @param {number} arousal  - 0 (düşük) → 1 (yüksek)
   * @param {number} valence  - 0 (negatif) → 1 (pozitif)
   */
  playGridTouch(arousal, valence) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Pitch mapping: 165Hz (düşük arousal) → 660Hz (yüksek arousal)
    const pitch = 165 + (arousal * 495);

    // Brightness mapping: valence → lowpass filter frekansı
    const filterFreq = 300 + (valence * 2700); // 300Hz (karanlık) → 3000Hz (parlak)

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = pitch;

    // İkinci osilatör: pozitif valence → major harmonik, negatif → minor
    osc2.type = 'triangle';
    osc2.frequency.value = pitch * (valence > 0.5 ? 2.0 : 1.5);
    osc2.detune.value = valence > 0.5 ? 0 : -10;

    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.5;

    // Volume: yüksek arousal → biraz daha yüksek
    const vol = 0.04 + (arousal * 0.06);

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(this._master);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  },


  // ═══════════════════════════════════════════════════════
  //  STEP 3 — EMOTION REFINEMENT  (isimlendirme, netleşme)
  // ═══════════════════════════════════════════════════════

  /**
   * Emotion ekranı açılışı — state'e uygun ambient bed
   * @param {'ventral'|'sympathetic'|'dorsal'} state
   */
  playEmotionOpen(state) {
    const beds = {
      ventral:     [330, 415, 495],    // sıcak major
      sympathetic: [440, 523, 660],    // parlak, hafif gergin
      dorsal:      [165, 220, 247]     // derin, ağır
    };
    const atk = state === 'dorsal' ? 1.5 : 0.8;
    this._pad(beds[state] || beds.ventral, 2.0, 0.03, { attack: atk });
  },

  /**
   * Emotion chip seçimi — state-renkli isimlendirme sesi (kalimba, bambu tık, taş kase)
   * @param {'ventral'|'sympathetic'|'dorsal'} state
   * @param {number} count - Kaç emotion seçili (3 olunca recognition chord)
   */
  playEmotionSelect(state, count) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    if (state === 'ventral') {
      // Ventral: Kalimba Arpeji (A Major Triad cascade)
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, i) => {
        const t0 = now + i * 0.06;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.045, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        
        osc.connect(g);
        g.connect(this._master);
        osc.start(t0);
        osc.stop(t0 + 0.35);
      });
    } else if (state === 'sympathetic') {
      // Sympathetic: Bambu Stick Çift Tık (Bamboo rattle click)
      [0, 0.08].forEach((delay) => {
        const t0 = now + delay;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t0);
        osc.frequency.exponentialRampToValueAtTime(600, t0 + 0.02);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.04, t0 + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);

        osc.connect(g);
        g.connect(this._master);
        osc.start(t0);
        osc.stop(t0 + 0.04);
      });
    } else {
      // Dorsal: Küçük Resonant Taş Kase (Resonant Stone Bowl Chime)
      const baseFreq = 220;
      // İnharmonik rezonans partials
      const partials = [1.0, 2.76, 5.4];
      partials.forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * ratio, now);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.04 / (i + 1), now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 - (i * 0.1));

        osc.connect(g);
        g.connect(this._master);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    }

    // 3 emotion seçildi → Yumuşak recognition pad
    if (count >= 3) {
      const chords = {
        ventral:     [349, 440, 523],  // F major
        sympathetic: [440, 523, 660],  // A minor-ish
        dorsal:      [220, 261, 330]   // Deep minor
      };
      const c = chords[state] || chords.ventral;
      setTimeout(() => this._pad(c, 0.6, 0.04, { attack: 0.08 }), 250);
    }
  },


  // ═══════════════════════════════════════════════════════
  //  STEP 4 — BREATHING EXERCISE  (düzenleme)
  // ═══════════════════════════════════════════════════════

  /**
   * Nefes fazı geçiş chime'ı — Metal rüzgar çanı tınısı (akustik kısmi sesler ile)
   * @param {'inhale'|'exhale'|'hold'} phase
   */
  playExercisePhaseChime(phase) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const baseFreq = phase === 'inhale' ? 293.66 : (phase === 'exhale' ? 220.00 : 246.94); // D4, A3, B3 (Lower octave)
    const partials = [1.0, 1.5, 2.0]; // Warm harmonics (fundamental, fifth, octave)
    const masterG = ctx.createGain();
    
    masterG.gain.setValueAtTime(0, now);
    masterG.gain.linearRampToValueAtTime(0.025, now + 0.01); // Softer volume
    masterG.gain.exponentialRampToValueAtTime(0.0001, now + 0.6); // Slightly longer, gentler decay
    masterG.connect(this._master);

    partials.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.8 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6 - (i * 0.15));
      
      osc.connect(g);
      g.connect(masterG);
      
      osc.start(now);
      osc.stop(now + 0.65);
    });
  },


  /** Tamamlanma — zen completion deneyimi (singing bowl + Om drone + ambient pad) */
  playCompletion() {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // ── Layer 1: Singing Bowl Strike ──
    // Metalik harmoniklerle gerçekçi bowl rezonansı
    const bowlFreqs = [261.6, 523.2, 784.8, 1046.5]; // C4 + harmonikleri
    const bowlGain = ctx.createGain();
    const bowlFilter = ctx.createBiquadFilter();
    bowlFilter.type = 'bandpass';
    bowlFilter.frequency.value = 800;
    bowlFilter.Q.value = 0.8;

    bowlGain.connect(bowlFilter);
    bowlFilter.connect(this._master);

    // Strike attack + uzun metalik decay
    bowlGain.gain.setValueAtTime(0, now);
    bowlGain.gain.linearRampToValueAtTime(0.12, now + 0.008); // Çok hızlı strike
    bowlGain.gain.exponentialRampToValueAtTime(0.04, now + 0.3); // İlk decay
    bowlGain.gain.exponentialRampToValueAtTime(0.02, now + 2.0); // Sustain
    bowlGain.gain.exponentialRampToValueAtTime(0.0001, now + 6.0); // Uzun fade

    bowlFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Harmonikler hafif detune — metalik shimmer
      osc.detune.value = (i * 2.5) + (Math.random() * 3 - 1.5);
      
      const hGain = ctx.createGain();
      // Yüksek harmonikler daha düşük seviyede + daha hızlı decay
      const level = 1.0 / (1 + i * 0.6);
      hGain.gain.setValueAtTime(level, now);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + 6.0 - (i * 0.8));
      
      osc.connect(hGain);
      hGain.connect(bowlGain);
      osc.start(now);
      osc.stop(now + 6.5);
    });

    // ── Layer 2: Temple Bell (yüksek tınlama) ──
    // 1.5 saniye gecikmeyle — bowl rezonansı yerleştikten sonra
    const bellDelay = 1.5;
    const bellGain = ctx.createGain();
    bellGain.connect(this._master);
    bellGain.gain.setValueAtTime(0, now + bellDelay);
    bellGain.gain.linearRampToValueAtTime(0.06, now + bellDelay + 0.005);
    bellGain.gain.exponentialRampToValueAtTime(0.015, now + bellDelay + 0.5);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + bellDelay + 4.0);

    [1318.5, 1975, 2637].forEach((freq, i) => { // E6 harmonikleri
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i * 4;
      const hG = ctx.createGain();
      hG.gain.value = 1.0 / (1 + i);
      osc.connect(hG);
      hG.connect(bellGain);
      osc.start(now + bellDelay);
      osc.stop(now + bellDelay + 4.5);
    });

    // ── Layer 3: Om Drone (derin grounding) ──
    // Bowl strike'dan 0.5sn sonra yavaşça yükselir
    const omGain = ctx.createGain();
    const omFilter = ctx.createBiquadFilter();
    omFilter.type = 'lowpass';
    omFilter.frequency.value = 400;
    omFilter.Q.value = 0.7;

    omGain.connect(omFilter);
    omFilter.connect(this._master);

    omGain.gain.setValueAtTime(0, now + 0.5);
    omGain.gain.linearRampToValueAtTime(0.04, now + 3.0);  // Yavaş swell
    omGain.gain.setValueAtTime(0.04, now + 5.0);           // Sustain
    omGain.gain.exponentialRampToValueAtTime(0.0001, now + 8.0); // Uzun fade

    // Fundamental + hafif 5th → Om rezonansı
    [130.8, 196.0].forEach((freq, i) => { // C3 + G3
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i * 2;
      // Çok yavaş vibrato — canlılık
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.3 + (i * 0.15); // 0.3Hz — nefes ritmi
      lfoGain.gain.value = 3; // ±3 cent vibrato
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);

      osc.connect(omGain);
      osc.start(now + 0.5);
      osc.stop(now + 8.5);
      lfo.start(now + 0.5);
      lfo.stop(now + 8.5);
    });

    // ── Layer 4: Ambient Shimmer Pad ──
    // Çok ince, yüksek register'da parıltı
    const shimmerGain = ctx.createGain();
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'bandpass';
    shimmerFilter.frequency.value = 3000;
    shimmerFilter.Q.value = 2;

    shimmerGain.connect(shimmerFilter);
    shimmerFilter.connect(this._master);

    shimmerGain.gain.setValueAtTime(0, now + 2.0);
    shimmerGain.gain.linearRampToValueAtTime(0.015, now + 4.0);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 7.5);

    [2093, 2637, 3136].forEach((freq, i) => { // C7, E7, G7
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = Math.random() * 8 - 4;
      osc.connect(shimmerGain);
      osc.start(now + 2.0);
      osc.stop(now + 8.0);
    });
  },

  /** Ana ekrana dönüş — ikinci singing bowl strike (daha küçük, daha yüksek) */
  playLanding() {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Küçük bowl — daha yüksek pitch, kısa decay
    const g = ctx.createGain();
    g.connect(this._master);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.02, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    [523, 1046, 1568].forEach((freq, i) => { // C5 + harmonikler
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i * 3 + (Math.random() * 2 - 1);
      const hG = ctx.createGain();
      hG.gain.value = 1.0 / (1 + i * 0.7);
      osc.connect(hG);
      hG.connect(g);
      osc.start(now);
      osc.stop(now + 3.0);
    });
  },


  /** Meditation loading ekranı başlangıcı — yavaşça alçalan derin rezonans hum */
  playMeditationLoadingStart() {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const dur = 5.2; // Toplam loading süresi

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.045, now + 1.2); // Yavaş swell
    master.gain.setValueAtTime(0.045, now + dur - 0.8);
    master.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    master.connect(this._master);

    // G2 (98Hz) ve D3 (146.8Hz) - Mistik, sakinleştirici 5'li aralık (perfect fifth)
    const baseFreqs = [108, 162]; // C3 gamına yakın resonant frekanslar
    baseFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + 15, now); // Biraz yukarıdan başlar
      // 5 saniye boyunca frekansı aşağı çeker (Yavaşlama/Sakinleşme etkisi)
      osc.frequency.exponentialRampToValueAtTime(freq, now + dur - 0.5);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq * 1.5;

      osc.connect(filter);
      filter.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.1);
    });
  },

  /** Meditation loading geri sayım tick sesi — her saniyede azalan pentatonik rüzgar çanı */
  playMeditationLoadingTick(secondsLeft) {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Geri sayım düştükçe pesleşen pentatonik gam (1 oktav daha pes)
    const scale = {
      5: 440.00, // A4
      4: 392.00, // G4
      3: 329.63, // E4
      2: 293.66, // D4
      1: 261.63, // C4
      0: 196.00  // G3
    };
    const freq = scale[secondsLeft] || 220;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Çan gövde rezonansı harmonikleri (sesi çok daha yumuşak tuttuk)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.03, now + 0.008); // Daha yumuşak atak
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7); // Daha uzun ve yumuşak sönüm

    const hG = ctx.createGain();
    hG.gain.setValueAtTime(0.004, now); // 0.012'den 0.004'e düşürülmüş yumuşak harmonik
    hG.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(g);
    osc2.connect(hG);
    hG.connect(g);
    g.connect(this._master);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.75);
    osc2.stop(now + 0.75);
  },


  // ═══════════════════════════════════════════════════════
  //  GENEL — ADIM GEÇİŞ
  // ═══════════════════════════════════════════════════════

  /** Evrensel ileri geçiş sesi (HUD arrow) — Esen yumuşak rüzgar filtresi ve sıcak ton */
  playStepTransition() {
    if (!this._init()) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Rüzgar Sweep'i (Köprülü gürültü)
    const bufSize = Math.ceil(0.3 * ctx.sampleRate);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.25);
    filter.Q.value = 1.2;

    const nG = ctx.createGain();
    nG.gain.setValueAtTime(0, now);
    nG.gain.linearRampToValueAtTime(0.035, now + 0.05);
    nG.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    noise.connect(filter);
    filter.connect(nG);
    nG.connect(this._master);
    noise.start(now);
    noise.stop(now + 0.3);

    // Sıcak, kayan ton
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.22); // C#5'e tatlı geçiş

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(g);
    g.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.28);
  }
};
