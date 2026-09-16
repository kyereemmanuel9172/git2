'use client';

import { useCallback, useEffect, useState } from 'react';
import { Newspaper, Plus, Trash2, Archive, Send, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, formatDateTime, titleCase } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Toast,
  cn,
  useToast,
} from '@/components/ui';

interface Announcement {
  id: string;
  title: string;
  content: string;
  departmentId?: string | null;
  memberStatus?: string | null;
  gender?: string | null;
  city?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; name: string } | null;
}

interface DepartmentOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 8;

const statusBadge: Record<string, 'blue' | 'green' | 'slate'> = {
  DRAFT: 'slate',
  PUBLISHED: 'green',
  ARCHIVED: 'slate',
};

const memberStatusOptions = ['ACTIVE', 'INACTIVE', 'VISITOR', 'TRANSFERRED', 'DECEASED'];

const EMPTY_FORM = {
  title: '',
  content: '',
  departmentId: '',
  gender: '',
  city: '',
  memberStatus: '',
  status: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED',
};

function audienceSummary(a: Announcement) {
  const parts: string[] = [];
  if (a.department) parts.push(a.department.name);
  if (a.memberStatus) parts.push(titleCase(a.memberStatus));
  if (a.gender) parts.push(titleCase(a.gender));
  if (a.city) parts.push(a.city);
  return parts.length ? parts.join(' · ') : 'All members';
}

export function AnnouncementsSection() {
  const { toast, message } = useToast();

  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter) q.set('status', statusFilter);
      const data = await api<{ items: Announcement[]; total: number }>(`/announcements?${q.toString()}`);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<{ items: DepartmentOption[] } | DepartmentOption[]>('/departments')
      .then((d) => setDepartments(Array.isArray(d) ? d : d.items ?? []))
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setAddOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content,
      departmentId: a.departmentId ?? '',
      gender: a.gender ?? '',
      city: a.city ?? '',
      memberStatus: a.memberStatus ?? '',
      status: a.status === 'ARCHIVED' ? 'DRAFT' : a.status,
    });
    setEditing(a);
    setAddOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      title: form.title,
      content: form.content,
      departmentId: form.departmentId || undefined,
      gender: form.gender || undefined,
      city: form.city || undefined,
      memberStatus: form.memberStatus ? [form.memberStatus] : [],
      status: form.status,
    };
    try {
      if (editing) {
        await api(`/announcements/${editing.id}`, { method: 'PATCH', body });
        toast('Announcement updated');
      } else {
        await api('/announcements', { method: 'POST', body });
        toast(form.status === 'PUBLISHED' ? 'Announcement published' : 'Draft saved');
      }
      setAddOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (a: Announcement, status: 'PUBLISHED' | 'ARCHIVED') => {
    try {
      await api(`/announcements/${a.id}/${status === 'PUBLISHED' ? 'publish' : 'archive'}`, { method: 'POST' });
      toast(status === 'PUBLISHED' ? 'Announcement published' : 'Announcement archived');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/announcements/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Announcement deleted');
      setDeleteTarget(null);
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader
          title={`Announcements (${total})`}
          subtitle="Church-wide notices and updates"
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> New announcement
            </Button>
          }
        />
        <div className="flex items-center gap-2 px-4 pb-3">
          <Select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="w-40">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>

        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Newspaper className="h-12 w-12" />}
            title="No announcements yet"
            subtitle="Create your first announcement to keep the congregation informed."
          />
        ) : (
          <Table headers={['Title', 'Audience', 'Status', 'When', '']}>
            {items.map((a) => (
              <tr key={a.id}>
                <Td>
                  <p className="max-w-sm font-medium text-slate-800">{a.title}</p>
                  <p className="max-w-sm truncate text-xs text-slate-500">{a.content}</p>
                </Td>
                <Td>
                  <p className="text-xs text-slate-500">{audienceSummary(a)}</p>
                </Td>
                <Td>
                  <Badge color={statusBadge[a.status]}>{titleCase(a.status)}</Badge>
                </Td>
                <Td className="text-xs text-slate-500">
                  {a.status === 'PUBLISHED' && a.publishedAt
                    ? `Published · ${formatDateTime(a.publishedAt)}`
                    : `Created · ${formatDateTime(a.createdAt)}`}
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {a.status === 'DRAFT' && (
                      <button
                        onClick={() => setStatus(a, 'PUBLISHED')}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                        title="Publish"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {a.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => setStatus(a, 'ARCHIVED')}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(a)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}

        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
            <span className="text-xs text-slate-400">{total} total</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="px-1 text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={editing ? 'Edit announcement' : 'New announcement'} wide>
        <form onSubmit={submit} className="space-y-5">
          <Input
            label="Title"
            required
            placeholder="Midweek service reminder"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Message</label>
              <span className="text-xs text-slate-400">{form.content.length}/20000</span>
            </div>
            <Textarea
              required
              rows={5}
              maxLength={20000}
              placeholder="Write the announcement the congregation will see…"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Target audience</p>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="mt-3">
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
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">Publish</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: 'PUBLISHED' }))}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  form.status === 'PUBLISHED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                Publish now
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: 'DRAFT' }))}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  form.status === 'DRAFT'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                Save as draft
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : form.status === 'PUBLISHED' ? 'Publish announcement' : 'Save draft'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete announcement">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete announcement'}
          </Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
