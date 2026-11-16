import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle as fbSignInWithGoogle,
  signInWithEmail as fbSignInWithEmail,
  signUpWithEmail as fbSignUpWithEmail,
  logOut as fbLogOut,
  resetPassword as fbResetPassword,
} from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase Auth State Error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const u = await fbSignInWithGoogle();
      return u;
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed');
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      const u = await fbSignInWithEmail(email, pass);
      return u;
    } catch (err: any) {
      setError(err?.message || 'Email Sign-In failed');
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    setError(null);
    try {
      const u = await fbSignUpWithEmail(email, pass, name);
      return u;
    } catch (err: any) {
      setError(err?.message || 'Sign-Up failed');
      throw err;
    }
  };

  const logOut = async () => {
    setError(null);
    try {
      await fbLogOut();
    } catch (err: any) {
      setError(err?.message || 'Sign-Out failed');
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await fbResetPassword(email);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed');
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logOut,
    resetPassword,
    clearError: () => setError(null),
  };
}
