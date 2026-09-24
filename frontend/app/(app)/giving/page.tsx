'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Download, HandCoins, Landmark, TrendingUp, CircleCheck } from 'lucide-react';
import { api, formatMoney, formatDate, titleCase, download } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
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
  StatCard,
  cn,
} from '@/components/ui';

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ContributionMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface Contribution {
  id: string;
  type: string;
  amount: number;
  currency?: string;
  method?: string;
  status?: string;
  member?: ContributionMember | null;
  giverName?: string;
  service?: string;
  date: string;
  reference?: string;
  notes?: string;
}

interface ContributionSummary {
  total: number;
  tithes: number;
  offerings: number;
  byType: Record<string, number>;
  verifiedTotal: number;
  voidTotal: number;
}

interface ContributionResponse {
  items: Contribution[];
  total: number;
  summary: ContributionSummary;
}

const TYPES = ['TITHE', 'OFFERING', 'SPECIAL', 'PLEDGE'];
const METHODS = ['CASH', 'MOBILE_MONEY', 'BANK', 'CARD', 'CHEQUE', 'OTHER'];
const STATUSES = ['RECORDED', 'VERIFIED', 'VOID'];

const TYPE_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'amber' | 'red'> = {
  TITHE: 'purple',
  OFFERING: 'blue',
  SPECIAL: 'amber',
  PLEDGE: 'green',
};
const STATUS_COLORS: Record<string, 'slate' | 'green' | 'red'> = {
  RECORDED: 'slate',
  VERIFIED: 'green',
  VOID: 'red',
};
const METHOD_COLORS: Record<string, 'slate' | 'blue' | 'green'> = {
  MOBILE_MONEY: 'blue',
  BANK: 'slate',
  CARD: 'slate',
  CASH: 'green',
  CHEQUE: 'slate',
  OTHER: 'slate',
};

const EMPTY_FORM = {
  type: 'TITHE',
  amount: '',
  method: 'CASH',
  status: 'RECORDED',
  memberId: '',
  giverName: '',
  service: '',
  date: '',
  reference: '',
  notes: '',
};

function memberName(m: ContributionMember | MemberOption | null | undefined) {
  if (!m) return '';
  return `${m.firstName} ${m.lastName}`;
}

