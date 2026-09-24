'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Download, Users, CalendarCheck, Wallet, CalendarDays } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api, download, formatMoney, formatDate, titleCase } from '@/lib/api';
import { DateRangePicker } from '@/components/date-range-picker';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  statusColor,
  Spinner,
  EmptyState,
  PageHeader,
  StatCard,
  cn,
} from '@/components/ui';

interface MembershipReport {
  total: number;
  active: number;
  joinedThisYear: number;
  families: number;
  byStatus: Array<{ name: string; value: number }>;
  byGender: Array<{ name: string; value: number }>;
}

interface AttendanceReport {
  from?: string | null;
  to?: string | null;
  totalCheckIns: number;
  uniqueMembers: number;
  byService: Record<string, number>;
  byDay: Record<string, number>;
}

interface FinanceReport {
  from?: string | null;
  to?: string | null;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
  byCategory: Record<string, number>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    category: string;
    date: string;
    description?: string | null;
    member?: string | null;
  }>;
}

interface EventReport {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  registrations: number;
  attended: number;
}

type Tab = 'membership' | 'attendance' | 'finance' | 'events';

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: 'membership', label: 'Membership', icon: <Users className="h-4 w-4" /> },
  { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="h-4 w-4" /> },
  { id: 'finance', label: 'Finance', icon: <Wallet className="h-4 w-4" /> },
  { id: 'events', label: 'Events', icon: <CalendarDays className="h-4 w-4" /> },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const todayIso = () => isoDay(new Date());
const daysAgoIso = (n: number) => isoDay(new Date(Date.now() - n * 86400000));
const monthStartIso = () => {
  const d = new Date();
  return isoDay(new Date(d.getFullYear(), d.getMonth(), 1));
};

const DATE_PRESETS: Array<{ key: string; label: string; from: () => string; to: () => string }> = [
  { key: '7d', label: 'Last 7 days', from: () => daysAgoIso(7), to: todayIso },
  { key: '30d', label: 'Last 30 days', from: () => daysAgoIso(30), to: todayIso },
  { key: 'month', label: 'This month', from: monthStartIso, to: todayIso },
];

