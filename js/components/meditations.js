import { protocols } from '../core/constants.js';
import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/state.js';

let configProps = {};

export function initMeditations(config) {
  Object.assign(configProps, config);
  
  // Bind Card Clicks
  if (elements.meditationsList) {
    elements.meditationsList.onclick = (e) => {
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

  const protocolMeta = {
    p_478: { icon: '🌙', accent: 'rgba(133, 141, 255, 0.4)', benefit: t('benefit_478') },
    p_sigh: { icon: '💨', accent: 'rgba(168, 230, 207, 0.4)', benefit: t('benefit_sigh') },
    p_bellows: { icon: '🔥', accent: 'rgba(255, 160, 100, 0.4)', benefit: t('benefit_bellows') },
    p_resonance: { icon: '🫀', accent: 'rgba(200, 140, 255, 0.4)', benefit: t('benefit_resonance') },
    p_grounding: { icon: '🌿', accent: 'rgba(133, 141, 255, 0.4)', benefit: t('benefit_grounding') },
    p_box: { icon: 'Box', accent: 'rgba(133, 141, 255, 0.4)', benefit: t('benefit_box') },
    p_phys_sigh: { icon: '😮‍💨', accent: 'rgba(168, 230, 207, 0.4)', benefit: t('benefit_phys_sigh') },
    p_coherent: { icon: '🌊', accent: 'rgba(200, 140, 255, 0.4)', benefit: t('benefit_coherent') },
    p_ext_exhale: { icon: '🌬️', accent: 'rgba(133, 141, 255, 0.4)', benefit: t('benefit_ext_exhale') },
    p_cyclic_sigh: { icon: '🌀', accent: 'rgba(168, 230, 207, 0.4)', benefit: t('benefit_cyclic_sigh') },
    p_fire: { icon: '⚡️', accent: 'rgba(255, 160, 100, 0.4)', benefit: t('benefit_fire') },
    p_nadi: { icon: '☯️', accent: 'rgba(200, 140, 255, 0.4)', benefit: t('benefit_nadi') }
  };

  const breatheProtocols = protocols || {};
  
  const renderCard = (id, p) => {
    const meta = protocolMeta[id] || { icon: '🫁', accent: 'rgba(255,255,255,0.1)', benefit: '' };
    const mins = Math.ceil(p.totalDuration / 60);
    return `
      <button class="meditation-card ${AppState._activeFilter && AppState._activeFilter !== 'all' && p.category !== AppState._activeFilter ? 'hidden-protocol' : ''}" 
              data-protocol="${id}" style="border-left: 3px solid ${meta.accent};">
        <div class="meditation-card-icon">${meta.icon}</div>
        <div class="meditation-card-info">
          <span class="meditation-card-title">${p.title}</span>
          <span class="meditation-card-meta">${mins} min · ${meta.benefit}</span>
        </div>
      </button>`;
  };

  const breathHTML = Object.keys(breatheProtocols).map(id => renderCard(id, breatheProtocols[id])).join('');

  elements.meditationsList.innerHTML = breathHTML;

  elements.meditationsList.querySelectorAll('.meditation-card').forEach(card => {
    card.addEventListener('click', () => {
      const protocolId = card.getAttribute('data-protocol');
      if (configProps.prepareExercise) configProps.prepareExercise(protocolId);
    });
  });
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
