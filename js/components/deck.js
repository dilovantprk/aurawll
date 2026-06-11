import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { protocols, PROTOCOL_META } from '../core/constants.js';
import { prepareExercise } from './checkin.js';
import { SensoryEngine } from '../services/sensory.js';

let deckStack = null;
let currentCards = [];
let deckType = ''; // 'breath' or 'ambient'
let activeAmbientId = null;

// Ambient sounds data (re-declared or imported if ambient.js exported it, but we'll mock or fetch for now)
let ambientSounds = [];

export function setAmbientData(sounds, icons) {
  ambientSounds = sounds;
  // attach icons to sounds if needed
}

export function initSwipeDeck() {
  deckStack = document.getElementById('deckStack');
  const closeBtn = document.getElementById('closeSwipeDeckBtn');
  const modal = document.getElementById('swipeDeckModal');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeDeck);
  }

  // Also close on backdrop click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('deck-backdrop') || e.target.classList.contains('deck-container')) {
        closeDeck();
      }
    });
  }
}

export function openBreathDeck() {
  deckType = 'breath';
  const modal = document.getElementById('swipeDeckModal');
  if (!modal || !deckStack) return;

  // Build cards from protocols
  currentCards = Object.keys(protocols).map(id => {
    const p = protocols[id];
    const meta = PROTOCOL_META[id] || {};
    return {
      id: id,
      title: t(p.titleKey),
      desc: t(meta.benefitKey) || p.category,
      duration: Math.floor(p.totalDuration / 60) + ' Dk',
      icon: meta.icon
    };
  });

  renderDeck();
  modal.classList.add('active');
  document.querySelector('.deck-backdrop')?.classList.add('active');
}

export function openAmbientDeck(sounds, iconMap) {
  deckType = 'ambient';
  const modal = document.getElementById('swipeDeckModal');
  if (!modal || !deckStack) return;

  currentCards = sounds.map(s => {
    return {
      id: s.id,
      title: t(s.titleKey),
      desc: s.category.toUpperCase(),
      duration: 'Sonsuz',
      icon: iconMap[s.icon] || '',
      visual: s.visual,
      url: s.url,
      type: s.type,
      subtype: s.subtype
    };
  });

  renderDeck();
  modal.classList.add('active');
  document.querySelector('.deck-backdrop')?.classList.add('active');
  
  // Play preview of the top card immediately
  if (currentCards.length > 0) {
    playAmbientPreview(currentCards[0]);
  }
}

function renderDeck() {
  deckStack.innerHTML = '';
  // Render cards in reverse order so [0] is on top (highest z-index)
  // We'll just render 5 cards at a time to prevent DOM bloat, or all of them. Let's do all.
  const reversed = [...currentCards].reverse();
  
  reversed.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'deck-card';
    if (deckType === 'ambient') {
      cardEl.classList.add('ambient-mode');
      cardEl.setAttribute('data-visual', card.visual);
    }
    cardEl.setAttribute('data-id', card.id);
    
    // Z-index and slight scale for stack effect
    const stackIndex = currentCards.length - 1 - index;
    cardEl.style.zIndex = 100 - stackIndex;
    
    if (stackIndex > 0) {
      const scale = Math.max(0.8, 1 - (stackIndex * 0.05));
      const ty = Math.min(40, stackIndex * 15);
      cardEl.style.transform = `translateY(${ty}px) scale(${scale})`;
      cardEl.dataset.baseTransform = `translateY(${ty}px) scale(${scale})`;
    } else {
      cardEl.style.transform = `translateY(0) scale(1)`;
      cardEl.dataset.baseTransform = `translateY(0) scale(1)`;
    }

    cardEl.innerHTML = `
      <div class="card-icon">${card.icon}</div>
      <h2>${card.title}</h2>
      <p class="card-desc">${card.desc}</p>
      <div class="card-meta">
        <span>${deckType === 'breath' ? 'Nefes' : 'Ambiyans'} • ${card.duration}</span>
      </div>
    `;

    deckStack.appendChild(cardEl);

    // Only attach physics to the top card
    if (stackIndex === 0) {
      attachPhysics(cardEl, card);
    }
  });
}

