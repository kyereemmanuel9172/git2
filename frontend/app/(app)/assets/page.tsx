'use client';

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Plus,
  Search,
  Wrench,
  Trash2,
  Pencil,
  Boxes,
  Truck,
  Cog,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  DollarSign,
} from 'lucide-react';
import { api, formatMoney, formatDate, titleCase } from '@/lib/api';
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  Textarea,
  Badge,
  Modal,
  Spinner,
  EmptyState,
  PageHeader,
  Toast,
  useToast,
  StatCard,
  cn,
} from '@/components/ui';

interface MaintenanceRecord {
  id: string;
  date: string;
  description: string;
  cost?: number | null;
  performedBy?: string | null;
  nextDueDate?: string | null;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  serialNumber?: string | null;
  condition?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  location?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  maintenance: MaintenanceRecord[];
}

interface AssetStats {
  total: number;
  totalValue: number;
  averageValue: number;
  byType: Array<{ type: string; count: number }>;
  byCondition: Array<{ condition: string; count: number }>;
}

interface AssetForm {
  name: string;
  type: string;
  serialNumber: string;
  condition: string;
  purchaseDate: string;
  purchasePrice: string;
  location: string;
  assignedTo: string;
  notes: string;
}

interface MaintenanceForm {
  description: string;
  date: string;
  cost: string;
  performedBy: string;
  nextDueDate: string;
}

const ASSET_TYPES = ['EQUIPMENT', 'VEHICLE', 'BUILDING', 'FURNITURE', 'OTHER'];
const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'REPAIR_NEEDED'];
const PAGE_SIZE = 12;

const conditionColors: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'purple'> = {
  EXCELLENT: 'green',
  GOOD: 'blue',
  FAIR: 'amber',
  POOR: 'red',
  REPAIR_NEEDED: 'purple',
};

const typeIcon: Record<string, typeof Boxes> = {
  EQUIPMENT: Cog,
  VEHICLE: Truck,
  BUILDING: Boxes,
  FURNITURE: Boxes,
  OTHER: Boxes,
};

const emptyAssetForm: AssetForm = {
  name: '',
  type: 'EQUIPMENT',
  serialNumber: '',
  condition: 'GOOD',
  purchaseDate: '',
  purchasePrice: '',
  location: '',
  assignedTo: '',
  notes: '',
};

