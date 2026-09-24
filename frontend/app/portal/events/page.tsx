'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Users, Check, Clock3, Calendar, Tag, AlertCircle, Sparkles } from 'lucide-react';
import { portalApi, formatDateTime, titleCase } from '@/lib/portal';
import { Card, CardBody, Button, Spinner, EmptyState, Badge, Toast, useToast, statusColor, cn } from '@/components/ui';

interface PortalEvent {
  id: string;
  title: string;
  type: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  status: string;
  registrations: number;
  registered: boolean;
  registrationStatus: string | null;
}

export default function PortalEvents() {
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast, message } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    portalApi<PortalEvent[]>('/portal/events', { signal: controller.signal })
      .then(setEvents)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load events');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const register = async (eventId: string) => {
    try {
      const res = await portalApi<{ message: string }>(`/portal/events/${eventId}/register`, { method: 'POST' });
      toast(res.message);
      const updated = await portalApi<PortalEvent[]>('/portal/events');
      setEvents(updated);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Registration failed');
    }
  };

  const getDaysUntil = (date: string) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return `${diffDays} days`;
  };

  const getEventColor = (type: string | null) => {
    const colors: Record<string, string> = {
      SERVICE: 'from-indigo-500 to-violet-500',
      CONFERENCE: 'from-emerald-500 to-teal-500',
      YOUTH: 'from-sky-500 to-cyan-500',
      WORSHIP: 'from-rose-500 to-pink-500',
      PRAYER: 'from-amber-500 to-orange-500',
      FELLOWSHIP: 'from-violet-500 to-purple-500',
    };
    return colors[type?.toUpperCase() ?? ''] ?? 'from-brand-500 to-indigo-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Events</h1>
        <p className="mt-0.5 text-sm text-slate-500">Upcoming services, conferences and gatherings</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner />
          <p className="mt-4 text-sm text-slate-500">Loading events...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : events.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<CalendarDays className="h-12 w-12" />}
              title="No upcoming events"
              subtitle="There are no upcoming events scheduled right now. Check back soon!"
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Featured event (first one) */}
          {events.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 p-5 sm:p-8 text-white shadow-xl shadow-brand-600/20">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-white/80" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Featured Event</span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">{events[0].title}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> {formatDateTime(events[0].startDate)}
                      </span>
                      {events[0].location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" /> {events[0].location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> {events[0].registrations} registered
                      </span>
                    </div>
                    <div className="mt-4">
                      {events[0].registered ? (
                        <Badge color={statusColor(events[0].registrationStatus ?? '')}>
                          <Check className="mr-1 h-3 w-3" />
                          {titleCase(events[0].registrationStatus ?? 'Registered')}
                        </Badge>
                      ) : (
                        <Button onClick={() => register(events[0].id)} className="bg-white text-brand-700 hover:bg-white/90">
                          Register now
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <div className="inline-flex flex-col items-center rounded-2xl bg-white/10 px-6 py-4">
                      <span className="text-3xl font-bold">{new Date(events[0].startDate).getDate()}</span>
                      <span className="text-sm font-semibold uppercase">
                        {new Date(events[0].startDate).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="mt-1 text-xs text-white/70">{getDaysUntil(events[0].startDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Remaining events grid */}
          {events.length > 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              {events.slice(1).map((e) => (
                <div
                  key={e.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                >
                  {/* Event header with gradient */}
                  <div className={cn('relative bg-gradient-to-r p-4 text-white', getEventColor(e.type))}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {e.type && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                            <Tag className="h-2.5 w-2.5" /> {titleCase(e.type)}
                          </span>
                        )}
                        <h3 className="mt-1.5 text-base font-bold leading-snug sm:text-lg">{e.title}</h3>
                      </div>
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/20 text-center">
                        <span className="text-lg font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                        <span className="text-[10px] font-semibold uppercase">
                          {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Event details */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        <span>{formatDateTime(e.startDate)}</span>
                      </div>
                      {e.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{e.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>
                          {e.registrations} registered
                          {e.capacity && ` · ${e.capacity - e.registrations} spots left`}
                        </span>
                      </div>
                    </div>

                    {/* Capacity bar */}
                    {e.capacity && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{Math.round((e.registrations / e.capacity) * 100)}% filled</span>
                          <span>{e.registrations}/{e.capacity}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              e.registrations >= e.capacity ? 'bg-red-500' : 'bg-brand-500',
                            )}
                            style={{ width: `${Math.min((e.registrations / e.capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action */}
                    <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {e.registered ? (
                          <Badge color={statusColor(e.registrationStatus ?? '')}>
                            <Check className="mr-1 h-3 w-3" />
                            {titleCase(e.registrationStatus ?? 'Registered')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Not registered</span>
                        )}
                        {e.capacity && e.registrations >= e.capacity && !e.registered && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" /> Full
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={e.registered ? 'outline' : 'primary'}
                        onClick={() => register(e.id)}
                        disabled={!e.registered && !!e.capacity && e.registrations >= e.capacity}
                        className="w-full sm:w-auto"
                      >
                        {e.registered ? 'Registered' : e.capacity && e.registrations >= e.capacity ? 'Join waitlist' : 'Register'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Toast message={message} />
    </div>
  );
}
