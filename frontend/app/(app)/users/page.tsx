'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Search, UserCog, ShieldX, Pencil, Trash2 } from 'lucide-react';
import { api, formatDateTime, titleCase } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Button,
  Card,
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
  cn,
} from '@/components/ui';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

type Color = 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'indigo' | 'purple';

const ROLES = ['SUPER_ADMIN', 'CHURCH_ADMIN', 'SENIOR_PASTOR', 'PASTOR', 'FINANCE_OFFICER', 'DEPARTMENT_LEADER', 'MEMBER'];
const LIMIT = 10;

const roleColor = (role: string): Color => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'red';
    case 'CHURCH_ADMIN':
      return 'purple';
    case 'SENIOR_PASTOR':
      return 'indigo';
    case 'PASTOR':
      return 'blue';
    case 'FINANCE_OFFICER':
      return 'amber';
    case 'DEPARTMENT_LEADER':
      return 'green';
    default:
      return 'slate';
  }
};

const emptyForm = { name: '', email: '', password: '', role: 'MEMBER', phone: '' };

export default function UsersPage() {
  const { user } = useAuth();
  const { toast, message } = useToast();
  const [items, setItems] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', role: 'MEMBER', phone: '' });

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (search) params.set('search', search);
      const res = await api<{ items: UserRecord[]; total: number }>(`/users?${params.toString()}`);
      setItems(res.items);
      setTotal(res.total);
      setPage(p);
    } catch (err) {
      toast((err as Error).message);
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

  if (!user || !['SUPER_ADMIN', 'CHURCH_ADMIN'].includes(user.role)) {
    return (
      <Card>
        <CardBody className="py-16 text-center">
          <ShieldX className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-700">Access denied</h3>
          <p className="mt-1 text-xs text-slate-500">You do not have permission to view this page.</p>
        </CardBody>
      </Card>
    );
  }

  const openAdd = () => {
    setForm(emptyForm);
    setAddOpen(true);
  };

  const openEdit = (u: UserRecord) => {
    setEditing(u);
    setEditForm({ name: u.name, role: u.role, phone: u.phone ?? '' });
    setEditOpen(true);
  };

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/users', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone || undefined,
        },
      });
      toast('User added');
      setAddOpen(false);
      setForm(emptyForm);
      await load(page);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/users/${editing.id}`, {
        method: 'PATCH',
        body: { name: editForm.name, role: editForm.role, phone: editForm.phone || undefined },
      });
      toast('User updated');
      setEditOpen(false);
      setEditing(null);
      await load(page);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: UserRecord) => {
    try {
      await api(`/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } });
      await load(page);
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const removeUser = async (u: UserRecord) => {
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' });
      toast('User deleted');
      await load(page);
    } catch (err) {
      toast((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle="Manage user accounts and permissions"
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
            />
          </div>
          <Button variant="outline" onClick={() => load(1)}>
            <Search className="h-4 w-4" />
            Search
          </Button>
        </CardBody>
      </Card>

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState icon={<UserCog className="h-8 w-8" />} title="No users found" />
        ) : (
          <Table headers={['Name', 'Email', 'Role', 'Phone', 'Active', 'Last login', 'Actions']}>
            {items.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium text-slate-800">{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge color={roleColor(u.role)}>{titleCase(u.role)}</Badge>
                </Td>
                <Td>{u.phone ?? '—'}</Td>
                <Td>
                  <button
                    onClick={() => toggleActive(u)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors',
                      u.isActive ? 'bg-emerald-500' : 'bg-slate-300',
                    )}
                    title={u.isActive ? 'Deactivate user' : 'Activate user'}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                        u.isActive ? 'left-4' : 'left-0.5',
                      )}
                    />
                  </button>
                </Td>
                <Td className="text-slate-500">{formatDateTime(u.lastLoginAt)}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Edit user"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeUser(u)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-xs text-slate-500">
            Showing {items.length} of {total}
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add user">
        <form onSubmit={submitAdd} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </Select>
          <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name || !form.email || !form.password}>
              {saving ? 'Saving...' : 'Add user'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit user">
        <form onSubmit={submitEdit} className="space-y-4">
          <Input
            label="Name"
            required
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select label="Role" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </Select>
          <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !editForm.name}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
