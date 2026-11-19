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

export const SUPER_ADMIN_EMAIL = 'ssdd747346@gmail.com';

/**
 * Check if a given user is the system Super Admin
 */
export function isUserSuperAdmin(user: User | null | { email?: string | null }): boolean {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Synchronize user metadata to Firestore users collection
 */
export async function syncUserProfile(user: User) {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);
    const isAdmin = isUserSuperAdmin(user);
    const payload: Record<string, any> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || (isAdmin ? 'Super Admin' : 'Creator'),
      photoURL: user.photoURL || '',
      lastLoginAt: serverTimestamp(),
      role: isAdmin ? 'super_admin' : (existing.exists() ? existing.data()?.role || 'user' : 'user'),
      isAdmin,
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
 * Sign In with Email and Password (with Super Admin auto-provisioning)
 */
export async function signInWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await syncUserProfile(result.user);
    }
    return result.user;
  } catch (err: any) {
    // If Super Admin credentials are provided and account doesn't exist yet, auto-register
    if (
      email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() &&
      (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential')
    ) {
      try {
        const created = await createUserWithEmailAndPassword(auth, email, pass);
        if (created.user) {
          await updateProfile(created.user, { displayName: 'Super Admin' });
          await syncUserProfile(created.user);
          return created.user;
        }
      } catch (signupErr) {
        console.warn('Super Admin auto-registration attempt error:', signupErr);
      }
    }
    throw err;
  }
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

/**
 * Save or update user's Agent API Key in Firestore
 */
export async function saveUserApiKey(userId: string, key: string, name = 'Default Agent Key') {
  if (!userId) return;
  try {
    const keyRef = doc(db, 'users', userId, 'apiKeys', 'default');
    await setDoc(keyRef, {
      key,
      name,
      createdAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save API key to Firestore:', err);
  }
}

/**
 * Retrieve user's Agent API Key from Firestore
 */
export async function getUserApiKey(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const keyRef = doc(db, 'users', userId, 'apiKeys', 'default');
    const snap = await getDoc(keyRef);
    if (snap.exists()) {
      return snap.data()?.key || null;
    }
  } catch (err) {
    console.warn('Could not fetch API key from Firestore:', err);
  }
  return null;
}

/**
 * Revoke/delete user's Agent API Key from Firestore
 */
export async function revokeUserApiKey(userId: string) {
  if (!userId) return;
  try {
    const keyRef = doc(db, 'users', userId, 'apiKeys', 'default');
    await deleteDoc(keyRef);
  } catch (err) {
    console.warn('Could not revoke API key from Firestore:', err);
  }
}

/**
 * Persist Admin Feature Flags to Firestore
 */
export async function saveAdminFeatureFlags(features: Record<string, any>) {
  try {
    const featRef = doc(db, 'admin_config', 'features');
    await setDoc(featRef, {
      ...features,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save admin feature flags to Firestore:', err);
  }
}

/**
 * Fetch Admin Feature Flags from Firestore
 */
export async function getAdminFeatureFlags(): Promise<Record<string, any> | null> {
  try {
    const featRef = doc(db, 'admin_config', 'features');
    const snap = await getDoc(featRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Could not fetch admin feature flags from Firestore:', err);
  }
  return null;
}

/**
 * Save an Admin-Generated Managed Token to Firestore
 */
export async function saveAdminToken(tokenData: {
  token: string;
  name: string;
  userEmail: string;
  rateLimitPerMin: number;
  status: 'active' | 'revoked';
}) {
  try {
    const tokenRef = doc(db, 'admin_tokens', tokenData.token);
    await setDoc(tokenRef, {
      ...tokenData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save admin token to Firestore:', err);
  }
}

/**
 * Fetch all Admin-Generated Managed Tokens from Firestore
 */
export async function getAdminTokens(): Promise<any[]> {
  try {
    const colRef = collection(db, 'admin_tokens');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ ...d.data(), token: d.id }));
  } catch (err) {
    console.warn('Could not fetch admin tokens from Firestore:', err);
    return [];
  }
}

/**
 * Revoke an Admin Token in Firestore
 */
export async function revokeAdminTokenInFirestore(tokenString: string) {
  try {
    const tokenRef = doc(db, 'admin_tokens', tokenString);
    await setDoc(tokenRef, { status: 'revoked', revokedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Could not revoke admin token in Firestore:', err);
  }
}

/**
 * Fetch all registered users from Firestore
 */
export async function getAllUsersFromFirestore(): Promise<any[]> {
  try {
    const colRef = collection(db, 'users');
    const q = query(colRef, limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Could not fetch users from Firestore:', err);
    return [];
  }
}


