import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { SensoryEngine } from '../services/sensory.js';
import { t } from '../core/i18n.js';

let navigateToGlobal = null;
let protocolTimeout = null;

const getLocalizedScript = () => [
  { text: t('sleep_coach_0'), dur: 4000 },
  { text: t('sleep_coach_1'), dur: 4000 },
  { text: t('sleep_coach_2'), dur: 5000 },
  { text: t('sleep_coach_3'), dur: 3000 },
  { text: t('sleep_coach_4'), dur: 4000 },
  { text: t('sleep_coach_5'), dur: 2000 },
  { text: t('sleep_coach_6'), dur: 7000 },
  { text: t('sleep_coach_7'), dur: 2000 },
  { text: t('sleep_coach_8'), dur: 8000 },
  { text: t('sleep_coach_9'), dur: 4000 },
  { text: t('sleep_coach_10'), dur: 4000 },
  { text: t('sleep_coach_11'), dur: 4000 },
  { text: t('sleep_coach_12'), dur: 4000 },
  { text: t('sleep_coach_13'), dur: 4000 },
  { text: t('sleep_coach_14'), dur: 4000 },
  { text: t('sleep_coach_15'), dur: 5000 },
  { text: t('sleep_coach_16'), dur: 4000 },
  { text: t('sleep_coach_17'), dur: 4000 },
  { text: t('sleep_coach_18'), dur: 5000 },
  { text: t('sleep_coach_19'), dur: 4000 },
  { text: t('sleep_coach_20'), dur: 4000 },
  { text: t('sleep_coach_21'), dur: 6000 }
];

export function initSleep({ navigateTo }) {
  navigateToGlobal = navigateTo;
  
  // Clean up if we leave the view
  const sleepObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.id === 'view-sleep') {
        if (!mutation.target.classList.contains('hidden')) {
          renderEntryScreen();
        } else {
          stopProtocol();
          document.body.classList.remove('sleep-mode-active');
        }
      }
    });
  });

  const sleepView = document.getElementById('view-sleep');
  if (sleepView) {
    sleepObserver.observe(sleepView, { attributes: true, attributeFilter: ['class'] });
  }
}

function renderEntryScreen() {
  const container = document.getElementById('sleepDynamicArea');
  if (!container) return;

  container.innerHTML = `
    <div id="sleepEntryContainer" class="sleep-entry-container fade-in">
      <button class="sleep-choice-btn" data-choice="mind">
        <div class="sleep-btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
        </div>
        <div class="sleep-btn-text">${t('sleep_choice_mind')}</div>
        <div class="sleep-btn-arrow">→</div>
      </button>
      <button class="sleep-choice-btn" data-choice="body">
        <div class="sleep-btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 7c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path></svg>
        </div>
        <div class="sleep-btn-text">${t('sleep_choice_body')}</div>
        <div class="sleep-btn-arrow">→</div>
      </button>
      <button class="sleep-choice-btn" data-choice="cant-sleep">
        <div class="sleep-btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
        </div>
        <div class="sleep-btn-text">${t('sleep_choice_cant')}</div>
        <div class="sleep-btn-arrow">→</div>
      </button>
    </div>
  `;

  const btns = container.querySelectorAll('.sleep-choice-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const choice = e.currentTarget.getAttribute('data-choice');
      handleChoice(choice);
    });
  });
}

function handleChoice(choice) {
  if (choice === 'mind') {
    renderMindEmptying();
  } else if (choice === 'body') {
    startSilentProtocol('body');
  } else if (choice === 'cant-sleep') {
    startSilentProtocol('coach');
  }
}

