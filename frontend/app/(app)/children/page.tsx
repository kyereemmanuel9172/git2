'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Download, Baby, Cake, Users2 } from 'lucide-react';
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

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  ministry?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
}

interface ChildrenResponse {
  items: Child[];
  total: number;
}

const GENDERS = ['MALE', 'FEMALE'];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  guardianName: '',
  guardianPhone: '',
  ministry: '',
  photoUrl: '',
  notes: '',
};

function toDateInput(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function ageOf(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function ChildrenPage() {
  const { user } = useAuth();
  const { toast, message } = useToast();
  const readOnly = user?.role === 'DEPARTMENT_LEADER';

  const [data, setData] = useState<ChildrenResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [recordOpen, setRecordOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Child | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const res = await api<ChildrenResponse>('/children');
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

  const openEdit = (c: Child) => {
    setEditTarget(c);
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      gender: c.gender ?? '',
      dateOfBirth: toDateInput(c.dateOfBirth ?? ''),
      guardianName: c.guardianName ?? '',
      guardianPhone: c.guardianPhone ?? '',
      ministry: c.ministry ?? '',
      photoUrl: c.photoUrl ?? '',
      notes: c.notes ?? '',
    });
  };

  const payload = () => ({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    gender: form.gender || undefined,
    dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
    guardianName: form.guardianName || undefined,
    guardianPhone: form.guardianPhone || undefined,
    ministry: form.ministry || undefined,
    photoUrl: form.photoUrl || undefined,
    notes: form.notes || undefined,
  });

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast('Please enter the child\'s first and last name');
      return;
    }
    setSaving(true);
    try {
      await api('/children', { method: 'POST', body: payload() });
      toast('Child added');
      setRecordOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch {
      toast('Failed to add child');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api(`/children/${editTarget.id}`, { method: 'PATCH', body: payload() });
      toast('Child updated');
      setEditTarget(null);
      load();
    } catch {
      toast('Failed to update child');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/children/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Child deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Failed to delete child');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    download('/children/export', 'children.csv');
  };

  const childModal = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Input label="First name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        <Input label="Last name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
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
        <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Guardian name" value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} />
        <Input label="Guardian phone" value={form.guardianPhone} onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Ministry" value={form.ministry} onChange={(e) => setForm((f) => ({ ...f, ministry: e.target.value }))} placeholder="e.g. Children's Ministry" />
        <Input label="Photo URL" value={form.photoUrl} onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://…" />
      </div>
      <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Children"
        subtitle="Children and guardians"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={exportCsv} disabled={data?.total === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setRecordOpen(true)}>
              <Plus className="h-4 w-4" />
              Add child
            </Button>
          </div>
        }
      />

      {!data ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard index={0} tone="indigo" label="Children" value={data.total} icon={<Baby className="h-4 w-4" />} hint="Registered children" />
          <StatCard
            index={1}
            tone="amber"
            label="Under 5"
            value={data.items.filter((c) => c.dateOfBirth && ageOf(c.dateOfBirth) < 5).length}
            icon={<Cake className="h-4 w-4" />}
            hint="Toddlers & infants"
          />
          <StatCard
            index={2}
            tone="emerald"
            label="Ages 5–12"
            value={data.items.filter((c) => c.dateOfBirth && ageOf(c.dateOfBirth) >= 5 && ageOf(c.dateOfBirth) <= 12).length}
            icon={<Users2 className="h-4 w-4" />}
            hint="Primary school"
          />
        </div>
      )}

      <Card>
        <CardHeader title="Children records" subtitle={`${data?.total ?? 0} registered children`} />
        <CardBody className="p-0">
          {loading ? (
            <Spinner />
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={<Baby className="h-8 w-8" />} title="No children yet" subtitle="Add a child to get started" />
          ) : (
            <Table headers={['Name', 'Age', 'Gender', 'Guardian', 'Guardian phone', 'Ministry', 'Actions']}>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium text-slate-800">
                    <div className="flex items-center gap-2.5">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={`${c.firstName} ${c.lastName}`} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <Baby className="h-4 w-4" />
                        </span>
                      )}
                      {c.firstName} {c.lastName}
                    </div>
                  </Td>
                  <Td className="text-slate-600">{c.dateOfBirth ? `${ageOf(c.dateOfBirth)} yrs · ${formatDate(c.dateOfBirth)}` : '—'}</Td>
                  <Td>
                    <Badge color={c.gender === 'FEMALE' ? 'purple' : c.gender === 'MALE' ? 'blue' : 'slate'}>
                      {c.gender ? c.gender.charAt(0) + c.gender.slice(1).toLowerCase() : '—'}
                    </Badge>
                  </Td>
                  <Td className="text-slate-600">{c.guardianName || '—'}</Td>
                  <Td className="text-slate-600">{c.guardianPhone || '—'}</Td>
                  <Td className="text-slate-600">{c.ministry || '—'}</Td>
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

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Add a child">
        <div className="space-y-4">
          {childModal}
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

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit child">
        <div className="space-y-4">
          {childModal}
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete child">
        <p className="text-sm text-slate-600">Are you sure you want to delete this child record? This action cannot be undone.</p>
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
