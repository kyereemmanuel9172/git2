'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users,
  UserCheck,
  CalendarCheck,
  Phone,
  MessageSquare,
  CalendarX2,
  Gauge,
  RefreshCw,
  Send,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  Printer,
  Download,
} from 'lucide-react';
import { api, download, formatDate, titleCase } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Textarea,
  Badge,
  Table,
  Td,
  Spinner,
  EmptyState,
  PageHeader,
  Toast,
  useToast,
  Avatar,
  Modal,
  statusColor,
  cn,
} from '@/components/ui';
import { QRScanner } from '@/components/QRScanner';
import ConferenceCall from '@/components/ConferenceCall';

interface MemberSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  photoUrl: string | null;
  memberId: string | null;
  phone: string | null;
}

interface RegisterMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  memberId: string | null;
  photoUrl: string | null;
  departmentLinks: Array<{ department: { name: string } }>;
}

interface RegisterRecord {
  id: string;
  memberId: string;
  serviceType: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  member: { id: string; firstName: string; lastName: string; photoUrl: string | null; memberId: string | null; phone: string | null };
}

interface TodayRegister {
  date: string;
  serviceScheduled: boolean;
  activeMembers: number;
  present: number;
  notCheckedIn: RegisterMember[];
  attendanceRate: number;
  byType: Record<string, number>;
  records: RegisterRecord[];
}

interface AttendanceRecord {
  id: string;
  serviceType: string;
  date: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  member: { firstName: string; lastName: string };
}

interface ScannedMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  memberId: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  membershipStatus: string | null;
  joinDate: string | null;
  baptismDate: string | null;
  notes: string | null;
  family: { id: string; name: string; address: string | null } | null;
  departmentLinks: Array<{ department: { id: string; name: string }; role: string | null }>;
}

const SERVICE_TYPES = ['SUNDAY', 'MIDWEEK', 'PRAYER', 'EVENT'];

const serviceColor: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'indigo' | 'purple'> = {
  SUNDAY: 'indigo',
  MIDWEEK: 'blue',
  PRAYER: 'amber',
  EVENT: 'purple',
};

const toYMD = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const formatGmt = (v: string | null | undefined) =>
  v ? `${new Date(v).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} GMT` : null;