function attachPhysics(el, cardData) {
  let startX = 0, startY = 0, currentX = 0, currentY = 0;
  let isDragging = false;

  const onStart = (x, y) => {
    startX = x; startY = y;
    isDragging = true;
    el.classList.add('dragging');
  };

  const onMove = (x, y) => {
    if (!isDragging) return;
    currentX = x - startX;
    currentY = y - startY;
    const rotate = currentX * 0.05;
    el.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('dragging');

    const threshold = window.innerWidth * 0.25; // 25% of screen width

    if (currentX > threshold) {
      // SWIPE RIGHT (Accept / Start)
      el.classList.add('swiped-right');
      setTimeout(() => handleSwipeRight(cardData), 300);
    } else if (currentX < -threshold) {
      // SWIPE LEFT (Reject / Next)
      el.classList.add('swiped-left');
      setTimeout(() => handleSwipeLeft(), 300);
    } else {
      // SNAP BACK
      el.style.transform = el.dataset.baseTransform;
    }
    
    currentX = 0; currentY = 0;
  };

  // Touch
  el.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
  el.addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
  el.addEventListener('touchend', onEnd);
  
  // Mouse
  el.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => { if (isDragging) onMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { if (isDragging) onEnd(); });
}

function handleSwipeLeft() {
  // Move top card to bottom (Infinite Loop)
  const swipedCard = currentCards.shift();
  currentCards.push(swipedCard);
  
  // Re-render
  renderDeck();

  if (deckType === 'ambient') {
    playAmbientPreview(currentCards[0]);
  } else {
    // light haptic
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
  }
}

function handleSwipeRight(cardData) {
  // strong haptic
  if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);

  if (deckType === 'breath') {
    closeDeck();
    prepareExercise(cardData.id);
  } else if (deckType === 'ambient') {
    // Go full screen ambient mode
    enterFullscreenAmbient(cardData);
  }
}

function playAmbientPreview(cardData) {
  activeAmbientId = cardData.id;
  // If it's a file, we should play it using SensoryEngine
  if (cardData.url) {
    SensoryEngine.playAtmosphere(cardData.id, cardData.url);
  } else if (cardData.type === 'noise') {
    SensoryEngine.playNoise(cardData.id); // e.g. pink, brown
  } else if (cardData.type === 'binaural') {
    // optional binaural handler
  }
}

function enterFullscreenAmbient(cardData) {
  // Logic to expand the card and hide the modal UI
  const modal = document.getElementById('swipeDeckModal');
  modal.classList.remove('active');
  document.querySelector('.deck-backdrop')?.classList.remove('active');
  
  // For now, we simulate full screen by starting the ambient sound properly
  // and opening the ambient list view or custom visualizer view.
  // Assuming ambient.js has a way to trigger active sound visually.
  document.dispatchEvent(new CustomEvent('aura-ambient-start', { detail: cardData.id }));
}

export function closeDeck() {
  const modal = document.getElementById('swipeDeckModal');
  if (modal) {
    modal.classList.remove('active');
    document.querySelector('.deck-backdrop')?.classList.remove('active');
  }
  
  if (deckType === 'ambient') {
    // Stop preview
    if (SensoryEngine.atmospheres) {
      Object.values(SensoryEngine.atmospheres).forEach(h => {
        h.fade(h.volume(), 0, 1000);
        setTimeout(() => h.stop(), 1100);
      });
    }
    if (SensoryEngine.playNoise) SensoryEngine.playNoise('none');
  }
  
  setTimeout(() => {
    if (deckStack) deckStack.innerHTML = '';
    currentCards = [];
  }, 400);
}
