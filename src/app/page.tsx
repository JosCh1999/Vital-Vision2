// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Loading from './loading'; // Use the app-wide loading component

export default function HomePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, loading, router]);

  // Show loading state while checking auth status
  if (loading) {
    return <Loading />;
  }
  
  // This page content will briefly show before redirect, or if redirect fails.
  // A blank page or a minimal message is fine.
  return null; 
}
