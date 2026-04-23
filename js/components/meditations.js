import { protocols, PROTOCOL_META } from '../core/constants.js';
import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/state.js';

let configProps = {};

export function initMeditations(config) {
  Object.assign(configProps, config);
  
  // Bind Card Clicks
  if (elements.meditationsList) {
    elements.meditationsList.onclick = (e) => {
      if (e.target.closest('.info-trigger')) return;
      const card = e.target.closest('.meditation-card');
      if (card && configProps.prepareExercise) {
        const protocolId = card.getAttribute('data-protocol');
        configProps.prepareExercise(protocolId);
      }
    };
  }

  renderMeditationsList();
  renderFilterChips();
  renderRecommendations();
}

export function renderMeditationsList() {
  if (!elements.meditationsList) return;

  const historyItems = (AppState.user && AppState.user.history && AppState.user.history.length > 0) 
    ? AppState.user.history 
    : (AppState.mockHistory || []);
  
  const lastEntry = historyItems.length > 0 ? historyItems[0] : null;

  const breatheProtocols = protocols || {};
  
  const renderCard = (id, p) => {
    const metaData = PROTOCOL_META[id] || { icon: '🫁', accent: 'rgba(255,255,255,0.1)', benefitKey: '' };
    const benefit = metaData.benefitKey ? t(metaData.benefitKey) : '';
    const mins = Math.ceil(p.totalDuration / 60);
    return `
      <div class="meditation-card ${AppState._activeFilter && AppState._activeFilter !== 'all' && p.category !== AppState._activeFilter ? 'hidden-protocol' : ''}" 
              data-protocol="${id}" style="border-left: 3px solid ${metaData.accent};">
        <div class="meditation-card-icon">
          <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${metaData.icon}
          </svg>
        </div>
        <div class="meditation-card-info">
          <span class="meditation-card-title">${t(p.titleKey)}</span>
          <span class="meditation-card-meta">${mins} min · ${benefit}</span>
        </div>
        <button class="cockpit-info-btn info-trigger" data-type="${id}">i</button>
      </div>`;
  };

  const breathHTML = Object.keys(breatheProtocols).map(id => renderCard(id, breatheProtocols[id])).join('');

  elements.meditationsList.innerHTML = breathHTML;


}


export function renderFilterChips() {
  if (!elements.filterChips) return;
  const categories = [
    { id: 'all', label: t('cat_all') },
    { id: 'calm', label: t('cat_calm') },
    { id: 'focus', label: t('cat_focus') },
    { id: 'energize', label: t('cat_energize') }
  ];
  AppState._activeFilter = AppState._activeFilter || 'all';
  elements.filterChips.innerHTML = categories.map(cat => `
    <button class="filter-chip ${AppState._activeFilter === cat.id ? 'active' : ''}" data-category="${cat.id}">
      ${cat.label}
    </button>
  `).join('');

  elements.filterChips.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      AppState._activeFilter = chip.getAttribute('data-category');
      renderFilterChips();
      renderMeditationsList();
    });
  });
}

export function renderRecommendations() {
  if (!elements.recommendationsContainer) return;
  // Recommendations logic here...
}
