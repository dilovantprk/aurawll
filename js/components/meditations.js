import { protocols, PROTOCOL_META } from '../core/constants.js';
import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/state.js';

let configProps = {};

/**
 * Initializes the meditation view logic and events.
 */
export function initMeditations(config) {
  Object.assign(configProps, config);
  
  // Bind Card Clicks & Touch Tracking
  if (elements.meditationsList) {
    // Track touch position for dynamic glow effect
    elements.meditationsList.addEventListener('touchstart', (e) => {
      const card = e.target.closest('.meditation-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      card.style.setProperty('--touch-x', `${x}px`);
      card.style.setProperty('--touch-y', `${y}px`);
    }, { passive: true });

    elements.meditationsList.onclick = (e) => {
      const infoTrigger = e.target.closest('.info-trigger');
      if (infoTrigger) {
        // Handled by global listener in modals.js, but stop bubble here
        return;
      }
      const card = e.target.closest('.meditation-card');
      if (card && configProps.prepareExercise) {
        const protocolId = card.getAttribute('data-protocol');
        configProps.prepareExercise(protocolId);
      }
    };
  }

  // Initial Rendering
  renderMeditationsList();
  renderFilterChips();
  renderRecommendations();
  
  // Apply initial filter state if any
  applyFilter(AppState._activeFilter || 'all');
}

/**
 * Renders all available meditation protocols as cards.
 */
export function renderMeditationsList() {
  if (!elements.meditationsList) return;

  const breatheProtocols = protocols || {};
  
  const renderCard = (id, p) => {
    const metaData = PROTOCOL_META[id] || { icon: '🫁', accent: 'rgba(255,255,255,0.1)', benefitKey: '' };
    const benefit = metaData.benefitKey ? t(metaData.benefitKey) : '';
    const mins = Math.ceil(p.totalDuration / 60);
    
    return `
      <div class="meditation-card" 
           data-protocol="${id}" 
           data-category="${p.category || 'all'}" 
           style="--card-accent: ${metaData.accent};">
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

  elements.meditationsList.innerHTML = Object.keys(breatheProtocols)
    .map(id => renderCard(id, breatheProtocols[id]))
    .join('');
    
  // Ensure the current filter is applied to the newly rendered list
  applyFilter(AppState._activeFilter || 'all');
}

/**
 * Renders filter chips and handles their click events via delegation.
 */
export function renderFilterChips() {
  if (!elements.filterChips) return;
  
  const categories = [
    { id: 'all', label: t('cat_all') },
    { id: 'calm', label: t('cat_calm') },
    { id: 'focus', label: t('cat_focus') },
    { id: 'energize', label: t('cat_energize') }
  ];
  
  const activeId = AppState._activeFilter || 'all';
  
  elements.filterChips.innerHTML = categories.map(cat => `
    <button class="filter-chip ${activeId === cat.id ? 'active' : ''}" data-category="${cat.id}">
      ${cat.label}
    </button>
  `).join('');

  // Event Delegation for Filter Chips
  elements.filterChips.onclick = (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    
    const category = chip.getAttribute('data-category');
    AppState._activeFilter = category;
    
    // Update visual active state of chips
    elements.filterChips.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c === chip);
    });
    
    applyFilter(category);
  };
}

/**
 * Applies the filter by updating the data-filter attribute on the list container.
 * This triggers the CSS-based filtering.
 */
export function applyFilter(category) {
  if (!elements.meditationsList) return;
  elements.meditationsList.setAttribute('data-filter', category || 'all');
}

/**
 * Renders recommendations based on user history or current state.
 */
export function renderRecommendations() {
  if (!elements.recommendationsContainer) return;
  // Recommendations logic here...
}
