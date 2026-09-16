'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  CalendarDays,
  HandCoins,
  HandHeart,
  Megaphone,
  ArrowRight,
  Clock4,
  MapPin,
  Sparkles,
  Users,
  ChevronRight,
} from 'lucide-react';
import { usePortalAuth } from '@/lib/portal-auth';
import { portalApi, formatMoney, formatDate, formatDateTime, titleCase } from '@/lib/portal';
import { Card, CardHeader, CardBody, Badge, Spinner, EmptyState, statusColor, cn } from '@/components/ui';

interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string | null;
  department: { id: string; name: string } | null;
}

interface PortalEvent {
  id: string;
  title: string;
  type: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  status: string;
  registrations: number;
  registered: boolean;
  registrationStatus: string | null;
}

interface Overview {
  kpis: { attendanceCount: number; givingTotal: number; registrations: number; prayerCount: number };
  recentAnnouncements: Announcement[];
  upcomingEvents: PortalEvent[];
}

const statVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: 'easeOut' },
  }),
};

const quickActions = [
  { label: 'Submit prayer request', icon: HandHeart, href: '/portal/prayer', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
  { label: 'View giving history', icon: HandCoins, href: '/portal/giving', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
  { label: 'Check attendance', icon: CalendarCheck, href: '/portal/attendance', color: 'bg-sky-50 text-sky-600 hover:bg-sky-100' },
  { label: 'Update profile', icon: Users, href: '/portal/profile', color: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
];

export default function PortalDashboard() {
  const { member } = usePortalAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    portalApi<Overview>('/portal/overview', { signal: controller.signal })
      .then(setOverview)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load overview');
      });
    return () => controller.abort();
  }, []);

  if (!overview) {
    return (
      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner />
            <p className="mt-4 text-sm text-slate-500">Loading your dashboard...</p>
          </div>
        )}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Attendance',
      value: overview.kpis.attendanceCount,
      icon: <CalendarCheck className="h-5 w-5" />,
      iconBg: 'bg-sky-100 text-sky-600',
      href: '/portal/attendance',
      hint: 'Total check-ins',
    },
    {
      label: 'Total giving',
      value: formatMoney(overview.kpis.givingTotal),
      icon: <HandCoins className="h-5 w-5" />,
      iconBg: 'bg-emerald-100 text-emerald-600',
      href: '/portal/giving',
      hint: 'Lifetime contributions',
    },
    {
      label: 'Event registrations',
      value: overview.kpis.registrations,
      icon: <CalendarDays className="h-5 w-5" />,
      iconBg: 'bg-violet-100 text-violet-600',
      href: '/portal/events',
      hint: 'Upcoming & past',
    },
    {
      label: 'Prayer requests',
      value: overview.kpis.prayerCount,
      icon: <HandHeart className="h-5 w-5" />,
      iconBg: 'bg-amber-100 text-amber-600',
      href: '/portal/prayer',
      hint: 'Active requests',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl shadow-brand-600/20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                {getGreeting()}, {member?.firstName ?? ''}
              </h1>
              <p className="mt-1 text-sm text-white/70 sm:text-base">
                {member?.church?.name} · {member?.memberId ?? 'Member'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge color={statusColor(member?.membershipStatus ?? '')}>
                  {titleCase(member?.membershipStatus ?? '')}
                </Badge>
                {member?.departmentLinks && member.departmentLinks.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
                    <Users className="h-3 w-3" />
                    {member.departmentLinks.length} ministry{member.departmentLinks.length > 1 ? 'ies' : 'y'}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles className="h-8 w-8 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link key={k.label} href={k.href}>
            <motion.div
              variants={statVariants}
              custom={i}
              initial="hidden"
              animate="show"
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', k.iconBg)}>
                {k.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500">{k.label}</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{k.value}</p>
                {k.hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{k.hint}</p>}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors', action.color)}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700 group-hover:text-slate-900">{action.label}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </Link>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Announcements - wider column */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader
              title="Latest announcements"
              subtitle="News and updates from your church"
              action={
                <Link
                  href="/portal/announcements"
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <CardBody className="space-y-3">
              {overview.recentAnnouncements.length === 0 && (
                <EmptyState
                  icon={<Megaphone className="h-10 w-10" />}
                  title="No announcements yet"
                  subtitle="Check back soon for news from your church."
                />
              )}
              {overview.recentAnnouncements.map((a, i) => (
                <div
                  key={a.id}
                  className={cn(
                    'group rounded-xl border border-slate-100 p-4 transition-all hover:border-slate-200 hover:bg-slate-50/50',
                    i === 0 && 'border-brand-100 bg-brand-50/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                            <Sparkles className="h-2.5 w-2.5" /> NEW
                          </span>
                        )}
                        <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{a.content}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {a.department && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {a.department.name}
                          </span>
                        )}
                        {a.publishedAt && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock4 className="h-3 w-3" />
                            {formatDate(a.publishedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Events - narrower column */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader
              title="Upcoming events"
              subtitle="Services, conferences and gatherings"
              action={
                <Link
                  href="/portal/events"
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <CardBody className="space-y-3">
              {overview.upcomingEvents.length === 0 && (
                <EmptyState
                  icon={<CalendarDays className="h-10 w-10" />}
                  title="No upcoming events"
                  subtitle="There are no upcoming events scheduled right now."
                />
              )}
              {overview.upcomingEvents.map((e) => (
                <div
                  key={e.id}
                  className="group flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition-all hover:border-slate-200 hover:bg-slate-50/50"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <span className="text-base font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                    <span className="text-[10px] font-semibold uppercase leading-tight">
                      {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{e.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                      {e.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock4 className="h-3 w-3" /> {formatDateTime(e.startDate)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {e.registered ? (
                        <Badge color={statusColor(e.registrationStatus ?? '')}>
                          {titleCase(e.registrationStatus ?? 'Registered')}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400">Not registered</span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {e.registrations} registered
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
