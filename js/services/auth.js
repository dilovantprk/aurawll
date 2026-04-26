// js/services/auth.js
import { 
  auth, 
  isInitialized 
} from '../../firebase.js';
import { 
  signInAnonymously, 
  linkWithCredential, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const MOCK_MODE = !isInitialized;

export async function signInAsGuest() {
  if (MOCK_MODE) {
    return { uid: 'mock-guest-' + Date.now(), isAnonymous: true, displayName: null, guest: true };
  }
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err) {
    console.warn('[Aura] Firebase Guest Auth failed, falling back to Mock:', err.code);
    return { uid: 'mock-guest-fallback-' + Date.now(), isAnonymous: true, displayName: null, guest: true };
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
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    return auth.currentUser;
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

/**
 * Delete specific checkin from Firestore
 */
export async function deleteSingleCheckin(timestamp) {
  if (MOCK_MODE) return true;
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  const fb = await import('../../firebase.js');
  try {
    const q = fb.query(
      fb.collection(fb.db, "checkins"),
      fb.where("uid", "==", currentUser.uid),
      fb.where("timestamp", "==", timestamp)
    );
    const snapshot = await fb.getDocs(q);
    const deletePromises = [];
    snapshot.forEach(doc => {
      deletePromises.push(fb.deleteDoc(doc.ref));
    });
    await Promise.all(deletePromises);
    return true;
  } catch (err) {
    console.error("[Auth Service] Delete checkin failed:", err);
    throw err;
  }
}

/**
 * Delete entire account and associated data
 */
export async function deleteUserAccount() {
  if (MOCK_MODE) {
    localStorage.clear();
    return true;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  const fb = await import('../../firebase.js');

  try {
    // 1. Delete all checkins from Firestore
    const q = fb.query(fb.collection(fb.db, "checkins"), fb.where("uid", "==", currentUser.uid));
    const snapshot = await fb.getDocs(q);
    const deletePromises = [];
    snapshot.forEach(doc => {
      deletePromises.push(fb.deleteDoc(doc.ref));
    });
    await Promise.all(deletePromises);

    // 2. Delete the user account itself
    await deleteUser(currentUser);
    
    // 3. Clear local storage
    localStorage.clear();
    return true;
  } catch (err) {
    console.error("[Auth Service] Account deletion failed:", err);
    if (err.code === 'auth/requires-recent-login') {
      throw new Error('REAUTH_NEEDED');
    }
    throw err;
  }
}
