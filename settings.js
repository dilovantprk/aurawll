import { isGuestUser, upgradeGuestWithGoogle } from './authService.js';

export function renderGuestBanner(user, container, t) {
  if (!isGuestUser(user)) return;

  const banner = document.createElement('div');
  banner.className = 'settings-guest-banner';
  banner.innerHTML = `
    <div class="sgb-inner">
      <p class="sgb-text">${t('dash_no_weekly')}</p>
      <button class="sgb-btn" id="sgb-upgrade">${t('btn_register')}</button>
    </div>
  `;
  container.prepend(banner);

  document.getElementById('sgb-upgrade').addEventListener('click', async () => {
    try {
      await upgradeGuestWithGoogle();
      banner.remove();
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use') {
        alert('Bu Google hesabı zaten kayıtlı. Lütfen giriş yapın.');
      }
    }
  });
}
