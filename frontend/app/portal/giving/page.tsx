'use client';

import { useEffect, useState } from 'react';
import { HandCoins, TrendingUp, Clock, Wallet, Download, Search, ArrowUpRight } from 'lucide-react';
import { portalApi, portalDownload, formatMoney, formatDate, titleCase } from '@/lib/portal';
import { Card, CardHeader, CardBody, StatCard, Spinner, EmptyState, Badge, statusColor, cn } from '@/components/ui';

interface GivingItem {
  id: string;
  source: 'TRANSACTION' | 'CONTRIBUTION';
  type: string;
  amount: number;
  currency: string;
  category: string | null;
  description: string | null;
  reference: string | null;
  date: string;
}

interface GivingData {
  items: GivingItem[];
  summary: { total: number; last30: number; thisYear: number };
}

export default function PortalGiving() {
  const [data, setData] = useState<GivingData | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    const controller = new AbortController();
    portalApi<GivingData>('/portal/contributions', { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load giving history');
      });
    return () => controller.abort();
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <Spinner />
            <p className="mt-4 text-sm text-slate-500">Loading giving history...</p>
          </>
        )}
      </div>
    );
  }

  const types = ['ALL', ...new Set(data.items.map((i) => i.type))];

  const filteredItems = data.items.filter((item) => {
    const matchesSearch =
      !search.trim() ||
      item.type.toLowerCase().includes(search.toLowerCase()) ||
      (item.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (item.reference ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = [
    { label: 'Total giving', value: formatMoney(data.summary.total), icon: <Wallet className="h-4 w-4" />, tone: 'emerald', hint: 'Lifetime contributions' },
    { label: 'This year', value: formatMoney(data.summary.thisYear), icon: <TrendingUp className="h-4 w-4" />, tone: 'sky', hint: new Date().getFullYear().toString() },
    { label: 'Last 30 days', value: formatMoney(data.summary.last30), icon: <Clock className="h-4 w-4" />, tone: 'violet', hint: 'Recent activity' },
  ];

  const formatReceipt = () => {
    const now = new Date();
    const filename = `giving-receipt-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
    portalDownload('/portal/receipt/pdf', filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My giving</h1>
          <p className="mt-0.5 text-sm text-slate-500">Your tithes, offerings and donations</p>
        </div>
        <button
          onClick={formatReceipt}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
        >
          <Download className="h-4 w-4" />
          Download receipt
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} hint={s.hint} index={i} />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                filterType === t
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {t === 'ALL' ? 'All types' : titleCase(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="Contribution history"
          subtitle={`${filteredItems.length} record${filteredItems.length === 1 ? '' : 's'}${filterType !== 'ALL' ? ` · Filtered by ${titleCase(filterType)}` : ''}`}
        />
        <CardBody className="p-0">
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<HandCoins className="h-12 w-12" />}
              title={search || filterType !== 'ALL' ? 'No matching records' : 'No giving records yet'}
              subtitle={
                search || filterType !== 'ALL'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Your tithes and offerings will appear here once recorded.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={`${item.source}-${item.id}`} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800">{formatDate(item.date)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge color={statusColor(item.type)}>{titleCase(item.type)}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-600">{item.category ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[200px] truncate text-slate-600">
                          {item.description ?? (item.reference ? `Ref: ${item.reference}` : '—')}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold text-emerald-700">{formatMoney(item.amount, item.currency)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
