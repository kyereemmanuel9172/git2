'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cake, Gift, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody, Badge, Spinner, EmptyState, PageHeader } from '@/components/ui';
import { cn } from '@/components/ui';

interface Birthday {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string;
  nextBirthday: string;
  age: number;
  daysUntil: number;
}

interface BirthdayResponse {
  days: number;
  total: number;
  withoutDob: number;
  items: Birthday[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayLabel(daysUntil: number) {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil < 7) return `In ${daysUntil} days`;
  return `In ${daysUntil} days`;
}

function BirthdayCard({ b }: { b: Birthday }) {
  const monthDay = b.nextBirthday.slice(5).split('-');
  const short = `${MONTHS[Number(monthDay[0]) - 1]} ${Number(monthDay[1])}`;
  return (
    <Link
      href={`/members/${b.id}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
        {b.firstName[0]}
        {b.lastName[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {b.firstName} {b.lastName}
          <span className="ml-1.5 font-normal text-slate-400">turning {b.age}</span>
        </p>
        <p className="text-xs text-slate-500">{short}</p>
      </div>
      <Badge color={b.daysUntil <= 1 ? 'green' : b.daysUntil < 7 ? 'blue' : 'slate'}>
        {dayLabel(b.daysUntil)}
      </Badge>
    </Link>
  );
}

function BirthdaySection({ title, icon, items, accent }: { title: string; icon: React.ReactNode; items: Birthday[]; accent: string }) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={items.length === 0 ? 'Nothing here' : `${items.length} birthday${items.length === 1 ? '' : 's'}`}
        action={
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent)}>{icon}</span>
        }
      />
      <CardBody className="space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No birthdays</p>
        ) : (
          items.map((b) => <BirthdayCard key={b.id} b={b} />)
        )}
      </CardBody>
    </Card>
  );
}

export default function BirthdaysPage() {
  const [data, setData] = useState<BirthdayResponse | null>(null);

  useEffect(() => {
    api<BirthdayResponse>('/members/birthdays?days=30')
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <Spinner />;

  const today = data.items.filter((b) => b.daysUntil === 0);
  const week = data.items.filter((b) => b.daysUntil >= 1 && b.daysUntil < 7);
  const month = data.items.filter((b) => b.daysUntil >= 7);

  return (
    <div>
      <PageHeader
        title="Birthdays"
        subtitle={`${data.total} birthday${data.total === 1 ? '' : 's'} in the next 30 days`}
      />

      {data.total === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Cake className="h-12 w-12" />}
              title="No upcoming birthdays"
              subtitle={
                data.withoutDob > 0
                  ? `${data.withoutDob} members don't have a date of birth set yet.`
                  : 'Add a date of birth to members to see their birthdays here.'
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <BirthdaySection title="Today" icon={<Gift className="h-4 w-4 text-emerald-600" />} items={today} accent="bg-emerald-50" />
          <BirthdaySection title="Next 7 days" icon={<Cake className="h-4 w-4 text-sky-600" />} items={week} accent="bg-sky-50" />
          <BirthdaySection title="Later this month" icon={<CalendarDays className="h-4 w-4 text-brand-600" />} items={month} accent="bg-brand-50" />
        </div>
      )}

      {data.withoutDob > 0 && data.total > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          {data.withoutDob} member{data.withoutDob === 1 ? '' : 's'} don't have a date of birth set and are not shown. Update them in{' '}
          <Link href="/members" className="font-medium text-brand-600 hover:text-brand-700">
            Members
          </Link>
          .
        </p>
      )}
    </div>
  );
}
