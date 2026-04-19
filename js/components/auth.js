import { elements } from '../core/dom.js';
import { loginWithEmail, registerWithEmail } from '../../authService.js';

/**
 * Initializes the Authentication UI (Login/Register tabs and forms)
 */
export function initAuth({ onAuthenticated, navigateTo }) {
  const { viewAuth, tabLogin, tabRegister, tabsPill, authForm, authSubmitBtn, authError, emailInput, passwordInput, nameInput, skipAuthBtn } = elements;

  if (!viewAuth) return;

  let activeTab = 'login'; // 'login' or 'register'

  // --- Tab Switching ---
  const updateTabs = () => {
    if (activeTab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      tabsPill.style.transform = 'translateX(0)';
      authSubmitBtn.textContent = 'Giriş Yap';
      if (nameInput) nameInput.parentElement.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      tabsPill.style.transform = 'translateX(100%)';
      authSubmitBtn.textContent = 'Kayıt Ol';
      if (nameInput) nameInput.parentElement.classList.remove('hidden');
    }
  };

  tabLogin?.addEventListener('click', () => { activeTab = 'login'; updateTabs(); });
  tabRegister?.addEventListener('click', () => { activeTab = 'register'; updateTabs(); });

  // --- Form Submission ---
  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (authError) authError.textContent = '';
    authSubmitBtn.disabled = true;
    authSubmitBtn.classList.add('loading');

    const email = emailInput.value;
    const pass = passwordInput.value;
    const name = nameInput?.value || '';

    try {
      let user;
      if (activeTab === 'login') {
        user = await loginWithEmail(email, pass);
      } else {
        user = await registerWithEmail(email, pass, name);
      }
      
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      console.error('[Aura] Auth Error:', err);
      if (authError) authError.textContent = translateFirebaseError(err.code);
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.classList.remove('loading');
    }
  });

  skipAuthBtn?.addEventListener('click', () => {
    navigateTo('view-welcome');
  });

  // Init state
  updateTabs();
}

function translateFirebaseError(code) {
  switch (code) {
    case 'auth/invalid-email': return 'Geçersiz e-posta adresi.';
    case 'auth/user-disabled': return 'Bu hesap devre dışı bırakılmış.';
    case 'auth/user-not-found': return 'Kullanıcı bulunamadı.';
    case 'auth/wrong-password': return 'Hatalı şifre.';
    case 'auth/email-already-in-use': return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/weak-password': return 'Şifre çok zayıf (en az 6 karakter).';
    default: return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}
