'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api, formatMoney, formatDate, titleCase } from '@/lib/api';
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
} from '@/components/ui';

interface TransactionMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency?: string;
  category?: string;
  description?: string;
  date: string;
  member?: TransactionMember | null;
}

interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  byType: Record<string, number>;
}

interface FinanceResponse {
  items: Transaction[];
  total: number;
  summary: FinanceSummary;
}

interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

const TRANSACTION_TYPES = ['TITHE', 'OFFERING', 'DONATION', 'EXPENSE'];

const TYPE_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'red'> = {
  TITHE: 'purple',
  OFFERING: 'blue',
  DONATION: 'green',
  EXPENSE: 'red',
};

const EMPTY_FORM = {
  type: 'TITHE',
  amount: '',
  category: '',
  description: '',
  date: '',
  memberId: '',
};

function memberName(m: TransactionMember | MemberOption | null | undefined) {
  if (!m) return '';
  return `${m.firstName} ${m.lastName}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function toDateInput(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function FinancePage() {
  const { user } = useAuth();
  const { toast, message } = useToast();
  const readOnly = user?.role === 'FINANCE_OFFICER';

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [trend, setTrend] = useState<MonthlyPoint[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);

  const [recordOpen, setRecordOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadSummary = useCallback(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    api<FinanceResponse>(`/finance?from=${since.toISOString()}`)
      .then((d) => {
        setSummary(d.summary);
        setTotal(d.total);
      })
      .catch(() => {});
  }, []);

  const loadTransactions = useCallback(async () => {
    const type = typeFilter === 'ALL' ? '' : typeFilter;
    try {
      const data = await api<FinanceResponse>(`/finance?type=${type}&limit=500`);
      setTransactions(data.items);
    } catch {
      // keep previous data
    }
  }, [typeFilter]);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([loadTransactions(), loadSummary()]).finally(() => setLoading(false));
  }, [loadTransactions, loadSummary]);

  useEffect(() => {
    refresh();
    api<MonthlyPoint[]>('/finance/monthly?months=6').then(setTrend).catch(() => {});
    api<MemberOption[] | { items: MemberOption[] }>('/members?limit=200')
      .then((res) => {
        const list = Array.isArray(res) ? res : res.items ?? [];
        setMembers(list);
      })
      .catch(() => {});
  }, [refresh]);

  const setField = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const openEdit = (t: Transaction) => {
    setEditTarget(t);
    setForm({
      type: t.type,
      amount: String(t.amount),
      category: t.category ?? '',
      description: t.description ?? '',
      date: toDateInput(t.date),
      memberId: t.member?.id ?? '',
    });
  };

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const body = {
        type: form.type,
        amount: Number(form.amount),
        category: form.category || undefined,
        description: form.description || undefined,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        memberId: form.memberId || undefined,
      };
      await api('/finance', { method: 'POST', body });
      toast('Transaction recorded');
      setRecordOpen(false);
      setForm(EMPTY_FORM);
      refresh();
    } catch {
      toast('Failed to record transaction');
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
      await api(`/finance/${editTarget.id}`, {
        method: 'PATCH',
        body: {
          type: form.type,
          amount: Number(form.amount),
          category: form.category || undefined,
          description: form.description || undefined,
          date: form.date ? new Date(form.date).toISOString() : undefined,
          memberId: form.memberId || undefined,
        },
      });
      toast('Transaction updated');
      setEditTarget(null);
      refresh();
    } catch {
      toast('Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/finance/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Transaction deleted');
      setDeleteTarget(null);
      refresh();
    } catch {
      toast('Failed to delete transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        subtitle="Track income, expenses and giving"
        action={
          <Button onClick={() => setRecordOpen(true)} disabled={readOnly}>
            <Plus className="h-4 w-4" />
            Record transaction
          </Button>
        }
      />

      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="h-4 w-4 shrink-0" />
          You have read-only access to financial records.
        </div>
      )}

      {!summary ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Income (30d)" value={formatMoney(summary.income)} icon={<TrendingUp className="h-4 w-4" />} />
          <StatCard label="Expenses (30d)" value={formatMoney(summary.expense)} icon={<TrendingDown className="h-4 w-4" />} />
          <StatCard label="Balance" value={formatMoney(summary.balance)} icon={<Scale className="h-4 w-4" />} />
          <StatCard label="Transactions" value={total} icon={<Receipt className="h-4 w-4" />} hint="Last 30 days" />
        </div>
      )}

      <Card>
        <CardHeader title="Monthly trend" subtitle="Income vs expenses" />
        <CardBody className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={monthLabel} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoney(Number(v)).replace(/\.00$/, '')} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} labelFormatter={(l) => monthLabel(String(l))} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Transactions"
          action={
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-44"
            >
              <option value="ALL">All types</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          }
        />
        <CardBody className="p-0">
          {loading ? (
            <Spinner />
          ) : transactions.length === 0 ? (
            <EmptyState title="No transactions" subtitle="Record a transaction to get started" />
          ) : (
            <Table headers={['Date', 'Type', 'Category', 'Description', 'Member', 'Amount', 'Actions']}>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <Td className="whitespace-nowrap text-slate-500">{formatDate(t.date)}</Td>
                  <Td>
                    <Badge color={TYPE_COLORS[t.type] ?? 'slate'}>{titleCase(t.type)}</Badge>
                  </Td>
                  <Td className="text-slate-600">{t.category ?? '—'}</Td>
                  <Td className="max-w-[220px] truncate text-slate-600">{t.description ?? '—'}</Td>
                  <Td className="text-slate-600">{memberName(t.member) || '—'}</Td>
                  <Td className={t.type === 'EXPENSE' ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
                    {t.type === 'EXPENSE' ? `-${formatMoney(t.amount, t.currency)}` : formatMoney(t.amount, t.currency)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)} disabled={readOnly}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(t)} disabled={readOnly}>
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

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record transaction">
        <div className="space-y-4">
          <Select label="Type" value={form.type} onChange={(e) => setField('type', e.target.value)}>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setField('amount', e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            placeholder="e.g. Tithes, Utilities"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Short description"
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
          />
          <Select label="Member" value={form.memberId} onChange={(e) => setField('memberId', e.target.value)}>
            <option value="">No member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {memberName(m)}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit transaction">
        <div className="space-y-4">
          <Select label="Type" value={form.type} onChange={(e) => setField('type', e.target.value)}>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setField('amount', e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            placeholder="e.g. Tithes, Utilities"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Short description"
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
          />
          <Select label="Member" value={form.memberId} onChange={(e) => setField('memberId', e.target.value)}>
            <option value="">No member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {memberName(m)}
              </option>
            ))}
          </Select>
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete transaction">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>
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
