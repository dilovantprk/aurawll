/**
 * Community Component
 * Manages user search, friend requests, and friends list.
 */

import { elements } from '../core/dom.js';
import { communityService } from '../services/community.js';
import { isGuestUser } from '../services/auth.js';
import { t } from '../core/i18n.js';

let state = {
  navigateTo: null,
  AppState: null,
  friends: [],
  incoming: [],
  outgoing: []
};

/**
 * Initializes the social UI elements and listeners
 */
export function initCommunity({ navigateTo, AppState }) {
  state.navigateTo = navigateTo;
  state.AppState = AppState;

  const searchInput = elements.socialSearchInput;
  const searchBtn = elements.socialSearchBtn;

  if (searchInput) {
    // Add input search on keyup with a short debounce
    searchInput.addEventListener('input', debounce(async (e) => {
      await performSearch(e.target.value);
    }, 300));
  }

  if (searchBtn) {
    searchBtn.onclick = async () => {
      if (searchInput) await performSearch(searchInput.value);
    };
  }

  // Bind click handler using event delegation
  const socialMain = elements.socialMainUi;
  if (socialMain) {
    socialMain.onclick = async (e) => {
      const btn = e.target.closest('.social-btn');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const uid = btn.getAttribute('data-uid');
      const name = btn.getAttribute('data-name');
      const reqId = btn.getAttribute('data-req-id');

      if (action === 'add-friend') {
        btn.disabled = true;
        btn.textContent = '...';
        const success = await communityService.sendFriendRequest(state.AppState.user, uid, name);
        if (success) {
          btn.textContent = t('comm_request_sent');
          btn.className = 'social-btn social-btn-text';
          btn.removeAttribute('data-action');
          await renderSocialTab();
        } else {
          btn.disabled = false;
          btn.textContent = t('comm_btn_send_request');
        }
      } else if (action === 'accept-request') {
        btn.disabled = true;
        const currentName = state.AppState.user.displayName || state.AppState.user.email?.split('@')[0] || 'Kullanıcı';
        const success = await communityService.respondToFriendRequest(reqId, uid, name, state.AppState.user.uid, currentName, true);
        if (success) {
          await renderSocialTab();
          // Clear search list if open to update button states
          if (searchInput && searchInput.value) await performSearch(searchInput.value);
        }
      } else if (action === 'reject-request') {
        btn.disabled = true;
        const currentName = state.AppState.user.displayName || state.AppState.user.email?.split('@')[0] || 'Kullanıcı';
        const success = await communityService.respondToFriendRequest(reqId, uid, name, state.AppState.user.uid, currentName, false);
        if (success) {
          await renderSocialTab();
          if (searchInput && searchInput.value) await performSearch(searchInput.value);
        }
      }
    };
  }
}

/**
 * Sweeps friends and requests, rendering the social lists
 */
