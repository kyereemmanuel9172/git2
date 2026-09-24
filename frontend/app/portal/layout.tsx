'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UserRound,
  HandCoins,
  CalendarCheck,
  Megaphone,
  CalendarDays,
  HandHeart,
  Cake,
  LogOut,
  Church,
  Menu,
  X,
} from 'lucide-react';
import { PortalProvider, usePortalAuth } from '@/lib/portal-auth';
import { cn, Spinner, Avatar } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const navItems = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/profile', label: 'My Profile', icon: UserRound },
  { href: '/portal/giving', label: 'Giving', icon: HandCoins },
  { href: '/portal/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/portal/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/portal/events', label: 'Events', icon: CalendarDays },
  { href: '/portal/prayer', label: 'Prayer & Counseling', icon: HandHeart },
  { href: '/portal/birthdays', label: 'Birthdays', icon: Cake },
];

function PortalSidebar({ member, logout, mobileOpen, setMobileOpen }: { member: any; logout: () => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const pathname = usePathname();

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Church className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{member?.church?.name ?? 'Church'}</p>
          <p className="truncate text-[11px] text-slate-400">Member Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === '/portal/dashboard' && pathname === '/portal') ||
            (item.href !== '/portal/dashboard' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile & logout */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/portal/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-800"
        >
          <Avatar
            name={`${member?.firstName} ${member?.lastName}`}
            src={member?.photoUrl}
            className="h-9 w-9"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {member?.firstName} {member?.lastName}
            </p>
            <p className="truncate text-[11px] text-slate-400">{member?.memberId ?? 'Member'}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
        {navContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-slate-900 shadow-2xl"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 rounded-md p-1 text-slate-400 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {navContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { member, loading, logout } = usePortalAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublicPage =
    pathname.startsWith('/portal/login') ||
    pathname.startsWith('/portal/forgot-password') ||
    pathname.startsWith('/portal/reset-password');

  useEffect(() => {
    if (!loading && !member && !isPublicPage) router.replace('/portal/login');
  }, [loading, member, isPublicPage, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-sm text-slate-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (isPublicPage || !member) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-slate-900 p-2.5 text-white shadow-lg shadow-slate-900/20 transition-transform active:scale-95 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <PortalSidebar member={member} logout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main content */}
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
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalProvider>
      <PortalShell>{children}</PortalShell>
    </PortalProvider>
  );
}
