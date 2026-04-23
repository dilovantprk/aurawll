// Firebase Configuration and Initialization
// Using ESM CDN imports to avoid Node/Bundler requirements

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { 
  getMessaging, 
  getToken, 
  onMessage 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging.js";

// Real configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyDyKkPP2VD0iipS2Q7LU525KuhhLdaVoV4",
  authDomain: "aura-65c3a.firebaseapp.com",
  projectId: "aura-65c3a",
  storageBucket: "aura-65c3a.firebasestorage.app",
  messagingSenderId: "333658445431",
  appId: "1:333658445431:web:ea25c21a0dcb74a7d29872",
  measurementId: "G-DGS6X2DXMG"
};

let app, auth, db;
let isInitialized = false;

try {
  // Try to initialize Firebase. Will fail safely if config is invalid.
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isInitialized = true;
  console.log("Firebase initialized successfully with placeholders.");
} catch (error) {
  console.warn("Firebase initialization failed due to placeholder config. Falling back to local/mock mode.", error);
}

// Export references so app.js can use them
export {
  auth,
  db,
  isInitialized,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getMessaging,
  getToken,
  onMessage
};
