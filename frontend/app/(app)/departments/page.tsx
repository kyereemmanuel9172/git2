'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserPlus,
  Crown,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { api, formatDate, titleCase } from '@/lib/api';
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

interface DepartmentMemberEntry {
  id?: string;
  role?: string;
  joinedAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
}

interface Department {
  id: string;
  name: string;
  description?: string | null;
  leaderId?: string | null;
  memberCount?: number;
  members: DepartmentMemberEntry[];
}

interface DepartmentStats {
  totalDepartments: number;
  totalMembers: number;
  avgMembers: number;
  departments: Array<{ id: string; name: string; memberCount: number }>;
}

interface MemberOption {
  id: string;
  firstName: string;
  lastName: string;
}

const EMPTY_DEPARTMENT_FORM = { name: '', description: '' };
const PAGE_SIZE = 12;

function memberName(m: MemberOption | DepartmentMemberEntry['member']) {
  return `${m.firstName} ${m.lastName}`;
}

export default function DepartmentsPage() {
  const { toast, message } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [stats, setStats] = useState<DepartmentStats | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [memberTarget, setMemberTarget] = useState<Department | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_DEPARTMENT_FORM);
  const [memberForm, setMemberForm] = useState({ memberId: '', role: '' });
  const [memberSearch, setMemberSearch] = useState('');

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set('search', search);
      const data = await api<{ items: Department[]; total: number }>(`/departments?${params.toString()}`);
      setDepartments(data.items);
      setTotal(data.total);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api<DepartmentStats>('/departments/stats');
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const data = await api<Department>(`/departments/${id}`);
      setSelected(data);
      setDepartments((prev) => prev.map((d) => (d.id === id ? data : d)));
    } catch {
      toast('Failed to load department details');
    }
  }, [toast]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadStats();
    api<MemberOption[] | { items: MemberOption[] }>('/members?limit=500')
      .then((res) => {
        const list = Array.isArray(res) ? res : res.items ?? [];
        setMembers(list);
      })
      .catch(() => {});
  }, [loadStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const doSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const selectDepartment = (d: Department) => {
    if (selected?.id === d.id) {
      setSelected(null);
      return;
    }
    loadDetail(d.id);
  };

  const setField = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const openEdit = (d: Department) => {
    setEditTarget(d);
    setForm({ name: d.name, description: d.description ?? '' });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast('Please enter a department name');
      return;
    }
    setSaving(true);
    try {
      await api('/departments', {
        method: 'POST',
        body: { name: form.name.trim(), description: form.description.trim() || undefined },
      });
      toast('Department created');
      setAddOpen(false);
      setForm(EMPTY_DEPARTMENT_FORM);
      loadDepartments();
      loadStats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    if (!form.name.trim()) {
      toast('Please enter a department name');
      return;
    }
    setSaving(true);
    try {
      await api(`/departments/${editTarget.id}`, {
        method: 'PATCH',
        body: { name: form.name.trim(), description: form.description.trim() || undefined },
      });
      toast('Department updated');
      setEditTarget(null);
      loadDepartments();
      loadStats();
      if (selected?.id === editTarget.id) loadDetail(editTarget.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/departments/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Department deleted');
      setDeleteTarget(null);
      setSelected((s) => (s?.id === deleteTarget.id ? null : s));
      loadDepartments();
      loadStats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete department');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberTarget) return;
    if (!memberForm.memberId) {
      toast('Please select a member');
      return;
    }
    setSaving(true);
    try {
      await api(`/departments/${memberTarget.id}/members`, {
        method: 'POST',
        body: { memberId: memberForm.memberId, role: memberForm.role.trim() || undefined },
      });
      toast('Member added');
      setMemberTarget(null);
      setMemberForm({ memberId: '', role: '' });
      setMemberSearch('');
      loadDetail(memberTarget.id);
      loadDepartments();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      await api(`/departments/members/${removeTarget.id}`, { method: 'DELETE' });
      toast('Member removed');
      setRemoveTarget(null);
      if (selected) loadDetail(selected.id);
      loadDepartments();
      loadStats();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = memberSearch
    ? members.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase()),
      )
    : members;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Organize ministries and their members"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add department
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Departments"
            value={stats.totalDepartments}
            icon={<LayoutGrid className="h-5 w-5" />}
            tone="indigo"
          />
          <StatCard
            label="Total members"
            value={stats.totalMembers}
            icon={<Users className="h-5 w-5" />}
            tone="emerald"
          />
          <StatCard
            label="Avg members/dept"
            value={stats.avgMembers}
            icon={<Users className="h-5 w-5" />}
            tone="sky"
          />
          <StatCard
            label="Largest dept"
            value={stats.departments.length > 0 ? Math.max(...stats.departments.map((d) => d.memberCount)) : 0}
            icon={<Crown className="h-5 w-5" />}
            tone="amber"
            hint={stats.departments.find((d) => d.memberCount === Math.max(...stats.departments.map((x) => x.memberCount)))?.name}
          />
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <Button variant="outline" onClick={doSearch}>
            <Search className="h-4 w-4" />
            Search
          </Button>
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <Spinner />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No departments yet"
          subtitle="Create a department to organize your ministries"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <div
              key={d.id}
              onClick={() => selectDepartment(d)}
              className={cn(
                'cursor-pointer rounded-xl border bg-white transition-all shadow-sm',
                selected?.id === d.id
                  ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-md'
                  : 'hover:shadow-md hover:border-slate-300',
              )}
            >
              <div className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{d.name}</h3>
                      <p className="text-xs text-slate-500">{d.memberCount ?? d.members.length} member{(d.memberCount ?? d.members.length) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(d)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(d)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{d.description || 'No description'}</p>
                {d.members.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {d.members.slice(0, 5).map((m) => (
                      <li key={m.id ?? `${d.id}-${m.member.id}`} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          {m.member.id === d.leaderId && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                          {memberName(m.member)}
                        </span>
                        <Badge color={m.role ? 'indigo' : 'slate'}>{m.role ? titleCase(m.role) : 'Member'}</Badge>
                      </li>
                    ))}
                    {d.members.length > 5 && (
                      <li className="text-xs text-slate-400">
                        +{d.members.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <Table headers={['Department', 'Members', 'Description', '']}>
            {departments.map((d) => (
              <tr
                key={d.id}
                className={cn('cursor-pointer', selected?.id === d.id && 'bg-brand-50/50')}
                onClick={() => selectDepartment(d)}
              >
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-slate-800">{d.name}</span>
                  </div>
                </Td>
                <Td>
                  <span className="text-sm font-medium text-slate-700">{d.memberCount ?? d.members.length}</span>
                </Td>
                <Td>
                  <p className="max-w-xs truncate text-sm text-slate-500">{d.description || '—'}</p>
                </Td>
                <Td>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(d)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(d)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs text-slate-500">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {selected && (
        <Card>
          <CardHeader
            title={selected.name}
            subtitle={selected.description || 'Department details'}
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button onClick={() => setMemberTarget(selected)}>
                  <UserPlus className="h-4 w-4" />
                  Add member
                </Button>
              </div>
            }
          />
          <CardBody className="p-0">
            {selected.members.length === 0 ? (
              <EmptyState title="No members" subtitle="Add members to this department" />
            ) : (
              <Table headers={['Member', 'Role', 'Joined', 'Actions']}>
                {selected.members.map((m) => (
                  <tr key={m.id ?? `${selected.id}-${m.member.id}`}>
                    <Td>
                      <div className="flex items-center gap-2">
                        {m.member.id === selected.leaderId && <Crown className="h-4 w-4 text-amber-500" />}
                        <div>
                          <p className="font-medium text-slate-800">{memberName(m.member)}</p>
                          {m.member.email && <p className="text-xs text-slate-400">{m.member.email}</p>}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge color={m.role ? 'indigo' : 'slate'}>{m.role ? titleCase(m.role) : 'Member'}</Badge>
                    </Td>
                    <Td className="text-slate-500">{formatDate(m.joinedAt)}</Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => m.id && setRemoveTarget({ id: m.id, name: memberName(m.member) })}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add department">
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Choir"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="What does this department do?"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit department">
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Choir"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="What does this department do?"
          />
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete department">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? All members will be removed from this department. This action cannot be undone.
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

      <Modal open={!!memberTarget} onClose={() => { setMemberTarget(null); setMemberSearch(''); }} title={`Add member to ${memberTarget?.name ?? ''}`}>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search members…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <Select
            label="Member"
            value={memberForm.memberId}
            onChange={(e) => setMemberForm((f) => ({ ...f, memberId: e.target.value }))}
          >
            <option value="">Select a member</option>
            {filteredMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {memberName(m)}
              </option>
            ))}
          </Select>
          <Input
            label="Role"
            value={memberForm.role}
            onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="e.g. Secretary (optional)"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setMemberTarget(null); setMemberSearch(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={saving}>
              {saving ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove member">
        <p className="text-sm text-slate-600">
          Remove <span className="font-semibold">{removeTarget?.name}</span> from {selected?.name}?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRemoveTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemoveMember} disabled={saving}>
            {saving ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
