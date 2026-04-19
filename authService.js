import { 
  auth, 
  isInitialized 
} from './firebase.js';
import { 
  signInAnonymously, 
  linkWithCredential, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
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

export async function loginWithEmail(email, password) {
  if (MOCK_MODE) return { uid: 'mock-user', email, displayName: 'Mock User' };
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (err) { throw err; }
}

export async function registerWithEmail(email, password, displayName) {
  if (MOCK_MODE) return { uid: 'mock-user', email, displayName };
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    return result.user;
  } catch (err) { throw err; }
}

export async function logoutUser() {
  if (MOCK_MODE) return;
  await signOut(auth);
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
  return user.isAnonymous === true || user.guest === true;
}
