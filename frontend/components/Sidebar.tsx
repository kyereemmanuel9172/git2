'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Cake,
  CalendarCheck,
  Wallet,
  HandCoins,
  CreditCard,
  Network,
  CalendarDays,
  CalendarClock,
  UserPlus,
  Baby,
  Mic,
  HandHeart,
  Boxes,
  BarChart3,
  UserCog,
  ScrollText,
  Settings,
  LogOut,
  Church,
  Megaphone,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from './ui';

const FINANCE_ROLES = ['SUPER_ADMIN', 'CHURCH_ADMIN', 'FINANCE_OFFICER', 'SENIOR_PASTOR'];

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
  { href: '/members', label: 'Members', icon: Users, roles: [] },
  { href: '/birthdays', label: 'Birthdays', icon: Cake, roles: [] },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: [] },
  { href: '/services', label: 'Services', icon: CalendarClock, roles: [] },
  { href: '/visitors', label: 'Visitors', icon: UserPlus, roles: [] },
  { href: '/children', label: 'Children', icon: Baby, roles: [] },
  {
    href: '/finance',
    label: 'Finance',
    icon: Wallet,
    roles: FINANCE_ROLES,
    children: [
      { href: '/giving', label: 'Tithes & Offerings', icon: HandCoins },
      { href: '/payments', label: 'Payments', icon: CreditCard },
    ],
  },
  { href: '/departments', label: 'Departments', icon: Network, roles: [] },
  { href: '/events', label: 'Events', icon: CalendarDays, roles: [] },
  { href: '/podcasts', label: 'Podcasts', icon: Mic, roles: [] },
  { href: '/communication', label: 'Communication', icon: Megaphone, roles: ['SUPER_ADMIN', 'CHURCH_ADMIN', 'SENIOR_PASTOR', 'DEPARTMENT_LEADER'] },
  { href: '/prayer', label: 'Prayer & Counseling', icon: HandHeart, roles: ['SUPER_ADMIN', 'CHURCH_ADMIN', 'SENIOR_PASTOR', 'PASTOR', 'DEPARTMENT_LEADER'] },
  { href: '/assets', label: 'Assets', icon: Boxes, roles: ['SUPER_ADMIN', 'CHURCH_ADMIN', 'SENIOR_PASTOR'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'CHURCH_ADMIN', 'FINANCE_OFFICER', 'SENIOR_PASTOR'] },
  { href: '/users', label: 'Users & Roles', icon: UserCog, roles: ['SUPER_ADMIN', 'CHURCH_ADMIN'] },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText, roles: ['SUPER_ADMIN', 'CHURCH_ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role;
  const [mobileOpen, setMobileOpen] = useState(false);

  const financeActive =
    pathname === '/finance' || pathname.startsWith('/finance/') || pathname.startsWith('/giving') || pathname.startsWith('/payments');
  const [financeOpen, setFinanceOpen] = useState(() => pathname.startsWith('/giving') || pathname.startsWith('/payments'));

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

  const filteredItems = navItems.filter((item) => item.roles.length === 0 || (role && item.roles.includes(role)));

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Church className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Church Admin</p>
          <p className="text-[11px] text-slate-400">Management System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {filteredItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.href}>
                <div className="flex items-center rounded-lg">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex flex-1 items-center gap-3 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors',
                      financeActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                  <button
                    onClick={() => setFinanceOpen((o) => !o)}
                    aria-label={`Toggle ${item.label} submenu`}
                    className={cn(
                      'flex h-9 w-8 items-center justify-center rounded-r-lg transition-colors',
                      financeActive ? 'bg-brand-600 text-white/80 hover:text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', financeOpen && 'rotate-180')} />
                  </button>
                </div>
                {financeOpen && (
                  <div className="mb-0.5 ml-6 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                            childActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                          )}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
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

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-[11px] text-slate-400">{user?.role.replace('_', ' ')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/settings"
              className={cn(
                'rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white',
                pathname.startsWith('/settings') && 'bg-slate-800 text-white',
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-slate-900 p-2.5 text-white shadow-lg shadow-slate-900/20 transition-transform active:scale-95 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
        {navContent}
      </aside>

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
