import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';

let schedulerInterval = null;

export const NotificationService = {
  swReg: null,

  async init() {
    if (!('Notification' in window)) return;
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      try {
        this.swReg = await navigator.serviceWorker.register('/sw.js');
      } catch (err) {
        console.warn('[Aura] ServiceWorker registration failed:', err);
      }
    }

    // Bind Modal Buttons
    if (elements.notifAcceptBtn) {
      elements.notifAcceptBtn.onclick = () => this.requestPermission();
    }
    if (elements.notifDenyBtn) {
      elements.notifDenyBtn.onclick = () => this.hideModal();
    }

    // Start Daily Nudges Scheduler if enabled
    if (localStorage.getItem('aura_notif') === 'true') {
      this.startScheduler();
    }
  },

  showModal() {
    if (elements.notifModal) elements.notifModal.classList.remove('hidden');
  },

  hideModal() {
    if (elements.notifModal) elements.notifModal.classList.add('hidden');
    if (elements.notifToggleCheckbox) {
      elements.notifToggleCheckbox.checked = false;
    }
    localStorage.setItem('aura_notif', 'false');
    if (elements.nudgeTimeContainer) {
      elements.nudgeTimeContainer.classList.add('hidden');
    }
    this.stopScheduler();
  },

  async requestPermission() {
    if (elements.notifModal) elements.notifModal.classList.add('hidden');
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('aura_notif', 'true');
        if (elements.notifToggleCheckbox) {
          elements.notifToggleCheckbox.checked = true;
        }
        if (elements.nudgeTimeContainer) {
          elements.nudgeTimeContainer.classList.remove('hidden');
        }
        this.startScheduler();

        // Send confirmation test notification
        setTimeout(() => {
          this.sendTestNotification();
        }, 500);
        return true;
      } else {
        if (elements.notifToggleCheckbox) {
          elements.notifToggleCheckbox.checked = false;
        }
        localStorage.setItem('aura_notif', 'false');
        if (elements.nudgeTimeContainer) {
          elements.nudgeTimeContainer.classList.add('hidden');
        }
        this.stopScheduler();
      }
    } catch (err) {
      console.error('[Aura] Error requesting permission', err);
    }
    return false;
  },

  async sendNotification(title, body = '', options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }

    const notifOptions = {
      body: body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [100, 50, 100],
      data: { url: '/', ...options.data },
      ...options
    };

    try {
      if (this.swReg && this.swReg.showNotification) {
        await this.swReg.showNotification(title, notifOptions);
        return true;
      } else if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, notifOptions);
        return true;
      } else {
        new Notification(title, notifOptions);
        return true;
      }
    } catch (err) {
      console.error('[Aura] Error sending notification:', err);
      try {
        new Notification(title, notifOptions);
        return true;
      } catch (e) {
        return false;
      }
    }
  },

  sendTestNotification() {
    const title = AppState.lang === 'tr' ? 'Aura • Bildirimler Aktif' : 'Aura • Notifications Active';
    const body = AppState.lang === 'tr'
      ? 'Günlük iyi oluş hatırlatıcılarınız ve duyusal uyarılar aktif edildi.'
      : 'Your daily wellness reminders and sensory prompts are now active.';
    this.sendNotification(title, body);
  },

  startScheduler() {
    this.stopScheduler();
    
    // Check every 30 seconds
    schedulerInterval = setInterval(() => {
      this.checkAndTriggerNudge();
    }, 30000);
    
    // Initial immediate check
    this.checkAndTriggerNudge();
  },

  stopScheduler() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
  },

  checkAndTriggerNudge() {
    const isEnabled = localStorage.getItem('aura_notif') === 'true';
    if (!isEnabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const targetTime = localStorage.getItem('aura_notif_time') || '21:00';
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = now.toDateString();

    const lastTriggeredDate = localStorage.getItem('aura_last_nudge_date');

    if (currentTimeStr === targetTime && lastTriggeredDate !== todayStr) {
      localStorage.setItem('aura_last_nudge_date', todayStr);
      
      const title = AppState.lang === 'tr' ? 'Aura • Günlük Check-in' : 'Aura • Daily Check-in';
      const body = AppState.lang === 'tr'
        ? 'Bugünkü sinir sistemi durumunuzu kaydetme zamanı geldi. Bedeninizi dinlemeye hazır mısınız?'
        : 'Time for your daily nervous system check-in. Ready to listen to your body?';

      this.sendNotification(title, body, { tag: 'daily-nudge' });
    }
  }
};
