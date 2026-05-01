import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { vibrate } from '../core/utils.js';
import { SensoryEngine } from '../services/sensory.js';

let timer = null;
let timeLeft = 0;
let totalTimeInCycle = 0;
let isRunning = false;
let mode = 'work'; // 'work' or 'break'

// Session Config
let sessionNames = [];
let workTime = 25;
let breakTime = 5;
let totalSets = 4;
let currentSet = 1;
let currentAmbient = 'none';
let isAmbientOn = true;

// Immersion Mode
let immersionTimer = null;
const IMMERSION_DELAY = 5000; // 5 seconds

let tasks = JSON.parse(localStorage.getItem('aura_tasks')) || [];

export function initFocus() {
  // Update elements reference
  Object.assign(elements, {
    addSessionBtn: document.getElementById('addSessionBtn'),
  });

  // Setup View Listeners
  if (elements.addSessionBtn) {
    elements.addSessionBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate('light');
      if (focusSessionCount < 8) {
        focusSessionCount++;
        renderSessionInputs();
      }
    };
  }

  // Stepper Controls
  document.querySelectorAll('.stepper-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      vibrate('light');
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        let val = parseInt(input.value) || 0;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 99;
        
        if (btn.classList.contains('minus')) {
          val = Math.max(min, val - 1);
        } else if (btn.classList.contains('plus')) {
          val = Math.min(max, val + 1);
        }
        
        input.value = val;
      }
    });
  });

  if (elements.focusStartSessionBtn) {
    elements.focusStartSessionBtn.onclick = startFocusSession;
  }

  // Active View Listeners
  if (elements.focusToggleBtn) {
    elements.focusToggleBtn.onclick = (e) => {
      e.stopPropagation();
      toggleTimer();
      resetImmersion();
    };
  }
  if (elements.focusStopBtn) {
    elements.focusStopBtn.onclick = (e) => {
      e.stopPropagation();
      stopFocusSession();
    };
  }
  if (elements.focusAmbientToggleBtn) {
    elements.focusAmbientToggleBtn.onclick = (e) => {
      e.stopPropagation();
      toggleAmbient();
      resetImmersion();
    };
  }

  // Interaction to wake up UI
  const focusView = document.getElementById('view-focus');
  if (focusView) {
    focusView.addEventListener('touchstart', resetImmersion, { passive: true });
    focusView.addEventListener('mousemove', resetImmersion, { passive: true });
    focusView.addEventListener('click', resetImmersion, { passive: true });
  }

  // Todo Listeners
  if (elements.todoForm) {
    elements.todoForm.onsubmit = addTask;
  }

  // Modal Listeners
  if (elements.focusConfirmCancel) {
    elements.focusConfirmCancel.onclick = () => {
      elements.focusConfirmModal.classList.remove('active');
      startTimer();
      startImmersionTimer();
    };
  }
  if (elements.focusConfirmFinish) {
    elements.focusConfirmFinish.onclick = () => {
      stopAmbient();
      exitLSD();
      elements.focusConfirmModal.classList.remove('active');
      elements.focusActive.classList.add('hidden');
      elements.focusSetup.classList.remove('hidden');
      resetFocusTheme();
      exitImmersion();
    };
  }

  // Slider Pagination
  const slider = document.getElementById('focusSlider');
  const dots = document.querySelectorAll('.focus-pagination .dot');
  if (slider && dots.length > 0) {
    slider.onscroll = () => {
      const index = Math.round(slider.scrollLeft / slider.offsetWidth);
      dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    };
  }
  
  // Ambient Wheel Picker
  initAmbientWheel();

  // Render initial session layout
  renderSessionInputs();
  renderTasks();

  // Initialize LSD Bicycle Day mode (Desktop only)
  initLSDMode();
}

function initAmbientWheel() {
  const wheel = document.getElementById('ambientWheel');
  if (!wheel) return;

  // Prevent scroll propagation to focus slider
  wheel.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  wheel.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  wheel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

  const items = wheel.querySelectorAll('.wheel-item');

  // Allow clicking on items to select them (crucial for desktop)
  items.forEach((item, i) => {
    item.addEventListener('click', () => {
      const itemWidth = 100;
      wheel.scrollTo({
        left: i * itemWidth,
        behavior: 'smooth'
      });
    });
  });

  wheel.onscroll = () => {
    const itemWidth = 100;
    const index = Math.round(wheel.scrollLeft / itemWidth);
    
    items.forEach((item, i) => {
      const isActive = i === index;
      if (isActive && !item.classList.contains('active')) {
        vibrate('light');
      }
      item.classList.toggle('active', isActive);
      item.style.color = isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.4)';
      item.style.transform = isActive ? 'scale(1.1)' : 'scale(0.9)';
      item.style.opacity = isActive ? '1' : '0.4';
    });
  };
}

