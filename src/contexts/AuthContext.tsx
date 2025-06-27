
// src/contexts/AuthContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { UserProfile } from '@/types'; // UserProfile already includes role
import { onAuthStateChanged as firebaseOnAuthStateChanged, getUserProfile, signOut as firebaseSignOut } from '@/lib/firebaseService'; // Using mocked service

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // The onAuthStateChanged in firebaseService now directly passes UserProfile | null
    const unsubscribe = firebaseOnAuthStateChanged(async (userWithProfile: UserProfile | null) => {
      setLoading(true);
      setError(null);
      if (userWithProfile && userWithProfile.id) {
        // The user object from onAuthStateChanged in firebaseService now IS the profile
        setCurrentUser(userWithProfile);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut();
      setCurrentUser(null);
    } catch (e) {
      console.error("Sign out error:", e);
      setError(e instanceof Error ? e : new Error("Failed to sign out"));
    } finally {
      setLoading(false);
    }
  };
  
  const value = useMemo(() => ({
    currentUser,
    loading,
    error,
    signOut,
  }), [currentUser, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
