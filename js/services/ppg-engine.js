// js/services/ppg-engine.js

export const PPGEngine = {
  stream: null,
  video: null,
  canvas: null,
  ctx: null,
  animationFrameId: null,
  
  // Callbacks
  onFingerStatusChange: null, // ('detecting', 'measuring', 'success', 'no_finger', 'failed')
  onProgress: null, // (percent)
  onPulse: null, // (val)
  onComplete: null, // ({ bpm, rmssd })

  // State
  isMeasuring: false,
  progress: 0,
  valHistory: [],
  filteredHistory: [],
  peaks: [],
  ibis: [],
  lastPeakTime: 0,
  ema: 0,
  measurementStartTime: 0,
  measurementDuration: 15000, // 15 seconds
  sampleCount: 0,

  async start(videoEl, canvasEl) {
    this.video = videoEl;
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    
    this.isMeasuring = false;
    this.progress = 0;
    this.valHistory = [];
    this.filteredHistory = [];
    this.peaks = [];
    this.ibis = [];
    this.lastPeakTime = 0;
    this.ema = 0;
    this.sampleCount = 0;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 100, height: 100, frameRate: 30 }
      });
      
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', true);
      this.video.muted = true;
      await this.video.play();
      
      // Attempt Android torch activation
      const track = this.stream.getVideoTracks()[0];
      try {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({ advanced: [{ torch: true }] });
        }
      } catch (e) {
        console.log("[PPG] Torch control not supported on this platform.");
      }

      if (this.onFingerStatusChange) this.onFingerStatusChange('detecting');
      
      this.loop();
    } catch (err) {
      console.error("[PPG] Camera access error:", err);
      if (this.onFingerStatusChange) this.onFingerStatusChange('failed');
      throw err;
    }
  },

  stop() {
    this.isMeasuring = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      // Turn off torch first if active
      try {
        const track = this.stream.getVideoTracks()[0];
        track.applyConstraints({ advanced: [{ torch: false }] }).catch(()=>{});
      } catch(e){}
      
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  },

  loop() {
    if (!this.stream) return;
    this.processFrame();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  },

  processFrame() {
    if (this.video.readyState < this.video.HAVE_CURRENT_DATA) return;
    
    // Draw 100x100 frame to canvas and sample center 10x10
    this.ctx.drawImage(this.video, 0, 0, 100, 100);
    const imgData = this.ctx.getImageData(45, 45, 10, 10).data;
    
    let sumR = 0, sumG = 0, sumB = 0;
    const len = imgData.length;
    for (let i = 0; i < len; i += 4) {
      sumR += imgData[i];
      sumG += imgData[i+1];
      sumB += imgData[i+2];
    }
    
    const count = len / 4;
    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;

    // Finger detection heuristic: Very red, very low green & blue
    const isFingerOnCamera = avgR > 130 && avgR > (avgG * 2) && avgR > (avgB * 2);

    if (!isFingerOnCamera) {
      if (this.isMeasuring) {
        // Reset measurement if finger is removed mid-way
        this.isMeasuring = false;
        this.progress = 0;
        this.ibis = [];
        this.lastPeakTime = 0;
        this.valHistory = [];
        this.filteredHistory = [];
        if (this.onFingerStatusChange) this.onFingerStatusChange('no_finger');
        if (this.onProgress) this.onProgress(0);
      } else {
        if (this.onFingerStatusChange) this.onFingerStatusChange('no_finger');
      }
      return;
    }

    // Finger is detected!
    if (!this.isMeasuring) {
      this.isMeasuring = true;
      this.measurementStartTime = Date.now();
      if (this.onFingerStatusChange) this.onFingerStatusChange('measuring');
    }

    // Green channel or Red-Green difference is best for PPG contrast
    const val = avgR - avgG; 
    
    // 1. Detrending using EMA filter (High-pass filter)
    if (this.sampleCount === 0) {
      this.ema = val;
    } else {
      this.ema = this.ema * 0.96 + val * 0.04;
    }
    this.sampleCount++;
    const acSignal = val - this.ema;

    // 2. Low pass filtering (Moving average of 3 samples)
    this.valHistory.push(acSignal);
    if (this.valHistory.length > 5) this.valHistory.shift();
    
    let filtered = acSignal;
    if (this.valHistory.length >= 3) {
      filtered = (this.valHistory[this.valHistory.length - 1] + 
                  this.valHistory[this.valHistory.length - 2] + 
                  this.valHistory[this.valHistory.length - 3]) / 3;
    }

    this.filteredHistory.push(filtered);
    if (this.filteredHistory.length > 30) this.filteredHistory.shift();

    // Trigger pulse callback for visualizer
    if (this.onPulse) this.onPulse(filtered);

    // 3. Peak Detection
    // A peak is a local maximum that is above a dynamically adjusted threshold
    const historyLen = this.filteredHistory.length;
    if (historyLen >= 5) {
      const prev2 = this.filteredHistory[historyLen - 5];
      const prev1 = this.filteredHistory[historyLen - 4];
      const curr = this.filteredHistory[historyLen - 3];
      const next1 = this.filteredHistory[historyLen - 2];
      const next2 = this.filteredHistory[historyLen - 1];

      // Local maximum check
      if (curr > prev1 && curr > prev2 && curr > next1 && curr > next2 && curr > 1.0) {
        const now = Date.now();
        if (this.lastPeakTime > 0) {
          const ibi = now - this.lastPeakTime;
          // Accept typical heart rates (40 - 180 BPM -> 333ms - 1500ms IBI)
          if (ibi > 330 && ibi < 1500) {
            this.ibis.push(ibi);
          }
        }
        this.lastPeakTime = now;
      }
    }

    // 4. Progress and completion
    const elapsed = Date.now() - this.measurementStartTime;
    const pct = Math.min(100, Math.round((elapsed / this.measurementDuration) * 100));
    this.progress = pct;
    if (this.onProgress) this.onProgress(pct);

    if (elapsed >= this.measurementDuration) {
      this.isMeasuring = false;
      this.stop();
      this.calculateResults();
    }
  },

  calculateResults() {
    if (this.ibis.length < 5) {
      // Not enough peaks / too noisy
      if (this.onFingerStatusChange) this.onFingerStatusChange('failed');
      return;
    }

    // Average IBI to BPM
    const sumIbi = this.ibis.reduce((a, b) => a + b, 0);
    const avgIbi = sumIbi / this.ibis.length;
    const bpm = Math.round(60000 / avgIbi);

    // HRV (RMSSD calculation)
    let sumSqDiff = 0;
    let validDiffCount = 0;
    for (let i = 1; i < this.ibis.length; i++) {
      const diff = this.ibis[i] - this.ibis[i - 1];
      sumSqDiff += diff * diff;
      validDiffCount++;
    }
    const rmssd = validDiffCount > 0 ? Math.round(Math.sqrt(sumSqDiff / validDiffCount)) : 0;

    if (this.onFingerStatusChange) this.onFingerStatusChange('success');
    if (this.onComplete) this.onComplete({ bpm, rmssd });
  }
};
