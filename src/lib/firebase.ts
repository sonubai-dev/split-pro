import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

// Client-side Firebase configuration loaded exclusively from secure environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase App safely (singleton)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Authentication instance
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore database instance
// NOTE: Per strict architecture guidelines, image binary files, uploads, and video blobs
// are NEVER sent to Firebase Storage or Firestore. All image processing stays 100% in local memory/Canvas.
// Firestore is used exclusively for lightweight user profile metadata and preferences.
export const db = getFirestore(app);

/**
 * Synchronize user metadata to Firestore users collection
 */
export async function syncUserProfile(user: User) {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);
    const payload: Record<string, any> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      lastLoginAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
    }
    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.warn('Could not sync user profile to Firestore:', err);
  }
}

/**
 * Sign In with Google popup
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    await syncUserProfile(result.user);
  }
  return result.user;
}

/**
 * Sign Up with Email and Password
 */
export async function signUpWithEmail(email: string, pass: string, displayName?: string) {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
  }
  if (result.user) {
    await syncUserProfile(result.user);
  }
  return result.user;
}

/**
 * Sign In with Email and Password
 */
export async function signInWithEmail(email: string, pass: string) {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  if (result.user) {
    await syncUserProfile(result.user);
  }
  return result.user;
}

/**
 * Sign Out
 */
export async function logOut() {
  return signOut(auth);
}

/**
 * Fetch user profile from Firestore users collection
 */
export async function getUserProfile(userId: string) {
  if (!userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Error fetching user profile from Firestore:', err);
    return null;
  }
}

/**
 * Save user custom layout preset (in users/{userId}/presets/{presetId})
 */
export async function saveUserPreset(userId: string, preset: {
  id?: string;
  name: string;
  rows: number;
  columns: number;
  resolution?: string;
  format?: string;
  sharpness?: string;
}) {
  if (!userId) throw new Error('User authentication required');
  const presetId = preset.id || `preset-${Date.now()}`;
  const presetRef = doc(db, 'users', userId, 'presets', presetId);
  const data = {
    ...preset,
    id: presetId,
    updatedAt: serverTimestamp(),
  };
  await setDoc(presetRef, data, { merge: true });
  return presetId;
}

/**
 * Retrieve user's saved presets
 */
export async function getUserPresets(userId: string) {
  if (!userId) return [];
  try {
    const colRef = collection(db, 'users', userId, 'presets');
    const q = query(colRef, orderBy('updatedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Could not fetch user presets:', err);
    return [];
  }
}

/**
 * Record an export history event in Firestore (strictly metadata, NO image files)
 */
export async function saveExportMetadata(userId: string, meta: {
  filename: string;
  sliceCount: number;
  format: string;
  resolution: string;
}) {
  if (!userId) return;
  try {
    const exportId = `export-${Date.now()}`;
    const exportRef = doc(db, 'users', userId, 'exports', exportId);
    await setDoc(exportRef, {
      ...meta,
      id: exportId,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not record export metadata:', err);
  }
}

/**
 * Retrieve user's export history
 */
export async function getUserExportHistory(userId: string) {
  if (!userId) return [];
  try {
    const colRef = collection(db, 'users', userId, 'exports');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Could not fetch export history:', err);
    return [];
  }
}

/**
 * Send Password Reset Email
 */
export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}
