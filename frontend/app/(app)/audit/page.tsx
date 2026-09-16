'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { api, formatDateTime, titleCase } from '@/lib/api';
import {
  Button,
  Card,
  CardBody,
  Select,
  Badge,
  Table,
  Td,
  Spinner,
  EmptyState,
  PageHeader,
} from '@/components/ui';

interface AuditItem {
  id: string;
  action: string;
  entity: string;
  details?: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

const LIMIT = 20;

const actionColor = (action: string): 'green' | 'blue' | 'red' | 'slate' | 'amber' | 'indigo' | 'purple' => {
  const a = action.toUpperCase();
  if (['CREATED', 'ADDED', 'LOGIN', 'ENABLED', 'REGISTERED'].some((k) => a.includes(k))) return 'green';
  if (['UPDATED', 'EDITED', 'CHANGED', 'ASSIGNED'].some((k) => a.includes(k))) return 'blue';
  if (['DELETED', 'DISABLED', 'REMOVED', 'LOGOUT', 'FAILED'].some((k) => a.includes(k))) return 'red';
  return 'slate';
};

export default function AuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      const res = await api<{ items: AuditItem[]; total: number }>(`/audit?${params.toString()}`);
      setItems(res.items);
      setTotal(res.total);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entities = useMemo(() => Array.from(new Set(items.map((i) => i.entity))), [items]);
  const filtered = entityFilter ? items.filter((i) => i.entity === entityFilter) : items;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle="A record of actions performed across the system" />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Filter by entity</span>
          <div className="w-full sm:w-64">
            <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All entities</option>
              {entities.map((e) => (
                <option key={e} value={e}>
                  {titleCase(e)}
                </option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-8 w-8" />} title="No audit logs found" />
        ) : (
          <Table headers={['Timestamp', 'User', 'Action', 'Entity', 'Details']}>
            {filtered.map((item) => (
              <tr key={item.id}>
                <Td className="whitespace-nowrap text-slate-500">{formatDateTime(item.createdAt)}</Td>
                <Td>
                  <div>
                    <p className="font-medium text-slate-800">{item.user?.name ?? 'System'}</p>
                    {item.user?.email && <p className="text-xs text-slate-500">{item.user.email}</p>}
                  </div>
                </Td>
                <Td>
                  <Badge color={actionColor(item.action)}>{titleCase(item.action)}</Badge>
                </Td>
                <Td>{titleCase(item.entity)}</Td>
                <Td className="max-w-md truncate text-slate-500">
                  <span className="block truncate" title={item.details ?? ''}>
                    {item.details ?? '—'}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-xs text-slate-500">
            Showing {filtered.length} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page * LIMIT >= total} onClick={() => load(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
