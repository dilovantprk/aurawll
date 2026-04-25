/**
 * Community Component - Stats & Identity Modal
 * Handles the Ben/Topluluk/Veri tabs in the main identity modal.
 */

import { elements } from '../core/dom.js';

/**
 * Initializes the identity modal tabs.
 */
export function initCommunity({ navigateTo }) {
  console.log("[Community] Initializing Stats Hub...");

  const tabBtns = document.querySelectorAll('.comm-tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      const targetTab = btn.getAttribute('data-tab');
      switchCommunityTab(targetTab);
    };
  });
}

export function switchCommunityTab(tab) {
  const tabPanes = document.querySelectorAll('.comm-tab-pane');
  const indicator = document.querySelector('.comm-tab-indicator');
  const activeBtn = document.querySelector(`.comm-tab-btn[data-tab="${tab}"]`);
  
  tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `commTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  });

  document.querySelectorAll('.comm-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn === activeBtn);
  });

  if (indicator && activeBtn) {
    indicator.style.width = `${activeBtn.offsetWidth}px`;
    indicator.style.left = `${activeBtn.offsetLeft}px`;
  }
}
