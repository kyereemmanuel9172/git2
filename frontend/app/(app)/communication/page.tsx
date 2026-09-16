'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquareText,
  Mail,
  Phone,
  Megaphone,
  Plus,
  Eye,
  XCircle,
  Send,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import { api, formatDateTime, titleCase } from '@/lib/api';
import { AnnouncementsSection } from './announcements-section';
import {
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  Badge,
  Modal,
  Table,
  Td,
  Spinner,
  EmptyState,
  PageHeader,
  Toast,
  useToast,
  Textarea,
  StatCard,
  cn,
} from '@/components/ui';

interface Campaign {
  id: string;
  type: 'SMS' | 'EMAIL' | 'CALL';
  subject?: string | null;
  message: string;
  memberStatus?: string | null;
  departmentId?: string | null;
  gender?: string | null;
  city?: string | null;
  status: 'PENDING' | 'SENT' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  _count?: { messages: number };
}

interface CampaignDetail extends Campaign {
  messages: Message[];
}

interface Message {
  id: string;
  memberId: string;
  channel: string;
  status: string;
  error?: string | null;
  sentAt?: string | null;
  member?: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null } | null;
}

interface CampaignStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  byType: Array<{ type: string; count: number; totalRecipients: number; sentCount: number; failedCount: number }>;
}

interface DepartmentOption {
  id: string;
  name: string;
}

const typeMeta = {
  SMS: { label: 'Bulk SMS', icon: MessageSquareText, color: 'text-emerald-600', bg: 'bg-emerald-50', limit: 1600 },
  EMAIL: { label: 'Email', icon: Mail, color: 'text-sky-600', bg: 'bg-sky-50', limit: 5000 },
  CALL: { label: 'Phone Calls', icon: Phone, color: 'text-violet-600', bg: 'bg-violet-50', limit: 2000 },
} as const;

const memberStatusOptions = ['ACTIVE', 'INACTIVE', 'VISITOR', 'TRANSFERRED', 'DECEASED'];

const statusBadge: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  SENT: 'green',
  PENDING: 'amber',
  PARTIAL: 'amber',
  FAILED: 'red',
  CANCELLED: 'slate',
};

type TabKey = 'campaigns' | 'announcements';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  type: 'SMS' as 'SMS' | 'EMAIL' | 'CALL',
  subject: '',
  message: '',
  memberStatus: '',
  departmentId: '',
  gender: '',
  city: '',
  scheduledAt: '',
};

function audienceSummary(c: Campaign) {
  const parts: string[] = [];
  if (c.memberStatus) parts.push(titleCase(c.memberStatus));
  if (c.gender) parts.push(titleCase(c.gender));
  if (c.city) parts.push(c.city);
  return parts.length ? parts.join(' · ') : 'All members';
}

