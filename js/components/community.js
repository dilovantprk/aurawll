/**
 * Community Component - Experimental Hub
 * Handles navigation, tabs, and content rendering for the Aura Space.
 */

import { elements } from '../core/dom.js';
import { communityService } from '../services/community.js';

let longPressTimer = null;
const LONG_PRESS_DURATION = 1500; // 1.5 seconds
let isLongPressActive = false;
let isCommunityMode = false;

const COMMUNITY_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
const PROFILE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

/**
 * Checks if the community mode is active.
 */
export function getCommunityMode() {
  return isCommunityMode;
}

export function toggleCommunityMode(force) {
  isCommunityMode = (force !== undefined) ? force : !isCommunityMode;
  const profileBtn = elements.navProfile;
  if (!profileBtn) return;

  const iconContainer = profileBtn.querySelector('.nav-icon');
  const label = profileBtn.querySelector('.nav-label');

  if (isCommunityMode) {
    if (iconContainer) iconContainer.innerHTML = COMMUNITY_ICON;
    if (label) label.textContent = "Space";
    profileBtn.setAttribute('data-view', 'community');
    profileBtn.classList.add('community-active');
    updateBottomNav(true);
  } else {
    if (iconContainer) iconContainer.innerHTML = PROFILE_ICON;
    if (label) label.textContent = "Profile";
    profileBtn.setAttribute('data-view', 'settings');
    profileBtn.classList.remove('community-active');
    updateBottomNav(false);
  }
}

/**
 * Checks if the last interaction was a long press to prevent double-navigation.
 */
export function checkAndResetLongPress() {
  const active = isLongPressActive;
  setTimeout(() => { isLongPressActive = false; }, 200);
  return active;
}

export function initCommunity({ navigateTo }) {
  console.log("[Community] Initializing Hub...");

  // 1. Long-press on Profile Icon to Enter/Exit Community Mode
  const profileBtn = elements.navProfile;
  if (profileBtn) {
    profileBtn.addEventListener('mousedown', startLongPress);
    profileBtn.addEventListener('touchstart', startLongPress, { passive: true });
    profileBtn.addEventListener('mouseup', cancelLongPress);
    profileBtn.addEventListener('mouseleave', cancelLongPress);
    profileBtn.addEventListener('touchend', cancelLongPress);
  }

  function startLongPress(e) {
    isLongPressActive = false;
    longPressTimer = setTimeout(() => {
      isLongPressActive = true;
      toggleCommunityMode(); 
      
      if (isCommunityMode) {
        navigateTo('view-community');
        loadCommunityContent();
        switchCommunityTab('articles'); // Default tab
      } else {
        navigateTo('view-settings');
      }
      
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, LONG_PRESS_DURATION);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer);
  }

  // 2. Tab Navigation within Community (Fallback for non-transformed nav)
  const tabBtns = document.querySelectorAll('.comm-nav-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      const targetTab = btn.getAttribute('data-comm-tab');
      switchCommunityTab(targetTab);
    };
  });

  // 3. Creator Studio Logic
  initCreatorStudio();
}

export async function loadCommunityContent() {
  const data = await communityService.getCommunityData();
  renderArticles(data.articles);
  renderMarketplace(data.modules);
}

function renderArticles(articles) {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  grid.innerHTML = articles.map(art => `
    <div class="comm-card fade-in-up">
      <img src="${art.image}" class="card-img" alt="${art.title}">
      <div class="card-body">
        <span class="card-category">${art.category}</span>
        <h3 class="card-title">${art.title}</h3>
        <p class="card-excerpt">${art.excerpt}</p>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.3);">By ${art.author}</div>
      </div>
    </div>
  `).join('');
}

