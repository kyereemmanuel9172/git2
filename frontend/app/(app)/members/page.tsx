'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Download, Upload, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Home, Archive, Printer, QrCode } from 'lucide-react';
import { api, download } from '@/lib/api';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Textarea,
  Badge,
  statusColor,
  Modal,
  Table,
  Td,
  Spinner,
  EmptyState,
  PageHeader,
  Toast,
  useToast,
  Avatar,
} from '@/components/ui';
import MemberPhotoPicker from '@/components/MemberPhotoPicker';

interface Family {
  id: string;
  name: string;
  address: string | null;
  head: { firstName: string; lastName: string } | null;
  members: Array<{ id: string; firstName: string; lastName: string }>;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  motherName: string | null;
  fatherName: string | null;
  churchBranch: string | null;
  membershipStatus: string | null;
  joinDate: string | null;
  baptismDate: string | null;
  memberId: string | null;
  photoUrl: string | null;
  familyId: string | null;
  notes: string | null;
  family: Family | null;
  departmentLinks: Array<{ department: { id: string; name: string }; role: string }>;
}

interface Department {
  id: string;
  name: string;
}

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  city: string;
  maritalStatus: string;
  occupation: string;
  motherName: string;
  fatherName: string;
  churchBranch: string;
  membershipStatus: string;
  joinDate: string;
  familyId: string;
  photoUrl: string;
  departmentIds: string[];
  notes: string;
}

const emptyForm: MemberForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: 'MALE',
  dateOfBirth: '',
  address: '',
  city: '',
  maritalStatus: '',
  occupation: '',
  motherName: '',
  fatherName: '',
  churchBranch: '',
  membershipStatus: 'ACTIVE',
  joinDate: '',
  familyId: '',
  photoUrl: '',
  departmentIds: [],
  notes: '',
};

const STATUSES = ['ACTIVE', 'INACTIVE', 'VISITOR', 'TRANSFERRED', 'DECEASED'];
const GENDERS = ['MALE', 'FEMALE'];

const isoDate = (v: string) => (v ? new Date(v).toISOString() : undefined);
const toDateInput = (v: string | null | undefined) => (v ? v.slice(0, 10) : '');

const IMPORT_TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Gender',
  'City',
  'Address',
  'Marital Status',
  'Occupation',
  "Mother's Name",
  "Father's Name",
  'Church Branch',
  'Membership Status',
  'Join Date',
  'Member ID',
];

const EXPORT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'memberId', label: 'Member ID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'maritalStatus', label: 'Marital Status' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'motherName', label: "Mother's Name" },
  { key: 'fatherName', label: "Father's Name" },
  { key: 'churchBranch', label: 'Church Branch' },
  { key: 'membershipStatus', label: 'Membership Status' },
  { key: 'joinDate', label: 'Join Date' },
  { key: 'baptismDate', label: 'Baptism Date' },
  { key: 'family', label: 'Church Group' },
  { key: 'ministries', label: 'Ministries' },
  { key: 'notes', label: 'Notes' },
];

