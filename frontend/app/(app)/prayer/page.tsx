'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  HandHeart,
  Plus,
  Trash2,
  Users,
  Search,
  Clock4,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Eye,
  X,
  Heart,
  Stethoscope,
  CalendarClock,
} from 'lucide-react';
import { api, formatDate, formatDateTime, titleCase } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  statusColor,
  Table,
  Td,
  Textarea,
  Toast,
  useToast,
  cn,
} from '@/components/ui';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface PrayerRequest {
  id: string;
  subject: string;
  content: string;
  isPublic?: boolean;
  status: string;
  createdAt: string;
  prayedForAt?: string;
  prayedBy?: string;
  member?: { id: string; firstName: string; lastName: string } | null;
}

interface CounselingSession {
  id: string;
  date: string;
  topic: string;
  notes?: string;
  followUpDate?: string;
  status: string;
  member: { id: string; firstName: string; lastName: string; phone?: string };
  counselor?: { name?: string } | null;
}

interface PrayerForm {
  subject: string;
  content: string;
  memberId: string;
  isPublic: boolean;
}

interface SessionForm {
  memberId: string;
  date: string;
  topic: string;
  notes: string;
  followUpDate: string;
  status: string;
}

const prayerStatuses = ['OPEN', 'IN_PROGRESS', 'PRAYED_FOR', 'CLOSED'];
const counselingStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'FOLLOW_UP'];

const emptyPrayerForm: PrayerForm = { subject: '', content: '', memberId: '', isPublic: false };
const emptySessionForm: SessionForm = {
  memberId: '',
  date: '',
  topic: '',
  notes: '',
  followUpDate: '',
  status: 'SCHEDULED',
};

const statusIcons: Record<string, React.ReactNode> = {
  OPEN: <AlertCircle className="h-4 w-4" />,
  IN_PROGRESS: <Clock4 className="h-4 w-4" />,
  PRAYED_FOR: <CheckCircle2 className="h-4 w-4" />,
  CLOSED: <CheckCircle2 className="h-4 w-4" />,
  SCHEDULED: <CalendarClock className="h-4 w-4" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4" />,
  CANCELLED: <X className="h-4 w-4" />,
  FOLLOW_UP: <CalendarCheck className="h-4 w-4" />,
};

