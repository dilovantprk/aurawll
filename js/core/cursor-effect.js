/**
 * Aura | Global Cursor / Touch Glow Effect
 * Event delegation kullanarak .glow-card class'lı tüm elemanlara
 * --cursor-x / --cursor-y CSS custom property'lerini dinamik olarak set eder.
 * Check-in ve meditation akışlarında otomatik devre dışı kalır.
 */

const EXCLUDED_VIEWS = [
  'view-somatic-entry',
  'view-affect-grid',
  'view-emotion-refinement',
  'view-exercise',
  'view-savoring',
  'view-meditation-loading',
  'view-completion',
  'view-welcome',
  'view-auth',
  'view-onboarding',
];

function isExcluded() {
  const active = document.querySelector('.view.active');
  if (!active) return false;
  return EXCLUDED_VIEWS.some(id => active.id === id);
}

function applyToCard(card, x, y) {
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--cursor-x', `${x - rect.left}px`);
  card.style.setProperty('--cursor-y', `${y - rect.top}px`);
}

export function initGlobalCursorEffect() {
  // Mouse — desktop
  document.addEventListener('mousemove', (e) => {
    if (isExcluded()) return;
    const card = e.target.closest('.glow-card');
    if (!card) return;
    applyToCard(card, e.clientX, e.clientY);
  }, { passive: true });

  // Touch — mobile
  document.addEventListener('touchstart', (e) => {
    if (isExcluded()) return;
    const card = e.target.closest('.glow-card');
    if (!card) return;
    const t = e.touches[0];
    applyToCard(card, t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (isExcluded()) return;
    const card = e.target.closest('.glow-card');
    if (!card) return;
    const t = e.touches[0];
    applyToCard(card, t.clientX, t.clientY);
  }, { passive: true });
}