const DEFAULT_EXPORT_COLUMNS = ['firstName', 'lastName', 'email', 'phone', 'gender', 'city', 'maritalStatus', 'membershipStatus', 'joinDate'];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function downloadBlob(filename: string, content: string, mime = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const downloadImportTemplate = () => {
  const sample = [
    'Kwame',
    'Agyemang',
    'kwame@example.com',
    '+1 555 123 4567',
    'Male',
    'Springfield',
    '14 Maple Street',
    'Married',
    'Active',
    '2026-01-15',
    '',
  ];
  const csv = [IMPORT_TEMPLATE_HEADERS.join(','), sample.join(',')].join('\n');
  downloadBlob('member-import-template.csv', csv);
};

export default function MembersPage() {
  const { toast, message } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [memberModal, setMemberModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [importModal, setImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<{ ok: number; invalid: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const [exportModal, setExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState<string[]>(DEFAULT_EXPORT_COLUMNS);
  const [exportPreview, setExportPreview] = useState<{ total: number; rows: Array<Record<string, string>> } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [familyModal, setFamilyModal] = useState(false);
  const [familyForm, setFamilyForm] = useState({ name: '', address: '' });

  const load = useCallback(
    (q: string, s: string, p: number) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (q) params.set('search', q);
      if (s) params.set('status', s);
      api<{ items: Member[]; total: number }>(`/members?${params}`)
        .then((d) => {
          setMembers(d.items);
          setTotal(d.total);
        })
        .catch(() => {
          setMembers([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    },
    [limit],
  );

  const loadFamilies = useCallback(() => {
    api<Family[]>('/members/families')
      .then(setFamilies)
      .catch(() => setFamilies([]));
  }, []);

  const loadDepartments = useCallback(() => {
    api<{ items: Department[] } | Department[]>('/departments')
      .then((res) => setDepartments(Array.isArray(res) ? res : res.items ?? []))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, status, page), 300);
    return () => clearTimeout(t);
  }, [load, search, status, page]);

  useEffect(() => {
    loadFamilies();
    loadDepartments();
  }, [loadFamilies, loadDepartments]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMemberModal(true);
  };

  const openEdit = (m: Member) => {
    setEditingId(m.id);
    setForm({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email ?? '',
      phone: m.phone ?? '',
      gender: m.gender ?? 'MALE',
      dateOfBirth: toDateInput(m.dateOfBirth),
      address: m.address ?? '',
      city: m.city ?? '',
      maritalStatus: m.maritalStatus ?? '',
      occupation: m.occupation ?? '',
      motherName: m.motherName ?? '',
      fatherName: m.fatherName ?? '',
      churchBranch: m.churchBranch ?? '',
      membershipStatus: m.membershipStatus ?? 'ACTIVE',
      joinDate: toDateInput(m.joinDate),
      familyId: m.familyId ?? '',
      photoUrl: m.photoUrl ?? '',
      departmentIds: m.departmentLinks.length ? [m.departmentLinks[0].department.id] : [],
      notes: m.notes ?? '',
    });
    setMemberModal(true);
  };

  const submitMember = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast('First and last name are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        gender: form.gender,
        dateOfBirth: isoDate(form.dateOfBirth),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        maritalStatus: form.maritalStatus.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        motherName: form.motherName.trim() || undefined,
        fatherName: form.fatherName.trim() || undefined,
        churchBranch: form.churchBranch.trim() || undefined,
        membershipStatus: form.membershipStatus,
        joinDate: isoDate(form.joinDate),
        familyId: form.familyId || undefined,
        photoUrl: form.photoUrl || undefined,
        departmentIds: form.departmentIds,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        await api(`/members/${editingId}`, { method: 'PATCH', body: payload });
      } else {
        await api('/members', { method: 'POST', body: payload });
      }
      toast(editingId ? 'Member updated' : 'Member added');
      setMemberModal(false);
      load(search, status, editingId ? page : 1);
      if (!editingId) setPage(1);
      loadFamilies();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const clearAllMembers = async () => {
    if (!confirm('Are you sure you want to DELETE ALL MEMBERS? This action cannot be undone.')) return;
    if (!confirm('This will permanently remove every member from the system. Type OK to confirm.')) return;
    try {
      const res = await api<{ deleted: number }>('/members/clear', { method: 'POST' });
      toast(`Cleared ${res.deleted} members`);
      load('', '', 1);
      setSearch('');
      setStatus('');
      setPage(1);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to clear members');
    }
  };

  const handleDelete = async (m: Member) => {
    if (!confirm(`Delete ${m.firstName} ${m.lastName}? This cannot be undone.`)) return;
    try {
      await api(`/members/${m.id}`, { method: 'DELETE' });
      toast('Member deleted');
      load(search, status, page);
      loadFamilies();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete member');
    }
  };

  const handleArchive = async (m: Member) => {
    if (!confirm(`Archive ${m.firstName} ${m.lastName}? Their status will change to Inactive.`)) return;
    try {
      await api(`/members/${m.id}`, { method: 'PATCH', body: { membershipStatus: 'INACTIVE' } });
      toast('Member archived');
      load(search, status, page);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to archive member');
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setImportText(text);
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setImportPreview({ ok: 0, invalid: 1 });
        return;
      }
      const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
      const norm: Record<string, string> = {
        firstname: 'firstName',
        'lastname': 'lastName',
        email: 'email',
        phone: 'phone',
        gender: 'gender',
        city: 'city',
        address: 'address',
        residence: 'address',
        maritalstatus: 'maritalStatus',
        membershiptype: 'membershipStatus',
        membershipstatus: 'membershipStatus',
        joindate: 'joinDate',
        memberid: 'memberId',
      };
      const mapTo = (h: string) => norm[h] ?? h;
      let ok = 0;
      let invalid = 0;
      for (const raw of rows.slice(1)) {
        const rec: Record<string, string> = {};
        header.forEach((h, i) => {
          if (h) rec[mapTo(h)] = (raw[i] ?? '').trim();
        });
        if (rec.firstName && rec.lastName) ok++;
        else invalid++;
      }
      setImportPreview({ ok, invalid });
    };
    reader.readAsText(file);
  };

  const submitImport = async () => {
    const rows = parseCsv(importText);
    if (rows.length < 2) {
      toast('No data rows found');
      return;
    }
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
    const norm: Record<string, string> = {
      firstname: 'firstName',
      'lastname': 'lastName',
      email: 'email',
      phone: 'phone',
      gender: 'gender',
      city: 'city',
      address: 'address',
      residence: 'address',
      maritalstatus: 'maritalStatus',
      membershiptype: 'membershipStatus',
      membershipstatus: 'membershipStatus',
      joindate: 'joinDate',
      memberid: 'memberId',
    };
    const mapTo = (h: string) => norm[h] ?? h;
    const membersPayload: Array<Record<string, unknown>> = [];
    for (const raw of rows.slice(1)) {
      const rec: Record<string, string> = {};
      header.forEach((h, i) => {
        if (h) rec[mapTo(h)] = (raw[i] ?? '').trim();
      });
      if (!rec.firstName || !rec.lastName) continue;
      membersPayload.push({
        firstName: rec.firstName,
        lastName: rec.lastName,
        email: rec.email || undefined,
        phone: rec.phone || undefined,
        gender: (rec.gender || 'MALE').toUpperCase(),
        city: rec.city || undefined,
        address: rec.address || undefined,
        maritalStatus: rec.maritalStatus || undefined,
        membershipStatus: (rec.membershipStatus || 'ACTIVE').toUpperCase(),
        joinDate: rec.joinDate || undefined,
        memberId: rec.memberId || undefined,
      });
    }
    if (membersPayload.length === 0) {
      toast('No valid rows found');
      return;
    }
    setImporting(true);
    try {
      const res = await api<{ created: number; skipped: number }>('/members/import', {
        method: 'POST',
        body: { members: membersPayload },
      });
      toast(`${res.created} imported, ${res.skipped} skipped`);
      setImportModal(false);
      setImportText('');
      setImportPreview(null);
      load(search, status, 1);
      setPage(1);
      loadFamilies();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const openPrintReport = () => {
    const esc = (s: string | null | undefined) =>
      (s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      toast('Pop-up blocked. Allow pop-ups to print the report.');
      return;
    }
    const rows = members
      .map(
        (m) => `<tr>
          <td>${esc(m.memberId)}</td>
          <td>${esc(m.firstName + ' ' + m.lastName)}</td>
          <td>${esc(m.email)}</td>
          <td>${esc(m.phone)}</td>
          <td>${esc(m.departmentLinks.map((l) => l.department.name).join(', ') || '')}</td>
          <td>${esc(m.membershipStatus)}</td>
        </tr>`,
      )
      .join('');
    win.document.write(`<!doctype html><html><head><title>Member Directory</title><style>
      body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#111}
      h1{font-size:20px;margin:0 0 4px} p.meta{color:#555;font-size:12px;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left}
      th{background:#f3f4f6}
      @media print{ button{display:none} }
    </style></head><body>
      <h1>Member Directory</h1>
      <p class="meta">${new Date().toLocaleDateString()} &middot; ${members.length} of ${total} members shown</p>
      <table><thead><tr><th>Member ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Ministry</th><th>Status</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No members.</td></tr>'}</tbody></table>
      <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
    </body></html>`);
    win.document.close();
  };

  const openExport = () => {
    setExportModal(true);
    setExportColumns(DEFAULT_EXPORT_COLUMNS);
    setExportPreview(null);
    setExportLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api<{ total: number; rows: Array<Record<string, string>> }>(`/members/export/preview?${params}`)
      .then((d) => setExportPreview(d))
      .catch(() => setExportPreview({ total: 0, rows: [] }))
      .finally(() => setExportLoading(false));
  };

  const toggleExportColumn = (key: string) => {
    setExportColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('columns', exportColumns.join(','));
    download(`/members/export/csv?${params}`, 'members.csv');
    const count = exportPreview?.total ?? 0;
    toast(`Exporting ${count} member${count === 1 ? '' : 's'} to CSV`);
    setExportModal(false);
  };

  const submitFamily = async () => {
    if (!familyForm.name.trim()) {
      toast('Church Group name is required');
      return;
    }
    try {
      await api('/members/families', {
        method: 'POST',
        body: { name: familyForm.name.trim(), address: familyForm.address.trim() || undefined },
      });
      toast('Church Group created');
      setFamilyModal(false);
      setFamilyForm({ name: '', address: '' });
      loadFamilies();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create church group');
    }
  };

  const deleteFamily = async (id: string, name: string) => {
    if (!confirm(`Delete church group "${name}"? Members in this church group will be unlinked but not deleted.`)) return;
    try {
      await api(`/members/families/${id}`, { method: 'DELETE' });
      toast('Church Group deleted');
      loadFamilies();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete church group');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle="Manage church members, church groups and membership records"
        action={
          <div className="flex items-center gap-2">
            <Button variant="danger" onClick={clearAllMembers}>
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add member
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search by name, member ID, phone or ministry..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0] + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={openPrintReport}>
            <Printer className="h-4 w-4" />
            Print report
          </Button>
          <Button variant="outline" onClick={() => download(`/members/export/qr?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`, 'member-qr-cards.pdf')}>
            <QrCode className="h-4 w-4" />
            QR cards
          </Button>
          <Button variant="outline" onClick={() => download('/members/export/pdf', 'members.pdf')}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={openExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setImportModal(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="All members" subtitle={`${total} total`} />
        <CardBody className="p-0">
          {loading ? (
            <Spinner />
          ) : members.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No members found"
              subtitle="Add your first member or adjust your search filters."
            />
          ) : (
            <Table headers={['Member', 'Member ID', 'Phone', 'Ministry', 'Status', 'Actions']}>
              {members.map((m) => (
                <tr key={m.id}>
                  <Td>
                    <Link href={`/members/${m.id}`} className="group flex items-center gap-3">
                      <Avatar name={`${m.firstName} ${m.lastName}`} src={m.photoUrl} />
                      <span className="font-medium text-brand-600 group-hover:underline">
                        {m.firstName} {m.lastName}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    {m.memberId ? (
                      <span className="font-mono text-xs text-slate-600">{m.memberId}</span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>{m.phone ?? '—'}</Td>
                  <Td>
                    {m.departmentLinks.length === 0 ? (
                      '—'
                    ) : (
                      <div className="flex max-w-[180px] flex-wrap gap-1">
                        {m.departmentLinks.map((l, i) => (
                          <Badge key={i} color="indigo">
                            {l.department.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <Badge color={statusColor(m.membershipStatus)}>{m.membershipStatus ?? 'Unknown'}</Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/members/${m.id}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {m.membershipStatus !== 'INACTIVE' && (
                        <button
                          onClick={() => handleArchive(m)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(m)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
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
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {start}–{end} of {total} members
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Home className="h-5 w-5 text-brand-500" />
              Church Groups
            </h2>
            <p className="text-sm text-slate-500">{families.length} registered church groups</p>
          </div>
          <Button variant="secondary" onClick={() => setFamilyModal(true)}>
            <Plus className="h-4 w-4" />
            New church group
          </Button>
        </div>
        {families.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState title="No church groups yet" subtitle="Create a church group to group related members together." />
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((f) => (
              <Card key={f.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{f.name}</h3>
                    {f.address && <p className="mt-0.5 text-xs text-slate-500">{f.address}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="indigo">{f.members.length} member{f.members.length === 1 ? '' : 's'}</Badge>
                    <button
                      onClick={() => deleteFamily(f.id, f.name)}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Delete church group"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {f.head && (
                  <p className="mt-3 text-xs text-slate-500">
                    Head: <span className="font-medium text-slate-700">{f.head.firstName} {f.head.lastName}</span>
                  </p>
                )}
                {f.members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.members.map((mm) => (
                      <Link
                        key={mm.id}
                        href={`/members/${mm.id}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {mm.firstName} {mm.lastName}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={memberModal} onClose={() => setMemberModal(false)} title={editingId ? 'Edit member' : 'Add member'} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <MemberPhotoPicker value={form.photoUrl || null} onChange={(v) => setForm({ ...form, photoUrl: v ?? '' })} />
          </div>
          <Input
            label="First name"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <Input
            label="Last name"
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g[0] + g.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <Input
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
          <Input
            label="Residence / address"
            placeholder="e.g. 14 Maple Street"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input
            label="Marital status"
            placeholder="e.g. SINGLE, MARRIED"
            value={form.maritalStatus}
            onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
          />
          <Input
            label="Occupation"
            placeholder="e.g. Engineer"
            value={form.occupation}
            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
          />
          <Input
            label="Mother's name"
            placeholder="e.g. Jane Doe"
            value={form.motherName}
            onChange={(e) => setForm({ ...form, motherName: e.target.value })}
          />
          <Input
            label="Father's name"
            placeholder="e.g. John Doe"
            value={form.fatherName}
            onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
          />
          <Input
            label="Church branch"
            placeholder="e.g. Main Campus"
            value={form.churchBranch}
            onChange={(e) => setForm({ ...form, churchBranch: e.target.value })}
          />
          <Select
            label="Membership status"
            value={form.membershipStatus}
            onChange={(e) => setForm({ ...form, membershipStatus: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <Input
            label="Join date"
            type="date"
            value={form.joinDate}
            onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
          />
          <Select
            label="Church Group"
            value={form.familyId}
            onChange={(e) => setForm({ ...form, familyId: e.target.value })}
          >
            <option value="">No church group</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select
            label="Ministry"
            value={form.departmentIds[0] ?? ''}
            onChange={(e) => setForm({ ...form, departmentIds: e.target.value ? [e.target.value] : [] })}
          >
            <option value="">No ministry</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setMemberModal(false)}>
            Cancel
          </Button>
          <Button onClick={submitMember} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add member'}
          </Button>
        </div>
      </Modal>

      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import members" wide>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Every row is checked before anything is saved. If a row is missing a first or last name, it is skipped and
            reported below. Each phone number is used as that member&apos;s portal login credential.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadImportTemplate}>
              <Download className="h-4 w-4" />
              Download template
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Choose CSV file
              <input
                type="file"
                accept=".csv,.txt,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {importText && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Preview of the first rows</p>
              <pre className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                {importText.split('\n').slice(0, 5).join('\n')}
              </pre>
            </div>
          )}

          {importPreview && (
            <div className="flex items-center gap-3 text-sm">
              <Badge color="green">{importPreview.ok} valid rows</Badge>
              {importPreview.invalid > 0 && <Badge color="red">{importPreview.invalid} rows missing a name</Badge>}
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setImportModal(false)}>
            Cancel
          </Button>
          <Button onClick={submitImport} disabled={importing || !importText}>
            {importing ? 'Importing...' : 'Validate and import members'}
          </Button>
        </div>
      </Modal>

      <Modal open={exportModal} onClose={() => setExportModal(false)} title="Export members" wide>
        <div className="space-y-5">
          <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
            <p className="font-medium">Scope</p>
            <p className="mt-0.5 text-brand-800/80">
              {search || status ? (
                <>
                  Exporting members matching{' '}
                  {search && (
                    <span className="font-medium">&ldquo;{search}&rdquo;</span>
                  )}
                  {search && status && ' and '}
                  {status && (
                    <span className="font-medium">{status[0] + status.slice(1).toLowerCase()} status</span>
                  )}{' '}
                </>
              ) : (
                'Exporting all members in your church. '
              )}
              <span className="font-semibold">
                {exportLoading ? 'Counting…' : `${exportPreview?.total ?? 0} member${(exportPreview?.total ?? 0) === 1 ? '' : 's'}`}
              </span>{' '}
              will be exported.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Columns</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">{exportColumns.length} of {EXPORT_COLUMNS.length} selected</span>
                <button
                  onClick={() => setExportColumns(EXPORT_COLUMNS.map((c) => c.key))}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  Select all
                </button>
                <button
                  onClick={() => setExportColumns([])}
                  className="font-medium text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              {EXPORT_COLUMNS.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={exportColumns.includes(c.key)}
                    onChange={() => toggleExportColumn(c.key)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Preview</p>
            {exportLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-slate-200 py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : exportPreview && exportPreview.rows.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {EXPORT_COLUMNS.filter((c) => exportColumns.includes(c.key)).map((c) => (
                        <th key={c.key} className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exportPreview.rows.map((r, i) => (
                      <tr key={i}>
                        {EXPORT_COLUMNS.filter((c) => exportColumns.includes(c.key)).map((c) => (
                          <td key={c.key} className="whitespace-nowrap px-3 py-2 text-slate-600">
                            {r[c.key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                {exportPreview ? 'No members match the current scope.' : 'Unable to load a preview.'}
              </p>
            )}
            {exportPreview && exportPreview.total > exportPreview.rows.length && (
              <p className="mt-1.5 text-xs text-slate-500">
                Showing the first {exportPreview.rows.length} of {exportPreview.total} members.
              </p>
            )}
            {exportColumns.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">Select at least one column to export.</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setExportModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleExportCsv} disabled={exportLoading || exportColumns.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </Modal>

      <Modal open={familyModal} onClose={() => setFamilyModal(false)} title="New church group">
        <div className="space-y-4">
          <Input
            label="Church Group name"
            required
            value={familyForm.name}
            onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
          />
          <Input
            label="Address"
            value={familyForm.address}
            onChange={(e) => setFamilyForm({ ...familyForm, address: e.target.value })}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setFamilyModal(false)}>
            Cancel
          </Button>
          <Button onClick={submitFamily}>Create church group</Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
