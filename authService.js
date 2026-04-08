// authService.js
import { 
  auth, 
  isInitialized 
} from './firebase.js';
import { 
  signInAnonymously, 
  linkWithCredential, 
  GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const MOCK_MODE = !isInitialized;

export async function signInAsGuest() {
  if (MOCK_MODE) {
    return { uid: 'mock-guest-' + Date.now(), isAnonymous: true, displayName: null };
  }
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err) {
    console.warn('[Aura] Firebase Guest Auth failed, falling back to Mock:', err.code);
    return { uid: 'mock-guest-fallback-' + Date.now(), isAnonymous: true, displayName: null };
  }
}

export async function upgradeGuestWithGoogle() {
  const currentUser = auth.currentUser;
  if (!currentUser?.isAnonymous) throw new Error('Mevcut kullanıcı misafir değil');
  const provider = new GoogleAuthProvider();
  try {
    const credential = await linkWithCredential(currentUser, provider);
    return credential.user;
  } catch (err) {
    console.error('[Aura] Hesap yükseltme hatası:', err.code);
    throw err;
  }
}

export function isGuestUser(user) {
  if (!user) return true;
  return user.isAnonymous === true;
}