const fullName = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`;
const ministryNames = (m: RegisterMember) =>
  m.departmentLinks.length ? m.departmentLinks.map((l) => l.department.name).join(', ') : '—';

const formatService = (s: string) => s[0] + s.slice(1).toLowerCase();

const PRESENT_PAGE_SIZE = 6;
const ABSENT_PAGE_SIZE = 6;
const HISTORY_PAGE_SIZE = 6;
const CHECKIN_PAGE_SIZE = 6;

const statVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: 'easeOut' },
  }),
};

function Pagination({
  page,
  totalPages,
  totalItems,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
      <span className="text-xs text-slate-400">{totalItems} total</span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="px-1 text-xs text-slate-500">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages}>
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

type RegisterTab = 'present' | 'absent' | 'history';

export default function AttendancePage() {
  const { toast, message } = useToast();
  const today = toYMD(new Date());

  const [serviceType, setServiceType] = useState('SUNDAY');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const [register, setRegister] = useState<TodayRegister | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordFilter, setRecordFilter] = useState('');
  const [recordPage, setRecordPage] = useState(1);
  const [recordTotal, setRecordTotal] = useState(0);
  const [presentPage, setPresentPage] = useState(1);
  const [absentPage, setAbsentPage] = useState(1);
  const [checkinPage, setCheckinPage] = useState(1);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<RegisterTab>('present');

  const [msgTarget, setMsgTarget] = useState<RegisterMember | null>(null);
  const [msgChannel, setMsgChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgResult, setMsgResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedMember | null>(null);
  const [scanResolving, setScanResolving] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanCheckinStatus, setScanCheckinStatus] = useState<'idle' | 'checking_in' | 'success' | 'already' | 'error'>('idle');
  const [scanCheckinMsg, setScanCheckinMsg] = useState('');
  const [conferenceOpen, setConferenceOpen] = useState(false);
  const [conferenceParticipants, setConferenceParticipants] = useState<Array<{ id?: string; name: string; phone?: string | null }>>([]);

  useEffect(() => {
    api<{ items: MemberSummary[] }>('/members?limit=200')
      .then((d) => setMembers(d.items))
      .catch(() => setMembers([]));
  }, []);

  const loadRegister = useCallback(() => {
    return api<TodayRegister>('/attendance/register')
      .then((r) => {
        setRegister(r);
        setPresentPage(1);
        setAbsentPage(1);
      })
      .catch(() => setRegister(null));
  }, []);

  const loadRecords = useCallback(() => {
    setLoadingRecords(true);
    const params = new URLSearchParams({ limit: String(HISTORY_PAGE_SIZE), page: String(recordPage) });
    if (recordFilter) params.set('serviceType', recordFilter);
    return api<{ items: AttendanceRecord[]; total: number }>(`/attendance?${params}`)
      .then((d) => {
        setRecords(d.items);
        setRecordTotal(d.total);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoadingRecords(false));
  }, [recordFilter, recordPage]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadRegister(), loadRecords()]);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members
      .filter(
        (m) =>
          fullName(m).toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q) ||
          (m.memberId ?? '').toLowerCase().includes(q) ||
          (m.phone ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [members, search]);

  const checkin = async (m: MemberSummary) => {
    setCheckingId(m.id);
    try {
      const res = await api<{ alreadyCheckedIn: boolean }>('/attendance/checkin', {
        method: 'POST',
        body: { memberId: m.id, serviceType, date: today },
      });
      toast(res.alreadyCheckedIn ? 'Already checked in' : 'Checked in');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setCheckingId(null);
    }
  };

  const checkout = async (m: { id: string }) => {
    setCheckingId(m.id);
    try {
      const res = await api<{ alreadyCheckedOut: boolean }>('/attendance/checkout', {
        method: 'POST',
        body: { memberId: m.id },
      });
      toast(res.alreadyCheckedOut ? 'Already checked out' : 'Checked out');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Check-out failed');
    } finally {
      setCheckingId(null);
    }
  };

  const checkoutRecord = async (recordId: string) => {
    setCheckingId(recordId);
    try {
      const res = await api<{ alreadyCheckedOut: boolean }>('/attendance/checkout', {
        method: 'POST',
        body: { recordId },
      });
      toast(res.alreadyCheckedOut ? 'Already checked out' : 'Checked out');
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Check-out failed');
    } finally {
      setCheckingId(null);
    }
  };

  const openScanner = () => {
    setScanResult(null);
    setScanResolving(false);
    setScanError(null);
    setScanCheckinStatus('idle');
    setScanCheckinMsg('');
    setScanOpen(true);
  };

  const closeScanner = () => {
    setScanOpen(false);
    setScanResult(null);
    setScanResolving(false);
    setScanError(null);
    setScanCheckinStatus('idle');
    setScanCheckinMsg('');
  };

  const retryScan = () => {
    setScanResult(null);
    setScanResolving(false);
    setScanError(null);
    setScanCheckinStatus('idle');
    setScanCheckinMsg('');
  };

  const handleScanned = async (rawCode: string) => {
    setScanResolving(true);
    setScanError(null);
    setScanCheckinStatus('idle');
    let code = rawCode.trim();
    try {
      const url = new URL(code);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length) code = decodeURIComponent(segments[segments.length - 1]);
    } catch {
      // not a URL; use the value as-is
    }
    try {
      const member = await api<ScannedMember>(`/members/resolve/${encodeURIComponent(code)}`);
      setScanResult(member);
      setScanResolving(false);

      setScanCheckinStatus('checking_in');
      try {
        const res = await api<{ alreadyCheckedIn: boolean }>('/attendance/checkin', {
          method: 'POST',
          body: { memberId: member.id, serviceType, date: today },
        });
        if (res.alreadyCheckedIn) {
          setScanCheckinStatus('already');
          setScanCheckinMsg(`${fullName(member)} is already checked in today.`);
          toast('Already checked in');
        } else {
          setScanCheckinStatus('success');
          setScanCheckinMsg(`${fullName(member)} checked in successfully.`);
          toast('Checked in');
        }
        refresh();
      } catch {
        setScanCheckinStatus('error');
        setScanCheckinMsg('Check-in failed. Please try again.');
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Could not find this member.');
      setScanResolving(false);
    }
  };

  const openMessage = (m: RegisterMember) => {
    setMsgTarget(m);
    setMsgChannel(m.email && !m.phone ? 'EMAIL' : 'SMS');
    setMsgSubject('');
    setMsgText('');
    setMsgResult(null);
  };

  const recordCall = (m: RegisterMember) => {
    api('/communications/calls', { method: 'POST', body: { memberId: m.id } }).catch(() => {});
  };

  const sendMessage = async () => {
    if (!msgTarget || !msgText.trim()) return;
    setMsgSending(true);
    setMsgResult(null);
    try {
      const res = await api<{ status: string; messages: Array<{ status: string; error: string | null }> }>(
        '/communications/direct',
        {
          method: 'POST',
          body: {
            type: msgChannel,
            memberId: msgTarget.id,
            subject: msgChannel === 'EMAIL' ? msgSubject : undefined,
            message: msgText.trim(),
          },
        },
      );
      const first = res.messages?.[0];
      if (first?.status === 'SENT') {
        setMsgResult({ ok: true, text: 'Message sent successfully.' });
      } else {
        setMsgResult({
          ok: false,
          text: `Message recorded but not delivered: ${first?.error ?? 'unknown error'}`,
        });
      }
    } catch (e) {
      setMsgResult({ ok: false, text: e instanceof Error ? e.message : 'Failed to send message' });
    } finally {
      setMsgSending(false);
    }
  };

  const absent = register ? register.activeMembers - register.present : 0;
  const rate = register?.attendanceRate ?? 0;
  const msgLimit = msgChannel === 'SMS' ? 1600 : 5000;

  const absentRows = register
    ? register.notCheckedIn.slice((absentPage - 1) * ABSENT_PAGE_SIZE, absentPage * ABSENT_PAGE_SIZE)
    : [];
  const absentTotalPages = Math.max(1, Math.ceil((register?.notCheckedIn.length ?? 0) / ABSENT_PAGE_SIZE));
  const recordTotalPages = Math.max(1, Math.ceil(recordTotal / HISTORY_PAGE_SIZE));

  const presentRows = register
    ? register.records.slice((presentPage - 1) * PRESENT_PAGE_SIZE, presentPage * PRESENT_PAGE_SIZE)
    : [];
  const presentTotalPages = Math.max(1, Math.ceil((register?.records.length ?? 0) / PRESENT_PAGE_SIZE));

  const presentIds = useMemo(
    () => new Set((register?.records ?? []).filter((r) => !r.checkedOutAt).map((r) => r.memberId)),
    [register],
  );

  const checkinRows = filtered.slice((checkinPage - 1) * CHECKIN_PAGE_SIZE, checkinPage * CHECKIN_PAGE_SIZE);
  const checkinTotalPages = Math.max(1, Math.ceil(filtered.length / CHECKIN_PAGE_SIZE));

  const tabs: Array<{ key: RegisterTab; label: string; count: number }> = [
    { key: 'present', label: 'Present', count: register?.present ?? 0 },
    { key: 'absent', label: 'Not checked in', count: absent },
    { key: 'history', label: 'History', count: recordTotal },
  ];

  const stats = [
    {
      label: 'Active members',
      value: register?.activeMembers ?? '—',
      icon: Users,
      card: 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30',
      chip: 'bg-white/25 text-white',
    },
    {
      label: 'Present today',
      value: register?.present ?? '—',
      icon: UserCheck,
      card: 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30',
      chip: 'bg-white/25 text-white',
      hint: register ? `${Math.round(rate)}% of active` : undefined,
      bar: register ? rate : 0,
    },
    {
      label: 'Not checked in',
      value: absent || '—',
      icon: CalendarX2,
      card: 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30',
      chip: 'bg-white/25 text-white',
    },
    {
      label: 'Attendance rate',
      value: register ? `${rate}%` : '—',
      icon: Gauge,
      card: 'bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sky-500/30',
      chip: 'bg-white/25 text-white',
      hint: register ? `${register.records.length} check-ins today` : undefined,
      bar: register ? rate : 0,
    },
  ];

  const openPrintReport = () => {
    const esc = (s: string | null | undefined) =>
      (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      toast('Pop-up blocked. Allow pop-ups to print the report.');
      return;
    }
    const presentRows = (register?.records ?? [])
      .map(
        (r) => `<tr>
          <td>${esc(r.member.firstName + ' ' + r.member.lastName)}</td>
          <td>${esc(r.member.memberId)}</td>
          <td>${esc(formatService(r.serviceType))}</td>
          <td>${esc(formatGmt(r.checkedInAt))}</td>
          <td>${esc(r.checkedOutAt ? formatGmt(r.checkedOutAt) : '—')}</td>
        </tr>`,
      )
      .join('');
    const absentRows = (register?.notCheckedIn ?? [])
      .map(
        (m) => `<tr>
          <td>${esc(m.firstName + ' ' + m.lastName)}</td>
          <td>${esc(m.memberId)}</td>
          <td>${esc(m.phone)}</td>
          <td>${esc(ministryNames(m))}</td>
        </tr>`,
      )
      .join('');
    const attRate = register?.attendanceRate ?? 0;
    win.document.write(`<!doctype html><html><head><title>Attendance Report</title><style>
      body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#111}
      h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:20px 0 8px;color:#4f46e5}
      p.meta{color:#555;font-size:12px;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left}
      th{background:#f3f4f6}
      .stats{display:flex;gap:12px;margin-bottom:20px}
      .stat{border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;text-align:center;flex:1}
      .stat .val{font-size:20px;font-weight:bold} .stat .lbl{font-size:11px;color:#6b7280;text-transform:uppercase}
      @media print{ button{display:none} }
    </style></head><body>
      <h1>Attendance Report</h1>
      <p class="meta">${esc(register?.date ?? today)} &middot; ${register?.present ?? 0} of ${register?.activeMembers ?? 0} checked in &middot; ${Math.round(attRate)}% attendance rate</p>
      <div class="stats">
        <div class="stat"><div class="val">${register?.activeMembers ?? 0}</div><div class="lbl">Active</div></div>
        <div class="stat"><div class="val">${register?.present ?? 0}</div><div class="lbl">Present</div></div>
        <div class="stat"><div class="val">${(register?.activeMembers ?? 0) - (register?.present ?? 0)}</div><div class="lbl">Absent</div></div>
        <div class="stat"><div class="val">${Math.round(attRate)}%</div><div class="lbl">Rate</div></div>
      </div>
      <h2>Checked In (${register?.records.length ?? 0})</h2>
      <table><thead><tr><th>Name</th><th>Member ID</th><th>Service</th><th>Checked In</th><th>Checked Out</th></tr></thead>
      <tbody>${presentRows || '<tr><td colspan="5">No check-ins yet.</td></tr>'}</tbody></table>
      <h2>Not Checked In (${register?.notCheckedIn.length ?? 0})</h2>
      <table><thead><tr><th>Name</th><th>Member ID</th><th>Phone</th><th>Ministry</th></tr></thead>
      <tbody>${absentRows || '<tr><td colspan="4">All members present.</td></tr>'}</tbody></table>
      <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        subtitle={today}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={register?.serviceScheduled ? 'green' : 'amber'}>
              {register?.serviceScheduled ? 'Service day' : 'No service scheduled'}
            </Badge>
            <Button variant="outline" size="sm" onClick={openPrintReport}>
              <Printer className="h-3.5 w-3.5" />
              Print report
            </Button>
            <Button variant="outline" size="sm" onClick={() => download('/attendance/export/pdf', 'attendance.pdf')}>
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            variants={statVariants}
            custom={i}
            initial="hidden"
            animate="show"
            whileHover={{ y: -4, transition: { duration: 0.2, delay: 0, ease: 'easeOut' } }}
            className={cn('relative overflow-hidden rounded-xl px-4 py-3.5 shadow-lg', s.card)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/80">{s.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">{s.value}</p>
                {s.hint && <p className="mt-0.5 truncate text-[11px] text-white/70">{s.hint}</p>}
              </div>
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', s.chip)}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            {s.bar !== undefined && register && (
              <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/30">
                <div className="h-1 rounded-full bg-white" style={{ width: `${s.bar}%` }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
        className="grid gap-4 lg:grid-cols-3"
      >
        <Card className="lg:col-span-2 h-full flex flex-col">
          <CardHeader
            title="Today's register"
            subtitle={register ? `${register.present} of ${register.activeMembers} checked in` : 'Loading…'}
            action={
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {t.label}
                    <span className={cn('ml-1', tab === t.key ? 'text-brand-600' : 'text-slate-400')}>{t.count}</span>
                  </button>
                ))}
              </div>
            }
          />
          {register && (
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-2.5">
              <span className="text-xs text-slate-500">{Math.round(rate)}% checked in</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-1 rounded-full bg-brand-500" style={{ width: `${rate}%` }} />
              </div>
            </div>
          )}
          <CardBody className="p-0">
            {tab === 'present' &&
              (!register ? (
                <Spinner />
              ) : register.records.length === 0 ? (
                <EmptyState
                  icon={<CalendarCheck className="h-8 w-8" />}
                  title="No check-ins yet"
                  subtitle="Checked-in members will appear here."
                />
              ) : (
                <Table headers={['Member', 'Member ID', 'Service', 'Checked in', 'Check out']}>
                  {presentRows.map((r, i) => (
                    <tr key={`${r.memberId}-${i}`}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(r.member)} src={r.member.photoUrl} className="h-8 w-8" />
                          <span className="font-medium text-slate-800">{fullName(r.member)}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-500">{r.member.memberId ?? '—'}</span>
                      </Td>
                      <Td>
                        <Badge color={serviceColor[r.serviceType] ?? 'slate'}>{formatService(r.serviceType)}</Badge>
                      </Td>
                      <Td>
                        <span className="text-sm text-slate-600">{formatGmt(r.checkedInAt) ?? '—'}</span>
                      </Td>
                      <Td>
                        {r.checkedOutAt ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                            Out {formatGmt(r.checkedOutAt)}
                          </span>
                        ) : (
                          <button
                            onClick={() => checkoutRecord(r.id)}
                            disabled={checkingId === r.id}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600 transition-colors hover:bg-amber-500 hover:text-white disabled:opacity-50"
                          >
                            {checkingId === r.id ? '…' : 'Check out'}
                          </button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
              ))}

            {tab === 'absent' &&
              (!register ? (
                <Spinner />
              ) : register.notCheckedIn.length === 0 ? (
                <EmptyState
                  icon={<CalendarCheck className="h-8 w-8" />}
                  title="Everyone is present"
                  subtitle="No active members are missing today."
                />
              ) : (
                <>
                  <div className="flex items-center justify-end border-b border-slate-100 px-4 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConferenceParticipants(
                          register.notCheckedIn.map((m) => ({ id: m.id, name: fullName(m), phone: m.phone })),
                        );
                        setConferenceOpen(true);
                      }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Conference call ({register.notCheckedIn.length})
                    </Button>
                  </div>
                  <Table headers={['Member', 'Member ID', 'Phone', 'Ministry', 'Contact']}>
                    {absentRows.map((m) => (
                    <tr key={m.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(m)} src={m.photoUrl} className="h-8 w-8" />
                          <div>
                            <p className="font-medium text-slate-800">{fullName(m)}</p>
                            {m.email && <p className="text-xs text-slate-400">{m.email}</p>}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-500">{m.memberId ?? '—'}</span>
                      </Td>
                      <Td>
                        <span className="text-sm text-slate-600">{m.phone ?? '—'}</span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-500">{ministryNames(m)}</span>
                      </Td>
                      <Td>
                        <div className="flex gap-1.5">
                          {m.phone && (
                            <a
                              href={`tel:${m.phone}`}
                              onClick={() => recordCall(m)}
                              title={`Call ${m.phone}`}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                            >
                              <Phone className="h-3 w-3" />
                              Call
                            </a>
                          )}
                          <button
                            onClick={() => openMessage(m)}
                            disabled={!m.phone && !m.email}
                            title={m.phone || m.email ? 'Send a message' : 'No contact details on file'}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Message
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  </Table>
                </>
              ))}

            {tab === 'history' && (
              <>
                <div className="flex items-center justify-end border-b border-slate-100 px-4 py-2">
                  <Select
                    className="w-40"
                    value={recordFilter}
                    onChange={(e) => {
                      setRecordFilter(e.target.value);
                      setRecordPage(1);
                    }}
                  >
                    <option value="">All services</option>
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {formatService(s)}
                      </option>
                    ))}
                  </Select>
                </div>
                {loadingRecords ? (
                  <Spinner />
                ) : records.length === 0 ? (
                  <EmptyState icon={<CalendarCheck className="h-8 w-8" />} title="No check-ins yet" />
                ) : (
                  <Table headers={['Date', 'Member', 'Service', 'Checked in', 'Checked out']}>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <Td>
                          <span className="text-sm text-slate-600">{formatDate(r.date)}</span>
                        </Td>
                        <Td className="font-medium text-slate-800">{fullName(r.member)}</Td>
                        <Td>
                          <Badge color={serviceColor[r.serviceType] ?? 'slate'}>{formatService(r.serviceType)}</Badge>
                        </Td>
                        <Td>
                          <span className="text-sm text-slate-600">{formatGmt(r.checkedInAt) ?? '—'}</span>
                        </Td>
                        <Td>
                          <span className="text-sm text-slate-600">{formatGmt(r.checkedOutAt) ?? '—'}</span>
                        </Td>
                      </tr>
                    ))}
                  </Table>
                )}
              </>
            )}
            {tab === 'present' && register && register.records.length > 0 && (
              <Pagination
                page={presentPage}
                totalPages={presentTotalPages}
                totalItems={register.records.length}
                onPrev={() => setPresentPage((p) => Math.max(1, p - 1))}
                onNext={() => setPresentPage((p) => Math.min(presentTotalPages, p + 1))}
              />
            )}
            {tab === 'absent' && register && register.notCheckedIn.length > 0 && (
              <Pagination
                page={absentPage}
                totalPages={absentTotalPages}
                totalItems={register.notCheckedIn.length}
                onPrev={() => setAbsentPage((p) => Math.max(1, p - 1))}
                onNext={() => setAbsentPage((p) => Math.min(absentTotalPages, p + 1))}
              />
            )}
            {tab === 'history' && !loadingRecords && records.length > 0 && (
              <Pagination
                page={recordPage}
                totalPages={recordTotalPages}
                totalItems={recordTotal}
                onPrev={() => setRecordPage((p) => Math.max(1, p - 1))}
                onNext={() => setRecordPage((p) => Math.min(recordTotalPages, p + 1))}
              />
            )}
          </CardBody>
        </Card>

        <Card className="h-full flex flex-col">
          <CardHeader
            title="Check in"
            subtitle="Quickly check a member in"
            action={
              <Button size="sm" variant="outline" onClick={openScanner}>
                <ScanLine className="h-3.5 w-3.5" />
                Scan QR
              </Button>
            }
          />
          <CardBody className="flex min-h-0 flex-1 flex-col space-y-3">
            <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {formatService(s)}
                </option>
              ))}
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search by name, ID or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCheckinPage(1);
                }}
              />
            </div>
            <div className="min-h-0 flex-1 space-y-1.5">
              {filtered.length === 0 ? (
                <EmptyState icon={<UserCheck className="h-8 w-8" />} title="No members found" />
              ) : (
                checkinRows.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => (presentIds.has(m.id) ? checkout(m) : checkin(m))}
                    disabled={checkingId === m.id}
                    className="group flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={fullName(m)} src={m.photoUrl} className="h-8 w-8" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{fullName(m)}</p>
                        <p className="truncate text-xs text-slate-400">{m.memberId ?? m.email ?? ''}</p>
                      </div>
                    </div>
                    {presentIds.has(m.id) ? (
                      <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                        {checkingId === m.id ? '…' : 'Check out'}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                        {checkingId === m.id ? '…' : 'Check in'}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            {filtered.length > CHECKIN_PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-xs text-slate-400">{filtered.length} members</span>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setCheckinPage((p) => Math.max(1, p - 1))} disabled={checkinPage <= 1}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <span className="px-1 text-xs text-slate-500">
                    {checkinPage}/{checkinTotalPages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCheckinPage((p) => Math.min(checkinTotalPages, p + 1))} disabled={checkinPage >= checkinTotalPages}>
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      <Modal open={!!msgTarget} onClose={() => setMsgTarget(null)} title={msgTarget ? `Message ${fullName(msgTarget)}` : 'Send message'}>
        {msgTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <Avatar name={fullName(msgTarget)} src={msgTarget.photoUrl} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{fullName(msgTarget)}</p>
                <p className="truncate text-xs text-slate-500">
                  {[msgTarget.memberId, msgTarget.phone, msgTarget.email].filter(Boolean).join(' · ') || 'No contact details'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Select label="Channel" className="w-40" value={msgChannel} onChange={(e) => setMsgChannel(e.target.value as 'SMS' | 'EMAIL')}>
                {msgTarget.phone && <option value="SMS">SMS text</option>}
                {msgTarget.email && <option value="EMAIL">Email</option>}
              </Select>
              <p className="flex items-end pb-2 text-xs text-slate-500">
                {msgChannel === 'SMS' ? `Sent to ${msgTarget.phone}.` : `Sent to ${msgTarget.email}.`}
              </p>
            </div>

            {msgChannel === 'EMAIL' && (
              <Input label="Subject" required value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} placeholder="Message subject" />
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">Message</label>
                <span className={cn('text-xs', msgText.length > msgLimit ? 'text-red-600' : 'text-slate-400')}>
                  {msgText.length}/{msgLimit}
                </span>
              </div>
              <Textarea
                rows={4}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder={msgChannel === 'SMS' ? 'Type the SMS text to send...' : 'Type your message...'}
              />
            </div>

            {msgResult && (
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  msgResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800',
                )}
              >
                {msgResult.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setMsgTarget(null)}>
                Cancel
              </Button>
              <Button onClick={sendMessage} disabled={msgSending || !msgText.trim() || (msgChannel === 'EMAIL' && !msgSubject.trim())}>
                <Send className="h-4 w-4" />
                {msgSending ? 'Sending...' : 'Send message'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={scanOpen} onClose={closeScanner} title="Scan member QR">
        {scanResult ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <Avatar name={fullName(scanResult)} src={scanResult.photoUrl} className="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-slate-900">{fullName(scanResult)}</p>
                  {scanResult.membershipStatus && (
                    <Badge color={statusColor(scanResult.membershipStatus)}>{titleCase(scanResult.membershipStatus)}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {scanResult.memberId ? `Member ID: ${scanResult.memberId}` : 'No member ID'}
                </p>
              </div>
            </div>

            {scanCheckinStatus === 'checking_in' && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <Spinner /> Checking in…
              </div>
            )}

            {scanCheckinStatus === 'success' && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                ✓ {scanCheckinMsg}
              </div>
            )}

            {scanCheckinStatus === 'already' && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                ⚠ {scanCheckinMsg}
              </div>
            )}

            {scanCheckinStatus === 'error' && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                ✕ {scanCheckinMsg}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                {formatService(serviceType)} service
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={retryScan}>
                  Scan another
                </Button>
                <Button variant="outline" onClick={closeScanner}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : scanResolving ? (
          <div className="py-8">
            <Spinner />
            <p className="mt-2 text-center text-sm text-slate-500">Looking up member…</p>
          </div>
        ) : scanError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">Could not find this member</p>
            <p className="max-w-xs text-xs text-slate-500">{scanError}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={retryScan}>
                Try again
              </Button>
              <Button variant="outline" onClick={closeScanner}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <QRScanner onDetected={handleScanned} />
            <p className="text-center text-xs text-slate-400">
              Position the member&apos;s QR ID card inside the frame.
            </p>
          </div>
        )}
      </Modal>

      <Modal open={conferenceOpen} onClose={() => setConferenceOpen(false)} title="Conference call">
        <ConferenceCall
          title={`${formatService(serviceType)} — ${conferenceParticipants.length} members`}
          participants={conferenceParticipants}
          onClose={() => setConferenceOpen(false)}
          onCheckIn={async (memberId) => {
            try {
              await api('/attendance/checkin', {
                method: 'POST',
                body: { memberId, serviceType },
              });
              toast('Member checked in after call');
              loadRegister();
            } catch {
              // silently ignore
            }
          }}
        />
      </Modal>

      <Toast message={message} />
    </div>
  );
}