let focusSessionCount = 1;

function renderSessionInputs() {
  if (!elements.sessionNamesList) return;
  
  const existingInputs = Array.from(elements.sessionNamesList.querySelectorAll('input'));
  const savedValues = existingInputs.map(inp => inp.value);

  let html = '';
  for (let i = 1; i <= focusSessionCount; i++) {
    const isActive = i === 1 ? 'active' : '';
    const val = savedValues[i-1] !== undefined ? savedValues[i-1] : `Session ${i}`;
    html += `
      <div class="session-name-item ${isActive}" style="display: flex; justify-content: space-between; align-items: center; position: relative;">
        <input type="text" class="session-name-input" 
               placeholder="Session ${i}" 
               value="${val}" style="width: calc(100% - 50px);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.7rem; opacity: 0.4;">(#${i})</span>
          ${i > 1 ? `<button type="button" class="remove-session-btn" data-index="${i}" style="background:none;border:none;color:rgba(255,100,100,0.6);cursor:pointer;padding:0;font-size:1.2rem;line-height:1;">&times;</button>` : '<span style="width:12px;"></span>'}
        </div>
      </div>
    `;
  }
  elements.sessionNamesList.innerHTML = html;
  
  // Cleaner rebinding logic
  bindRemoveButtons();
}

function bindRemoveButtons() {
  elements.sessionNamesList.querySelectorAll('.remove-session-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      vibrate('light');
      const idx = parseInt(e.target.getAttribute('data-index')) - 1;
      
      const currentInputs = Array.from(elements.sessionNamesList.querySelectorAll('input'));
      const currentValues = currentInputs.map(inp => inp.value);
      currentValues.splice(idx, 1);
      
      focusSessionCount--;
      
      // Hack to pass values: temporarily write them back then call render
      elements.sessionNamesList.innerHTML = currentValues.map(v => `<input value="${v}">`).join('');
      renderSessionInputs();
    };
  });
}

function startFocusSession() {
  vibrate('medium');
  
  // Capture Inputs
  const inputs = elements.sessionNamesList.querySelectorAll('.session-name-input');
  sessionNames = Array.from(inputs).map((inp, idx) => inp.value.trim() || `Session ${idx + 1}`);
  
  workTime = parseInt(elements.focusWorkInput.value) || 25;
  breakTime = parseInt(elements.focusBreakInput.value) || 5;
  totalSets = elements.sessionNamesList.querySelectorAll('.session-name-item').length || 1;
  
  // Ambient Sound Setup (Reading from active wheel item)
  const activeItem = document.querySelector('.wheel-item.active');
  currentAmbient = activeItem ? activeItem.getAttribute('data-value') : 'none';
  
  isAmbientOn = true;
  updateAmbientUI();
  playCurrentAmbient();

  currentSet = 1;
  mode = 'work';
  totalTimeInCycle = workTime * 60;
  timeLeft = totalTimeInCycle;
  
  // UI Transition
  elements.focusSetup.classList.add('hidden');
  elements.focusActive.classList.remove('hidden');
  
  updateFocusTheme();
  updateStatusUI();
  renderTimeline();
  updateTimerDisplay();
  
  startTimer();
  startImmersionTimer();
}

function stopFocusSession() {
  vibrate('heavy');
  pauseTimer();
  clearTimeout(immersionTimer);
  
  if (elements.focusConfirmModal) {
    elements.focusConfirmModal.classList.add('active');
  } else {
    // Fallback if modal not found
    if (confirm(t('focus_confirm_stop') || 'Stop session?')) {
      stopAmbient();
      elements.focusActive.classList.add('hidden');
      elements.focusSetup.classList.remove('hidden');
      resetFocusTheme();
      exitImmersion();
    } else {
      startTimer();
      startImmersionTimer();
    }
  }
}

function updateFocusTheme() {
  const focusView = document.getElementById('view-focus');
  if (!focusView) return;
  focusView.setAttribute('data-focus-mode', mode);
}

function resetFocusTheme() {
  const focusView = document.getElementById('view-focus');
  if (!focusView) return;
  focusView.removeAttribute('data-focus-mode');
}

