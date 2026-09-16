'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Users,
  CalendarCheck,
  Wallet,
  TrendingUp,
  CalendarDays,
  Cake,
  Network,
  Trash2,
  Pencil,
  Sun,
  Moon,
  Sunrise,
} from 'lucide-react';
import { useApiQuery } from '@/lib/hooks';
import { api, formatMoney, formatDateTime } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardBody, EmptyState, StatCard, Button, Modal, Input, Toast, useToast } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SkeletonStats, SkeletonChart, Skeleton } from '@/components/Skeleton';

const ChartsSection = dynamic(() => import('./charts-section'), { ssr: false, loading: () => <SkeletonChart className="col-span-2" /> });

interface Kpis {
  totalMembers: number;
  activeMembers: number;
  visitors: number;
  attendanceLast30Days: number;
  incomeLast30Days: number;
  expenseLast30Days: number;
  upcomingEvents: number;
  openPrayers: number;
  departments: number;
}

interface Birthday {
  id: string;
  firstName: string;
  lastName: string;
  nextBirthday: string;
  age: number;
  daysUntil: number;
}

interface Ministry {
  id: string;
  name: string;
  description?: string | null;
  memberCount?: number;
}

const MINISTRY_CREATE_ROLES = ['SUPER_ADMIN', 'CHURCH_ADMIN', 'SENIOR_PASTOR'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: Sunrise };
  if (h < 17) return { text: 'Good afternoon', icon: Sun };
  return { text: 'Good evening', icon: Moon };
}

function birthdayLabel(b: Birthday) {
  if (b.daysUntil === 0) return 'Today';
  if (b.daysUntil === 1) return 'Tomorrow';
  const md = b.nextBirthday.slice(5).split('-');
  return `${MONTHS[Number(md[0]) - 1]} ${Number(md[1])}`;
}

