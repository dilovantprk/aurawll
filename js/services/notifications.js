import { elements } from '../core/dom.js';
import { AppState } from '../core/state.js';
import { getMessaging, getToken } from '../../firebase.js';

export const NotificationService = {
  async init() {
    if (!('Notification' in window)) return;
    
    // Bind Modal Buttons
    if (elements.notifAcceptBtn) {
      elements.notifAcceptBtn.onclick = () => this.requestPermission();
    }
    if (elements.notifDenyBtn) {
      elements.notifDenyBtn.onclick = () => this.hideModal();
    }
  },

  showModal() {
    if (elements.notifModal) elements.notifModal.classList.remove('hidden');
  },

  hideModal() {
    if (elements.notifModal) elements.notifModal.classList.add('hidden');
  },

  async requestPermission() {
    this.hideModal();
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('[Aura] Notification permission granted.');
        await this.registerToken();
        return true;
      }
    } catch (err) {
      console.error('[Aura] Error requesting permission', err);
    }
    return false;
  },

  async registerToken() {
    try {
      const messaging = getMessaging();
      const currentToken = await getToken(messaging, {
        vapidKey: 'BMYtY_V4GfU-J6v2S2VqP8G0Y6H9S6H9S6H9S6H9S6H9S6H9' // Placeholder, usually from config
      });

      if (currentToken) {
        console.log('[Aura] FCM Token obtained:', currentToken);
        localStorage.setItem('aura_fcm_token', currentToken);
        
        // If user is logged in, sync to Firestore
        if (AppState.user && AppState.user.uid) {
          // This would typically go to a 'users' collection
          console.log('[Aura] Syncing token to user profile:', AppState.user.uid);
        }
      }
    } catch (err) {
      console.warn('[Aura] Failed to get FCM token', err);
    }
  }
};
