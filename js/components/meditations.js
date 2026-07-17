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

  const openSwipeBtn = document.getElementById('openSwipeBreathingBtn');
  if (openSwipeBtn) {
    openSwipeBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('aura-haptic', {detail: 'medium'}));
      if (configProps.navigateTo) {
        configProps.navigateTo('view-swipe-breathing');
      }
    });
  }

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
    const metaData = PROTOCOL_META[id] || { icon: '🫁', accent: 'rgba(255,255,255,0.1)' };
    const mins = Math.ceil(p.totalDuration / 60);
    const sciTitle = t(`sci_${id}_title`);

    return `
      <div class="meditation-card liquid-glass" 
           data-protocol="${id}" 
           data-category="${p.category || 'all'}">
        
        <button class="cockpit-info-btn info-trigger" data-type="${id}">i</button>
        
        <div class="meditation-card-content">
          <div class="meditation-card-top">
            <h3 class="card-title-v2">${sciTitle}</h3>
          </div>
          
          <div class="meditation-card-bottom">
            <div class="meditation-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                ${metaData.icon}
              </svg>
            </div>
            <div class="meditation-card-meta">
              <span class="meditation-card-mins">${mins} ${t('meditations_duration')}</span>
              <span class="meditation-card-original-title">${t(p.titleKey)}</span>
            </div>
          </div>
        </div>
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

let canvas = null;
let ctx = null;
let orbs = [];
let animationFrameId = null;

function initCanvasVisualizer() {
  canvas = document.getElementById('meditationBgCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  function resize() {
    if (canvas) {
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight / 2;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  const activeAccent = getComputedStyle(document.documentElement).getPropertyValue('--vagal-accent').trim() || '#64e49f';
  orbs = [
    { x: Math.random() * (window.innerWidth / 2), y: Math.random() * (window.innerHeight / 2), r: 100, vx: 0.15, vy: 0.12, color: activeAccent }, 
    { x: Math.random() * (window.innerWidth / 2), y: Math.random() * (window.innerHeight / 2), r: 130, vx: -0.12, vy: 0.15, color: '#A8E6CF' }, 
    { x: Math.random() * (window.innerWidth / 2), y: Math.random() * (window.innerHeight / 2), r: 110, vx: 0.1, vy: -0.18, color: '#A2D1FF' }
  ];
}

function animateOrbs() {
  if (!ctx || !canvas) return;

  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  orbs.forEach(orb => {
    orb.x += orb.vx;
    orb.y += orb.vy;

    if (orb.x < 0 || orb.x > canvas.width) orb.vx *= -1;
    if (orb.y < 0 || orb.y > canvas.height) orb.vy *= -1;

    let gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    gradient.addColorStop(0, orb.color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  });

  animationFrameId = requestAnimationFrame(animateOrbs);
}

export function startMeditationBgAnimation() {
  // Disabled: Nefes page background has been matched with homepage (using global #aura-background)
}

export function stopMeditationBgAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}
