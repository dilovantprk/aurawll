/**
 * Aura | Swipe Breathing Component
 * Handles the Tinder-swipe interface for choosing 1-minute breathing protocols.
 */

import { SwipeDeck } from './swipe-deck.js';
import { protocols, PROTOCOL_ICONS } from '../core/constants.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/state.js';
import { prepareExercise } from './checkin.js';
import { vibrate } from '../core/utils.js';

let configProps = {
  navigateTo: null
};

let deckInstance = null;

export function initSwipeBreathing(config) {
  Object.assign(configProps, config);
}

export function startSwipeBreathingFlow() {
  if (deckInstance) {
    deckInstance.destroy();
    deckInstance = null;
  }

  const container = document.getElementById('swipeBreathingDeck');
  if (!container) return;

  // Convert protocols object into shuffled array
  const rawItems = Object.keys(protocols).map(id => ({
    id,
    ...protocols[id]
  }));

  // Shuffle array utility
  const shuffledItems = [...rawItems].sort(() => Math.random() - 0.5);

  // Initialize swipe deck
  deckInstance = new SwipeDeck(container, {
    badgeLeftText: t('lang') === 'tr' ? 'GEÇ' : 'SKIP',
    badgeRightText: t('lang') === 'tr' ? 'BAŞLA' : 'START',
    renderCardContent: (item) => {
      const mins = Math.ceil(item.totalDuration / 60);
      const sciTitle = t(`sci_${item.id}_title`) || item.id;
      const descText = t(`mc_${item.id}`) || '';

      // Soft colored glowing backgrounds based on category
      let glowColor = 'rgba(133, 141, 255, 0.07)';
      if (item.category === 'Calm' || item.category === 'Denge') glowColor = 'rgba(100, 228, 159, 0.08)';
      if (item.category === 'Focus' || item.category === 'Odak') glowColor = 'rgba(251, 160, 68, 0.08)';
      if (item.category === 'Energize' || item.category === 'Enerji') glowColor = 'rgba(255, 107, 107, 0.08)';

      return `
        <!-- Decorative Glow Blob -->
        <div class="card-glow" style="position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; background: radial-gradient(circle at 20% 20%, ${glowColor} 0%, transparent 60%); pointer-events: none; z-index: -1;"></div>

        <!-- TOP: Category tag & Duration -->
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;">
          <span class="card-tag-v2" style="background: rgba(255, 255, 255, 0.05); padding: 5px 12px; border-radius: 20px; font-size: 0.65rem; text-transform: uppercase; border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.65); font-weight: 600; letter-spacing: 1px;">
            ${item.category}
          </span>
          <span style="font-size: 0.75rem; opacity: 0.55; font-weight: 500; letter-spacing: 0.5px;">
            ${mins} dk
          </span>
        </div>
        
        <!-- MIDDLE: Title, Subtitle, and benefit paragraph -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: left; width: 100%; padding: 12px 0;">
          <h3 style="font-size: 1.45rem; font-weight: 700; margin: 0 0 6px 0; background: linear-gradient(135deg, #ffffff, rgba(255, 255, 255, 0.7)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.25; font-family: var(--font-family);">
            ${sciTitle}
          </h3>
          <span style="font-size: 0.8rem; opacity: 0.5; font-weight: 500; margin-bottom: 16px; display: block; letter-spacing: 0.5px;">
            ${t(item.titleKey)}
          </span>
          <p style="font-size: 0.85rem; opacity: 0.7; line-height: 1.5; margin: 0; max-height: 110px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; font-weight: 300;">
            ${descText}
          </p>
        </div>
        
        <!-- FOOTER: Icon and play pill button -->
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 16px; margin-top: 8px;">
          <!-- Rounded app-like icon container -->
          <div style="background: rgba(255, 255, 255, 0.04); border-radius: 12px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255,255,255,0.85); box-shadow: 0 8px 16px rgba(0,0,0,0.15);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="opacity: 0.9;">
              ${PROTOCOL_ICONS[item.id] || ''}
            </svg>
          </div>
          
          <!-- Elegant action pill button -->
          <div style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 6px 16px; font-size: 0.75rem; font-weight: 600; color: #fff; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); cursor: pointer;">
            <span>${t('lang') === 'tr' ? 'BAŞLA' : 'START'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      `;
    },
    onSwipeLeft: (item) => {
      vibrate('light');
    },
    onSwipeRight: (item) => {
      vibrate('medium');
      AppState.isCheckIn = false;
      
      // Determine portal color RGB based on category
      let colorRGB = '16, 185, 129'; // default Calm green
      if (item.category === 'Focus' || item.category === 'Odak') colorRGB = '245, 158, 11';
      if (item.category === 'Energize' || item.category === 'Enerji') colorRGB = '255, 107, 107';

      // Destroy deck instance to prevent interaction during transition
      if (deckInstance) {
        deckInstance.destroy();
      }
      
      // Trigger Portal Transition, loading the exercise midway
      if (configProps.triggerPortalTransition) {
        configProps.triggerPortalTransition('view-exercise', colorRGB, () => {
          prepareExercise(item.id);
        });
      } else {
        prepareExercise(item.id);
      }
    }
  });

  deckInstance.init(shuffledItems);
}

export function destroySwipeBreathingFlow() {
  if (deckInstance) {
    deckInstance.destroy();
    deckInstance = null;
  }
}
