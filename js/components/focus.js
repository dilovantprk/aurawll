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
  // Setup View Listeners
  if (elements.focusSetsInput) {
    elements.focusSetsInput.oninput = (e) => {
      const val = parseInt(e.target.value);
      renderSessionInputs(val);
    };
  }

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

  // Initial population
  renderSessionInputs(4);
  renderTasks();
}

function initAmbientWheel() {
  const wheel = document.getElementById('ambientWheel');
  if (!wheel) return;

  // Prevent scroll propagation to focus slider
  wheel.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  wheel.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  wheel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

  wheel.onscroll = () => {
    const itemWidth = 100;
    const index = Math.round(wheel.scrollLeft / itemWidth);
    const items = wheel.querySelectorAll('.wheel-item');
    
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

function renderSessionInputs(count) {
  if (!elements.sessionNamesList) return;
  
  let html = '';
  for (let i = 1; i <= count; i++) {
    html += `
      <div class="session-input-row" style="position: relative;">
        <input type="text" class="session-name-input glass-input" 
               placeholder="Session ${i}" 
               style="padding: 10px 14px; font-size: 0.85rem; border-radius: 10px; width: 100%;">
        <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.7rem; opacity: 0.3;">#${i}</span>
      </div>
    `;
  }
  elements.sessionNamesList.innerHTML = html;
}

function startFocusSession() {
  vibrate('medium');
  
  // Capture Inputs
  const inputs = elements.sessionNamesList.querySelectorAll('.session-name-input');
  sessionNames = Array.from(inputs).map((inp, idx) => inp.value.trim() || `Session ${idx + 1}`);
  
  workTime = parseInt(elements.focusWorkInput.value) || 25;
  breakTime = parseInt(elements.focusBreakInput.value) || 5;
  totalSets = parseInt(elements.focusSetsInput.value) || 4;
  
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