const emptyMaintenanceForm: MaintenanceForm = {
  description: '',
  date: '',
  cost: '',
  performedBy: '',
  nextDueDate: '',
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AssetsPage() {
  const { toast, message } = useToast();
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [stats, setStats] = useState<AssetStats | null>(null);

  const [assetModal, setAssetModal] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>(emptyAssetForm);
  const [saving, setSaving] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [addMaintenanceOpen, setAddMaintenanceOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>(emptyMaintenanceForm);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (conditionFilter) params.set('condition', conditionFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      const res = await api<{ items: Asset[]; total: number }>(`/assets?${params.toString()}`);
      setItems(res.items);
      setTotal(res.total);
      return res.items;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, conditionFilter, sortBy, sortOrder]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api<AssetStats>('/assets/stats');
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const doSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const setAssetField =
    (key: keyof AssetForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setAssetForm((f) => ({ ...f, [key]: e.target.value }));

  const setMaintenanceField =
    (key: keyof MaintenanceForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setMaintenanceForm((f) => ({ ...f, [key]: e.target.value }));

  const openAdd = () => {
    setEditing(null);
    setAssetForm(emptyAssetForm);
    setAssetModal(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setAssetForm({
      name: asset.name,
      type: asset.type,
      serialNumber: asset.serialNumber ?? '',
      condition: asset.condition ?? 'GOOD',
      purchaseDate: toDateInput(asset.purchaseDate),
      purchasePrice: asset.purchasePrice != null ? String(asset.purchasePrice) : '',
      location: asset.location ?? '',
      assignedTo: asset.assignedTo ?? '',
      notes: asset.notes ?? '',
    });
    setAssetModal(true);
  };

  const submitAsset = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: assetForm.name,
        type: assetForm.type,
        serialNumber: assetForm.serialNumber || undefined,
        condition: assetForm.condition,
        purchaseDate: assetForm.purchaseDate ? new Date(assetForm.purchaseDate).toISOString() : undefined,
        purchasePrice: assetForm.purchasePrice !== '' ? Number(assetForm.purchasePrice) : undefined,
        location: assetForm.location || undefined,
        assignedTo: assetForm.assignedTo || undefined,
        notes: assetForm.notes || undefined,
      };
      if (editing) {
        await api(`/assets/${editing.id}`, { method: 'PATCH', body });
        toast('Asset updated');
      } else {
        await api('/assets', { method: 'POST', body });
        toast('Asset added');
      }
      setAssetModal(false);
      setEditing(null);
      setAssetForm(emptyAssetForm);
      await load();
      loadStats();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/assets/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Asset deleted');
      setDeleteTarget(null);
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
      loadStats();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const submitMaintenance = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setSaving(true);
    try {
      await api(`/assets/${selectedAsset.id}/maintenance`, {
        method: 'POST',
        body: {
          description: maintenanceForm.description,
          date: maintenanceForm.date ? new Date(maintenanceForm.date).toISOString() : undefined,
          cost: maintenanceForm.cost !== '' ? Number(maintenanceForm.cost) : undefined,
          performedBy: maintenanceForm.performedBy || undefined,
          nextDueDate: maintenanceForm.nextDueDate ? new Date(maintenanceForm.nextDueDate).toISOString() : undefined,
        },
      });
      await load();
      setAddMaintenanceOpen(false);
      setMaintenanceForm(emptyMaintenanceForm);
      toast('Maintenance record added');
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMaintenance = async (record: MaintenanceRecord) => {
    if (!window.confirm('Delete this maintenance record?')) return;
    try {
      await api(`/assets/maintenance/${record.id}`, { method: 'DELETE' });
      await load();
      toast('Maintenance record deleted');
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const latestMaintenance = (asset: Asset) =>
    asset.maintenance.length ? [...asset.maintenance].sort((a, b) => (a.date > b.date ? -1 : 1))[0] : null;

  const needsRepair = stats?.byCondition.find((c) => c.condition === 'REPAIR_NEEDED')?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        subtitle="Manage church equipment, vehicles and facilities"
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add asset
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total assets"
            value={stats.total}
            icon={<Boxes className="h-5 w-5" />}
            tone="indigo"
          />
          <StatCard
            label="Total value"
            value={formatMoney(stats.totalValue)}
            icon={<DollarSign className="h-5 w-5" />}
            tone="emerald"
            hint={`Avg ${formatMoney(stats.averageValue)}`}
          />
          <StatCard
            label="Vehicles"
            value={stats.byType.find((t) => t.type === 'VEHICLE')?.count ?? 0}
            icon={<Truck className="h-5 w-5" />}
            tone="sky"
          />
          <StatCard
            label="Needs repair"
            value={needsRepair}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone={needsRepair > 0 ? 'rose' : 'emerald'}
          />
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets by name, serial, location…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="sm:w-40">
            <option value="">All types</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{titleCase(t)}</option>
            ))}
          </Select>
          <Select value={conditionFilter} onChange={(e) => { setConditionFilter(e.target.value); setPage(1); }} className="sm:w-40">
            <option value="">All conditions</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{titleCase(c.replace('_', ' '))}</option>
            ))}
          </Select>
          <Button variant="outline" onClick={doSearch}>
            <Search className="h-4 w-4" />
            Search
          </Button>
        </CardBody>
      </Card>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<Boxes className="h-8 w-8" />} title="No assets found" subtitle="Add your first asset to get started." />
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{total} asset{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Sort:</span>
              {[
                { key: 'createdAt', label: 'Date' },
                { key: 'name', label: 'Name' },
                { key: 'purchasePrice', label: 'Value' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => toggleSort(s.key)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors',
                    sortBy === s.key ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-100 text-slate-600',
                  )}
                >
                  {s.label}
                  {sortBy === s.key && (
                    <ArrowUpDown className="h-3 w-3" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((asset) => {
              const latest = latestMaintenance(asset);
              const Icon = typeIcon[asset.type] ?? Boxes;
              return (
                <Card key={asset.id} className="flex flex-col">
                  <CardBody className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </span>
                        <h3 className="font-semibold text-slate-900">{asset.name}</h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => openEdit(asset)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(asset)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{titleCase(asset.type)}</Badge>
                      {asset.condition && (
                        <Badge color={conditionColors[asset.condition] ?? 'slate'}>
                          {titleCase(asset.condition.replace('_', ' '))}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      {asset.serialNumber && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Serial</span>
                          <span className="truncate text-slate-700">{asset.serialNumber}</span>
                        </div>
                      )}
                      {asset.location && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Location</span>
                          <span className="truncate text-slate-700">{asset.location}</span>
                        </div>
                      )}
                      {asset.purchaseDate && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Purchased</span>
                          <span className="truncate text-slate-700">{formatDate(asset.purchaseDate)}</span>
                        </div>
                      )}
                      {asset.purchasePrice != null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Value</span>
                          <span className="font-semibold text-slate-800">{formatMoney(asset.purchasePrice)}</span>
                        </div>
                      )}
                      {asset.assignedTo && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Assigned to</span>
                          <span className="truncate text-slate-700">{asset.assignedTo}</span>
                        </div>
                      )}
                    </div>
                    {latest && (
                      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Latest maintenance:</span> {latest.description}
                      </p>
                    )}
                    <div className="mt-4 flex-1" />
                    <Button variant="outline" size="sm" onClick={() => setSelectedAsset(asset)}>
                      <Wrench className="h-3.5 w-3.5" />
                      Maintenance ({asset.maintenance.length})
                    </Button>
                  </CardBody>
                </Card>
              );
            })}
          </div>

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
        </>
      )}

      <Modal open={assetModal} onClose={() => setAssetModal(false)} title={editing ? 'Edit asset' : 'Add asset'}>
        <form onSubmit={submitAsset} className="space-y-4">
          <Input label="Name" required value={assetForm.name} onChange={setAssetField('name')} placeholder="e.g. Toyota HiAce" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={assetForm.type} onChange={setAssetField('type')}>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{titleCase(t)}</option>
              ))}
            </Select>
            <Select label="Condition" value={assetForm.condition} onChange={setAssetField('condition')}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{titleCase(c.replace('_', ' '))}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Serial number" value={assetForm.serialNumber} onChange={setAssetField('serialNumber')} />
            <Input label="Purchase price" type="number" step="0.01" min="0" value={assetForm.purchasePrice} onChange={setAssetField('purchasePrice')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Purchase date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={assetForm.purchaseDate}
                onChange={setAssetField('purchaseDate')}
              />
            </div>
            <Input label="Assigned to" value={assetForm.assignedTo} onChange={setAssetField('assignedTo')} />
          </div>
          <Input label="Location" value={assetForm.location} onChange={setAssetField('location')} />
          <Textarea label="Notes" rows={3} value={assetForm.notes} onChange={setAssetField('notes')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAssetModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !assetForm.name}>
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Add asset'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={selectedAsset?.name ? `${selectedAsset.name} · Maintenance` : 'Maintenance'} wide>
        {selectedAsset && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddMaintenanceOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add maintenance
              </Button>
            </div>
            {selectedAsset.maintenance.length === 0 ? (
              <EmptyState icon={<Wrench className="h-8 w-8" />} title="No maintenance records" />
            ) : (
              <div className="space-y-3">
                {selectedAsset.maintenance.map((m) => (
                  <div key={m.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.description}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(m.date)}
                          {m.performedBy ? ` · by ${m.performedBy}` : ''}
                          {m.cost != null ? ` · ${formatMoney(m.cost)}` : ''}
                        </p>
                        {m.nextDueDate && <p className="mt-0.5 text-xs text-slate-500">Next due: {formatDate(m.nextDueDate)}</p>}
                      </div>
                      <button
                        onClick={() => deleteMaintenance(m)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={addMaintenanceOpen} onClose={() => setAddMaintenanceOpen(false)} title="Add maintenance record">
        <form onSubmit={submitMaintenance} className="space-y-4">
          <Textarea label="Description" rows={3} required value={maintenanceForm.description} onChange={setMaintenanceField('description')} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={maintenanceForm.date}
                onChange={setMaintenanceField('date')}
              />
            </div>
            <Input label="Cost" type="number" step="0.01" min="0" value={maintenanceForm.cost} onChange={setMaintenanceField('cost')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Performed by" value={maintenanceForm.performedBy} onChange={setMaintenanceField('performedBy')} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Next due date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={maintenanceForm.nextDueDate}
                onChange={setMaintenanceField('nextDueDate')}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddMaintenanceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !maintenanceForm.description}>
              {saving ? 'Saving...' : 'Add record'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete asset">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete asset'}
          </Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
