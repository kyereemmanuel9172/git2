'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Download, CreditCard, CircleCheck, Clock, Receipt } from 'lucide-react';
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

interface PaymentMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface Payment {
  id: string;
  amount: number;
  currency?: string;
  payerName?: string;
  category?: string;
  method?: string;
  status?: string;
  source?: string;
  member?: PaymentMember | null;
  date: string;
  reference?: string;
  notes?: string;
}

interface PaymentSummary {
  completedValue: number;
  pendingValue: number;
  failedValue: number;
  count: number;
  byStatus: Record<string, number>;
}

interface PaymentResponse {
  items: Payment[];
  total: number;
  summary: PaymentSummary;
}

const METHODS = ['CASH', 'MOBILE_MONEY', 'BANK', 'CARD', 'CHEQUE', 'OTHER'];
const STATUSES = ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED', 'VOID'];
const SOURCES = ['MANUAL', 'PROVIDER', 'IMPORT'];

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = {
  COMPLETED: 'green',
  PENDING: 'amber',
  FAILED: 'red',
  REFUNDED: 'blue',
  VOID: 'slate',
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
  amount: '',
  payerName: '',
  category: '',
  method: 'CASH',
  status: 'COMPLETED',
  source: 'MANUAL',
  memberId: '',
  date: '',
  reference: '',
  notes: '',
};

function memberName(m: PaymentMember | MemberOption | null | undefined) {
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

export default function PaymentsPage() {
  const { user } = useAuth();
  const { toast, message } = useToast();
  const readOnly = user?.role === 'FINANCE_OFFICER';

  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ status: '', method: '', source: '', from: '', to: '' });

  const [recordOpen, setRecordOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    const q = buildQuery({ ...filters, limit: '500' });
    try {
      const data = await api<PaymentResponse>(`/payments?${q}`);
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

  const openEdit = (p: Payment) => {
    setEditTarget(p);
    setForm({
      amount: String(p.amount),
      payerName: p.payerName ?? '',
      category: p.category ?? '',
      method: p.method ?? 'CASH',
      status: p.status ?? 'COMPLETED',
      source: p.source ?? 'MANUAL',
      memberId: p.member?.id ?? '',
      date: toDateInput(p.date),
      reference: p.reference ?? '',
      notes: p.notes ?? '',
    });
  };

  const payload = () => ({
    amount: Number(form.amount),
    payerName: form.payerName || undefined,
    category: form.category || undefined,
    method: form.method || undefined,
    status: form.status || undefined,
    source: form.source || undefined,
    memberId: form.memberId || undefined,
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
      await api('/payments', { method: 'POST', body: payload() });
      toast('Payment recorded');
      setRecordOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch {
      toast('Failed to record payment');
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
      await api(`/payments/${editTarget.id}`, { method: 'PATCH', body: payload() });
      toast('Payment updated');
      setEditTarget(null);
      load();
    } catch {
      toast('Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/payments/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Payment deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Failed to delete payment');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const q = buildQuery(filters);
    download(`/payments/export?${q}`, 'payments.csv');
  };

  const paymentModal = (
    <>
      <Input
        label="Amount"
        type="number"
        min="0"
        step="0.01"
        value={form.amount}
        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        placeholder="0.00"
      />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Select label="Method" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Source" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Bibles, Building fund" />
      </div>
      <Input label="Payer name" value={form.payerName} onChange={(e) => setForm((f) => ({ ...f, payerName: e.target.value }))} placeholder="Only if no member selected" />
      <Select label="Member" value={form.memberId} onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}>
        <option value="">Not linked / guest</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {memberName(m)}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <Input label="Reference" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Provider ref" />
      </div>
      <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Transactions, methods and provider references"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={items.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setRecordOpen(true)} disabled={readOnly}>
              <Plus className="h-4 w-4" />
              Record payment
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
            tone="emerald"
            label="Completed value"
            value={formatMoney(summary.completedValue)}
            icon={<CircleCheck className="h-4 w-4" />}
            hint={`${summary.byStatus.COMPLETED ?? 0} transactions`}
          />
          <StatCard
            index={1}
            tone="amber"
            label="Pending value"
            value={formatMoney(summary.pendingValue)}
            icon={<Clock className="h-4 w-4" />}
            hint={`${summary.byStatus.PENDING ?? 0} awaiting settlement`}
          />
          <StatCard
            index={2}
            tone="rose"
            label="Failed"
            value={formatMoney(summary.failedValue)}
            icon={<Receipt className="h-4 w-4" />}
            hint={`${summary.byStatus.FAILED ?? 0} require attention`}
          />
          <StatCard
            index={3}
            tone="indigo"
            label="Transactions"
            value={total}
            icon={<CreditCard className="h-4 w-4" />}
            hint="Matching records"
          />
        </div>
      )}

      <Card>
        <CardHeader title="Payment register" subtitle={`${total} transactions match your filters`} />
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-32">
            <option value="">Every status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <Select value={filters.method} onChange={(e) => setFilter('method', e.target.value)} className="w-36">
            <option value="">Every method</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {titleCase(m)}
              </option>
            ))}
          </Select>
          <Select value={filters.source} onChange={(e) => setFilter('source', e.target.value)} className="w-32">
            <option value="">Every source</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
          <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
          <Input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className="w-40" aria-label="From date" />
          <Input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className="w-40" aria-label="To date" />
          {Object.values(filters).some(Boolean) && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ status: '', method: '', source: '', from: '', to: '' })}>
              Reset
            </Button>
          )}
        </div>
        <CardBody className="p-0">
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState icon={<CreditCard className="h-8 w-8" />} title="No payments" subtitle="Record a payment to get started" />
          ) : (
            <Table
              headers={['Date', 'Payer', 'Category', 'Method', 'Status', 'Source', 'Reference', { label: 'Amount', align: 'right' }, 'Actions']}
            >
              {items.map((p) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap text-slate-500">{formatDate(p.date)}</Td>
                  <Td className="text-slate-600">{p.member ? memberName(p.member) : p.payerName || '—'}</Td>
                  <Td className="text-slate-600">{p.category || '—'}</Td>
                  <Td>
                    <Badge color={METHOD_COLORS[p.method ?? ''] ?? 'slate'}>{titleCase(p.method ?? '')}</Badge>
                  </Td>
                  <Td>
                    <Badge color={STATUS_COLORS[p.status ?? ''] ?? 'slate'}>{titleCase(p.status ?? '')}</Badge>
                  </Td>
                  <Td className="text-slate-500">{titleCase(p.source ?? '')}</Td>
                  <Td className="text-slate-500">{p.reference || '—'}</Td>
                  <Td
                    className={cn(
                      'whitespace-nowrap text-right font-semibold tabular-nums',
                      p.status === 'VOID' || p.status === 'FAILED' ? 'text-slate-400 line-through' : 'text-emerald-600',
                    )}
                  >
                    {formatMoney(p.amount, p.currency)}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} disabled={readOnly} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)} disabled={readOnly} title="Delete">
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

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record a payment">
        <div className="space-y-4">{paymentModal}
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

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit payment">
        <div className="space-y-4">{paymentModal}
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete payment">
        <p className="text-sm text-slate-600">Are you sure you want to delete this payment? This action cannot be undone.</p>
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
