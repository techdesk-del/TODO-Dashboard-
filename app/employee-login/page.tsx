'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { EmployeeLoginGate } from '@/components/EmployeeLoginGate';
import { AuthModal } from '@/components/AuthModal';

export default function EmployeeLoginPage() {
  const router = useRouter();
  const { currentUser, isAuthModalOpen, setIsAuthModalOpen, authModalInitialMode } = useApp();

  useEffect(() => {
    if (currentUser && currentUser.id !== 'guest') {
      router.replace('/');
    }
  }, [currentUser, router]);

  return (
    <>
      <EmployeeLoginGate onSuccess={() => router.replace('/')} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalInitialMode}
      />
    </>
  );
}
