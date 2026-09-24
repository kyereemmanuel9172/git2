'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  Mic,
  Send,
  Archive,
  Clock,
  Search,
  Grid3X3,
  List,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
} from 'lucide-react';
import { api, formatDate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApiQuery } from '@/lib/hooks';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Textarea,
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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SkeletonCard } from '@/components/Skeleton';

interface Episode {
  id: string;
  title: string;
  slug: string;
  speaker?: string | null;
  series?: string | null;
  episodeNumber?: number | null;
  publishDate?: string | null;
  durationMinutes?: number | null;
  audioUrl?: string | null;
  artworkUrl?: string | null;
  status: string;
  description?: string | null;
  tags: string[];
}

interface PodcastsResponse {
  items: Episode[];
  total: number;
  published: number;
  drafts: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SeriesItem {
  name: string;
  count: number;
}

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'slate'> = {
  PUBLISHED: 'green',
  DRAFT: 'amber',
  ARCHIVED: 'slate',
};

const SORT_OPTIONS = [
  { value: 'publishDate', label: 'Publish Date' },
  { value: 'createdAt', label: 'Date Created' },
  { value: 'title', label: 'Title' },
  { value: 'durationMinutes', label: 'Duration' },
];

const EMPTY_FORM = {
  title: '',
  speaker: '',
  series: '',
  episodeNumber: '',
  publishDate: '',
  durationMinutes: '',
  audioUrl: '',
  artworkUrl: '',
  description: '',
  tags: '',
};

function toDateInput(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function minutesLabel(mins: number | null | undefined) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function AudioPlayer({ url, title: _title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => (typeof Audio !== 'undefined' ? new Audio(url) : null));

  useEffect(() => {
    if (!audio) return;
    audio.addEventListener('ended', () => setPlaying(false));
    return () => {
      audio.pause();
      audio.removeEventListener('ended', () => setPlaying(false));
    };
  }, [audio]);

  const toggle = () => {
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
      title={playing ? 'Pause' : 'Play'}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      {playing ? 'Pause' : 'Play'}
    </button>
  );
}

export default function PodcastsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast, message } = useToast();
  const readOnly = user?.role === 'DEPARTMENT_LEADER';

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [seriesFilter, setSeriesFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('publishDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams();
  if (page > 1) queryParams.set('page', String(page));
  if (statusFilter) queryParams.set('status', statusFilter);
  if (seriesFilter) queryParams.set('series', seriesFilter);
  if (search) queryParams.set('search', search);
  if (sortBy) queryParams.set('sortBy', sortBy);
  if (sortOrder) queryParams.set('sortOrder', sortOrder);

  const { data, isLoading, refetch } = useApiQuery<PodcastsResponse>(
    ['podcasts', 'list', statusFilter, seriesFilter, search, sortBy, sortOrder, String(page)],
    `/podcasts?${queryParams.toString()}`,
  );

  const { data: series = [] } = useApiQuery<SeriesItem[]>(
    ['podcasts', 'series'],
    '/podcasts/series',
  );

  const [recordOpen, setRecordOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Episode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Episode | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const openEdit = (e: Episode) => {
    setEditTarget(e);
    setForm({
      title: e.title,
      speaker: e.speaker ?? '',
      series: e.series ?? '',
      episodeNumber: e.episodeNumber != null ? String(e.episodeNumber) : '',
      publishDate: toDateInput(e.publishDate ?? ''),
      durationMinutes: e.durationMinutes != null ? String(e.durationMinutes) : '',
      audioUrl: e.audioUrl ?? '',
      artworkUrl: e.artworkUrl ?? '',
      description: e.description ?? '',
      tags: e.tags?.join(', ') ?? '',
    });
  };

  const payload = () => ({
    title: form.title.trim(),
    speaker: form.speaker || undefined,
    series: form.series || undefined,
    episodeNumber: form.episodeNumber ? Number(form.episodeNumber) : undefined,
    publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : undefined,
    durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
    audioUrl: form.audioUrl || undefined,
    artworkUrl: form.artworkUrl || undefined,
    description: form.description || undefined,
    tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  });

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast('Please enter an episode title');
      return;
    }
    setSaving(true);
    try {
      await api('/podcasts', { method: 'POST', body: payload() });
      toast('Episode created');
      setRecordOpen(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch {
      toast('Failed to create episode');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api(`/podcasts/${editTarget.id}`, { method: 'PATCH', body: payload() });
      toast('Episode updated');
      setEditTarget(null);
      refetch();
    } catch {
      toast('Failed to update episode');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/podcasts/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Episode deleted');
      setDeleteTarget(null);
      refetch();
    } catch {
      toast('Failed to delete episode');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (e: Episode) => {
    setSaving(true);
    try {
      await api(`/podcasts/${e.id}/publish`, { method: 'POST' });
      toast('Episode published');
      refetch();
    } catch {
      toast('Failed to publish episode');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (e: Episode) => {
    setSaving(true);
    try {
      await api(`/podcasts/${e.id}/archive`, { method: 'POST' });
      toast('Episode archived');
      refetch();
    } catch {
      toast('Failed to archive episode');
    } finally {
      setSaving(false);
    }
  };

  const episodeModal = (
    <>
      <Input
        label="Episode title"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="e.g. The Power of Prayer"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Speaker" value={form.speaker} onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))} placeholder="Pastor John" />
        <Input label="Series" value={form.series} onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))} placeholder="Faith Foundations" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Episode #"
          type="number"
          min="1"
          value={form.episodeNumber}
          onChange={(e) => setForm((f) => ({ ...f, episodeNumber: e.target.value }))}
          placeholder="1"
        />
        <Input label="Publish date" type="date" value={form.publishDate} onChange={(e) => setForm((f) => ({ ...f, publishDate: e.target.value }))} />
        <Input
          label="Duration (minutes)"
          type="number"
          min="0"
          value={form.durationMinutes}
          onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
          placeholder="45"
        />
      </div>
      <Input
        label="Audio URL"
        value={form.audioUrl}
        onChange={(e) => setForm((f) => ({ ...f, audioUrl: e.target.value }))}
        placeholder="https://…/episode.mp3"
      />
      <div>
        <Input
          label="Artwork URL"
          value={form.artworkUrl}
          onChange={(e) => setForm((f) => ({ ...f, artworkUrl: e.target.value }))}
          placeholder="https://…/artwork.jpg"
        />
        {form.artworkUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={form.artworkUrl}
              alt="Artwork preview"
              className="h-16 w-16 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <p className="text-xs text-slate-500">Preview</p>
          </div>
        )}
      </div>
      <Input
        label="Tags (comma-separated)"
        value={form.tags}
        onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
        placeholder="prayer, faith, youth"
      />
      <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Podcasts"
        subtitle="Sermons, speakers and episode publishing"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200 bg-white">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
            {!readOnly && (
              <Button onClick={() => setRecordOpen(true)}>
                <Plus className="h-4 w-4" />
                New episode
              </Button>
            )}
          </div>
        }
      />

      <ErrorBoundary>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard index={0} tone="indigo" label="Episodes" value={data.total} icon={<Mic className="h-4 w-4" />} hint="Media library" />
            <StatCard index={1} tone="emerald" label="Published" value={data.published} icon={<Send className="h-4 w-4" />} hint="Live episodes" />
            <StatCard index={2} tone="amber" label="Drafts" value={data.drafts} icon={<Clock className="h-4 w-4" />} hint="In progress" />
          </div>
        ) : null}
      </ErrorBoundary>

      <Card>
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search episodes..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-auto"
            >
              <option value="">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </Select>
            <Select
              value={seriesFilter}
              onChange={(e) => { setSeriesFilter(e.target.value); setPage(1); }}
              className="w-auto"
            >
              <option value="">All Series</option>
              {series.map((s) => (
                <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </CardBody>
      </Card>

      <ErrorBoundary>
        <Card>
          <CardHeader title="Episodes" subtitle={data ? `Showing ${data.items.length} of ${data.total} episodes` : ''} />
          <CardBody className="p-0">
            {isLoading ? (
              <Spinner />
            ) : !data || data.items.length === 0 ? (
              <EmptyState icon={<Mic className="h-8 w-8" />} title="No episodes found" subtitle="Try adjusting your filters or create a new episode" />
            ) : viewMode === 'table' ? (
              <Table headers={['Episode', 'Speaker', 'Series', 'Publish date', 'Duration', 'Status', 'Actions']}>
                {data.items.map((e) => (
                  <tr key={e.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/podcasts/${e.id}`)}>
                    <Td className="font-medium text-slate-800">
                      <div className="flex items-center gap-2.5">
                        {e.artworkUrl ? (
                          <img src={e.artworkUrl} alt={e.title} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Mic className="h-5 w-5" />
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="line-clamp-1 font-medium">{e.title}</p>
                            {e.episodeNumber && <span className="text-xs text-slate-400">#{e.episodeNumber}</span>}
                          </div>
                          {e.description && <p className="line-clamp-1 text-xs font-normal text-slate-400">{e.description}</p>}
                          {e.tags?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {e.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{e.speaker || '—'}</Td>
                    <Td className="text-slate-600">{e.series || '—'}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{e.publishDate ? formatDate(e.publishDate) : '—'}</Td>
                    <Td className="whitespace-nowrap text-slate-600">{minutesLabel(e.durationMinutes)}</Td>
                    <Td>
                      <Badge color={STATUS_COLORS[e.status] ?? 'slate'}>{e.status.charAt(0) + e.status.slice(1).toLowerCase()}</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1" onClick={(ev: React.MouseEvent) => ev.stopPropagation()}>
                        {e.audioUrl && <AudioPlayer url={e.audioUrl} title={e.title} />}
                        {e.status === 'DRAFT' && (
                          <Button variant="ghost" size="sm" onClick={() => handlePublish(e)} disabled={readOnly || saving} title="Publish">
                            <Send className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        {e.status === 'PUBLISHED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(e)} disabled={readOnly || saving} title="Archive">
                            <Archive className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)} disabled={readOnly} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(e)} disabled={readOnly} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.items.map((e) => (
                  <div
                    key={e.id}
                    className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-md"
                    onClick={() => router.push(`/podcasts/${e.id}`)}
                  >
                    {e.artworkUrl ? (
                      <img src={e.artworkUrl} alt={e.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
                    ) : (
                      <div className="mb-3 flex h-40 w-full items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100">
                        <Mic className="h-12 w-12 text-brand-300" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge color={STATUS_COLORS[e.status] ?? 'slate'}>{e.status.charAt(0) + e.status.slice(1).toLowerCase()}</Badge>
                          {e.episodeNumber && <span className="text-xs text-slate-400">#{e.episodeNumber}</span>}
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{e.title}</h3>
                        {e.speaker && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <User className="h-3 w-3" /> {e.speaker}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {e.publishDate ? formatDate(e.publishDate) : 'No date'}
                      </span>
                      <span>{minutesLabel(e.durationMinutes)}</span>
                    </div>
                    {e.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {e.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
                      {e.audioUrl && <AudioPlayer url={e.audioUrl} title={e.title} />}
                      {!readOnly && (
                        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(e)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(e)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </ErrorBoundary>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="New podcast episode" wide>
        <div className="space-y-4">
          {episodeModal}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save episode'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit episode" wide>
        <div className="space-y-4">
          {episodeModal}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? 'Saving...' : 'Save episode'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete episode">
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.title}</span>? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
