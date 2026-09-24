'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import BirthdayPrompt from '@/components/BirthdayPrompt';
import { Spinner } from '@/components/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="min-h-screen overflow-x-clip lg:ml-64"
        >
          <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-8 lg:px-6 lg:pt-8">
            <BirthdayPrompt />
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