// IMMERSION LOGIC
function startImmersionTimer() {
  clearTimeout(immersionTimer);
  if (!isRunning) return;
  immersionTimer = setTimeout(enterImmersion, IMMERSION_DELAY);
}

function resetImmersion() {
  exitImmersion();
  if (isRunning) {
    startImmersionTimer();
  }
}

function enterImmersion() {
  if (!isRunning) return;
  const focusView = document.getElementById('view-focus');
  if (focusView) focusView.classList.add('immersion-mode');
  
  // Also hide global elements
  const header = document.getElementById('mobile-header');
  const nav = document.getElementById('mobile-nav');
  if (header) header.classList.add('immersion-hide');
  if (nav) nav.classList.add('immersion-hide');
}

export function exitImmersion() {
  clearTimeout(immersionTimer);
  const focusView = document.getElementById('view-focus');
  if (focusView) focusView.classList.remove('immersion-mode');
  
  const header = document.getElementById('mobile-header');
  const nav = document.getElementById('mobile-nav');
  if (header) header.classList.remove('immersion-hide');
  if (nav) nav.classList.remove('immersion-hide');
}

function stopAmbient(clearState = true) {
  if (currentAmbient === 'none') return;
  
  if (['rain', 'waves', 'storm', 'night', 'nature', 'space'].includes(currentAmbient)) {
    SensoryEngine.playAtmosphere(null); // Stops atmosphere
  } else {
    SensoryEngine.playBinaural('none'); // Stops binaural
  }
  if (clearState) currentAmbient = 'none';
}

function playCurrentAmbient() {
  if (currentAmbient === 'none' || !isAmbientOn) {
    stopAmbient(false);
    return;
  }

  const ambientMap = {
    'rain': 'soul_serenity_sounds-water-noises-241049.mp3',
    'night': 'recordx_media-midnight-sound-effect-199863.mp3',
    'nature': 'kalsstockmedia-ambient-forest-bird-sounds-280152.mp3',
    'space': 'freesound_community-spaceship-ambient-27988.mp3'
  };

  if (ambientMap[currentAmbient]) {
    SensoryEngine.playAtmosphere(currentAmbient, `assets/audio/ambient/${ambientMap[currentAmbient]}`); 
  } else if (['focus', 'relax'].includes(currentAmbient)) {
    SensoryEngine.playBinaural(currentAmbient);
  }
}

function toggleAmbient() {
  vibrate('light');
  isAmbientOn = !isAmbientOn;
  updateAmbientUI();
  if (isAmbientOn) {
    playCurrentAmbient();
  } else {
    stopAmbient(false);
  }
}

function updateAmbientUI() {
  if (!elements.focusAmbientToggleBtn) return;
  
  const speakerIcon = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>`;
  
  const muteIcon = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
      <line x1="23" y1="9" x2="17" y2="15"></line>
      <line x1="17" y1="9" x2="23" y2="15"></line>
    </svg>`;

  elements.focusAmbientToggleBtn.innerHTML = isAmbientOn ? speakerIcon : muteIcon;
  elements.focusAmbientToggleBtn.style.opacity = isAmbientOn ? '1' : '0.4';
}

function toggleTimer() {
  vibrate('light');
  if (isRunning) {
    pauseTimer();
    clearTimeout(immersionTimer);
  } else {
    startTimer();
    startImmersionTimer();
  }
}

function startTimer() {
  isRunning = true;
  updateToggleIcon(true);
  timer = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timer);
      handleCycleCompletion();
    }
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  updateToggleIcon(false);
  clearInterval(timer);
}

function handleCycleCompletion() {
  vibrate('heavy');
  
  if (mode === 'work') {
    if (currentSet >= totalSets) {
      completeSession();
      return;
    }
    mode = 'break';
    totalTimeInCycle = breakTime * 60;
  } else {
    mode = 'work';
    currentSet++;
    totalTimeInCycle = workTime * 60;
  }
  
  timeLeft = totalTimeInCycle;
  updateFocusTheme();
  updateStatusUI();
  renderTimeline();
  startTimer();
  startImmersionTimer();
}

function completeSession() {
  pauseTimer();
  stopAmbient();
  exitLSD();
  alert(t('focus_session_done') || 'Session Complete! Great work.');
  elements.focusActive.classList.add('hidden');
  elements.focusSetup.classList.remove('hidden');
  resetFocusTheme();
  exitImmersion();
}

