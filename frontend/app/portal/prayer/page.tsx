'use client';

import { useEffect, useState } from 'react';
import { HandHeart, Send, Sparkles, Stethoscope, CalendarCheck, Globe, Clock4, RefreshCw } from 'lucide-react';
import { portalApi, formatDate, formatDateTime, titleCase } from '@/lib/portal';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Textarea,
  StatCard,
  Badge,
  Spinner,
  EmptyState,
  Toast,
  useToast,
  statusColor,
  cn,
} from '@/components/ui';

interface PrayerRequest {
  id: string;
  subject: string;
  content: string;
  isPublic: boolean;
  status: string;
  prayedForAt: string | null;
  createdAt: string;
}

interface CounselingSession {
  id: string;
  topic: string;
  notes: string | null;
  date: string;
  followUpDate: string | null;
  status: string;
  counselor: { id: string; name: string } | null;
}

interface PrayerData {
  requests: PrayerRequest[];
  sessions: CounselingSession[];
}

export default function PortalPrayer() {
  const { toast, message } = useToast();
  const [data, setData] = useState<PrayerData | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', content: '', isPublic: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    portalApi<PrayerData>('/portal/prayer', { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load prayer requests');
      });
    return () => controller.abort();
  }, []);

  const reload = () => {
    portalApi<PrayerData>('/portal/prayer')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load prayer requests'));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await portalApi('/portal/prayer', { method: 'POST', body: form });
      setForm({ subject: '', content: '', isPublic: true });
      toast('Prayer request submitted');
      const updated = await portalApi<PrayerData>('/portal/prayer');
      setData(updated);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to submit prayer request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : <Spinner />}
      </div>
    );
  }

  const answered = data.requests.filter((r) => r.status === 'PRAYED_FOR' || r.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prayer &amp; counseling</h1>
        <p className="mt-0.5 text-sm text-slate-500">Submit prayer requests and view your counseling sessions</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Prayer requests" value={data.requests.length} icon={<HandHeart className="h-4 w-4" />} tone="amber" index={0} />
        <StatCard label="Answered" value={answered} icon={<Sparkles className="h-4 w-4" />} tone="emerald" index={1} />
        <StatCard label="Counseling sessions" value={data.sessions.length} icon={<Stethoscope className="h-4 w-4" />} tone="sky" index={2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Submit a prayer request" subtitle="Your request is shared with the pastoral team" />
            <CardBody>
              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Subject"
                  required
                  maxLength={120}
                  placeholder="What would you like prayer for?"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <Textarea
                  label="Details"
                  required
                  rows={4}
                  placeholder="Share the details of your request…"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
                <label className="flex items-start gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    Make this a public request
                    <span className="block text-xs text-slate-400">Public requests may be shared with the prayer team.</span>
                  </span>
                </label>
                <Button type="submit" disabled={submitting}>
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting…' : 'Submit request'}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="My prayer requests"
              subtitle={`${data.requests.length} request${data.requests.length === 1 ? '' : 's'} · ${answered} answered`}
              action={
                <button
                  onClick={reload}
                  title="Refresh"
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              }
            />
            <CardBody className="p-0">
              {data.requests.length === 0 ? (
                <EmptyState
                  icon={<HandHeart className="h-8 w-8" />}
                  title="No prayer requests yet"
                  subtitle="Submit a request above and it will appear here with its status."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.requests.map((r) => {
                    const isAnswered = r.status === 'PRAYED_FOR' || r.status === 'CLOSED';
                    return (
                      <li key={r.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{r.subject}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock4 className="h-3.5 w-3.5" />
                                Requested {formatDate(r.createdAt)}
                              </span>
                              {r.isPublic && (
                                <span className="inline-flex items-center gap-1">
                                  <Globe className="h-3.5 w-3.5" />
                                  Public request
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge color={statusColor(r.status)}>{titleCase(r.status)}</Badge>
                        </div>
                        {r.content && (
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{r.content}</p>
                        )}
                        {isAnswered && r.prayedForAt && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            <Sparkles className="h-3 w-3" />
                            Prayed for {formatDate(r.prayedForAt)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="Counseling sessions" subtitle={`${data.sessions.length} session${data.sessions.length === 1 ? '' : 's'}`} />
          <CardBody className="p-0">
            {data.sessions.length === 0 ? (
              <EmptyState
                icon={<Stethoscope className="h-8 w-8" />}
                title="No sessions yet"
                subtitle="Scheduled counseling sessions will appear here."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.sessions.map((s) => {
                  const isDone = s.status === 'COMPLETED' || s.status === 'CANCELLED';
                  const followUpDue = s.followUpDate && !isDone && new Date(s.followUpDate).getTime() < Date.now();
                  return (
                    <li key={s.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{s.topic || 'Session'}</p>
                        <Badge color={statusColor(s.status)}>{titleCase(s.status)}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarCheck className="h-3.5 w-3.5" />
                        {formatDateTime(s.date)}
                        {s.counselor?.name ? ` · ${s.counselor.name}` : ''}
                      </div>
                      {s.notes && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{s.notes}</p>}
                      {s.followUpDate && (
                        <span
                          className={cn(
                            'mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                            followUpDue ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500',
                          )}
                        >
                          <CalendarCheck className="h-3 w-3" />
                          Follow-up {followUpDue ? 'overdue' : 'due'} {formatDate(s.followUpDate)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Toast message={message} />
    </div>
  );
}