export async function renderSocialTab() {
  const AppState = state.AppState || window.AppState;
  if (!AppState) return;

  const isGuest = isGuestUser(AppState.user);

  if (isGuest) {
    if (elements.socialGuestWarning) elements.socialGuestWarning.classList.remove('hidden');
    if (elements.socialMainUi) elements.socialMainUi.classList.add('hidden');
    return;
  }

  if (elements.socialGuestWarning) elements.socialGuestWarning.classList.add('hidden');
  if (elements.socialMainUi) elements.socialMainUi.classList.remove('hidden');

  try {
    const uid = AppState.user.uid;
    const [friends, incoming, outgoing] = await Promise.all([
      communityService.getFriends(uid),
      communityService.getIncomingRequests(uid),
      communityService.getOutgoingRequests(uid)
    ]);

    state.friends = friends;
    state.incoming = incoming;
    state.outgoing = outgoing;

    // --- Render Incoming Requests ---
    const requestsSection = elements.socialRequestsSection;
    const requestsList = elements.socialRequestsList;
    const requestsBadge = elements.socialRequestsBadge;

    if (incoming.length > 0) {
      if (requestsSection) requestsSection.classList.remove('hidden');
      if (requestsBadge) {
        requestsBadge.textContent = incoming.length;
        requestsBadge.classList.remove('hidden');
      }

      if (requestsList) {
        requestsList.innerHTML = incoming.map(req => {
          const initials = getInitials(req.senderName);
          return `
            <div class="social-user-card">
              <div class="social-user-info">
                <div class="social-avatar state-neutral">${initials}</div>
                <div class="social-user-details">
                  <span class="social-user-name">${req.senderName}</span>
                </div>
              </div>
              <div class="social-actions">
                <button class="social-btn social-btn-primary" data-action="accept-request" data-req-id="${req.id}" data-uid="${req.senderUid}" data-name="${req.senderName}">
                  ${t('comm_btn_accept')}
                </button>
                <button class="social-btn social-btn-danger" data-action="reject-request" data-req-id="${req.id}" data-uid="${req.senderUid}" data-name="${req.senderName}">
                  ✕
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    } else {
      if (requestsSection) requestsSection.classList.add('hidden');
    }

    // --- Render Sent Requests ---
    const sentSection = elements.socialSentSection;
    const sentList = elements.socialSentList;

    if (outgoing.length > 0) {
      if (sentSection) sentSection.classList.remove('hidden');
      if (sentList) {
        sentList.innerHTML = outgoing.map(req => {
          const initials = getInitials(req.receiverName);
          return `
            <div class="social-user-card">
              <div class="social-user-info">
                <div class="social-avatar state-neutral">${initials}</div>
                <div class="social-user-details">
                  <span class="social-user-name">${req.receiverName}</span>
                </div>
              </div>
              <div class="social-actions">
                <span class="social-btn social-btn-text">${t('comm_request_sent')}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } else {
      if (sentSection) sentSection.classList.add('hidden');
    }

    // --- Render Friends List ---
    const friendsList = elements.socialFriendsList;
    if (friendsList) {
      if (friends.length === 0) {
        friendsList.innerHTML = `<div class="social-empty">${t('comm_no_friends')}</div>`;
      } else {
        friendsList.innerHTML = friends.map(friend => {
          const initials = getInitials(friend.displayName);
          const { stateClass, dotClass } = getSomaticClasses(friend.lastEmotion);
          const stateLabel = t(friend.lastEmotion);

          return `
            <div class="social-user-card">
              <div class="social-user-info">
                <div class="social-avatar ${stateClass}">${initials}</div>
                <div class="social-user-details">
                  <span class="social-user-name">${friend.displayName}</span>
                  <span class="social-user-state">
                    <span class="state-dot ${dotClass}"></span>
                    ${stateLabel}
                  </span>
                </div>
              </div>
              <div class="social-actions">
                <!-- Keep actions expandable if we want messaging/sharing later -->
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error("[Community UI] Render social tab failed:", err);
  }
}

/**
 * Searches users and renders results list
 */
async function performSearch(queryText) {
  const AppState = state.AppState || window.AppState;
  const resultsContainer = elements.socialSearchResults;

  if (!queryText || queryText.trim().length < 2) {
    if (resultsContainer) {
      resultsContainer.classList.add('hidden');
      resultsContainer.innerHTML = '';
    }
    return;
  }

  const results = await communityService.searchUsers(queryText.trim(), AppState.user);

  if (resultsContainer) {
    resultsContainer.classList.remove('hidden');

    if (results.length === 0) {
      resultsContainer.innerHTML = `<div class="social-empty">${t('comm_search_no_results')}</div>`;
      return;
    }

    resultsContainer.innerHTML = results.map(u => {
      const initials = getInitials(u.displayName);
      const { stateClass } = getSomaticClasses(u.lastEmotion);
      
      // Determine request relationship
      let actionHtml = '';
      const isAlreadyFriend = state.friends.some(f => f.friendUid === u.uid);
      const hasReceivedRequest = state.incoming.some(r => r.senderUid === u.uid);
      const hasSentRequest = state.outgoing.some(r => r.receiverUid === u.uid);

      if (isAlreadyFriend) {
        actionHtml = `<span class="social-btn social-btn-text">${t('comm_already_friends')}</span>`;
      } else if (hasSentRequest) {
        actionHtml = `<span class="social-btn social-btn-text">${t('comm_request_sent')}</span>`;
      } else if (hasReceivedRequest) {
        const matchingRequest = state.incoming.find(r => r.senderUid === u.uid);
        actionHtml = `
          <button class="social-btn social-btn-primary" data-action="accept-request" data-req-id="${matchingRequest.id}" data-uid="${u.uid}" data-name="${u.displayName}">
            ${t('comm_btn_accept')}
          </button>
        `;
      } else {
        actionHtml = `
          <button class="social-btn social-btn-secondary" data-action="add-friend" data-uid="${u.uid}" data-name="${u.displayName}">
            ${t('comm_btn_send_request')}
          </button>
        `;
      }

      return `
        <div class="social-user-card" style="background: rgba(255,255,255,0.01);">
          <div class="social-user-info">
            <div class="social-avatar ${stateClass}">${initials}</div>
            <div class="social-user-details">
              <span class="social-user-name">${u.displayName}</span>
            </div>
          </div>
          <div class="social-actions">
            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');
  }
}

// --- Helper Functions ---

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getSomaticClasses(emotion) {
  const em = emotion || 'se_neutral';
  
  if (['se_calm', 'se_focused', 'se_content', 'se_grateful', 'se_grounded'].includes(em)) {
    return { stateClass: 'state-ventral', dotClass: 'ventral' };
  }
  if (['se_anxious', 'se_overwhelmed', 'se_scattered', 'se_frustrated', 'se_racing_thoughts', 'se_on_edge'].includes(em)) {
    return { stateClass: 'state-sympathetic', dotClass: 'sympathetic' };
  }
  if (['se_exhausted', 'se_numb', 'se_disconnected', 'se_bored', 'se_heavy', 'se_spaced_out'].includes(em)) {
    return { stateClass: 'state-dorsal', dotClass: 'dorsal' };
  }
  return { stateClass: 'state-neutral', dotClass: 'neutral' };
}

function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}