function updateStatusUI() {
  if (elements.activeSessionName) {
    elements.activeSessionName.textContent = sessionNames[currentSet - 1] || 'Focus';
  }
  if (elements.focusSetCounter) {
    elements.focusSetCounter.textContent = `Set ${currentSet} / ${totalSets}`;
  }
  if (elements.focusStatusLabel) {
    elements.focusStatusLabel.textContent = mode === 'work' ? 'FOCUS' : 'BREAK';
    elements.focusStatusLabel.style.color = mode === 'work' ? 'var(--accent-primary)' : 'var(--accent-okay)';
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  if (elements.focusTimeDisplay) elements.focusTimeDisplay.textContent = timeStr;

  // Liquid Height Update
  if (elements.timerLiquid) {
    const progress = 1 - (timeLeft / totalTimeInCycle);
    elements.timerLiquid.style.height = `${progress * 100}%`;
    elements.timerLiquid.style.backgroundColor = mode === 'work' ? 'var(--accent-primary)' : 'var(--accent-okay)';
  }
}

function updateToggleIcon(running) {
  if (!elements.focusToggleBtn) return;
  const playIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  const pauseIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  elements.focusToggleBtn.innerHTML = running ? pauseIcon : playIcon;
}

function renderTimeline() {
  if (!elements.focusTimeline) return;
  
  let html = '';
  for (let i = 1; i <= totalSets; i++) {
    const isCurrent = i === currentSet;
    const isPast = i < currentSet;
    
    html += `<div class="timeline-dot work ${isCurrent && mode === 'work' ? 'active' : ''} ${isPast ? 'done' : ''}"></div>`;
    if (i < totalSets) {
       html += `<div class="timeline-dot break ${isCurrent && mode === 'break' ? 'active' : ''} ${isPast ? 'done' : ''}"></div>`;
    }
  }
  elements.focusTimeline.innerHTML = html;
}

// TODO LOGIC
function addTask(e) {
  e.preventDefault();
  const text = elements.todoInput.value.trim();
  if (!text) return;
  
  tasks.push({ id: Date.now(), text, completed: false });
  elements.todoInput.value = '';
  saveTasks();
  renderTasks();
  vibrate('light');
}

function renderTasks() {
  if (!elements.todoList) return;
  
  elements.todoList.innerHTML = tasks.map(task => `
    <div class="todo-item glow-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
       <div class="todo-check"></div>
       <span class="todo-text" style="font-size: 1rem;">${task.text}</span>
       <button class="todo-delete">✕</button>
    </div>
  `).join('');
  
  if (elements.todoCount) elements.todoCount.textContent = tasks.filter(t => !t.completed).length;

  elements.todoList.querySelectorAll('.todo-item').forEach(item => {
    const id = parseInt(item.getAttribute('data-id'));
    item.querySelector('.todo-check').onclick = () => toggleTask(id);
    item.querySelector('.todo-delete').onclick = (e) => {
      e.stopPropagation();
      deleteTask(id);
    };
  });
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
    vibrate('light');
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  vibrate('medium');
}

function saveTasks() {
  localStorage.setItem('aura_tasks', JSON.stringify(tasks));
}

// ==========================================
// 🚲 BICYCLE DAY — LSD MODE (Desktop Only)
// ==========================================

let lsdActive = false;
let lsdAnimFrame = null;
let lsdGL = null;
let lsdProgram = null;
let dvdX = 200, dvdY = 150;
let dvdVX = 2.2, dvdVY = 1.7;
const DVD_SIZE = 240;

// Hue rotation for border color on bounce
let dvdHue = 0;

function initLSDMode() {
  const btn = document.getElementById('bicycleDayBtn');
  const exitBtn = document.getElementById('lsdExitBtn');

  if (btn) {
    btn.onclick = (e) => {
      e.stopPropagation();
      enterLSD();
    };
  }
  if (exitBtn) {
    exitBtn.onclick = (e) => {
      e.stopPropagation();
      exitLSD();
    };
  }
}

function enterLSD() {
  const overlay = document.getElementById('lsdOverlay');
  const canvas = document.getElementById('lsdCanvas');
  if (!overlay || !canvas) return;

  lsdActive = true;
  overlay.classList.remove('hidden');

  // Reset exit button animation
  const exitBtn = document.getElementById('lsdExitBtn');
  if (exitBtn) {
    exitBtn.style.animation = 'none';
    exitBtn.offsetHeight; // force reflow
    exitBtn.style.animation = '';
  }

  // Initialize position near center
  dvdX = window.innerWidth / 2 - DVD_SIZE / 2;
  dvdY = window.innerHeight / 2 - DVD_SIZE / 2;

  // Randomize velocity direction - slower floating
  dvdVX = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.5);
  dvdVY = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4);

  setupWebGL(canvas);
  animateLSD();
}