export default function DashboardPage() {
  const { toast, message } = useToast();
  const { user } = useAuth();
  const greeting = getGreeting();
  const [editTarget, setEditTarget] = useState<Ministry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ministry | null>(null);
  const [saving, setSaving] = useState(false);
  const [ministryForm, setMinistryForm] = useState({ name: '', description: '' });

  const { data: kpis, isLoading: loadingKpis } = useApiQuery<Kpis>(
    ['dashboard', 'kpis'],
    '/dashboard/kpis'
  );

  const { data: trend = [], isLoading: loadingTrend } = useApiQuery<Array<{ date: string; value: number }>>(
    ['dashboard', 'trend'],
    '/dashboard/attendance-trend'
  );

  const { data: byService = [], isLoading: loadingByService } = useApiQuery<Array<{ name: string; value: number }>>(
    ['dashboard', 'byService'],
    '/dashboard/attendance-by-service'
  );

  const { data: demographics = { byStatus: [] }, isLoading: loadingDemographics } = useApiQuery<{ byStatus: Array<{ name: string; value: number }> }>(
    ['dashboard', 'demographics'],
    '/dashboard/demographics'
  );

  const { data: activity = [], isLoading: loadingActivity } = useApiQuery<Array<{ id: string; action: string; details: string; createdAt: string; user: { name: string } | null }>>(
    ['dashboard', 'activity'],
    '/dashboard/recent-activity'
  );

  const { data: birthdayData, isLoading: loadingBirthdays } = useApiQuery<{ items: Birthday[] }>(
    ['dashboard', 'birthdays'],
    '/members/birthdays?days=30'
  );

  const { data: deptsRes, isLoading: loadingMinistries, refetch: refetchMinistries } = useApiQuery<{ items: Ministry[] }>(
    ['departments'],
    '/departments'
  );
  const ministries = deptsRes?.items ?? [];

  const birthdays = birthdayData?.items?.slice(0, 5) ?? [];
  const canCreateMinistry = user?.role ? MINISTRY_CREATE_ROLES.includes(user.role) : false;
  const isLoading = loadingKpis || loadingTrend || loadingByService || loadingDemographics;

  const openEditMinistry = (m: Ministry) => {
    setEditTarget(m);
    setMinistryForm({ name: m.name, description: m.description ?? '' });
  };

  const handleUpdateMinistry = async () => {
    if (!editTarget) return;
    if (!ministryForm.name.trim()) {
      toast('Please enter a ministry name');
      return;
    }
    setSaving(true);
    try {
      await api(`/departments/${editTarget.id}`, {
        method: 'PATCH',
        body: { name: ministryForm.name.trim(), description: ministryForm.description.trim() || undefined },
      });
      toast('Ministry updated');
      setEditTarget(null);
      refetchMinistries();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update ministry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMinistry = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/departments/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Ministry deleted');
      setDeleteTarget(null);
      refetchMinistries();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete ministry');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <greeting.icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting.text}, {user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Here's what's happening at your church today</p>
        </div>
      </div>

      <ErrorBoundary>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis && (
            <>
              <StatCard index={0} tone="indigo" label="Total Members" value={kpis.totalMembers} icon={<Users className="h-4 w-4" />} hint={`${kpis.activeMembers} active · ${kpis.visitors} visitors`} />
              <StatCard index={1} tone="emerald" label="Attendance (30d)" value={kpis.attendanceLast30Days} icon={<CalendarCheck className="h-4 w-4" />} />
              <StatCard index={2} tone="amber" label="Income (30d)" value={formatMoney(kpis.incomeLast30Days)} icon={<Wallet className="h-4 w-4" />} hint={`Expenses ${formatMoney(kpis.expenseLast30Days)}`} />
              <StatCard index={3} tone="sky" label="Upcoming Events" value={kpis.upcomingEvents} icon={<CalendarDays className="h-4 w-4" />} hint={`${kpis.openPrayers} open prayer requests`} />
            </>
          )}
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <Card>
          <CardHeader
            title="Ministries"
            subtitle={`${ministries.length} ministry group${ministries.length === 1 ? '' : 's'}`}
            action={
              ministries.length > 0 && (
                <Link href="/departments" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              )
            }
          />
          <CardBody>
            {loadingMinistries ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : ministries.length === 0 ? (
              <EmptyState
                icon={<Network className="h-8 w-8" />}
                title="No ministries yet"
                subtitle={canCreateMinistry ? 'Create your first ministry to organize your church groups' : 'No ministries have been created yet'}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ministries.slice(0, 8).map((m) => (
                  <div
                    key={m.id}
                    className="group rounded-lg border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-brand-200 hover:bg-brand-50/50 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                        <Network className="h-3.5 w-3.5" />
                      </span>
                      <Link href="/departments" className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700 hover:text-brand-600">{m.name}</p>
                      </Link>
                      {canCreateMinistry && (
                        <div className="flex shrink-0 items-center">
                          <button
                            onClick={() => openEditMinistry(m)}
                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                            title={`Edit ${m.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(m)}
                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title={`Delete ${m.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-xs text-slate-400">{m.description || 'No description'}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{m.memberCount ?? 0} members</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </ErrorBoundary>

      <ErrorBoundary>
        <ChartsSection
          trend={trend}
          byService={byService}
          demographics={demographics}
          loadingTrend={loadingTrend}
          loadingByService={loadingByService}
          loadingDemographics={loadingDemographics}
        />
      </ErrorBoundary>

      <div className="grid gap-4 lg:grid-cols-3">
        <ErrorBoundary>
          <Card>
            <CardHeader
              title="Upcoming birthdays"
              subtitle="Next 30 days"
              action={
                <Link href="/birthdays" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              }
            />
            <CardBody className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
              {loadingBirthdays ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : birthdays.length === 0 ? (
                <EmptyState title="No birthdays soon" />
              ) : (
                birthdays.map((b) => (
                  <Link
                    key={b.id}
                    href={`/members/${b.id}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 p-2 transition-all hover:border-l-2 hover:border-l-brand-400 hover:bg-brand-50/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Cake className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {b.firstName} {b.lastName}
                        <span className="ml-1 font-normal text-slate-400">· {b.age}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">{birthdayLabel(b)}</span>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card className="lg:col-span-1">
            <CardHeader title="Recent activity" />
            <CardBody className="max-h-64 overflow-y-auto scrollbar-thin">
              {loadingActivity ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <ul className="space-y-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">{a.user?.name ?? 'System'}</span> · {a.action.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          {a.details && <p className="text-xs text-slate-500">{a.details}</p>}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card>
            <CardHeader
              title="Departments"
              subtitle={`${ministries.length} department${ministries.length === 1 ? '' : 's'}`}
              action={
                <Link href="/departments" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              }
            />
            <CardBody className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
              {loadingMinistries ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : ministries.length === 0 ? (
                <EmptyState title="No departments yet" />
              ) : (
                ministries.slice(0, 6).map((m) => (
                  <Link
                    key={m.id}
                    href="/departments"
                    className="flex items-center gap-3 rounded-lg border border-slate-100 p-2 transition-all hover:border-l-2 hover:border-l-brand-400 hover:bg-brand-50/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Network className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{m.name}</p>
                      <p className="truncate text-xs text-slate-400">{m.description || 'No description'}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">{m.memberCount ?? 0}</span>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>
        </ErrorBoundary>
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit ministry">
        <div className="space-y-4">
          <Input
            label="Name"
            value={ministryForm.name}
            onChange={(e) => setMinistryForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Youth Ministry"
          />
          <Input
            label="Description"
            value={ministryForm.description}
            onChange={(e) => setMinistryForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What does this ministry do?"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMinistry} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete ministry">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? This action
          cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteMinistry} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <SkeletonStats />
      <SkeletonChart />
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonChart className="lg:col-span-2" />
        <SkeletonChart />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}