function toDateInput(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function buildQuery(filters: Record<string, string>) {
  return Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

export default function GivingPage() {
  const { user } = useAuth();
  const { toast, message } = useToast();
  const readOnly = user?.role === 'FINANCE_OFFICER';

  const [items, setItems] = useState<Contribution[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ type: '', method: '', status: '', from: '', to: '' });

  const [recordOpen, setRecordOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contribution | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contribution | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    const q = buildQuery({ ...filters, limit: '500' });
    try {
      const data = await api<ContributionResponse>(`/contributions?${q}`);
      setItems(data.items);
      setTotal(data.total);
      setSummary(data.summary);
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    load();
    api<MemberOption[] | { items: MemberOption[] }>('/members?limit=200')
      .then((res) => {
        const list = Array.isArray(res) ? res : res.items ?? [];
        setMembers(list);
      })
      .catch(() => {});
  }, [load]);

  const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const openEdit = (c: Contribution) => {
    setEditTarget(c);
    setForm({
      type: c.type,
      amount: String(c.amount),
      method: c.method ?? 'CASH',
      status: c.status ?? 'RECORDED',
      memberId: c.member?.id ?? '',
      giverName: c.giverName ?? '',
      service: c.service ?? '',
      date: toDateInput(c.date),
      reference: c.reference ?? '',
      notes: c.notes ?? '',
    });
  };

  const payload = () => ({
    type: form.type,
    amount: Number(form.amount),
    method: form.method || undefined,
    status: form.status || undefined,
    memberId: form.memberId || undefined,
    giverName: form.giverName || undefined,
    service: form.service || undefined,
    date: form.date ? new Date(form.date).toISOString() : undefined,
    reference: form.reference || undefined,
    notes: form.notes || undefined,
  });

  const handleCreate = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api('/contributions', { method: 'POST', body: payload() });
      toast('Contribution recorded');
      setRecordOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch {
      toast('Failed to record contribution');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    if (!form.amount || Number(form.amount) <= 0) {
      toast('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api(`/contributions/${editTarget.id}`, { method: 'PATCH', body: payload() });
      toast('Contribution updated');
      setEditTarget(null);
      load();
    } catch {
      toast('Failed to update contribution');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/contributions/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Contribution deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Failed to delete contribution');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const q = buildQuery(filters);
    download(`/contributions/export?${q}`, 'contributions.csv');
  };

  const exportPdf = () => {
    const q = buildQuery(filters);
    download(`/contributions/export/pdf?${q}`, 'contributions.pdf');
  };

  const contributionModal = (
    <>
      <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {titleCase(t)}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          placeholder="0.00"
        />
        <Select label="Method" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
      </div>
      <Select label="Member" value={form.memberId} onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}>
        <option value="">Anonymous / guest</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {memberName(m)}
          </option>
        ))}
      </Select>
      <Input label="Giver name" value={form.giverName} onChange={(e) => setForm((f) => ({ ...f, giverName: e.target.value }))} placeholder="Only if no member selected" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Service" value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g. Sunday worship" />
        <Input label="Reference" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Optional ref no." />
      </div>
      <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tithes & Offerings"
        subtitle="Reconcile giving by service, date, method and verified state"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={exportCsv} disabled={items.length === 0}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            <Button variant="outline" onClick={exportPdf} disabled={items.length === 0}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={() => setRecordOpen(true)} disabled={readOnly}>
              <Plus className="h-4 w-4" />
              Record giving
            </Button>
          </div>
        }
      />

      {!summary ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            index={0}
            tone="indigo"
            label="Total giving"
            value={formatMoney(summary.total)}
            icon={<HandCoins className="h-4 w-4" />}
            hint={`${total} records`}
          />
          <StatCard
            index={1}
            tone="violet"
            label="Tithes"
            value={formatMoney(summary.tithes)}
            icon={<Landmark className="h-4 w-4" />}
            hint={`${Math.round((summary.tithes / (summary.total || 1)) * 100)}% of total`}
          />
          <StatCard
            index={2}
            tone="sky"
            label="Offerings"
            value={formatMoney(summary.offerings)}
            icon={<TrendingUp className="h-4 w-4" />}
            hint={`${Math.round((summary.offerings / (summary.total || 1)) * 100)}% of total`}
          />
          <StatCard
            index={3}
            tone="emerald"
            label="Verified"
            value={formatMoney(summary.verifiedTotal)}
            icon={<CircleCheck className="h-4 w-4" />}
            hint={`${formatMoney(summary.voidTotal)} void`}
          />
        </div>
      )}

      <Card>
        <CardHeader title="Giving register" subtitle={`${total} contributions match your filters`} />
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <Select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className="w-32">
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </Select>
          <Select value={filters.method} onChange={(e) => setFilter('method', e.target.value)} className="w-36">
            <option value="">All methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {titleCase(m)}
              </option>
            ))}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-32">
            <option value="">All states</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
          <Input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className="w-40" aria-label="From date" />
          <Input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className="w-40" aria-label="To date" />
          {Object.values(filters).some(Boolean) && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ type: '', method: '', status: '', from: '', to: '' })}>
              Reset
            </Button>
          )}
        </div>
        <CardBody className="p-0">
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState icon={<HandCoins className="h-8 w-8" />} title="No contributions" subtitle="Record tithes or offerings to get started" />
          ) : (
            <Table
              headers={['Date', 'Type', 'Member / Giver', 'Method', 'Status', 'Reference', { label: 'Amount', align: 'right' }, 'Actions']}
            >
              {items.map((c) => (
                <tr key={c.id}>
                  <Td className="whitespace-nowrap text-slate-500">{formatDate(c.date)}</Td>
                  <Td>
                    <Badge color={TYPE_COLORS[c.type] ?? 'slate'}>{titleCase(c.type)}</Badge>
                  </Td>
                  <Td className="text-slate-600">
                    {c.member ? memberName(c.member) : c.giverName || 'Anonymous'}
                  </Td>
                  <Td>
                    <Badge color={METHOD_COLORS[c.method ?? ''] ?? 'slate'}>{titleCase(c.method ?? '')}</Badge>
                  </Td>
                  <Td>
                    <Badge color={STATUS_COLORS[c.status ?? ''] ?? 'slate'}>{titleCase(c.status ?? '')}</Badge>
                  </Td>
                  <Td className="text-slate-500">{c.reference || '—'}</Td>
                  <Td
                    className={cn(
                      'whitespace-nowrap text-right font-semibold tabular-nums',
                      c.status === 'VOID' ? 'text-slate-400 line-through' : 'text-emerald-600',
                    )}
                  >
                    {formatMoney(c.amount, c.currency)}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} disabled={readOnly} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)} disabled={readOnly} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record giving">
        <div className="space-y-4">{contributionModal}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit contribution">
        <div className="space-y-4">{contributionModal}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete contribution">
        <p className="text-sm text-slate-600">Are you sure you want to delete this contribution? This action cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