function exitLSD() {
  lsdActive = false;
  const overlay = document.getElementById('lsdOverlay');
  if (overlay) overlay.classList.add('hidden');

  if (lsdAnimFrame) {
    cancelAnimationFrame(lsdAnimFrame);
    lsdAnimFrame = null;
  }

  // Cleanup WebGL
  if (lsdGL && lsdProgram) {
    lsdGL.deleteProgram(lsdProgram);
    lsdProgram = null;
  }
  lsdGL = null;
}

function setupWebGL(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) {
    // Fallback: 2D canvas psychedelic
    setupCanvas2DFallback(canvas);
    return;
  }
  lsdGL = gl;

  // Vertex shader — simple fullscreen quad
  const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment shader — Dynamic LSD psychedelic visuals (Tripping intensity scales with time)
  const fsSource = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_intensity; // Goes from 0.0 (start) to 1.0 (end)

    // Simplex-ish noise
    vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x / 289.0) * 289.0; }
    vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865, 0.366025404, -0.577350269, 0.024390243);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x_) - 0.5;
      vec3 ox = floor(x_ + 0.5);
      vec3 a0 = x_ - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // Convert Hue, Saturation, Value to RGB
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    // 2D Rotation Matrix
    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= u_resolution.x / u_resolution.y;

      // Base time scaling
      float t = u_time * (0.3 + u_intensity * 0.5);
      
      // Dynamic zoom/warp based on intensity
      float zoom = 1.0 - (u_intensity * 0.4);
      p *= zoom;

      // Kaleidoscope Effect (amplifies with intensity)
      float angle = atan(p.y, p.x);
      float radius = length(p);
      
      // Fold space for kaleidascope
      float segments = mix(2.0, 12.0, u_intensity);
      angle = mod(angle, 6.28318 / segments);
      angle = abs(angle - 3.14159 / segments);
      
      vec2 k_p = vec2(cos(angle), sin(angle)) * radius;
      vec2 warped_p = mix(p, k_p, u_intensity * 0.8);

      // Multi-layer flowing noise
      float n1 = snoise(warped_p * mix(2.0, 6.0, u_intensity) + vec2(t * 0.5, t * 0.3));
      float n2 = snoise(warped_p * mix(4.0, 12.0, u_intensity) - vec2(t * 0.4, t * 0.6));
      float n3 = snoise(warped_p * mix(8.0, 24.0, u_intensity) + vec2(sin(t), cos(t)));
      
      // Domain distortion (warping space with noise)
      vec2 distort = vec2(n1, n2) * mix(0.1, 0.6, u_intensity);
      float n_final = snoise(warped_p * 3.0 + distort + t);
      
      // Psychedelic Color Mapping (HSV)
      // Hue shifts over time, but spatial frequency and chaos increase with intensity
      float hue = fract(t * 0.1 + n1 * 0.2 + radius * mix(0.1, 1.5, u_intensity) + angle * mix(0.0, 1.0, u_intensity));
      
      // Saturation pulses
      float sat = 0.6 + 0.4 * sin(t * 2.0 + n_final * 6.28);
      sat = mix(sat, 1.0, u_intensity); // Max saturation at high intensity
      
      // Value (Brightness) creates distinct fractal bands at high intensity
      float val = 0.5 + 0.5 * sin(n_final * mix(3.14, 20.0, u_intensity) + t * 3.0);
      val = smoothstep(0.1, 0.9, val); // Increase contrast
      
      vec3 col = hsv2rgb(vec3(hue, sat, val));

      // Add Chromatic Aberration near edges
      float r_shift = snoise(warped_p * 2.0 + t) * 0.05 * u_intensity * radius;
      float b_shift = snoise(warped_p * 2.0 - t) * 0.05 * u_intensity * radius;
      
      col.r += hsv2rgb(vec3(fract(hue + 0.05), sat, snoise(warped_p * 3.0 + r_shift))).r * 0.5 * u_intensity;
      col.b += hsv2rgb(vec3(fract(hue - 0.05), sat, snoise(warped_p * 3.0 + b_shift))).b * 0.5 * u_intensity;

      // Deep vignette to ground it
      float vig = 1.0 - radius * mix(0.3, 0.6, u_intensity);
      col *= smoothstep(0.0, 1.0, vig);
      
      // Pure brightness boost at peak
      col += vec3(n3 * 0.1 * u_intensity);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);
  lsdProgram = prog;

  // Fullscreen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
}