function BarList({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) return <EmptyState title="No data" />;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">{titleCase(d.name)}</span>
            <span className="text-slate-500">{d.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('membership');
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipReport | null>(null);
  const [events, setEvents] = useState<EventReport[]>([]);
  const [attendance, setAttendance] = useState<AttendanceReport | null>(null);
  const [finance, setFinance] = useState<FinanceReport | null>(null);
  const [attFrom, setAttFrom] = useState('');
  const [attTo, setAttTo] = useState('');
  const [finFrom, setFinFrom] = useState('');
  const [finTo, setFinTo] = useState('');
  const [attPreset, setAttPreset] = useState('');
  const [finPreset, setFinPreset] = useState('');
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<MembershipReport>('/reports/membership'),
      api<EventReport[]>('/reports/events'),
      api<AttendanceReport>('/reports/attendance'),
      api<FinanceReport>('/reports/finance'),
    ])
      .then(([m, e, a, f]) => {
        setMembership(m);
        setEvents(e);
        setAttendance(a);
        setFinance(f);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const loadAttendance = async (range?: { from?: string; to?: string }) => {
    setLoadingAttendance(true);
    try {
      const params = new URLSearchParams();
      const from = range?.from ?? attFrom;
      const to = range?.to ?? attTo;
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const res = await api<AttendanceReport>(`/reports/attendance${qs ? `?${qs}` : ''}`);
      setAttendance(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const loadFinance = async (range?: { from?: string; to?: string }) => {
    setLoadingFinance(true);
    try {
      const params = new URLSearchParams();
      const from = range?.from ?? finFrom;
      const to = range?.to ?? finTo;
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      const res = await api<FinanceReport>(`/reports/finance${qs ? `?${qs}` : ''}`);
      setFinance(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingFinance(false);
    }
  };

  const applyAttPreset = async (key: string) => {
    const p = DATE_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setAttPreset(key);
    setAttFrom(p.from());
    setAttTo(p.to());
    await loadAttendance({ from: p.from(), to: p.to() });
  };

  const applyFinPreset = async (key: string) => {
    const p = DATE_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setFinPreset(key);
    setFinFrom(p.from());
    setFinTo(p.to());
    await loadFinance({ from: p.from(), to: p.to() });
  };

  const attendanceByDay = attendance ? Object.entries(attendance.byDay).map(([date, value]) => ({ date, value })) : [];
  const attendanceByService = attendance ? Object.entries(attendance.byService).map(([name, value]) => ({ name, value })) : [];
  const financeByCategory = finance ? Object.entries(finance.byCategory).map(([name, value]) => ({ name, value })) : [];

  const exportPdf = () => {
    const params = new URLSearchParams({ type: tab });
    if (tab === 'attendance') {
      if (attFrom) params.set('from', attFrom);
      if (attTo) params.set('to', attTo);
    }
    if (tab === 'finance') {
      if (finFrom) params.set('from', finFrom);
      if (finTo) params.set('to', finTo);
    }
    download(`/reports/export/pdf?${params.toString()}`, `${tab}-report.pdf`);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Membership, attendance, finance and events insights" />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => download('/reports/export/members', 'members-report.csv')}>
          <Download className="h-4 w-4" />
          Export members CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => download('/reports/export/finance', 'finance-report.csv')}>
          <Download className="h-4 w-4" />
          Export finance CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportPdf}>
          <Download className="h-4 w-4" />
          Export {tab} PDF
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'membership' && membership && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total members" value={membership.total} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Active" value={membership.active} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Joined this year" value={membership.joinedThisYear} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Church Groups" value={membership.families} icon={<Users className="h-4 w-4" />} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="By status" />
              <CardBody>
                <BarList data={membership.byStatus} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="By gender" />
              <CardBody>
                <BarList data={membership.byGender} />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Date range</span>
                <div className="flex flex-wrap gap-1.5">
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => applyAttPreset(p.key)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        attPreset === p.key
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <span className="hidden text-xs text-slate-400 sm:inline">or pick a custom range</span>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex-1">
                  <DateRangePicker
                    from={attFrom}
                    to={attTo}
                    onChange={({ from, to }) => {
                      setAttPreset('');
                      setAttFrom(from);
                      setAttTo(to);
                    }}
                    placeholder="Pick a date range"
                  />
                </div>
                <Button onClick={() => loadAttendance()} disabled={loadingAttendance} className="w-full sm:w-auto">
                  {loadingAttendance ? 'Loading...' : 'Apply filter'}
                </Button>
              </div>
            </CardBody>
          </Card>
          {attendance && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatCard label="Total check-ins" value={attendance.totalCheckIns} icon={<CalendarCheck className="h-4 w-4" />} />
                <StatCard label="Unique members" value={attendance.uniqueMembers} icon={<Users className="h-4 w-4" />} />
                <StatCard
                  label="Date range"
                  value={
                    attendance.from && attendance.to
                      ? `${formatDate(attendance.from)} → ${formatDate(attendance.to)}`
                      : 'All'
                  }
                  icon={<CalendarCheck className="h-4 w-4" />}
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader title="By service" />
                  <CardBody>
                    <BarList data={attendanceByService} />
                  </CardBody>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader title="Daily attendance" />
                  <CardBody className="h-72">
                    {attendanceByDay.length === 0 ? (
                      <EmptyState title="No attendance data" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={attendanceByDay}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" name="Check-ins" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardBody>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'finance' && (
        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Date range</span>
                <div className="flex flex-wrap gap-1.5">
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => applyFinPreset(p.key)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        finPreset === p.key
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <span className="hidden text-xs text-slate-400 sm:inline">or pick a custom range</span>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex-1">
                  <DateRangePicker
                    from={finFrom}
                    to={finTo}
                    onChange={({ from, to }) => {
                      setFinPreset('');
                      setFinFrom(from);
                      setFinTo(to);
                    }}
                    placeholder="Pick a date range"
                  />
                </div>
                <Button onClick={() => loadFinance()} disabled={loadingFinance} className="w-full sm:w-auto">
                  {loadingFinance ? 'Loading...' : 'Apply filter'}
                </Button>
              </div>
            </CardBody>
          </Card>
          {finance && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Income" value={formatMoney(finance.income)} icon={<Wallet className="h-4 w-4" />} />
                <StatCard label="Expenses" value={formatMoney(finance.expense)} icon={<Wallet className="h-4 w-4" />} />
                <StatCard label="Balance" value={formatMoney(finance.balance)} icon={<Wallet className="h-4 w-4" />} />
                <StatCard label="Transactions" value={finance.transactionCount} icon={<Wallet className="h-4 w-4" />} />
              </div>
              <Card>
                <CardHeader title="By category" />
                <CardBody className="h-72">
                  {financeByCategory.length === 0 ? (
                    <EmptyState title="No finance data" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financeByCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" name="Amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Transactions" />
                <div>
                  {finance.transactions.length === 0 ? (
                    <EmptyState title="No transactions" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Member</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {finance.transactions.map((t) => (
                            <tr key={t.id}>
                              <td className="px-4 py-3 text-slate-700">{formatDate(t.date)}</td>
                              <td className="px-4 py-3">
                                <Badge color={t.type === 'INCOME' ? 'green' : 'red'}>{titleCase(t.type)}</Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{titleCase(t.category)}</td>
                              <td className="px-4 py-3 text-slate-700">{t.member ?? '—'}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">{formatMoney(t.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'events' && (
        <Card>
          {events.length === 0 ? (
            <EmptyState title="No events" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Registrations</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Attended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{ev.title}</td>
                      <td className="px-4 py-3 text-slate-700">{titleCase(ev.type)}</td>
                      <td className="px-4 py-3">
                        <Badge color={statusColor(ev.status)}>{titleCase(ev.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(ev.startDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{ev.registrations}</td>
                      <td className="px-4 py-3 text-slate-700">{ev.attended}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