function renderMindEmptying() {
  const container = document.getElementById('sleepDynamicArea');
  
  container.innerHTML = `
    <div id="sleepMindEmptying" class="sleep-mind-container fade-in" style="width: 100%;">
      <div class="step-header" style="margin-bottom: 2rem; text-align: center;">
        <h2 style="font-size: 1.8rem; font-weight: 300; margin-bottom: 0.5rem;">${t('sleep_mind_title')}</h2>
        <p style="font-size: 0.9rem; opacity: 0.6;">${t('sleep_mind_desc')}</p>
      </div>
      <div style="position: relative; width: 100%; max-width: 400px; margin: 0 auto;">
        <textarea id="sleepMindInput" class="sleep-mind-textarea glass-panel" placeholder="${t('sleep_mind_placeholder')}"></textarea>
      </div>
      <div style="text-align: center; margin-top: 1rem;">
        <button id="sleepMindDoneBtn" class="primary-btn ghost-btn" style="border: 1px solid rgba(255,255,255,0.2); border-radius: 30px; padding: 0.8rem 2rem;">${t('sleep_btn_done')}</button>
      </div>
    </div>
  `;

  document.getElementById('sleepMindDoneBtn').addEventListener('click', () => {
    // Clear textarea and proceed to protocol
    document.getElementById('sleepMindInput').value = '';
    startSilentProtocol('nsdr');
  });
}

function startSilentProtocol(type) {
  document.body.classList.add('sleep-mode-active');
  const container = document.getElementById('sleepDynamicArea');
  
  container.innerHTML = `
    <div id="sleepProtocolPlayer" class="sleep-protocol-container fade-in">
      <div class="sleep-orb"></div>
      <div id="sleepProtocolText" class="sleep-coach-text"></div>
      <button id="sleepCantSleepBtn" class="sleep-ghost-btn hidden" style="position: absolute; bottom: 3rem; opacity: 0.5; border: none; font-size: 0.9rem;">${t('sleep_btn_still_awake')}</button>
    </div>
  `;

  const cantSleepBtn = document.getElementById('sleepCantSleepBtn');
  cantSleepBtn.addEventListener('click', () => {
    stopProtocol();
    renderCBTiScreen();
  });

  // Start Ambience
  SensoryEngine.setDroneEnabled(true);

  // Play script
  playScript(getLocalizedScript(), 0, () => {
    // End of script
    cantSleepBtn.classList.remove('hidden');
    cantSleepBtn.classList.add('fade-in');
  });
}

function playScript(script, index, onComplete) {
  if (index >= script.length) {
    if (onComplete) onComplete();
    return;
  }

  const textEl = document.getElementById('sleepProtocolText');
  if (!textEl) return; // User navigated away

  const line = script[index];
  
  // Fade in
  textEl.textContent = line.text;
  textEl.classList.remove('fade-out');
  textEl.classList.add('visible');

  // Wait then fade out
  protocolTimeout = setTimeout(() => {
    textEl.classList.remove('visible');
    textEl.classList.add('fade-out');
    
    // Wait for fade out to complete before next line
    protocolTimeout = setTimeout(() => {
      playScript(script, index + 1, onComplete);
    }, 2000); // fade transition time

  }, line.dur);
}

function stopProtocol() {
  if (protocolTimeout) {
    clearTimeout(protocolTimeout);
    protocolTimeout = null;
  }
  // Stop Sleep-related effects
  SensoryEngine.setDroneEnabled(false);
  document.body.classList.remove('sleep-mode-active');
}

function renderCBTiScreen() {
  document.body.classList.remove('sleep-mode-active');
  const container = document.getElementById('sleepDynamicArea');
  
  container.innerHTML = `
    <div id="sleepCBTiView" class="sleep-cbti-container fade-in">
      <div class="sleep-cbti-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      </div>
      <h3 class="sleep-cbti-title">${t('sleep_cbti_title')}</h3>
      <p class="sleep-cbti-desc">
        ${t('sleep_cbti_desc')}
      </p>
      <button id="sleepCbtiDoneBtn" class="primary-btn">${t('sleep_btn_understood')}</button>
    </div>
  `;

  document.getElementById('sleepCbtiDoneBtn').addEventListener('click', () => {
    navigateToGlobal('view-dashboard');
  });
}
