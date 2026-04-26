import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { vibrate } from '../core/utils.js';

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

let tasks = JSON.parse(localStorage.getItem('aura_tasks')) || [];

export function initFocus() {
  // Setup View Listeners
  if (elements.focusSetsInput) {
    elements.focusSetsInput.oninput = (e) => {
      const val = parseInt(e.target.value);
      if (elements.focusSetsVal) elements.focusSetsVal.textContent = val;
      renderSessionInputs(val);
    };
  }

  if (elements.focusStartSessionBtn) {
    elements.focusStartSessionBtn.onclick = startFocusSession;
  }

  // Active View Listeners
  if (elements.focusToggleBtn) {
    elements.focusToggleBtn.onclick = toggleTimer;
  }
  if (elements.focusStopBtn) {
    elements.focusStopBtn.onclick = stopFocusSession;
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
    };
  }
  if (elements.focusConfirmFinish) {
    elements.focusConfirmFinish.onclick = () => {
      elements.focusConfirmModal.classList.remove('active');
      elements.focusActive.classList.add('hidden');
      elements.focusSetup.classList.remove('hidden');
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
  
  // Initial population
  renderSessionInputs(4);
  renderTasks();
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
  
  currentSet = 1;
  mode = 'work';
  totalTimeInCycle = workTime * 60;
  timeLeft = totalTimeInCycle;
  
  // UI Transition
  elements.focusSetup.classList.add('hidden');
  elements.focusActive.classList.remove('hidden');
  
  updateStatusUI();
  renderTimeline();
  updateTimerDisplay();
  
  startTimer();
}

function stopFocusSession() {
  vibrate('heavy');
  pauseTimer();
  
  if (elements.focusConfirmModal) {
    elements.focusConfirmModal.classList.add('active');
  } else {
    // Fallback if modal not found
    if (confirm(t('focus_confirm_stop') || 'Stop session?')) {
      elements.focusActive.classList.add('hidden');
      elements.focusSetup.classList.remove('hidden');
    } else {
      startTimer();
    }
  }
}

function toggleTimer() {
  vibrate('light');
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
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
  updateStatusUI();
  renderTimeline();
  startTimer();
}

function completeSession() {
  pauseTimer();
  alert(t('focus_session_done') || 'Session Complete! Great work.');
  elements.focusActive.classList.add('hidden');
  elements.focusSetup.classList.remove('hidden');
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
