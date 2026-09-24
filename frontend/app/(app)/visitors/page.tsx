'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Users, UserPlus, Phone, CheckCircle2 } from 'lucide-react';
import { api, formatDate, download } from '@/lib/api';
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

interface Visitor {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  memberType?: string | null;
  visitedAt: string;
  hostName?: string | null;
  notes?: string | null;
  followedUp: boolean;
  convertedMemberId?: string | null;
}

interface VisitorsResponse {
  items: Visitor[];
  total: number;
  pendingFollowUp: number;
}

const MEMBER_TYPES = ['First-timer', 'Returning guest', 'Invited', 'Walk-in'];
const GENDERS = ['MALE', 'FEMALE'];

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  gender: '',
  memberType: '',
  hostName: '',
  notes: '',
};

export default function VisitorsPage() {
  const { user } = useAuth();
  const { toast, message } = useToast();
  const readOnly = user?.role === 'DEPARTMENT_LEADER';

  const [data, setData] = useState<VisitorsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [recordOpen, setRecordOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Visitor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Visitor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const res = await api<VisitorsResponse>('/visitors');
      setData(res);
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (v: Visitor) => {
    setEditTarget(v);
    setForm({
      fullName: v.fullName,
      phone: v.phone ?? '',
      email: v.email ?? '',
      gender: v.gender ?? '',
      memberType: v.memberType ?? '',
      hostName: v.hostName ?? '',
      notes: v.notes ?? '',
    });
  };

  const payload = () => ({
    fullName: form.fullName.trim(),
    phone: form.phone || undefined,
    email: form.email || undefined,
    gender: form.gender || undefined,
    memberType: form.memberType || undefined,
    hostName: form.hostName || undefined,
    notes: form.notes || undefined,
  });

  const handleCreate = async () => {
    if (!form.fullName.trim()) {
      toast('Please enter the visitor\'s full name');
      return;
    }
    setSaving(true);
    try {
      await api('/visitors', { method: 'POST', body: payload() });
      toast('Visitor registered');
      setRecordOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch {
      toast('Failed to register visitor');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api(`/visitors/${editTarget.id}`, { method: 'PATCH', body: payload() });
      toast('Visitor updated');
      setEditTarget(null);
      load();
    } catch {
      toast('Failed to update visitor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/visitors/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Visitor deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Failed to delete visitor');
    } finally {
      setSaving(false);
    }
  };

  const handleFollowUp = async (v: Visitor) => {
    setSaving(true);
    try {
      await api(`/visitors/${v.id}/follow-up`, { method: 'POST' });
      toast('Marked as followed up');
      load();
    } catch {
      toast('Failed to update visitor');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    download('/visitors/export', 'visitors.csv');
  };

  const visitorModal = (
    <>
      <Input
        label="Full name"
        value={form.fullName}
        onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        placeholder="Visitor's full name"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+233 …" />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="visitor@example.com" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
          <option value="">Prefer not to say</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <Select label="Member type" value={form.memberType} onChange={(e) => setForm((f) => ({ ...f, memberType: e.target.value }))}>
          <option value="">—</option>
          {MEMBER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <Input label="Host / invited by" value={form.hostName} onChange={(e) => setForm((f) => ({ ...f, hostName: e.target.value }))} />
      <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        subtitle="Guests and first-timers"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={exportCsv} disabled={data?.total === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setRecordOpen(true)}>
              <Plus className="h-4 w-4" />
              Register visitor
            </Button>
          </div>
        }
      />

      {!data ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard index={0} tone="indigo" label="Visitors" value={data.total} icon={<Users className="h-4 w-4" />} hint="All records" />
          <StatCard index={1} tone="amber" label="Pending follow-up" value={data.pendingFollowUp} icon={<Phone className="h-4 w-4" />} hint="Need a call or visit" />
          <StatCard index={2} tone="emerald" label="Followed up" value={data.total - data.pendingFollowUp} icon={<CheckCircle2 className="h-4 w-4" />} hint="Contacted" />
        </div>
      )}

      <Card>
        <CardHeader title="Visitor records" subtitle={`${data?.total ?? 0} registered visitors`} />
        <CardBody className="p-0">
          {loading ? (
            <Spinner />
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={<UserPlus className="h-8 w-8" />} title="No visitors yet" subtitle="Register a visitor to get started" />
          ) : (
            <Table headers={['Name', 'Contact', 'Member type', 'Visited', 'Host', 'Follow-up', 'Actions']}>
              {data.items.map((v) => (
                <tr key={v.id}>
                  <Td className="font-medium text-slate-800">{v.fullName}</Td>
                  <Td className="text-slate-600">
                    {v.phone || v.email ? (
                      <div className="flex flex-col">
                        {v.phone && <span>{v.phone}</span>}
                        {v.email && <span className="text-xs text-slate-400">{v.email}</span>}
                      </div>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    <Badge color="slate">{v.memberType || '—'}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{formatDate(v.visitedAt)}</Td>
                  <Td className="text-slate-600">{v.hostName || '—'}</Td>
                  <Td>
                    {v.convertedMemberId ? (
                      <Badge color="green">Converted</Badge>
                    ) : v.followedUp ? (
                      <Badge color="green">Followed up</Badge>
                    ) : (
                      <Badge color="amber">Pending</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {!v.followedUp && !v.convertedMemberId && (
                        <Button variant="ghost" size="sm" onClick={() => handleFollowUp(v)} disabled={readOnly || saving} title="Mark followed up">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(v)} disabled={readOnly} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(v)} disabled={readOnly} title="Delete">
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

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Register a visitor">
        <div className="space-y-4">
          {visitorModal}
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

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit visitor">
        <div className="space-y-4">
          {visitorModal}
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete visitor">
        <p className="text-sm text-slate-600">Are you sure you want to delete this visitor record? This action cannot be undone.</p>
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
