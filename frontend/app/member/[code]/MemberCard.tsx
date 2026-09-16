'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Users, CalendarDays, UserRound, SearchX, Home, IdCard } from 'lucide-react';
import { formatDate, titleCase } from '@/lib/api';

interface PublicMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  memberId: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  membershipStatus: string | null;
  joinDate: string | null;
  baptismDate: string | null;
  notes: string | null;
  family: { id: string; name: string; address: string | null } | null;
  departmentLinks: Array<{ department: { id: string; name: string }; role: string | null }>;
}

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-amber-100 text-amber-700',
  VISITOR: 'bg-sky-100 text-sky-700',
  TRANSFERRED: 'bg-red-100 text-red-700',
  DECEASED: 'bg-red-100 text-red-700',
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
        {title}
      </p>
      {children}
    </div>
  );
}

export default function MemberCard() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [member, setMember] = useState<PublicMember | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    setStatus('loading');
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
    fetch(`${base}/public/member/${encodeURIComponent(code)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Member not found' : 'Failed to load member details');
        return r.json();
      })
      .then((data) => {
        setMember(data);
        setStatus('ready');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Something went wrong');
        setStatus('error');
      });
  }, [code]);

  const initials = (m: { firstName: string; lastName: string }) =>
    `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-100 p-4 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md space-y-4"
      >
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
          <IdCard className="h-3.5 w-3.5" />
          Church Management System
        </Link>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-500">Loading member details…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <SearchX className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">{error}</p>
            <p className="max-w-xs text-xs text-slate-500">
              This QR code may be invalid or the member may no longer exist.
            </p>
          </div>
        )}

        {status === 'ready' && member && (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-20 bg-gradient-to-br from-brand-500 to-violet-500" />
              <div className="-mt-10 px-5 pb-5">
                <div className="flex items-end justify-between">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={`${member.firstName} ${member.lastName}`}
                      className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-100 text-xl font-bold text-brand-700 shadow-sm">
                      {initials(member)}
                    </div>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor[member.membershipStatus ?? ''] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {member.membershipStatus ? titleCase(member.membershipStatus) : 'Member'}
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-bold text-slate-900">
                  {member.firstName} {member.lastName}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {member.memberId ? `Member ID: ${member.memberId}` : 'Church Member'}
                </p>
              </div>
            </div>

            <Section icon={<UserRound className="h-4 w-4" />} title="Personal information">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Gender" value={member.gender ? titleCase(member.gender) : null} />
                <Field label="Date of birth" value={member.dateOfBirth ? formatDate(member.dateOfBirth) : null} />
                <Field label="Marital status" value={member.maritalStatus ? titleCase(member.maritalStatus) : null} />
                <Field label="Occupation" value={member.occupation} />
              </div>
            </Section>

            <Section icon={<Mail className="h-4 w-4" />} title="Contact">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Phone</p>
                    <p className="truncate text-sm text-slate-800">{member.phone ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Email</p>
                    <p className="truncate text-sm text-slate-800">{member.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Location</p>
                    <p className="truncate text-sm text-slate-800">
                      {[member.city, member.address].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            <Section icon={<Home className="h-4 w-4" />} title="Membership">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Status" value={member.membershipStatus ? titleCase(member.membershipStatus) : null} />
                <Field label="Member ID" value={member.memberId} />
                <Field label="Join date" value={member.joinDate ? formatDate(member.joinDate) : null} />
                <Field label="Baptism date" value={member.baptismDate ? formatDate(member.baptismDate) : null} />
          <Field label="Church Group" value={member.family?.name ?? null} />
          <Field label="Church Group address" value={member.family?.address ?? null} />
              </div>
              {member.notes && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{member.notes}</p>
                </div>
              )}
            </Section>

            <Section icon={<Users className="h-4 w-4" />} title="Ministry">
              {member.departmentLinks.length === 0 ? (
                <p className="text-sm text-slate-400">Not assigned to any ministry.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {member.departmentLinks.map((l) => (
                    <span key={l.department.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                      {l.department.name}
                      {l.role && l.role !== 'Member' ? ` · ${l.role}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </Section>

            <div className="pb-8 pt-1 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <CalendarDays className="h-3 w-3" />
                {member.joinDate ? `Member since ${formatDate(member.joinDate)}` : 'Church Management System'}
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
