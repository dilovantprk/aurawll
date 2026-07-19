import { elements } from '../core/dom.js';
import { 
  loginWithEmail, 
  registerWithEmail, 
  signInAsGuest, 
  loginWithGoogle, 
  loginWithX,
  handleRedirectResult 
} from '../services/auth.js';
import { t } from '../core/i18n.js';

/**
 * Initializes the Authentication UI (Login/Register tabs and forms)
 */
export function initAuth({ onAuthenticated, navigateTo }) {
  const { 
    viewAuth, tabLogin, tabRegister, tabsPill, 
    authForm, authSubmitBtn, authError, 
    emailInput, passwordInput, nameInput, 
    skipAuthBtn, authLegalGroup, legalCheckbox,
    googleLoginBtn, xLoginBtn
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

  const mainAuthOptions = document.getElementById('mainAuthOptions');
  const emailAuthView = document.getElementById('emailAuthView');
  const showEmailAuthBtn = document.getElementById('showEmailAuthBtn');
  const backToMainAuthBtn = document.getElementById('backToMainAuthBtn');

  showEmailAuthBtn?.addEventListener('click', () => {
    mainAuthOptions?.classList.add('hidden');
    emailAuthView?.classList.remove('hidden');
  });

  backToMainAuthBtn?.addEventListener('click', () => {
    emailAuthView?.classList.add('hidden');
    mainAuthOptions?.classList.remove('hidden');
    if (authError) authError.classList.add('hidden');
  });

  skipAuthBtn?.addEventListener('click', async () => {
    try {
      const user = await signInAsGuest();
      // Force onboarding status to true when skipping from auth
      localStorage.setItem('aura_onboarded', 'true');
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      console.error('[Aura] Guest login failed', err);
      navigateTo('view-welcome'); 
    }
  });

  googleLoginBtn?.addEventListener('click', async () => {
    if (authError) authError.textContent = '';
    
    // Call loginWithGoogle synchronously to trigger popup without browser block
    try {
      const userPromise = loginWithGoogle();
      
      googleLoginBtn.disabled = true;
      googleLoginBtn.classList.add('loading');
      
      const user = await userPromise;
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      console.error('[Aura] Google Auth Error:', err);
      if (authError) {
        authError.textContent = translateFirebaseError(err.code);
        authError.classList.remove('hidden');
      }
    } finally {
      googleLoginBtn.disabled = false;
      googleLoginBtn.classList.remove('loading');
    }
  });

  xLoginBtn?.addEventListener('click', async () => {
    if (authError) authError.textContent = '';
    
    // Call loginWithX synchronously to trigger popup without browser block
    try {
      const userPromise = loginWithX();
      
      xLoginBtn.disabled = true;
      xLoginBtn.classList.add('loading');
      
      const user = await userPromise;
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      console.error('[Aura] X Auth Error:', err);
      if (authError) {
        authError.textContent = translateFirebaseError(err.code);
        authError.classList.remove('hidden');
      }
    } finally {
      xLoginBtn.disabled = false;
      xLoginBtn.classList.remove('loading');
    }
  });

  // Init state
  updateTabs();
}

/**
 * Opens the auth bottom sheet (mobile only)
 */
export function openAuthSheet() {
  const sheet = document.getElementById('auth-sheet');
  const backdrop = document.getElementById('auth-sheet-backdrop');
  if (!sheet || !backdrop) return;
  sheet.classList.add('open');
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/**
 * Closes the auth bottom sheet
 */
export function closeAuthSheet() {
  const sheet = document.getElementById('auth-sheet');
  const backdrop = document.getElementById('auth-sheet-backdrop');
  if (!sheet || !backdrop) return;
  sheet.classList.remove('open');
  backdrop.classList.remove('open');
  document.body.style.overflow = '';
  // Reset to main options view when closed
  const mainOpts = document.getElementById('sheet-mainAuthOptions');
  const emailView = document.getElementById('sheet-emailAuthView');
  if (mainOpts) mainOpts.classList.remove('hidden');
  if (emailView) emailView.classList.add('hidden');
}

/**
 * Initializes the Auth Bottom Sheet (mobile modal)
 */
export function initAuthSheet({ onAuthenticated, navigateTo }) {
  const backdrop = document.getElementById('auth-sheet-backdrop');
  const sheetGoogleBtn = document.getElementById('sheet-googleLoginBtn');
  const sheetXBtn = document.getElementById('sheet-xLoginBtn');
  const sheetSkipBtn = document.getElementById('sheet-skipAuthBtn');
  const sheetShowEmailBtn = document.getElementById('sheet-showEmailAuthBtn');
  const sheetBackBtn = document.getElementById('sheet-backToMainAuthBtn');
  const sheetMainOpts = document.getElementById('sheet-mainAuthOptions');
  const sheetEmailView = document.getElementById('sheet-emailAuthView');
  const sheetTabLogin = document.getElementById('sheet-tabLogin');
  const sheetTabRegister = document.getElementById('sheet-tabRegister');
  const sheetTabsPill = document.getElementById('sheet-tabs-pill');
  const sheetForm = document.getElementById('sheet-authForm');
  const sheetSubmitBtn = document.getElementById('sheet-authSubmitBtn');
  const sheetError = document.getElementById('sheet-authError');
  const sheetNameGroup = document.getElementById('sheet-nameInputGroup');
  const sheetLegalGroup = document.getElementById('sheet-authLegalGroup');
  const sheetNameInput = document.getElementById('sheet-nameInput');
  const sheetEmailInput = document.getElementById('sheet-emailInput');
  const sheetPasswordInput = document.getElementById('sheet-passwordInput');
  const sheetLegalCheckbox = document.getElementById('sheet-legalCheckbox');

  // Close on backdrop click
  backdrop?.addEventListener('click', closeAuthSheet);

  // Show email form
  sheetShowEmailBtn?.addEventListener('click', () => {
    sheetMainOpts?.classList.add('hidden');
    sheetEmailView?.classList.remove('hidden');
  });

  sheetBackBtn?.addEventListener('click', () => {
    sheetEmailView?.classList.add('hidden');
    sheetMainOpts?.classList.remove('hidden');
    if (sheetError) sheetError.classList.add('hidden');
  });

  // Tab switching
  let sheetActiveTab = 'login';
  const updateSheetTabs = () => {
    if (sheetActiveTab === 'login') {
      sheetTabLogin?.classList.add('active');
      sheetTabRegister?.classList.remove('active');
      if (sheetTabsPill) sheetTabsPill.style.transform = 'translateX(0)';
      if (sheetSubmitBtn) sheetSubmitBtn.textContent = 'Giriş Yap';
      sheetNameGroup?.classList.add('hidden');
      sheetLegalGroup?.classList.add('hidden');
    } else {
      sheetTabRegister?.classList.add('active');
      sheetTabLogin?.classList.remove('active');
      if (sheetTabsPill) sheetTabsPill.style.transform = 'translateX(100%)';
      if (sheetSubmitBtn) sheetSubmitBtn.textContent = 'Kayıt Ol';
      sheetNameGroup?.classList.remove('hidden');
      sheetLegalGroup?.classList.remove('hidden');
    }
  };

  sheetTabLogin?.addEventListener('click', () => { sheetActiveTab = 'login'; updateSheetTabs(); });
  sheetTabRegister?.addEventListener('click', () => { sheetActiveTab = 'register'; updateSheetTabs(); });
  updateSheetTabs();

  // Email form submit
  sheetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sheetError) sheetError.classList.add('hidden');
    if (sheetSubmitBtn) { sheetSubmitBtn.disabled = true; sheetSubmitBtn.classList.add('loading'); }
    try {
      let user;
      if (sheetActiveTab === 'login') {
        user = await loginWithEmail(sheetEmailInput?.value, sheetPasswordInput?.value);
      } else {
        if (!sheetLegalCheckbox?.checked) {
          if (sheetError) { sheetError.textContent = 'Lütfen kullanım koşullarını onaylayın.'; sheetError.classList.remove('hidden'); }
          return;
        }
        user = await registerWithEmail(sheetEmailInput?.value, sheetPasswordInput?.value, sheetNameInput?.value);
      }
      closeAuthSheet();
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      if (sheetError) { sheetError.textContent = translateFirebaseError(err.code); sheetError.classList.remove('hidden'); }
    } finally {
      if (sheetSubmitBtn) { sheetSubmitBtn.disabled = false; sheetSubmitBtn.classList.remove('loading'); }
    }
  });

  // Guest
  sheetSkipBtn?.addEventListener('click', async () => {
    try {
      const user = await signInAsGuest();
      localStorage.setItem('aura_onboarded', 'true');
      closeAuthSheet();
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      console.error('[Aura] Sheet Guest login failed', err);
    }
  });

  // Google
  sheetGoogleBtn?.addEventListener('click', async () => {
    if (sheetError) sheetError.textContent = '';
    try {
      const userPromise = loginWithGoogle();
      if (sheetGoogleBtn) { sheetGoogleBtn.disabled = true; sheetGoogleBtn.classList.add('loading'); }
      const user = await userPromise;
      closeAuthSheet();
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      if (sheetError) { sheetError.textContent = translateFirebaseError(err.code); sheetError.classList.remove('hidden'); }
    } finally {
      if (sheetGoogleBtn) { sheetGoogleBtn.disabled = false; sheetGoogleBtn.classList.remove('loading'); }
    }
  });

  // X
  sheetXBtn?.addEventListener('click', async () => {
    if (sheetError) sheetError.textContent = '';
    try {
      const userPromise = loginWithX();
      if (sheetXBtn) { sheetXBtn.disabled = true; sheetXBtn.classList.add('loading'); }
      const user = await userPromise;
      closeAuthSheet();
      if (onAuthenticated) onAuthenticated(user);
    } catch (err) {
      if (sheetError) { sheetError.textContent = translateFirebaseError(err.code); sheetError.classList.remove('hidden'); }
    } finally {
      if (sheetXBtn) { sheetXBtn.disabled = false; sheetXBtn.classList.remove('loading'); }
    }
  });
}

function translateFirebaseError(code) {
  switch (code) {
    case 'auth/invalid-email': return 'Geçersiz e-posta adresi.';
    case 'auth/user-disabled': return 'Bu hesap devre dışı bırakılmış.';
    case 'auth/user-not-found': return 'Kullanıcı bulunamadı.';
    case 'auth/wrong-password': return 'Hatalı şifre.';
    case 'auth/email-already-in-use': return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/weak-password': return 'Şifre çok zayıf (en az 6 karakter).';
    case 'auth/popup-blocked': return 'Açılır pencere engellendi. Lütfen izin verin veya tekrar deneyin.';
    case 'auth/unauthorized-domain': return 'Bu alan adı yetkilendirilmemiş. Lütfen Firebase Console üzerinden ekleyin.';
    case 'auth/admin-restricted-operation': return 'Misafir girişi devre dışı. Lütfen Firebase Console üzerinden Anonymous auth\'u etkinleştirin.';
    default: return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}
