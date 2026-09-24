'use client';

import { useEffect, useState, useMemo } from 'react';
import { CalendarCheck, Clock4, LogOut, Calendar, BarChart3 } from 'lucide-react';
import { portalApi, formatDateTime, titleCase, formatDate } from '@/lib/portal';
import { Card, CardHeader, CardBody, StatCard, Spinner, EmptyState, cn } from '@/components/ui';

interface AttendanceRecord {
  id: string;
  serviceType: string;
  date: string;
  checkedInAt: string;
  checkedOutAt: string | null;
}

interface AttendanceData {
  items: AttendanceRecord[];
  total: number;
  byType: Array<{ serviceType: string; count: number }>;
}

const serviceColors: Record<string, string> = {
  SUNDAY: 'bg-indigo-50 text-indigo-700',
  MIDWEEK: 'bg-sky-50 text-sky-700',
  PRAYER: 'bg-purple-50 text-purple-700',
  EVENT: 'bg-amber-50 text-amber-700',
};

export default function PortalAttendance() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    portalApi<AttendanceData>('/portal/attendance', { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load attendance history');
      });
    return () => controller.abort();
  }, []);

  const monthlyData = useMemo(() => {
    if (!data) return [];
    const months: Record<string, number> = {};
    data.items.forEach((r) => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        return {
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count,
          percentage: Math.round((count / Math.max(...Object.values(months))) * 100),
        };
      });
  }, [data]);

  const avgDuration = useMemo(() => {
    if (!data) return null;
    const durations = data.items
      .filter((r) => r.checkedOutAt)
      .map((r) => new Date(r.checkedOutAt!).getTime() - new Date(r.checkedInAt).getTime());
    if (durations.length === 0) return null;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const hours = Math.floor(avg / 3600000);
    const mins = Math.floor((avg % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, [data]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <Spinner />
            <p className="mt-4 text-sm text-slate-500">Loading attendance history...</p>
          </>
        )}
      </div>
    );
  }

  const totalCheckedOut = data.items.filter((r) => r.checkedOutAt).length;

  const stats = [
    { label: 'Total visits', value: data.total, icon: <CalendarCheck className="h-4 w-4" />, tone: 'sky', hint: 'All time check-ins' },
    { label: 'Checked out', value: totalCheckedOut, icon: <LogOut className="h-4 w-4" />, tone: 'emerald', hint: `${data.total > 0 ? Math.round((totalCheckedOut / data.total) * 100) : 0}% completion rate` },
    { label: 'Avg. session', value: avgDuration ?? '—', icon: <Clock4 className="h-4 w-4" />, tone: 'violet', hint: 'Average time per visit' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My attendance</h1>
        <p className="mt-0.5 text-sm text-slate-500">Your service check-in history and patterns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} hint={s.hint} index={i} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly activity */}
        <Card className="lg:col-span-1">
          <CardHeader title="Monthly activity" subtitle="Check-ins by month" />
          <CardBody>
            {monthlyData.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="h-8 w-8" />}
                title="No data yet"
                subtitle="Monthly patterns will appear after your first check-ins."
              />
            ) : (
              <div className="space-y-3">
                {monthlyData.map((m) => (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{m.label}</span>
                      <span className="text-xs text-slate-500">{m.count} visit{m.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                        style={{ width: `${m.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* By service type */}
        <Card className="lg:col-span-2">
          <CardHeader title="Service breakdown" subtitle="Attendance by service type" />
          <CardBody>
            {data.byType.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="No attendance data"
                subtitle="Service type breakdown will appear after check-ins."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.byType.map((t) => {
                  const maxCount = Math.max(...data.byType.map((x) => x.count));
                  const percentage = maxCount > 0 ? Math.round((t.count / maxCount) * 100) : 0;
                  return (
                    <div
                      key={t.serviceType}
                      className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50/50"
                    >
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold', serviceColors[t.serviceType] ?? 'bg-slate-100 text-slate-700')}>
                        {t.count}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{titleCase(t.serviceType)}</p>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent check-ins */}
      <Card>
        <CardHeader
          title="Recent check-ins"
          subtitle={`${data.items.length} record${data.items.length === 1 ? '' : 's'}`}
        />
        <CardBody className="p-0">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="h-12 w-12" />}
              title="No attendance yet"
              subtitle="Once you check in at a service, your attendance will appear here."
            />
          ) : (
            <>
              {/* Mobile card list */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {data.items.map((r) => {
                  const duration = r.checkedOutAt
                    ? Math.round((new Date(r.checkedOutAt).getTime() - new Date(r.checkedInAt).getTime()) / 60000)
                    : null;
                  const time = (iso?: string | null) =>
                    iso
                      ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : null;
                  return (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{formatDate(r.date)}</p>
                          <span
                            className={cn(
                              'mt-1 inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold',
                              serviceColors[r.serviceType] ?? 'bg-slate-100 text-slate-700',
                            )}
                          >
                            {titleCase(r.serviceType)}
                          </span>
                        </div>
                        {duration !== null ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            <Clock4 className="h-3 w-3" />
                            {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                            <Clock4 className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          In {time(r.checkedInAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full', r.checkedOutAt ? 'bg-slate-400' : 'bg-amber-400')} />
                          {r.checkedOutAt ? `Out ${time(r.checkedOutAt)}` : 'Still checked in'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Service</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Checked in</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Checked out</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((r) => {
                    const duration = r.checkedOutAt
                      ? Math.round((new Date(r.checkedOutAt).getTime() - new Date(r.checkedInAt).getTime()) / 60000)
                      : null;
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800">{formatDate(r.date)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold', serviceColors[r.serviceType] ?? 'bg-slate-100 text-slate-700')}>
                            {titleCase(r.serviceType)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-slate-700">{formatDateTime(r.checkedInAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('h-1.5 w-1.5 rounded-full', r.checkedOutAt ? 'bg-slate-400' : 'bg-amber-400')} />
                            <span className="text-slate-700">{r.checkedOutAt ? formatDateTime(r.checkedOutAt) : '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {duration !== null ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                              <Clock4 className="h-3 w-3" />
                              {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