function setupCanvas2DFallback(canvas) {
  // Simple 2D fallback for browsers without WebGL
  lsdGL = null;
}

function animateLSD() {
  if (!lsdActive) return;

  // Calculate session progress (1.0 = start, 0.0 = end)
  const progress = totalTimeInCycle > 0 ? (timeLeft / totalTimeInCycle) : 0;

  const canvas = document.getElementById('lsdCanvas');
  const dvdEl = document.getElementById('dvdTimer');
  const dvdTimeEl = document.getElementById('dvdTimeDisplay');
  const dvdStatusEl = document.getElementById('dvdStatusLabel');

  // Sync timer text with actual focus timer
  if (dvdTimeEl && elements.focusTimeDisplay) {
    dvdTimeEl.textContent = elements.focusTimeDisplay.textContent;
  }
  if (dvdStatusEl && elements.focusStatusLabel) {
    dvdStatusEl.textContent = elements.focusStatusLabel.textContent;
  }

  // Render WebGL psychedelics
  if (lsdGL && lsdProgram) {
    const gl = lsdGL;

    // Handle resize
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    const timeUniform = gl.getUniformLocation(lsdProgram, 'u_time');
    const resUniform = gl.getUniformLocation(lsdProgram, 'u_resolution');
    const intensityUniform = gl.getUniformLocation(lsdProgram, 'u_intensity');

    gl.uniform1f(timeUniform, performance.now() / 1000);
    gl.uniform2f(resUniform, canvas.width, canvas.height);
    // Intensity goes from 0.0 (start of timer) to 1.0 (end of timer)
    gl.uniform1f(intensityUniform, 1.0 - progress);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // Scale DVD timer based on remaining time
  const minScale = 0.35;
  const scale = minScale + (1 - minScale) * progress;
  
  if (dvdEl) {
    dvdEl.style.transform = `scale(${scale})`;

    // Calculate dynamic collision boundaries based on scale
    // By default, CSS scale transforms from the center.
    const offset = (DVD_SIZE / 2) * (1 - scale);
    const minX = -offset;
    const minY = -offset;
    const maxX = window.innerWidth - DVD_SIZE + offset;
    const maxY = window.innerHeight - DVD_SIZE + offset;

    dvdX += dvdVX;
    dvdY += dvdVY;
    let bounced = false;

    if (dvdX <= minX) { dvdX = minX; dvdVX = Math.abs(dvdVX); bounced = true; }
    if (dvdX >= maxX) { dvdX = maxX; dvdVX = -Math.abs(dvdVX); bounced = true; }
    if (dvdY <= minY) { dvdY = minY; dvdVY = Math.abs(dvdVY); bounced = true; }
    if (dvdY >= maxY) { dvdY = maxY; dvdVY = -Math.abs(dvdVY); bounced = true; }

    if (bounced) {
      dvdHue = (dvdHue + 60 + Math.random() * 30) % 360;
      const circle = dvdEl.querySelector('.dvd-timer-circle');
      if (circle) {
        circle.style.borderColor = `hsl(${dvdHue}, 80%, 70%)`;
        circle.style.boxShadow = `
          inset 0 0 30px rgba(0, 0, 0, 0.3),
          0 0 60px hsla(${dvdHue}, 80%, 60%, 0.3),
          0 0 120px hsla(${dvdHue}, 70%, 50%, 0.15)
        `;
      }

      // Slight speed variation after bounce
      dvdVX += (Math.random() - 0.5) * 0.15;
      dvdVY += (Math.random() - 0.5) * 0.15;

      // Clamp speed
      dvdVX = Math.max(-2, Math.min(2, dvdVX));
      dvdVY = Math.max(-2, Math.min(2, dvdVY));

      // Ensure minimum speed
      if (Math.abs(dvdVX) < 0.5) dvdVX = dvdVX > 0 ? 0.6 : -0.6;
      if (Math.abs(dvdVY) < 0.4) dvdVY = dvdVY > 0 ? 0.5 : -0.5;
    }

    dvdEl.style.transform = `translate3d(${dvdX}px, ${dvdY}px, 0)`;
  }

  lsdAnimFrame = requestAnimationFrame(animateLSD);
}
