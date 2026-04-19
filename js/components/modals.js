import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';

let isModalOpen = false;
let configProps = {
  pauseExercise: null,
  pauseMeditation: null,
  resumeExercise: null,
  resumeMeditation: null,
  getExerciseParams: null,
  isTimerPaused: false,
  isMeditationPaused: false
};

export function initModals(config) {
  Object.assign(configProps, config);
  
  if (elements.closeInfoBtn) elements.closeInfoBtn.addEventListener('click', hideInfoModal);
  if (elements.infoBackdrop) elements.infoBackdrop.addEventListener('click', hideInfoModal);
  if (elements.closeVagalModal) elements.closeVagalModal.addEventListener('click', hideInfoModal);

  // Global Info Support: Handle all elements with data-info or data-type
  document.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.cockpit-info-btn, .info-icon, .info-trigger');
    if (infoBtn) {
      const infoKey = infoBtn.getAttribute('data-info') || infoBtn.getAttribute('data-type');
      if (infoKey) openInfoArchive(infoKey);
    }
  });
}

export function updateModalState(state) {
  Object.assign(configProps, state);
}

function getAuraSVGIcon(type) {
  const iconMap = {
    'heatmap': `<rect x="18" y="18" width="8" height="8" rx="1" fill="white" opacity="0.6"/><rect x="28" y="18" width="8" height="8" rx="1" fill="white" opacity="0.3"/><rect x="38" y="18" width="8" height="8" rx="1" fill="white" opacity="0.8"/><rect x="18" y="28" width="8" height="8" rx="1" fill="white" opacity="0.2"/><rect x="28" y="28" width="8" height="8" rx="1" fill="white" opacity="0.9"/><rect x="38" y="28" width="8" height="8" rx="1" fill="white" opacity="0.4"/><rect x="18" y="38" width="8" height="8" rx="1" fill="white" opacity="0.5"/><rect x="28" y="38" width="8" height="8" rx="1" fill="white" opacity="0.1"/><rect x="38" y="38" width="8" height="8" rx="1" fill="white" opacity="0.7"/>`,
    'resilience': `<path d="M12 32 C 18 12, 26 52, 32 32 C 38 12, 46 52, 52 32" stroke="white" stroke-width="1.5" fill="none" opacity="0.8"/><path d="M12 32 L 52 32" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'insight': `<circle cx="32" cy="32" r="12" stroke="white" stroke-width="1.5"/><circle cx="32" cy="32" r="22" stroke="white" stroke-width="0.5" stroke-dasharray="2 4"/><path d="M32 20V12M32 52V44M44 32H52M12 32H20" stroke="white" stroke-width="1" opacity="0.6"/>`,
    'exercise': `<path d="M22 32L28 32L32 20L36 44L40 32L46 32" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="32" cy="32" r="25" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'step1': `<circle cx="32" cy="32" r="6" fill="white" opacity="0.9"><animate attributeName="r" values="6;10;6" dur="3s" repeatCount="indefinite"/></circle><path d="M32 10V54M10 32H54" stroke="white" stroke-width="0.5" opacity="0.3"/>`,
    'step2': `<path d="M32 12V52M12 32H52" stroke="white" stroke-width="1" opacity="0.4"/><rect x="22" y="22" width="20" height="20" stroke="white" stroke-width="1.5"/><circle cx="37" cy="27" r="3" fill="white"/>`,
    'step2b': `<path d="M20 20H44V36H28L20 44V20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="28" r="1" fill="white"/><circle cx="28" cy="28" r="1" fill="white"/><circle cx="36" cy="28" r="1" fill="white"/>`,
    'step3': `<path d="M18 48C18 48 12 40 12 30C12 20 20 12 32 12C44 12 52 20 52 30C52 40 46 48 46 48" stroke="white" stroke-width="1.5" fill="none"/><path d="M32 28V44" stroke="white" stroke-width="1" opacity="0.5"/>`,
    'step4': `<circle cx="32" cy="32" r="4" fill="white"/><circle cx="32" cy="32" r="12" stroke="white" stroke-width="1" opacity="0.4"/><circle cx="32" cy="32" r="24" stroke="white" stroke-width="0.5" opacity="0.2"/>`,
    'step5': `<path d="M20 44L32 20L44 44H20Z" stroke="white" stroke-width="1.5" fill="none"/><circle cx="32" cy="34" r="2" fill="white"/>`,
    'step6': `<path d="M32 48C32 48 12 36 12 24C12 16 18 12 24 12C28 12 32 15 32 15C32 15 36 12 40 12C46 12 52 16 52 24C52 36 32 48 32 48Z" stroke="white" stroke-width="1.5" fill="none"/><path d="M22 24H42" stroke="white" stroke-width="0.5" opacity="0.4"/>`,
    'breathing': `<circle cx="32" cy="32" r="14" stroke="white" stroke-width="1.5" fill="none"><animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite"/></circle><circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.2)" stroke-width="1" fill="none"/>`
  };
  
  const innerContent = iconMap[type] || `<circle cx="32" cy="32" r="10" fill="white" opacity="0.8"/><circle cx="32" cy="32" r="22" stroke="rgba(255,255,255,0.2)" fill="none"/>`;
  
  return `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="auraGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g filter="url(#auraGlow)">
        ${innerContent}
      </g>
    </svg>
  `;
}

export function openInfoArchive(key) {
  if (!elements.vagalModal) return;

  const type = key.replace('info_', '').replace('_desc', '').replace('_title', '').replace('_body', '');
  
  let title, body, ref;
  const exerciseParams = typeof configProps.getExerciseParams === 'function' ? configProps.getExerciseParams() : null;

  if (type === 'breathing' && exerciseParams && exerciseParams.id) {
    const pId = exerciseParams.id;
    title = t(`sci_${pId}_title`);
    body = t(`sci_${pId}_desc`);
    ref = t(`sci_${pId}_ref`);
  } else {
    title = t(`info_${type}_title`);
    body = t(`info_${type}_body`);
    ref = t(`info_${type}_ref`);
  }

  if (elements.vagalModalTitle) elements.vagalModalTitle.style.display = 'none';
  if (elements.vagalModalHeatmap) elements.vagalModalHeatmap.style.display = 'none';
  if (elements.vagalModalRec) elements.vagalModalRec.style.display = 'none';

  if (elements.vagalModalAnalysis) {
    elements.vagalModalAnalysis.innerHTML = `
      <div class="info-sheet-content">
        <div class="info-sheet-icon">${getAuraSVGIcon(type)}</div>
        <h2 class="info-sheet-title">${title}</h2>
        <div class="info-sheet-body">${body}</div>
        <div class="info-sheet-ref">Source: ${ref}</div>
      </div>
    `;
  }

  elements.vagalModal.classList.add('open');
  
  if (!configProps.isTimerPaused && configProps.pauseExercise) configProps.pauseExercise();
  if (!configProps.isMeditationPaused && configProps.pauseMeditation) configProps.pauseMeditation();
}

export function showInfoModal(type) {
  openInfoArchive(`info_${type}`);
}

export function hideInfoModal() {
  isModalOpen = false;
  if(elements.infoBackdrop) elements.infoBackdrop.classList.remove('active');
  if(elements.infoModal) elements.infoModal.classList.remove('active');
  if(elements.vagalModal) elements.vagalModal.classList.remove('open');

  if (configProps.isTimerPaused && configProps.resumeExercise) configProps.resumeExercise();
  if (configProps.isMeditationPaused && configProps.resumeMeditation) configProps.resumeMeditation();
}
