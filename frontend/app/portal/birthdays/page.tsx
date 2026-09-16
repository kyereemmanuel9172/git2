'use client';

import { useEffect, useState } from 'react';
import { Cake, Gift, PartyPopper, Calendar, Star, Clock4 } from 'lucide-react';
import { portalApi, formatDate } from '@/lib/portal';
import { Card, CardBody, Spinner, EmptyState, Badge, cn } from '@/components/ui';

interface BirthdayMember {
  id: string;
  firstName: string;
  lastName: string;
  memberId: string;
  photoUrl: string | null;
  dateOfBirth: string;
  nextBirthday: string;
  age: number;
  daysUntil: number;
  isToday: boolean;
  isThisWeek: boolean;
  isSelf: boolean;
}

interface BirthdaysData {
  items: BirthdayMember[];
  today: BirthdayMember[];
  thisWeek: BirthdayMember[];
  later: BirthdayMember[];
  total: number;
}

export default function PortalBirthdays() {
  const [data, setData] = useState<BirthdaysData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    portalApi<BirthdaysData>('/portal/birthdays', { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e instanceof Error ? e.message : 'Failed to load birthdays');
      });
    return () => controller.abort();
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <Spinner />
            <p className="mt-4 text-sm text-slate-500">Loading birthdays...</p>
          </>
        )}
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0]}${lastName[0]}`.toUpperCase();

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-rose-100 text-rose-700',
      'bg-amber-100 text-amber-700',
      'bg-emerald-100 text-emerald-700',
      'bg-sky-100 text-sky-700',
      'bg-violet-100 text-violet-700',
      'bg-pink-100 text-pink-700',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getDaysLabel = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today!';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    return `${daysUntil} days`;
  };

  const BirthdayCard = ({ member, highlighted = false }: { member: BirthdayMember; highlighted?: boolean }) => (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-xl border p-4 transition-all',
        highlighted
          ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
      )}
    >
      <div className="relative">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={`${member.firstName} ${member.lastName}`}
            className="h-14 w-14 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold shadow-sm',
              getAvatarColor(member.id),
            )}
          >
            {getInitials(member.firstName, member.lastName)}
          </div>
        )}
        {member.isToday && (
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
            <Gift className="h-3 w-3" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            {member.firstName} {member.lastName}
          </p>
          {member.isSelf && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
              You
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Cake className="h-3 w-3" />
            {formatDate(member.dateOfBirth)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" />
            Turning {member.age}
          </span>
        </div>
      </div>

      <div className="text-right">
        <Badge color={member.isToday ? 'amber' : member.daysUntil <= 7 ? 'blue' : 'slate'}>
          {getDaysLabel(member.daysUntil)}
        </Badge>
        {member.isToday && (
          <p className="mt-1 text-[11px] font-medium text-amber-600">
            <PartyPopper className="mr-1 inline h-3 w-3" />
            Happy Birthday!
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 p-6 sm:p-8 text-white shadow-xl shadow-rose-500/20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Cake className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Church Birthdays</h1>
              <p className="mt-0.5 text-sm text-white/80">
                {data.total} member{data.total !== 1 ? 's' : ''} with upcoming birthdays
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.today.length}</p>
            <p className="text-xs text-slate-500">Today</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Clock4 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.thisWeek.length}</p>
            <p className="text-xs text-slate-500">This week</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{data.later.length}</p>
            <p className="text-xs text-slate-500">Later</p>
          </div>
        </div>
      </div>

      {/* Today's birthdays */}
      {data.today.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <PartyPopper className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Today's Birthdays</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {data.today.length}
            </span>
          </div>
          <div className="space-y-3">
            {data.today.map((m) => (
              <BirthdayCard key={m.id} member={m} highlighted />
            ))}
          </div>
        </div>
      )}

      {/* This week */}
      {data.thisWeek.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Clock4 className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">This Week</h2>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
              {data.thisWeek.length}
            </span>
          </div>
          <div className="space-y-3">
            {data.thisWeek.map((m) => (
              <BirthdayCard key={m.id} member={m} />
            ))}
          </div>
        </div>
      )}

      {/* Later */}
      {data.later.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Coming Up</h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
              {data.later.length}
            </span>
          </div>
          <div className="space-y-3">
            {data.later.map((m) => (
              <BirthdayCard key={m.id} member={m} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.total === 0 && (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Cake className="h-12 w-12" />}
              title="No upcoming birthdays"
              subtitle="There are no upcoming birthdays in the church. Check back soon!"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
