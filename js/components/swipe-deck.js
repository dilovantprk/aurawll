/**
 * Aura | SwipeDeck Component
 * High-performance, touch-friendly Tinder-like swipeable card deck.
 */

import { SensoryEngine } from '../services/sensory.js';

export class SwipeDeck {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('[SwipeDeck] Container element is required.');
    }
    this.container = container;
    this.options = {
      onSwipeLeft: () => {},   // e.g. Shuffle/Next
      onSwipeRight: () => {},  // e.g. Select/Start
      onCardChange: () => {},  // Called when a new card becomes active at top
      renderCardContent: (item) => `<h3>${item.title || ''}</h3>`,
      dismissOnSwipeRight: true,
      badgeLeftText: 'SIRADAKİ',
      badgeRightText: 'SEÇ',
      ...options
    };

    this.items = [];       // Array of items (protocols or ambient sounds)
    this.currentIndex = 0; // Current index in items
    this.cards = [];       // Array of card DOM elements

    // Drag tracking state
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.startTime = 0;
    this.grabRelativeY = 0.5;
    this.isDragging = false;
    this.topCard = null;
    this.secondCard = null;

    // Thresholds
    this.swipeThreshold = 100; // px
    this.maxRotation = 15;     // degrees

    // Bound event handlers for event listener removal
    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);

    this.eventsBound = false;
  }

  /**
   * Initializes the deck with items and renders initial cards
   */
  init(items) {
    this.items = [...items];
    this.currentIndex = 0;
    this.container.innerHTML = '';
    this.cards = [];

    if (this.items.length === 0) return;

    // Render the first 2 cards to begin with
    this.pushCard(this.items[this.currentIndex]);
    if (this.items.length > 1) {
      const nextIndex = (this.currentIndex + 1) % this.items.length;
      this.pushCard(this.items[nextIndex]);
    }

    this.updateStackPositions();
    this.bindEvents();
    
    // Trigger initial card change
    if (this.options.onCardChange && this.items.length > 0) {
      this.options.onCardChange(this.items[this.currentIndex]);
    }
  }

  /**
   * Creates a card DOM element and adds it to the deck
   */
  pushCard(item) {
    const card = document.createElement('div');
    card.className = 'swipe-card glass-panel';
    card.dataset.id = item.id;
    
    // Badges for swipe direction visual feedback
    card.innerHTML = `
      <div class="swipe-badge badge-left">${this.options.badgeLeftText}</div>
      <div class="swipe-badge badge-right">${this.options.badgeRightText}</div>
      <div class="swipe-card-inner">
        ${this.options.renderCardContent(item)}
      </div>
    `;

    // Add to DOM at the bottom of stack (visually behind)
    this.container.appendChild(card);
    this.cards.push(card);
  }

  /**
   * Refreshes the active cards stack
   */
  updateStackPositions() {
    this.topCard = this.cards[0] || null;
    this.secondCard = this.cards[1] || null;

    // Reset styles for all cards
    this.cards.forEach((card, idx) => {
      card.classList.remove('top', 'second');
      card.style.transform = '';
      card.style.opacity = '';
      card.style.zIndex = this.cards.length - idx;
      
      // Reset badge opacities
      const badgeL = card.querySelector('.badge-left');
      const badgeR = card.querySelector('.badge-right');
      if (badgeL) badgeL.style.opacity = 0;
      if (badgeR) badgeR.style.opacity = 0;
    });

    if (this.topCard) {
      this.topCard.classList.add('top');
      this.topCard.style.transform = 'translate(0, 0) scale(1) rotate(0)';
      this.topCard.style.opacity = '1';
    }

    if (this.secondCard) {
      this.secondCard.classList.add('second');
      this.secondCard.style.transform = 'translate(0, 16px) scale(0.95)';
      this.secondCard.style.opacity = '0';
    }
  }

  /**
   * Binds touch and mouse events to the container
   */
  bindEvents() {
    if (this.eventsBound) return;

    // We bind event listeners to the container so that it delegates to the top card
    this.container.addEventListener('mousedown', this.handleStart);
    this.container.addEventListener('touchstart', this.handleStart, { passive: false });

    window.addEventListener('mousemove', this.handleMove);
    window.addEventListener('touchmove', this.handleMove, { passive: false });

    window.addEventListener('mouseup', this.handleEnd);
    window.addEventListener('touchend', this.handleEnd);

    this.eventsBound = true;
  }

  /**
   * Cleans up event listeners
   */
  destroy() {
    this.container.removeEventListener('mousedown', this.handleStart);
    this.container.removeEventListener('touchstart', this.handleStart);
    
    window.removeEventListener('mousemove', this.handleMove);
    window.removeEventListener('touchmove', this.handleMove);
    
    window.removeEventListener('mouseup', this.handleEnd);
    window.removeEventListener('touchend', this.handleEnd);

    this.container.innerHTML = '';
    this.cards = [];
    this.eventsBound = false;
  }

  handleStart(e) {
    if (this.isDragging || !this.topCard) return;

    // Check if clicked/touched element is a button or interactive
    if (e.target.closest('button, a, input, select, textarea, .cockpit-info-btn, [data-no-swipe], .swipe-action-btn')) {
      return; 
    }

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    this.isDragging = true;
    this.startX = clientX;
    this.startY = clientY;
    this.currentX = clientX;
    this.currentY = clientY;
    this.startTime = Date.now();

    // Calculate relative grab point Y to determine hinge rotation direction
    const rect = this.topCard.getBoundingClientRect();
    this.grabRelativeY = (clientY - rect.top) / (rect.height || 1);

    this.topCard.style.transition = 'none';
    if (this.secondCard) {
      this.secondCard.style.transition = 'none';
    }
  }

  handleMove(e) {
    if (!this.isDragging || !this.topCard) return;

    // Prevent default scroll on touch
    if (e.cancelable) e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    this.currentX = clientX;
    this.currentY = clientY;

    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;

    // Hinge rotation physics: grab below center tilts in the opposite direction
    const rotationDirection = this.grabRelativeY > 0.5 ? -1 : 1;
    const rotate = rotationDirection * Math.min(this.maxRotation, Math.max(-this.maxRotation, (deltaX / 12)));

    // Apply translation & rotation to top card
    this.topCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;

    // Scale up second card slightly as top card moves away
    if (this.secondCard) {
      const dragPercent = Math.min(1, Math.abs(deltaX) / 150);
      const scale = 0.95 + (dragPercent * 0.05);
      const translateY = 16 - (dragPercent * 16);
      this.secondCard.style.transform = `translate(0, ${translateY}px) scale(${scale})`;
      this.secondCard.style.opacity = `${dragPercent * 0.85}`;
    }

    // Badge opacities based on swipe direction
    const badgeL = this.topCard.querySelector('.badge-left');
    const badgeR = this.topCard.querySelector('.badge-right');
    
    if (deltaX > 0) {
      if (badgeR) badgeR.style.opacity = Math.min(1, deltaX / 80);
      if (badgeL) badgeL.style.opacity = 0;
    } else {
      if (badgeL) badgeL.style.opacity = Math.min(1, Math.abs(deltaX) / 80);
      if (badgeR) badgeR.style.opacity = 0;
    }
  }

  handleEnd() {
    if (!this.isDragging || !this.topCard) return;
    this.isDragging = false;

    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;
    const duration = Date.now() - this.startTime;
    const velocityX = deltaX / (duration || 1); // px/ms

    // 1. Tap Gesture Detection (very short travel, short duration)
    if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8 && duration < 250) {
      SensoryEngine.triggerHaptic('light');
      
      // Tap micro-animation: tilt right slightly and trigger right swipe
      this.topCard.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      this.topCard.style.transform = 'translate(25px, -8px) rotate(3deg)';
      
      const badgeR = this.topCard.querySelector('.badge-right');
      if (badgeR) {
        badgeR.style.transition = 'opacity 0.15s ease-out';
        badgeR.style.opacity = '0.8';
      }

      setTimeout(() => {
        this.swipe('right');
      }, 150);
      return;
    }

    // 2. Flick or Drag Swipe Threshold Detection
    const isFlickRight = velocityX > 0.35 && deltaX > 20;
    const isFlickLeft = velocityX < -0.35 && deltaX < -20;

    if (deltaX > this.swipeThreshold || isFlickRight) {
      this.swipe('right');
    } else if (deltaX < -this.swipeThreshold || isFlickLeft) {
      this.swipe('left');
    } else {
      this.snapBack();
    }
  }

  /**
   * Snaps the top card back to center
   */
  snapBack() {
    if (!this.topCard) return;
    
    SensoryEngine.triggerHaptic('light');

    this.topCard.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s';
    this.topCard.style.transform = 'translate(0, 0) rotate(0)';
    this.topCard.style.opacity = '1';
    
    const badgeL = this.topCard.querySelector('.badge-left');
    const badgeR = this.topCard.querySelector('.badge-right');
    if (badgeL) {
      badgeL.style.transition = 'opacity 0.3s';
      badgeL.style.opacity = 0;
    }
    if (badgeR) {
      badgeR.style.transition = 'opacity 0.3s';
      badgeR.style.opacity = 0;
    }

    if (this.secondCard) {
      this.secondCard.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s';
      this.secondCard.style.transform = 'translate(0, 16px) scale(0.95)';
      this.secondCard.style.opacity = '0';
    }
  }

  /**
   * Animates card out in a direction or triggers actions
   */
  swipe(direction) {
    if (!this.topCard) return;

    const isRight = direction === 'right';
    const item = this.items[this.currentIndex];

    // Non-dismiss swipe right (e.g. Ambient Discover player open)
    if (isRight && !this.options.dismissOnSwipeRight) {
      this.snapBack();
      this.options.onSwipeRight(item);
      return;
    }

    SensoryEngine.triggerHaptic('medium');

    const cardToDismiss = this.topCard;
    const exitX = isRight ? window.innerWidth + 100 : -window.innerWidth - 100;
    const rotate = isRight ? 25 : -25;

    // Apply exit transition
    cardToDismiss.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s';
    cardToDismiss.style.transform = `translate(${exitX}px, ${this.currentY - this.startY || 0}px) rotate(${rotate}deg)`;
    cardToDismiss.style.opacity = '0';

    // Instantly animate the second card forward to the top position in sync
    if (this.secondCard) {
      this.secondCard.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.45s';
      this.secondCard.style.transform = 'translate(0, 0) scale(1) rotate(0)';
      this.secondCard.style.opacity = '1';
      
      const inner = this.secondCard.querySelector('.swipe-card-inner');
      if (inner) {
        inner.style.opacity = '1';
      }
    }

    // Callbacks
    if (isRight) {
      this.options.onSwipeRight(item);
    } else {
      this.options.onSwipeLeft(item);
    }

    // Move index to next
    this.currentIndex = (this.currentIndex + 1) % this.items.length;

    setTimeout(() => {
      // Remove dismissed card from DOM and array
      cardToDismiss.remove();
      this.cards.shift();

      // Push a new card for the back of the deck (representing the card after the next one)
      if (this.items.length > 1) {
        const nextNextIndex = (this.currentIndex + 1) % this.items.length;
        this.pushCard(this.items[nextNextIndex]);
      }

      // Apply smooth transition to make the second card the top card
      if (this.cards[0]) {
        this.cards[0].style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s';
      }

      this.updateStackPositions();

      // Trigger active card change callback
      if (this.options.onCardChange && this.items.length > 0) {
        this.options.onCardChange(this.items[this.currentIndex]);
      }
    }, 350);
  }
}