function renderMarketplace(modules) {
  const grid = document.getElementById('marketGrid');
  if (!grid) return;

  grid.innerHTML = modules.map(mod => `
    <div class="comm-card mod-card fade-in-up">
      <div class="card-body">
        <span class="card-category">${mod.type}</span>
        <h3 class="card-title">${mod.name}</h3>
        <p style="font-size: 0.9rem; opacity: 0.6; margin-bottom: 1rem;">${mod.description}</p>
        <div class="mod-meta">
          <span class="mod-price">${mod.price}</span>
          <button class="install-btn ${mod.installed ? 'installed' : ''}" 
                  onclick="console.log('Installing ${mod.id}...')">
            ${mod.installed ? 'Installed' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function initCreatorStudio() {
  const typeSelect = document.getElementById('creatorTypeSelect');
  const dynamicFields = document.getElementById('creatorDynamicFields');
  const preview = document.getElementById('creatorJsonPreview');
  const publishBtn = document.getElementById('btnPublishCommunity');

  if (!typeSelect || !dynamicFields || !preview) return;

  const updatePreview = () => {
    const type = typeSelect.value;
    let data = { type, author: "You", timestamp: Date.now() };

    if (type === 'breath') {
      const name = document.getElementById('creatorNameInput')?.value || "New Rhythm";
      const inhale = document.getElementById('inhaleRange')?.value || 4;
      const exhale = document.getElementById('exhaleRange')?.value || 6;
      data.name = name;
      data.pattern = { inhale: parseInt(inhale), exhale: parseInt(exhale) };
      data.visuals = { primaryColor: "rgba(100, 228, 159, 0.3)", glowType: "liquid-pulse" };
    } else if (type === 'meditation') {
      data.title = document.getElementById('medTitleInput')?.value || "Deep Journey";
      const dur = document.getElementById('medDurationRange')?.value || 10;
      data.duration = parseInt(dur);
      data.focus = "Vagal Tone";
    } else if (type === 'article') {
      data.title = document.getElementById('artTitleInput')?.value || "Aura Insight";
      data.excerpt = document.getElementById('artExcerptInput')?.value || "A short summary...";
    }

    preview.textContent = JSON.stringify(data, null, 2);
  };

  const renderFields = () => {
    const type = typeSelect.value;
    if (type === 'breath') {
      dynamicFields.innerHTML = `
        <div class="creator-form-group">
          <label class="creator-label"><span>Exercise Name</span></label>
          <input type="text" id="creatorNameInput" class="creator-input" placeholder="e.g. Ocean Breath">
        </div>
        <div class="creator-form-group">
          <label class="creator-label"><span>Inhale</span> <span id="inhaleVal">4s</span></label>
          <input type="range" id="inhaleRange" class="creator-range" min="2" max="10" value="4">
        </div>
        <div class="creator-form-group">
          <label class="creator-label"><span>Exhale</span> <span id="exhaleVal">6s</span></label>
          <input type="range" id="exhaleRange" class="creator-range" min="2" max="12" value="6">
        </div>
      `;
    } else if (type === 'meditation') {
      dynamicFields.innerHTML = `
        <div class="creator-form-group">
          <label class="creator-label"><span>Meditation Title</span></label>
          <input type="text" id="medTitleInput" class="creator-input" placeholder="e.g. Morning Calm">
        </div>
        <div class="creator-form-group">
          <label class="creator-label"><span>Duration</span> <span id="medDurationVal">10 min</span></label>
          <input type="range" id="medDurationRange" class="creator-range" min="5" max="30" value="10">
        </div>
      `;
    } else if (type === 'article') {
      dynamicFields.innerHTML = `
        <div class="creator-form-group">
          <label class="creator-label"><span>Article Title</span></label>
          <input type="text" id="artTitleInput" class="creator-input" placeholder="e.g. The Science of Calm">
        </div>
        <div class="creator-form-group">
          <label class="creator-label"><span>Short Excerpt</span></label>
          <textarea id="artExcerptInput" class="creator-input" placeholder="Write a brief summary..."></textarea>
        </div>
      `;
    }

    dynamicFields.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', (e) => {
        if (e.target.id === 'inhaleRange') document.getElementById('inhaleVal').textContent = e.target.value + 's';
        if (e.target.id === 'exhaleRange') document.getElementById('exhaleVal').textContent = e.target.value + 's';
        if (e.target.id === 'medDurationRange') document.getElementById('medDurationVal').textContent = e.target.value + ' min';
        updatePreview();
      });
    });
    updatePreview();
  };

  typeSelect.addEventListener('change', renderFields);
  renderFields();

  if (publishBtn) {
    publishBtn.onclick = async () => {
      publishBtn.disabled = true;
      const originalText = publishBtn.textContent;
      publishBtn.textContent = "Publishing...";
      const res = await communityService.publishExercise(JSON.parse(preview.textContent));
      if (res.success) {
        publishBtn.textContent = "Published!";
        setTimeout(() => {
          publishBtn.disabled = false;
          publishBtn.textContent = originalText;
        }, 2000);
      }
    };
  }
}

/**
 * Transforms the bottom navigation for Community sections.
 */
export function updateBottomNav(isComm) {
  const navItems = {
    home: document.getElementById('navHome'),
    breathe: document.getElementById('navBreathe'),
    notebook: document.getElementById('navNotebook'),
    insight: document.getElementById('navInsight'),
    profile: document.getElementById('navProfile')
  };

  const ICONS = {
    articles: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    market: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
    create: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    breathe: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`,
    notebook: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    insight: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
  };

  if (isComm) {
    if (navItems.breathe) {
      navItems.breathe.querySelector('.nav-icon').innerHTML = ICONS.articles;
      navItems.breathe.querySelector('.nav-label').textContent = "Articles";
      navItems.breathe.setAttribute('data-view', 'comm-articles');
    }
    if (navItems.notebook) {
      navItems.notebook.querySelector('.nav-icon').innerHTML = ICONS.market;
      navItems.notebook.querySelector('.nav-label').textContent = "Market";
      navItems.notebook.setAttribute('data-view', 'comm-market');
    }
    if (navItems.insight) {
      navItems.insight.querySelector('.nav-icon').innerHTML = ICONS.create;
      navItems.insight.querySelector('.nav-label').textContent = "Create";
      navItems.insight.setAttribute('data-view', 'comm-creator');
    }
  } else {
    if (navItems.breathe) {
      navItems.breathe.querySelector('.nav-icon').innerHTML = ICONS.breathe;
      navItems.breathe.querySelector('.nav-label').textContent = "Breathe";
      navItems.breathe.setAttribute('data-view', 'meditations');
    }
    if (navItems.notebook) {
      navItems.notebook.querySelector('.nav-icon').innerHTML = ICONS.notebook;
      navItems.notebook.querySelector('.nav-label').textContent = "Notes";
      navItems.notebook.setAttribute('data-view', 'notebook');
    }
    if (navItems.insight) {
      navItems.insight.querySelector('.nav-icon').innerHTML = ICONS.insight;
      navItems.insight.querySelector('.nav-label').textContent = "Insight";
      navItems.insight.setAttribute('data-view', 'insight');
    }
  }
}

export function switchCommunityTab(tab) {
  const tabPanes = document.querySelectorAll('.comm-view-pane');
  const targetId = `commTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
  
  tabPanes.forEach(pane => {
    if (pane.id === targetId) {
      pane.classList.remove('hidden');
      pane.classList.add('active');
      setTimeout(() => pane.querySelector('.comm-grid')?.classList.add('visible'), 50);
    } else {
      pane.classList.add('hidden');
      pane.classList.remove('active');
    }
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === `comm-${tab}`) item.classList.add('active');
  });

  // Also sync the secondary tab buttons if they exist
  document.querySelectorAll('.comm-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-comm-tab') === tab);
  });
}