export default function PrayerPage() {
  const { toast, message } = useToast();
  const [tab, setTab] = useState<'prayer' | 'counseling'>('prayer');

  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [prayerStatus, setPrayerStatus] = useState('ALL');
  const [prayerModal, setPrayerModal] = useState(false);
  const [prayerForm, setPrayerForm] = useState<PrayerForm>(emptyPrayerForm);
  const [prayerSearch, setPrayerSearch] = useState('');
  const [detailPrayer, setDetailPrayer] = useState<PrayerRequest | null>(null);

  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [counselingStatus, setCounselingStatus] = useState('ALL');
  const [counselingModal, setCounselingModal] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);
  const [counselingSearch, setCounselingSearch] = useState('');
  const [detailSession, setDetailSession] = useState<CounselingSession | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Member[] }>('/members?limit=200')
      .then((res) => setMembers(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'prayer') return;
    setLoading(true);
    const path = prayerStatus === 'ALL' ? '/prayer/requests' : `/prayer/requests?status=${prayerStatus}`;
    api<PrayerRequest[]>(path)
      .then(setPrayers)
      .catch(() => toast('Failed to load prayer requests'))
      .finally(() => setLoading(false));
  }, [tab, prayerStatus]);

  useEffect(() => {
    if (tab !== 'counseling') return;
    setLoading(true);
    const path =
      counselingStatus === 'ALL' ? '/prayer/counseling' : `/prayer/counseling?status=${counselingStatus}`;
    api<CounselingSession[]>(path)
      .then(setSessions)
      .catch(() => toast('Failed to load counseling sessions'))
      .finally(() => setLoading(false));
  }, [tab, counselingStatus]);

  const filteredPrayers = useMemo(() => {
    if (!prayerSearch.trim()) return prayers;
    const q = prayerSearch.toLowerCase();
    return prayers.filter(
      (r) =>
        r.subject.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.member && `${r.member.firstName} ${r.member.lastName}`.toLowerCase().includes(q)),
    );
  }, [prayers, prayerSearch]);

  const filteredSessions = useMemo(() => {
    if (!counselingSearch.trim()) return sessions;
    const q = counselingSearch.toLowerCase();
    return sessions.filter(
      (s) =>
        s.topic.toLowerCase().includes(q) ||
        s.member.firstName.toLowerCase().includes(q) ||
        s.member.lastName.toLowerCase().includes(q) ||
        (s.counselor?.name ?? '').toLowerCase().includes(q) ||
        (s.notes ?? '').toLowerCase().includes(q),
    );
  }, [sessions, counselingSearch]);

  const prayerStats = useMemo(() => {
    const open = prayers.filter((r) => r.status === 'OPEN').length;
    const inProgress = prayers.filter((r) => r.status === 'IN_PROGRESS').length;
    const prayedFor = prayers.filter((r) => r.status === 'PRAYED_FOR').length;
    const closed = prayers.filter((r) => r.status === 'CLOSED').length;
    return { total: prayers.length, open, inProgress, prayedFor, closed };
  }, [prayers]);

  const counselingStats = useMemo(() => {
    const scheduled = sessions.filter((s) => s.status === 'SCHEDULED').length;
    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
    const followUp = sessions.filter((s) => s.status === 'FOLLOW_UP').length;
    const overdue = sessions.filter(
      (s) => s.status === 'SCHEDULED' && s.followUpDate && new Date(s.followUpDate).getTime() < Date.now(),
    ).length;
    return { total: sessions.length, scheduled, completed, followUp, overdue };
  }, [sessions]);

  const submitPrayer = async () => {
    if (!prayerForm.subject.trim() || !prayerForm.content.trim()) {
      toast('Subject and content are required');
      return;
    }
    try {
      await api('/prayer/requests', {
        method: 'POST',
        body: {
          memberId: prayerForm.memberId || undefined,
          subject: prayerForm.subject,
          content: prayerForm.content,
          isPublic: prayerForm.isPublic || undefined,
        },
      });
      toast('Prayer request submitted');
      setPrayerModal(false);
      setPrayerForm(emptyPrayerForm);
      const path = prayerStatus === 'ALL' ? '/prayer/requests' : `/prayer/requests?status=${prayerStatus}`;
      api<PrayerRequest[]>(path).then(setPrayers).catch(() => {});
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to submit prayer request');
    }
  };

  const updatePrayerStatus = async (r: PrayerRequest, status: string) => {
    try {
      await api(`/prayer/requests/${r.id}`, { method: 'PATCH', body: { status } });
      toast(`Prayer request marked as ${titleCase(status)}`);
      const path = prayerStatus === 'ALL' ? '/prayer/requests' : `/prayer/requests?status=${prayerStatus}`;
      api<PrayerRequest[]>(path).then(setPrayers).catch(() => {});
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update prayer request');
    }
  };

  const deletePrayer = async (r: PrayerRequest) => {
    if (!window.confirm(`Delete prayer request "${r.subject}"? This action cannot be undone.`)) return;
    try {
      await api(`/prayer/requests/${r.id}`, { method: 'DELETE' });
      toast('Prayer request deleted');
      setPrayers((prev) => prev.filter((p) => p.id !== r.id));
      setDetailPrayer(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete prayer request');
    }
  };

  const submitSession = async () => {
    if (!sessionForm.memberId || !sessionForm.date || !sessionForm.topic.trim()) {
      toast('Member, date and topic are required');
      return;
    }
    try {
      await api('/prayer/counseling', {
        method: 'POST',
        body: {
          memberId: sessionForm.memberId,
          date: new Date(sessionForm.date).toISOString(),
          topic: sessionForm.topic,
          notes: sessionForm.notes.trim() || undefined,
          followUpDate: sessionForm.followUpDate ? new Date(sessionForm.followUpDate).toISOString() : undefined,
          status: sessionForm.status,
        },
      });
      toast('Counseling session created');
      setCounselingModal(false);
      setSessionForm(emptySessionForm);
      const path =
        counselingStatus === 'ALL' ? '/prayer/counseling' : `/prayer/counseling?status=${counselingStatus}`;
      api<CounselingSession[]>(path).then(setSessions).catch(() => {});
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create counseling session');
    }
  };

  const updateSessionStatus = async (s: CounselingSession, status: string) => {
    try {
      await api(`/prayer/counseling/${s.id}`, { method: 'PATCH', body: { status } });
      toast(`Session marked as ${titleCase(status)}`);
      const path =
        counselingStatus === 'ALL' ? '/prayer/counseling' : `/prayer/counseling?status=${counselingStatus}`;
      api<CounselingSession[]>(path).then(setSessions).catch(() => {});
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update session' );
    }
  };

  const deleteSession = async (s: CounselingSession) => {
    if (!window.confirm(`Delete counseling session on ${formatDateTime(s.date)}? This action cannot be undone.`))
      return;
    try {
      await api(`/prayer/counseling/${s.id}`, { method: 'DELETE' });
      toast('Session deleted');
      setSessions((prev) => prev.filter((x) => x.id !== s.id));
      setDetailSession(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete session');
    }
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0]}${lastName[0]}`.toUpperCase();

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-sky-100 text-sky-700',
      'bg-violet-100 text-violet-700',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const prayerActions = [
    { status: 'IN_PROGRESS', label: 'In progress', variant: 'secondary' as const },
    { status: 'PRAYED_FOR', label: 'Mark prayed', variant: 'primary' as const },
    { status: 'CLOSED', label: 'Close', variant: 'outline' as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prayer & Counseling"
        subtitle="Prayer requests and pastoral counseling management"
        action={
          tab === 'prayer' ? (
            <Button onClick={() => setPrayerModal(true)}>
              <Plus className="h-4 w-4" />
              New request
            </Button>
          ) : (
            <Button onClick={() => setCounselingModal(true)}>
              <Plus className="h-4 w-4" />
              New session
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 sm:w-auto">
          <button
            onClick={() => setTab('prayer')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all sm:flex-none sm:px-4',
              tab === 'prayer'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            <HandHeart className="h-4 w-4" />
            Prayer Requests
            {prayers.length > 0 && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  tab === 'prayer' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {prayers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('counseling')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all sm:flex-none sm:px-4',
              tab === 'counseling'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            <Users className="h-4 w-4" />
            Counseling
            {sessions.length > 0 && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  tab === 'counseling' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {sessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-0 w-full sm:w-auto sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={tab === 'prayer' ? 'Search requests...' : 'Search sessions...'}
            value={tab === 'prayer' ? prayerSearch : counselingSearch}
            onChange={(e) => (tab === 'prayer' ? setPrayerSearch(e.target.value) : setCounselingSearch(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Status filter */}
        <Select
          className="w-full sm:w-44"
          value={tab === 'prayer' ? prayerStatus : counselingStatus}
          onChange={(e) => (tab === 'prayer' ? setPrayerStatus(e.target.value) : setCounselingStatus(e.target.value))}
        >
          <option value="ALL">All statuses</option>
          {(tab === 'prayer' ? prayerStatuses : counselingStatuses).map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'prayer' ? (
        <>
          {/* Prayer Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 sm:h-10 sm:w-10">
                <HandHeart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{prayerStats.total}</p>
                <p className="text-xs text-slate-500">Total requests</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 sm:h-10 sm:w-10">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{prayerStats.open}</p>
                <p className="text-xs text-slate-500">Open</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 sm:h-10 sm:w-10">
                <Clock4 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{prayerStats.inProgress}</p>
                <p className="text-xs text-slate-500">In progress</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 sm:h-10 sm:w-10">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{prayerStats.prayedFor}</p>
                <p className="text-xs text-slate-500">Prayed for</p>
              </div>
            </div>
          </div>

          {/* Prayer List */}
          {filteredPrayers.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<HandHeart className="h-12 w-12" />}
                  title={prayerSearch ? 'No matching requests' : 'No prayer requests'}
                  subtitle={
                    prayerSearch
                      ? 'Try adjusting your search terms.'
                      : 'Submit a prayer request to begin tracking and supporting your congregation.'
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPrayers.map((r) => {
                const memberName = r.member ? `${r.member.firstName} ${r.member.lastName}` : 'Anonymous';
                return (
                  <div
                    key={r.id}
                    className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    {/* Avatar */}
                    {r.member ? (
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                          getAvatarColor(r.member.id),
                        )}
                      >
                        {getInitials(r.member.firstName, r.member.lastName)}
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Heart className="h-5 w-5" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-semibold text-slate-800">{r.subject}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>{memberName}</span>
                            {r.isPublic && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                Public
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Clock4 className="h-3 w-3" />
                              {formatDate(r.createdAt)}
                            </span>
                          </div>
                        </div>
                        <Badge color={statusColor(r.status)}>
                          {statusIcons[r.status]}
                          {titleCase(r.status)}
                        </Badge>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{r.content}</p>

                      {r.prayedForAt && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Prayed for on {formatDate(r.prayedForAt)}
                          {r.prayedBy && ` by ${r.prayedBy}`}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        {prayerActions
                          .filter((a) => r.status !== a.status)
                          .slice(0, 2)
                          .map((a) => (
                            <Button
                              key={a.status}
                              size="sm"
                              variant={a.variant}
                              onClick={() => updatePrayerStatus(r, a.status)}
                            >
                              {a.label}
                            </Button>
                          ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-500 hover:text-slate-700"
                          onClick={() => setDetailPrayer(r)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deletePrayer(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Counseling Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 sm:h-10 sm:w-10">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{counselingStats.total}</p>
                <p className="text-xs text-slate-500">Total sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 sm:h-10 sm:w-10">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{counselingStats.scheduled}</p>
                <p className="text-xs text-slate-500">Scheduled</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 sm:h-10 sm:w-10">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{counselingStats.completed}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 sm:h-10 sm:w-10">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{counselingStats.followUp}</p>
                <p className="text-xs text-slate-500">Follow-up needed</p>
              </div>
            </div>
          </div>

          {/* Counseling Table */}
          {filteredSessions.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<Stethoscope className="h-12 w-12" />}
                  title={counselingSearch ? 'No matching sessions' : 'No counseling sessions'}
                  subtitle={
                    counselingSearch
                      ? 'Try adjusting your search terms.'
                      : 'Create a counseling session to begin tracking pastoral care for your members.'
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="p-0">
                {/* Mobile card list */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {filteredSessions.map((s) => {
                    const followUpDue =
                      s.followUpDate && s.status !== 'COMPLETED' && s.status !== 'CANCELLED'
                        ? new Date(s.followUpDate).getTime() < Date.now()
                        : false;
                    const showFollowUp =
                      s.followUpDate && (s.status === 'SCHEDULED' || s.status === 'FOLLOW_UP');
                    return (
                      <div key={s.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                              getAvatarColor(s.member.id),
                            )}
                          >
                            {getInitials(s.member.firstName, s.member.lastName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <p className="break-words text-sm font-semibold text-slate-800">{s.topic}</p>
                              <Badge color={statusColor(s.status)}>{titleCase(s.status)}</Badge>
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock4 className="h-3 w-3" />
                                {formatDateTime(s.date)}
                              </span>
                              <span>
                                {s.member.firstName} {s.member.lastName}
                              </span>
                              {s.member.phone && <span>{s.member.phone}</span>}
                            </p>
                            {s.notes && (
                              <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{s.notes}</p>
                            )}
                            {showFollowUp && s.followUpDate && (
                              <span
                                className={cn(
                                  'mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                                  followUpDue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600',
                                )}
                              >
                                <CalendarCheck className="h-3 w-3" />
                                {followUpDue ? 'Follow-up overdue' : `Follow-up ${formatDate(s.followUpDate)}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          {s.status === 'SCHEDULED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateSessionStatus(s, 'COMPLETED')}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Complete
                            </Button>
                          )}
                          {s.status === 'COMPLETED' && (
                            <Button size="sm" variant="outline" onClick={() => updateSessionStatus(s, 'FOLLOW_UP')}>
                              Follow-up
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-700"
                            onClick={() => setDetailSession(s)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteSession(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block">
                <Table
                  headers={[
                    { label: 'Date & Time', align: 'left' },
                    { label: 'Member', align: 'left' },
                    { label: 'Topic', align: 'left' },
                    { label: 'Counselor', align: 'left' },
                    { label: 'Follow-up', align: 'left' },
                    { label: 'Status', align: 'left' },
                    { label: '', align: 'right' },
                  ]}
                >
                  {filteredSessions.map((s) => {
                    const followUpDue =
                      s.followUpDate && s.status !== 'COMPLETED' && s.status !== 'CANCELLED'
                        ? new Date(s.followUpDate).getTime() < Date.now()
                        : false;
                    const followUpDate =
                      s.followUpDate && (s.status === 'SCHEDULED' || s.status === 'FOLLOW_UP');
                    return (
                      <tr
                        key={s.id}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/50"
                        onClick={() => setDetailSession(s)}
                      >
                        <Td>
                          <p className="font-medium text-slate-800">{formatDateTime(s.date)}</p>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                getAvatarColor(s.member.id),
                              )}
                            >
                              {getInitials(s.member.firstName, s.member.lastName)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {s.member.firstName} {s.member.lastName}
                              </p>
                              {s.member.phone && (
                                <p className="text-xs text-slate-400">{s.member.phone}</p>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <p className="font-medium text-slate-700">{s.topic}</p>
                          {s.notes && (
                            <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-400">{s.notes}</p>
                          )}
                        </Td>
                        <Td>
                          {s.counselor?.name ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              {s.counselor.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Not assigned</span>
                          )}
                        </Td>
                        <Td>
                          {followUpDate && s.followUpDate ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                                followUpDue
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-slate-100 text-slate-600',
                              )}
                            >
                              <CalendarCheck className="h-3 w-3" />
                              {followUpDue ? 'Overdue' : formatDate(s.followUpDate)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </Td>
                        <Td>
                          <Badge color={statusColor(s.status)}>{titleCase(s.status)}</Badge>
                        </Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            {s.status === 'SCHEDULED' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSessionStatus(s, 'COMPLETED');
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Complete
                              </Button>
                            )}
                            {s.status === 'COMPLETED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSessionStatus(s, 'FOLLOW_UP');
                                }}
                              >
                                Follow-up
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-500 hover:text-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailSession(s);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(s);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </Table>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Prayer Detail Modal */}
      <Modal open={!!detailPrayer} onClose={() => setDetailPrayer(null)} title="Prayer Request Details" wide>
        {detailPrayer && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              {detailPrayer.member ? (
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    getAvatarColor(detailPrayer.member.id),
                  )}
                >
                  {getInitials(detailPrayer.member.firstName, detailPrayer.member.lastName)}
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Heart className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{detailPrayer.subject}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>
                    {detailPrayer.member
                      ? `${detailPrayer.member.firstName} ${detailPrayer.member.lastName}`
                      : 'Anonymous'}
                  </span>
                  <Badge color={statusColor(detailPrayer.status)}>
                    {statusIcons[detailPrayer.status]}
                    {titleCase(detailPrayer.status)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{detailPrayer.content}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">Created</p>
                <p className="mt-0.5 text-sm text-slate-800">{formatDate(detailPrayer.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">Visibility</p>
                <p className="mt-0.5 text-sm text-slate-800">{detailPrayer.isPublic ? 'Public' : 'Private'}</p>
              </div>
              {detailPrayer.prayedForAt && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">Prayed for</p>
                  <p className="mt-0.5 text-sm text-slate-800">{formatDate(detailPrayer.prayedForAt)}</p>
                </div>
              )}
              {detailPrayer.prayedBy && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">Prayed by</p>
                  <p className="mt-0.5 text-sm text-slate-800">{detailPrayer.prayedBy}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap gap-2">
                {prayerActions
                  .filter((a) => detailPrayer.status !== a.status)
                  .map((a) => (
                    <Button
                      key={a.status}
                      size="sm"
                      variant={a.variant}
                      onClick={() => {
                        updatePrayerStatus(detailPrayer, a.status);
                        setDetailPrayer(null);
                      }}
                    >
                      {a.label}
                    </Button>
                  ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deletePrayer(detailPrayer)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Session Detail Modal */}
      <Modal open={!!detailSession} onClose={() => setDetailSession(null)} title="Counseling Session Details" wide>
        {detailSession && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  getAvatarColor(detailSession.member.id),
                )}
              >
                {getInitials(detailSession.member.firstName, detailSession.member.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{detailSession.topic}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>
                    {detailSession.member.firstName} {detailSession.member.lastName}
                  </span>
                  {detailSession.member.phone && <span>{detailSession.member.phone}</span>}
                  <Badge color={statusColor(detailSession.status)}>{titleCase(detailSession.status)}</Badge>
                </div>
              </div>
            </div>

            {detailSession.notes && (
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="mb-1 text-xs font-medium text-slate-500">Session Notes</p>
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{detailSession.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">Scheduled Date</p>
                <p className="mt-0.5 text-sm text-slate-800">{formatDateTime(detailSession.date)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">Counselor</p>
                <p className="mt-0.5 text-sm text-slate-800">{detailSession.counselor?.name ?? 'Not assigned'}</p>
              </div>
              {detailSession.followUpDate && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">Follow-up Date</p>
                  <p className="mt-0.5 text-sm text-slate-800">{formatDate(detailSession.followUpDate)}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap gap-2">
                {detailSession.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      updateSessionStatus(detailSession, 'COMPLETED');
                      setDetailSession(null);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark completed
                  </Button>
                )}
                {detailSession.status !== 'FOLLOW_UP' && detailSession.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateSessionStatus(detailSession, 'FOLLOW_UP');
                      setDetailSession(null);
                    }}
                  >
                    Schedule follow-up
                  </Button>
                )}
                {detailSession.status !== 'CANCELLED' && detailSession.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateSessionStatus(detailSession, 'CANCELLED');
                      setDetailSession(null);
                    }}
                  >
                    Cancel session
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteSession(detailSession)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Prayer Request Modal */}
      <Modal open={prayerModal} onClose={() => setPrayerModal(false)} title="New Prayer Request" wide>
        <div className="space-y-4">
          <Input
            label="Subject"
            required
            placeholder="e.g. Healing for a sick relative"
            value={prayerForm.subject}
            onChange={(e) => setPrayerForm({ ...prayerForm, subject: e.target.value })}
          />
          <Textarea
            label="Prayer details"
            required
            rows={5}
            placeholder="Share the details of this prayer request. What should the church pray about?"
            value={prayerForm.content}
            onChange={(e) => setPrayerForm({ ...prayerForm, content: e.target.value })}
          />
          <Select
            label="Member (optional)"
            value={prayerForm.memberId}
            onChange={(e) => setPrayerForm({ ...prayerForm, memberId: e.target.value })}
          >
            <option value="">Anonymous</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={prayerForm.isPublic}
              onChange={(e) => setPrayerForm({ ...prayerForm, isPublic: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              Make this a public request
              <span className="block text-xs text-slate-400">
                Public requests are visible to all church members and may be shared with the prayer team.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setPrayerModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitPrayer}>
              <HandHeart className="h-4 w-4" />
              Submit request
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Counseling Session Modal */}
      <Modal open={counselingModal} onClose={() => setCounselingModal(false)} title="New Counseling Session" wide>
        <div className="space-y-4">
          <Select
            label="Member"
            required
            value={sessionForm.memberId}
            onChange={(e) => setSessionForm({ ...sessionForm, memberId: e.target.value })}
          >
            <option value="">Select a member...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Date & time"
              type="datetime-local"
              required
              value={sessionForm.date}
              onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
            />
            <Input
              label="Follow-up date"
              type="date"
              value={sessionForm.followUpDate}
              onChange={(e) => setSessionForm({ ...sessionForm, followUpDate: e.target.value })}
            />
          </div>
          <Input
            label="Topic"
            required
            placeholder="e.g. Grief counseling, Pre-marital, Career guidance"
            value={sessionForm.topic}
            onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
          />
          <Textarea
            label="Session notes"
            rows={4}
            placeholder="Notes from the session, key discussion points, action items..."
            value={sessionForm.notes}
            onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
          />
          <Select
            label="Status"
            value={sessionForm.status}
            onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value })}
          >
            {counselingStatuses.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setCounselingModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitSession}>
              <CalendarCheck className="h-4 w-4" />
              Create session
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
