'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Clock4, Search, Sparkles } from 'lucide-react';
import { portalApi, formatDate } from '@/lib/portal';
import { Card, CardBody, Spinner, EmptyState, cn } from '@/components/ui';

interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string | null;
  department: { id: string; name: string } | null;
}

export default function PortalAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    portalApi<Announcement[]>('/portal/announcements', { signal: controller.signal })
      .then(setItems)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load announcements');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = items.filter(
    (a) =>
      !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      (a.department?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="mt-0.5 text-sm text-slate-500">News and updates from your church</p>
        </div>
        <span className="text-sm text-slate-500">
          {items.length} announcement{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search */}
      {items.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner />
          <p className="mt-4 text-sm text-slate-500">Loading announcements...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Megaphone className="h-12 w-12" />}
              title={search ? 'No matching announcements' : 'No announcements yet'}
              subtitle={search ? 'Try adjusting your search terms.' : 'Check back soon for news from your church.'}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((a, i) => {
            const isNew = i === 0 && !search;
            return (
              <div
                key={a.id}
                className={cn(
                  'group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md',
                  isNew ? 'border-brand-200 ring-1 ring-brand-100' : 'border-slate-200 hover:border-slate-300',
                )}
              >
                {/* Top accent bar */}
                <div className={cn('h-1', isNew ? 'bg-gradient-to-r from-brand-500 to-indigo-500' : 'bg-slate-100')} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isNew && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                            <Sparkles className="h-2.5 w-2.5" /> NEW
                          </span>
                        )}
                        <h3 className="text-base font-semibold text-slate-800">{a.title}</h3>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {a.publishedAt && (
                          <span className="inline-flex items-center gap-1">
                            <Clock4 className="h-3 w-3" />
                            {formatDate(a.publishedAt)}
                          </span>
                        )}
                        {a.department && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {a.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50/80 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
