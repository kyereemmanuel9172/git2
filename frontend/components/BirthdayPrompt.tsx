'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, X, PartyPopper, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface BirthdayToday {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  daysUntil: number;
}

export default function BirthdayPrompt() {
  const [birthdays, setBirthdays] = useState<BirthdayToday[]>([]);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return localStorage.getItem(`birthday-dismissed-${key}`) === 'true';
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ items: BirthdayToday[] }>('/members/birthdays?days=7')
      .then((r) => setBirthdays(r.items.filter((b) => b.daysUntil <= 3)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const dismiss = () => {
    setDismissed(true);
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    localStorage.setItem(`birthday-dismissed-${key}`, 'true');
  };

  const show = loaded && birthdays.length > 0 && !dismissed;
  if (!show) return null;

  const todayBirthdays = birthdays.filter((b) => b.daysUntil === 0);
  const upcomingBirthdays = birthdays.filter((b) => b.daysUntil > 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -12, height: 0 }}
        className="mb-6 overflow-hidden"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-brand-100/60 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-md shadow-brand-600/30">
            <Cake className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            {todayBirthdays.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
                  <PartyPopper className="h-4 w-4 text-brand-600" />
                  Birthday today!
                </p>
                <p className="truncate text-sm text-brand-800">
                  {todayBirthdays.map((b) => `${b.firstName} ${b.lastName}`).join(', ')}{' '}
                  {todayBirthdays.length === 1 ? 'is' : 'are'} celebrating a birthday today (turning{' '}
                  {todayBirthdays.map((b) => b.age).join(', ')}).
                </p>
              </>
            )}
            {upcomingBirthdays.length > 0 && (
              <>
                {todayBirthdays.length > 0 && <div className="my-1.5 h-px bg-brand-200" />}
                <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
                  <Clock className="h-4 w-4 text-brand-600" />
                  Upcoming birthdays
                </p>
                <p className="truncate text-sm text-brand-800">
                  {upcomingBirthdays
                    .map((b) => {
                      const label = b.daysUntil === 1 ? 'tomorrow' : `in ${b.daysUntil} days`;
                      return `${b.firstName} ${b.lastName} (${label})`;
                    })
                    .join(', ')}
                </p>
              </>
            )}
          </div>
          <Link
            href="/birthdays"
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
          >
            View all
          </Link>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-md p-1.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