export default function CommunicationPage() {
  const { toast, message } = useToast();
  const [tab, setTab] = useState<TabKey>('campaigns');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const data = await api<{ items: Campaign[]; total: number }>(`/communications?${params.toString()}`);
      setCampaigns(data.items);
      setTotal(data.total);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api<CampaignStats>('/communications/stats');
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    loadStats();
    api<{ items: DepartmentOption[] } | DepartmentOption[]>('/departments')
      .then((d) => setDepartments(Array.isArray(d) ? d : d.items ?? []))
      .catch(() => {});
  }, [loadStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const doSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  useEffect(() => {
    if (!addOpen) return;
    const t = setTimeout(() => {
      const type = form.type;
      if (!type) return;
      const params = new URLSearchParams({ type });
      if (form.memberStatus) params.set('memberStatus', form.memberStatus);
      if (form.departmentId) params.set('departmentId', form.departmentId);
      if (form.gender) params.set('gender', form.gender);
      if (form.city) params.set('city', form.city);
      setCounting(true);
      api<{ count: number }>(`/communications/audience-count?${params.toString()}`)
        .then((r) => setAudienceCount(r.count))
        .catch(() => setAudienceCount(null))
        .finally(() => setCounting(false));
    }, 300);
    return () => clearTimeout(t);
  }, [addOpen, form.type, form.memberStatus, form.departmentId, form.gender, form.city]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setAudienceCount(null);
    setAddOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/communications', {
        method: 'POST',
        body: {
          type: form.type,
          subject: form.type === 'EMAIL' ? form.subject : undefined,
          message: form.message,
          memberStatus: form.memberStatus ? [form.memberStatus] : [],
          departmentId: form.departmentId || undefined,
          gender: form.gender || undefined,
          city: form.city || undefined,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        },
      });
      toast(form.scheduledAt ? 'Campaign scheduled' : 'Campaign sent');
      setAddOpen(false);
      loadCampaigns();
      loadStats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api(`/communications/${cancelTarget.id}/cancel`, { method: 'POST' });
      toast('Campaign cancelled');
      setCancelTarget(null);
      loadCampaigns();
      loadStats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel campaign');
    } finally {
      setCancelling(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/communications/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Campaign deleted');
      setDeleteTarget(null);
      if (campaigns.length === 1 && page > 1) setPage((p) => p - 1);
      else loadCampaigns();
      loadStats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete campaign');
    } finally {
      setDeleting(false);
    }
  };

  const openDetail = async (c: Campaign) => {
    try {
      const data = await api<CampaignDetail>(`/communications/${c.id}`);
      setDetail(data);
    } catch {
      toast('Failed to load campaign');
    }
  };

  const meta = typeMeta[form.type];
  const charLimit = meta.limit;
  const smsSegments = form.type === 'SMS' ? Math.max(1, Math.ceil(form.message.length / 160)) : 0;
  const audienceLabel = `${audienceCount ?? 0} recipients`;

  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle="Send bulk SMS, emails and phone calls to your congregation"
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        }
      />

      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {([
          { key: 'campaigns' as TabKey, label: 'Campaigns', icon: Megaphone },
          { key: 'announcements' as TabKey, label: 'Announcements', icon: Megaphone },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' ? (
        <>
          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Total campaigns"
                value={stats.total}
                icon={<Megaphone className="h-5 w-5" />}
                tone="indigo"
              />
              <StatCard
                label="Sent"
                value={stats.sent}
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="emerald"
              />
              <StatCard
                label="Pending"
                value={stats.pending}
                icon={<CalendarClock className="h-5 w-5" />}
                tone="amber"
              />
              <StatCard
                label="Failed"
                value={stats.failed}
                icon={<AlertCircle className="h-5 w-5" />}
                tone="rose"
              />
            </div>
          )}

          {stats && stats.byType.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-3">
              {(['SMS', 'EMAIL', 'CALL'] as const).map((t) => {
                const entry = stats.byType.find((e) => e.type === t);
                const m = typeMeta[t];
                return (
                  <div key={t} className={cn('rounded-xl border border-slate-200 bg-white p-4')}>
                    <div className="flex items-center gap-2">
                      <m.icon className={cn('h-5 w-5', m.color)} />
                      <span className="text-sm font-semibold text-slate-800">{m.label}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>
                        <span className="text-slate-400">Sent</span>
                        <p className="font-semibold text-slate-700">{entry?.sentCount ?? 0}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Failed</span>
                        <p className="font-semibold text-red-600">{entry?.failedCount ?? 0}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Card>
            <CardHeader title={`Campaigns (${total})`} subtitle="SMS, email and call broadcasts" />
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaigns…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="">All channels</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="CALL">Phone Calls</option>
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="PARTIAL">Partial</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>

            {loading ? (
              <Spinner />
            ) : campaigns.length === 0 ? (
              <EmptyState
                icon={<Megaphone className="h-12 w-12" />}
                title="No campaigns yet"
                subtitle="Create your first bulk SMS, email or call campaign to reach your members."
              />
            ) : (
              <>
                <Table headers={['Type', 'Content', 'Audience', 'Recipients', 'Status', 'When', '']}>
                  {campaigns.map((c) => {
                    const Meta = typeMeta[c.type];
                    return (
                      <tr key={c.id} className="group">
                        <Td>
                          <span className={cn('flex items-center gap-1.5 font-medium text-slate-800')}>
                            <Meta.icon className={cn('h-4 w-4', Meta.color)} />
                            {Meta.label}
                          </span>
                        </Td>
                        <Td>
                          <p className="max-w-xs truncate font-medium text-slate-800">{c.type === 'EMAIL' ? c.subject : c.message}</p>
                          {c.type === 'EMAIL' && <p className="max-w-xs truncate text-xs text-slate-500">{c.message}</p>}
                        </Td>
                        <Td>
                          <p className="text-xs text-slate-500">{audienceSummary(c)}</p>
                        </Td>
                        <Td>
                          <p className="text-sm font-medium text-slate-700">{c.totalRecipients}</p>
                          {c.sentCount > 0 && c.sentCount !== c.totalRecipients && (
                            <p className="text-xs text-slate-400">{c.sentCount} sent</p>
                          )}
                          {c.failedCount > 0 && (
                            <p className="text-xs text-red-500">{c.failedCount} failed</p>
                          )}
                        </Td>
                        <Td>
                          <Badge color={statusBadge[c.status]}>{c.status}</Badge>
                        </Td>
                        <Td className="text-xs text-slate-500">
                          {c.scheduledAt && c.status === 'PENDING'
                            ? `Scheduled · ${formatDateTime(c.scheduledAt)}`
                            : formatDateTime(c.sentAt ?? c.createdAt)}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => openDetail(c)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {c.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => setCancelTarget(c)}
                                  className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                  title="Cancel"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(c)}
                                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </Table>
                {total > PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                    <span className="text-xs text-slate-400">{total} total</span>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="px-1 text-xs text-slate-500">
                        {page} / {totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      ) : (
        <AnnouncementsSection />
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New communication campaign" wide>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Channel</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(typeMeta) as Array<keyof typeof typeMeta>).map((t) => {
                const m = typeMeta[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <m.icon className={cn('h-5 w-5', active ? m.color : 'text-slate-400')} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {form.type === 'EMAIL' && (
            <Input
              label="Subject"
              required
              placeholder="Weekly church update"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">
                {form.type === 'EMAIL' ? 'Message body' : form.type === 'SMS' ? 'SMS text' : 'Call script'}
              </label>
              <span className="text-xs text-slate-400">
                {form.message.length}/{charLimit}
                {smsSegments > 1 && <span className="ml-2 text-amber-600">{smsSegments} SMS segments</span>}
              </span>
            </div>
            <Textarea
              required
              rows={5}
              maxLength={charLimit}
              placeholder={
                form.type === 'SMS'
                  ? 'Join us this Sunday at 9am…'
                  : form.type === 'EMAIL'
                    ? 'Dear member, we would love to see you…'
                    : 'Hi {firstName}, this is a courtesy call from the church office…'
              }
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-400">
              Tip: Use <code className="rounded bg-slate-100 px-1 font-mono text-slate-500">{'{firstName}'}</code>, <code className="rounded bg-slate-100 px-1 font-mono text-slate-500">{'{lastName}'}</code>, or <code className="rounded bg-slate-100 px-1 font-mono text-slate-500">{'{name}'}</code> to personalize.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Target audience</p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Membership status"
                value={form.memberStatus}
                onChange={(e) => setForm((f) => ({ ...f, memberStatus: e.target.value }))}
              >
                <option value="">All members</option>
                {memberStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
              <Select
                label="Department"
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Gender"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
              <Input
                label="City"
                placeholder="Springfield"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-brand-50/60 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-700">
              <Send className="h-4 w-4" />
              Will reach <span className="font-bold">{counting ? '…' : audienceLabel}</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={!!form.scheduledAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduledAt: e.target.checked ? f.scheduledAt : '' }))
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Schedule for later
            </label>
          </div>

          {form.scheduledAt && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Sending…' : form.scheduledAt ? 'Schedule campaign' : 'Send now'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Campaign details" wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Channel</p>
                <p className="text-sm font-semibold text-slate-800">{typeMeta[detail.type].label}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Recipients</p>
                <p className="text-sm font-semibold text-slate-800">{detail.totalRecipients}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Status</p>
                <Badge color={statusBadge[detail.status]}>{detail.status}</Badge>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Delivered</p>
                <p className="text-sm font-semibold text-slate-800">{detail.sentCount} sent</p>
                {detail.failedCount > 0 && <p className="text-xs text-red-500">{detail.failedCount} failed</p>}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</p>
              <p className="mt-1 text-sm text-slate-700">{audienceSummary(detail)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
              {detail.type === 'EMAIL' && detail.subject && (
                <p className="mt-1 text-sm font-semibold text-slate-800">{detail.subject}</p>
              )}
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{detail.message}</p>
            </div>

            {detail.messages.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Delivery log ({detail.messages.length})
                </p>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                  <Table headers={['Member', 'Channel', 'Status', 'Sent']}>
                    {detail.messages.map((m) => (
                      <tr key={m.id}>
                        <Td>
                          {m.member ? (
                            <span className="font-medium text-slate-800">
                              {m.member.firstName} {m.member.lastName}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unknown</span>
                          )}
                        </Td>
                        <Td className="text-slate-500">{m.channel}</Td>
                        <Td>
                          <Badge color={m.status === 'SENT' ? 'green' : 'red'}>{m.status}</Badge>
                          {m.error && <p className="mt-0.5 max-w-xs text-xs text-red-500">{m.error}</p>}
                        </Td>
                        <Td className="text-xs text-slate-500">{formatDateTime(m.sentAt)}</Td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel scheduled campaign">
        <p className="text-sm text-slate-600">
          Are you sure you want to cancel this scheduled campaign? It will not be sent to any recipients.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCancelTarget(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirmCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel campaign'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete campaign">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this campaign? Only pending or cancelled campaigns can be deleted.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete campaign'}
          </Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
