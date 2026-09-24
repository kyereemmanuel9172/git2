'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  QrCode,
  Users,
  CalendarDays,
  Wallet,
  Mail,
  Phone,
  MapPin,
  Home,
  CalendarCheck,
  CalendarClock,
  PartyPopper,
  HeartHandshake,
  IdCard,
  UserRound,
  Stethoscope,
  Globe,
  Sparkles,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { api, formatDate, formatMoney, formatDateTime, titleCase } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  statusColor,
  Table,
  Td,
  Spinner,
  Modal,
  EmptyState,
  StatCard,
  Toast,
  useToast,
  Avatar,
  cn,
  Input,
} from '@/components/ui';

interface Family {
  id: string;
  name: string;
  address: string | null;
  head: { firstName: string; lastName: string } | null;
  members: Array<{ id: string; firstName: string; lastName: string }>;
}

interface MemberDetail {
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
  notes: string | null;
  family: Family | null;
  departmentLinks: Array<{ department: { id: string; name: string }; role: string }>;
  attendance: Array<{ id: string; serviceType: string; date: string }>;
  transactions: Array<{ id: string; type: string; amount: number; date: string }>;
  eventRegistrations: Array<{ id: string; event: { title: string }; status?: string | null }>;
  prayerRequests: Array<{
    id: string;
    subject: string;
    content?: string | null;
    isPublic: boolean;
    status: string;
    createdAt: string;
    prayedForAt?: string | null;
    prayedByName?: string | null;
  }>;
  counselingSessions: Array<{
    id: string;
    topic: string;
    status: string;
    date: string;
    notes?: string | null;
    followUpDate?: string | null;
    counselor?: { id: string; name: string; email?: string | null } | null;
  }>;
  portalEnabled: boolean;
  lastPortalLoginAt: string | null;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

const serviceColor: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'indigo' | 'purple'> = {
  SUNDAY: 'indigo',
  MIDWEEK: 'blue',
  PRAYER: 'amber',
  EVENT: 'purple',
};

export default function MemberDetailPage() {
  const { toast, message } = useToast();
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [savingPortal, setSavingPortal] = useState(false);

  useEffect(() => {
    api<MemberDetail>(`/members/${id}`)
      .then(setMember)
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshAttendance = async () => {
    setRefreshing(true);
    try {
      const d = await api<MemberDetail>(`/members/${id}`);
      setMember(d);
      toast('Attendance refreshed');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to refresh attendance');
    } finally {
      setRefreshing(false);
    }
  };

  const recordCall = () => {
    if (!member?.id) return;
    api('/communications/calls', { method: 'POST', body: { memberId: member.id } }).catch(() => {});
  };

  const openQr = async () => {
    setQrOpen(true);
    if (!qrCode) {
      setQrLoading(true);
      try {
        const res = await api<{ qrCode: string }>(`/members/${id}/qr`);
        setQrCode(res.qrCode);
      } catch {
        setQrCode(null);
      } finally {
        setQrLoading(false);
      }
    }
  };

  const setPortalPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPortal(true);
    try {
      await api(`/members/${id}/portal-password`, { method: 'POST', body: { password: portalPassword } });
      setPortalPassword('');
      const d = await api<MemberDetail>(`/members/${id}`);
      setMember(d);
      toast('Portal access enabled');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to set portal password');
    } finally {
      setSavingPortal(false);
    }
  };

  if (loading) return <Spinner />;

  if (!member) {
    return (
      <div className="space-y-6">
        <Link href="/members" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>
        <EmptyState icon={<Users className="h-10 w-10" />} title="Member not found" subtitle="The member may have been removed." />
        <Toast message={message} />
      </div>
    );
  }

  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <div className="space-y-6">
      <Link href="/members" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" />
        Back to members
      </Link>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-violet-800 text-white shadow-lg shadow-brand-700/20">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-64 top-6 h-3 w-3 rounded-full bg-white/30" />
        <div className="relative flex flex-col gap-6 px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={fullName} src={member.photoUrl} className="h-20 w-20 text-xl ring-4 ring-white/25" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{fullName}</h1>
                <Badge color={statusColor(member.membershipStatus)}>{member.membershipStatus ?? 'Unknown'}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/75">
                {member.memberId && (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <IdCard className="h-3.5 w-3.5" />
                    {member.memberId}
                  </span>
                )}
                {member.joinDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Member since {formatDate(member.joinDate)}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {member.email}
                  </a>
                )}
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    onClick={recordCall}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone}
                  </a>
                )}
                {(member.city || member.address) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    {[member.city, member.address].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full shrink-0 border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
            onClick={openQr}
          >
            <QrCode className="h-4 w-4" />
            QR ID card
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          index={0}
          tone="indigo"
          label="Membership"
          value={titleCase(member.membershipStatus) || '—'}
          icon={<Users className="h-4 w-4" />}
          hint={member.gender ? `${titleCase(member.gender)} member` : undefined}
        />
        <StatCard
          index={1}
          tone="emerald"
          label="Joined"
          value={formatDate(member.joinDate)}
          icon={<CalendarDays className="h-4 w-4" />}
          hint={member.maritalStatus ? titleCase(member.maritalStatus) : undefined}
        />
        <StatCard
          index={2}
          tone="amber"
          label="Baptized"
          value={formatDate(member.baptismDate)}
          icon={<PartyPopper className="h-4 w-4" />}
          hint={member.dateOfBirth ? `Born ${formatDate(member.dateOfBirth)}` : undefined}
        />
        <StatCard
          index={3}
          tone="sky"
          label="Check-ins"
          value={member.attendance?.length ?? 0}
          icon={<CalendarCheck className="h-4 w-4" />}
          hint={`${member.counselingSessions?.length ?? 0} counseling sessions`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Personal information"
              subtitle="Contact, membership and ministry details"
              action={member.departmentLinks.length > 0 ? <Badge color="indigo">{member.departmentLinks.length} ministr{member.departmentLinks.length === 1 ? 'y' : 'ies'}</Badge> : undefined}
            />
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Email</p>
                    <p className="truncate text-sm font-medium text-slate-800">{member.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Phone</p>
                    <p className="truncate text-sm font-medium text-slate-800">{member.phone ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Location</p>
                    <p className="truncate text-sm font-medium text-slate-800">
                      {[member.city, member.address].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Member ID" value={member.memberId} />
                <Field label="Gender" value={titleCase(member.gender) || '—'} />
                <Field label="Date of birth" value={formatDate(member.dateOfBirth)} />
                <Field label="Marital status" value={titleCase(member.maritalStatus) || '—'} />
                <Field label="Occupation" value={member.occupation} />
                <Field label="Mother's name" value={member.motherName} />
                <Field label="Father's name" value={member.fatherName} />
                <Field label="Church branch" value={member.churchBranch} />
                <Field label="Church Group" value={member.family?.name} />
                <Field label="Join date" value={formatDate(member.joinDate)} />
                <Field label="Baptism date" value={formatDate(member.baptismDate)} />
                <Field label="Address" value={member.address} />
              </dl>

              {member.departmentLinks.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Ministries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.departmentLinks.map((l, i) => (
                      <Badge key={i} color="indigo">
                        {l.department.name}
                        {l.role ? ` · ${titleCase(l.role)}` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {member.notes && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{member.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Attendance history"
                subtitle={`${member.attendance?.length ?? 0} check-ins`}
                action={
                  <button
                    onClick={refreshAttendance}
                    disabled={refreshing}
                    title="Refresh attendance"
                    className="inline-flex items-center gap-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                  </button>
                }
              />
              <CardBody className="p-0">
                {!member.attendance || member.attendance.length === 0 ? (
                  <EmptyState icon={<CalendarCheck className="h-8 w-8" />} title="No attendance" subtitle="Check-ins will appear here." />
                ) : (
                  <Table headers={['Date', 'Service']}>
                    {member.attendance.map((a) => (
                      <tr key={a.id}>
                        <Td>{formatDate(a.date)}</Td>
                        <Td>
                          <Badge color={serviceColor[a.serviceType] ?? 'slate'}>{titleCase(a.serviceType) || a.serviceType}</Badge>
                        </Td>
                      </tr>
                    ))}
                  </Table>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Transactions" subtitle={`${member.transactions?.length ?? 0} records`} />
              <CardBody className="p-0">
                {!member.transactions || member.transactions.length === 0 ? (
                  <EmptyState icon={<Wallet className="h-8 w-8" />} title="No transactions" subtitle="Giving and contributions will appear here." />
                ) : (
                  <Table headers={['Date', 'Type', { label: 'Amount', align: 'right' }]}>
                    {member.transactions.map((t) => (
                      <tr key={t.id}>
                        <Td>{formatDate(t.date)}</Td>
                        <Td>{titleCase(t.type) || t.type}</Td>
                        <Td className="text-right font-medium text-slate-900">{formatMoney(t.amount)}</Td>
                      </tr>
                    ))}
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Church Group" subtitle={member.family ? `${member.family.members.length} member${member.family.members.length === 1 ? '' : 's'}` : undefined} />
            <CardBody>
              {!member.family ? (
                <EmptyState icon={<Home className="h-8 w-8" />} title="No church group assigned" subtitle="This member is not linked to a church group yet." />
              ) : (
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Home className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{member.family.name}</p>
                      {member.family.address && <p className="mt-0.5 text-xs text-slate-500">{member.family.address}</p>}
                      {member.family.head && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          Head: <span className="font-medium text-slate-700">{member.family.head.firstName} {member.family.head.lastName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Church Group members</p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.family.members.map((m) => (
                        <Link
                          key={m.id}
                          href={`/members/${m.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Users className="h-3 w-3" />
                          {m.firstName} {m.lastName}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {user && (user.role === 'SUPER_ADMIN' || user.role === 'CHURCH_ADMIN') && (
            <Card>
              <CardHeader
                title="Member portal"
                subtitle="Self-service access for this member"
                action={<Badge color={member.portalEnabled ? 'green' : 'slate'}>{member.portalEnabled ? 'Enabled' : 'Not set up'}</Badge>}
              />
              <CardBody>
                <p className="text-xs text-slate-500">
                  The member can sign in at{' '}
                  <span className="font-medium text-slate-700">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/portal
                  </span>{' '}
                  using their member ID, email or phone and the password below.
                </p>
                <form onSubmit={setPortalPasswordSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <Input
                    type="password"
                    placeholder="New portal password"
                    minLength={8}
                    required
                    className="flex-1"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                  />
                  <Button type="submit" size="sm" disabled={savingPortal}>
                    <KeyRound className="h-4 w-4" />
                    {savingPortal ? 'Saving…' : member.portalEnabled ? 'Reset' : 'Enable'}
                  </Button>
                </form>
                {member.lastPortalLoginAt && (
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <CalendarCheck className="h-3 w-3" />
                    Last signed in {formatDateTime(member.lastPortalLoginAt)}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Event registrations" subtitle={`${member.eventRegistrations?.length ?? 0} events`} />
            <CardBody>
              {!member.eventRegistrations || member.eventRegistrations.length === 0 ? (
                <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="No registrations" />
              ) : (
                <ul className="space-y-2">
                  {member.eventRegistrations.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                      <span className="text-slate-700">{r.event.title}</span>
                      {r.status && <Badge color={statusColor(r.status)}>{titleCase(r.status)}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Prayer requests"
              subtitle={`${member.prayerRequests?.length ?? 0} requests · ${member.prayerRequests?.filter((p) => p.status === 'PRAYED_FOR' || p.status === 'CLOSED').length ?? 0} answered`}
              action={
                (member.prayerRequests?.length ?? 0) > 0 ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                ) : undefined
              }
            />
            <CardBody className="p-0">
              {!member.prayerRequests || member.prayerRequests.length === 0 ? (
                <EmptyState
                  icon={<HeartHandshake className="h-8 w-8" />}
                  title="No prayer requests"
                  subtitle="Prayer requests submitted by this member will appear here."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {member.prayerRequests.map((p) => {
                    const answered = p.status === 'PRAYED_FOR' || p.status === 'CLOSED';
                    return (
                      <li key={p.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{p.subject}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" />
                                Requested {formatDate(p.createdAt)}
                              </span>
                              {p.isPublic && (
                                <span className="inline-flex items-center gap-1">
                                  <Globe className="h-3.5 w-3.5" />
                                  Public request
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge color={statusColor(p.status)}>{titleCase(p.status)}</Badge>
                        </div>
                        {p.content && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{p.content}</p>
                        )}
                        {answered && p.prayedForAt && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            <Sparkles className="h-3 w-3" />
                            Prayed for {formatDate(p.prayedForAt)}
                            {p.prayedByName ? ` by ${p.prayedByName}` : ''}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Counseling sessions"
              subtitle={`${member.counselingSessions?.length ?? 0} sessions · ${member.counselingSessions?.filter((s) => s.status === 'COMPLETED').length ?? 0} completed`}
              action={
                (member.counselingSessions?.length ?? 0) > 0 ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                ) : undefined
              }
            />
            <CardBody className="p-0">
              {!member.counselingSessions || member.counselingSessions.length === 0 ? (
                <EmptyState
                  icon={<Stethoscope className="h-8 w-8" />}
                  title="No counseling sessions"
                  subtitle="Scheduled counseling sessions will appear here."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {member.counselingSessions.map((c) => {
                    const isDone = c.status === 'COMPLETED' || c.status === 'CANCELLED';
                    const followUpDue =
                      c.followUpDate && !isDone && new Date(c.followUpDate).getTime() < Date.now();
                    return (
                      <li key={c.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{c.topic || 'Session'}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {formatDate(c.date)}
                              </span>
                              {c.counselor?.name && (
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="h-3.5 w-3.5" />
                                  {c.counselor.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge color={statusColor(c.status)}>{titleCase(c.status)}</Badge>
                        </div>
                        {c.notes && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{c.notes}</p>
                        )}
                        {c.followUpDate && (
                          <span
                            className={
                              followUpDue
                                ? 'mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700'
                                : 'mt-2 inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500'
                            }
                          >
                            <CalendarCheck className="h-3 w-3" />
                            Follow-up {followUpDue ? 'overdue' : 'due'} {formatDate(c.followUpDate)}
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
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR ID card">
        <div className="flex flex-col items-center py-2">
          <div className="w-72 rounded-xl border-2 border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-900">{fullName}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">Church Member</p>
            <div className="my-4 flex justify-center border-y border-dashed border-slate-200 py-4">
              {qrLoading ? (
                <Spinner />
              ) : qrCode ? (
                <img src={qrCode} alt={`QR code for ${fullName}`} className="h-44 w-44" />
              ) : (
                <p className="py-10 text-sm text-slate-500">Could not load QR code.</p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {member.memberId ? `ID: ${member.memberId}` : member.membershipStatus ? titleCase(member.membershipStatus) : 'Member'}
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Scan with a phone camera to view this member's details, or use the scanner at the check-in desk.
          </p>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
