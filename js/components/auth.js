import { elements } from '../core/dom.js';
import { loginWithEmail, registerWithEmail } from '../../authService.js';
import { t } from '../core/i18n.js';

/**
 * Initializes the Authentication UI (Login/Register tabs and forms)
 */
export function initAuth({ onAuthenticated, navigateTo }) {
  const { 
    viewAuth, tabLogin, tabRegister, tabsPill, 
    authForm, authSubmitBtn, authError, 
    emailInput, passwordInput, nameInput, 
    skipAuthBtn, authLegalGroup, legalCheckbox 
  } = elements;

  if (!viewAuth) return;

  let activeTab = 'login'; // 'login' or 'register'

  // --- Tab Switching ---
  const updateTabs = () => {
    if (activeTab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      tabsPill.style.transform = 'translateX(0)';
      authSubmitBtn.textContent = t('btn_enter');   // "İlerle" / "Enter"
      if (nameInput) nameInput.parentElement.classList.add('hidden');
      if (authLegalGroup) authLegalGroup.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      tabsPill.style.transform = 'translateX(100%)';
      authSubmitBtn.textContent = t('btn_register'); // "Kayıt Ol" / "Register"
      if (nameInput) nameInput.parentElement.classList.remove('hidden');
      if (authLegalGroup) authLegalGroup.classList.remove('hidden');
    }
  };

  tabLogin?.addEventListener('click', () => { activeTab = 'login'; updateTabs(); });
  tabRegister?.addEventListener('click', () => { activeTab = 'register'; updateTabs(); });

  // --- Legal Link Delegation ---
  authLegalGroup?.addEventListener('click', (e) => {
    const link = e.target.closest('.legal-link');
    if (link) {
      const type = link.getAttribute('data-legal'); // 'terms', 'privacy', 'kvkk'
      if (type) {
        import('./modals.js').then(m => m.showInfoModal(`legal_${type}`));
      }
    }
  });

  // --- Form Submission ---
  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (authError) authError.textContent = '';

    // Validation: Legal Consent
    if (activeTab === 'register' && legalCheckbox && !legalCheckbox.checked) {
      if (authError) {
        authError.textContent = t('auth_legal_required');
        authError.classList.remove('hidden');
      }
      return;
    }

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
      if (authError) {
        authError.textContent = translateFirebaseError(err.code);
        authError.classList.remove('hidden');
      }
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
