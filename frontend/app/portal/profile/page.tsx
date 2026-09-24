'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  KeyRound,
  Mail,
  Phone,
  MapPin,
  Users,
  Briefcase,
  HeartHandshake,
  Shield,
  Calendar,
  BadgeCheck,
  Check,
} from 'lucide-react';
import { usePortalAuth } from '@/lib/portal-auth';
import { portalApi, formatDate, titleCase } from '@/lib/portal';
import { Card, CardHeader, CardBody, Button, Input, Spinner, Badge, Toast, useToast, statusColor, cn } from '@/components/ui';

interface InfoItem {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  iconColor?: string;
}

function InfoCard({ items }: { items: InfoItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="min-w-0 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100 transition-colors hover:bg-slate-50"
        >
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-100',
              item.iconColor ?? 'text-slate-500',
            )}
          >
            {item.icon}
          </div>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-0.5 break-words text-sm font-medium text-slate-800">{item.value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

export default function PortalProfile() {
  const { member, refresh } = usePortalAuth();
  const { toast, message } = useToast();
  const [form, setForm] = useState({
    email: '',
    phone: '',
    address: '',
    city: '',
    maritalStatus: '',
    occupation: '',
  });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        email: member.email ?? '',
        phone: member.phone ?? '',
        address: member.address ?? '',
        city: member.city ?? '',
        maritalStatus: member.maritalStatus ?? '',
        occupation: member.occupation ?? '',
      });
    }
  }, [member]);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spinner />
        <p className="mt-4 text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }

  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await portalApi('/portal/profile', { method: 'PATCH', body: form });
      await refresh();
      toast('Profile updated successfully');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      await portalApi('/portal/change-password', { method: 'POST', body: pw });
      setPw({ currentPassword: '', newPassword: '' });
      toast('Password changed successfully');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const personalInfo: InfoItem[] = [
    { icon: <Mail className="h-5 w-5" />, label: 'Email', value: member.email, iconColor: 'text-blue-500' },
    { icon: <Phone className="h-5 w-5" />, label: 'Phone', value: member.phone, iconColor: 'text-emerald-500' },
    { icon: <MapPin className="h-5 w-5" />, label: 'Location', value: [member.city, member.address].filter(Boolean).join(', '), iconColor: 'text-rose-500' },
    { icon: <Users className="h-5 w-5" />, label: 'Church Group', value: member.family?.name, iconColor: 'text-violet-500' },
  ];

  const membershipInfo: InfoItem[] = [
    { icon: <Calendar className="h-5 w-5" />, label: 'Member since', value: member.joinDate ? formatDate(member.joinDate) : undefined, iconColor: 'text-sky-500' },
    { icon: <Briefcase className="h-5 w-5" />, label: 'Occupation', value: member.occupation, iconColor: 'text-amber-500' },
    { icon: <HeartHandshake className="h-5 w-5" />, label: 'Marital status', value: member.maritalStatus ? titleCase(member.maritalStatus) : undefined, iconColor: 'text-pink-500' },
    { icon: <BadgeCheck className="h-5 w-5" />, label: 'Baptism date', value: member.baptismDate ? formatDate(member.baptismDate) : undefined, iconColor: 'text-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={`${member.firstName} ${member.lastName}`}
                className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-4 ring-white/20"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-brand-500 text-3xl font-bold shadow-lg ring-4 ring-white/20">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">
              {member.firstName} {member.lastName}
            </h1>
            <p className="mt-0.5 text-sm text-white/60">{member.memberId ?? 'Member'}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge color={statusColor(member.membershipStatus ?? '')}>
                {titleCase(member.membershipStatus ?? '')}
              </Badge>
              {member.departmentLinks && member.departmentLinks.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
                  <Users className="h-3 w-3" />
                  {member.departmentLinks.length} ministry{member.departmentLinks.length > 1 ? 'ies' : 'y'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Info Cards */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Personal information" subtitle="Your contact details" />
            <CardBody>
              <InfoCard items={personalInfo} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Membership details" subtitle="Your church membership information" />
            <CardBody>
              <InfoCard items={membershipInfo} />
            </CardBody>
          </Card>

          {/* Departments */}
          {member.departmentLinks && member.departmentLinks.length > 0 && (
            <Card>
              <CardHeader title="My ministries" subtitle="Department and group memberships" />
              <CardBody>
                <div className="space-y-2">
                  {member.departmentLinks.map((link: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-slate-100">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{link.department?.name ?? 'Department'}</p>
                        {link.role && (
                          <p className="truncate text-xs text-slate-500">{titleCase(link.role)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right Column - Forms */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader
              title="Edit contact details"
              subtitle="Update your personal information. These changes are visible to your church administration."
              action={
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield className="h-3.5 w-3.5" />
                  Admin visible
                </div>
              }
            />
            <CardBody>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <Input
                    label="Phone number"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <Input
                    label="Street address"
                    placeholder="123 Main St"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                  <Input
                    label="City"
                    placeholder="Your city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                  <Input
                    label="Marital status"
                    placeholder="Single, Married, etc."
                    value={form.maritalStatus}
                    onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                  />
                  <Input
                    label="Occupation"
                    placeholder="Your occupation"
                    value={form.occupation}
                    onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <Button type="button" variant="ghost" onClick={() => member && setForm({
                    email: member.email ?? '',
                    phone: member.phone ?? '',
                    address: member.address ?? '',
                    city: member.city ?? '',
                    maritalStatus: member.maritalStatus ?? '',
                    occupation: member.occupation ?? '',
                  })} className="w-full sm:w-auto">
                    Reset
                  </Button>
                  <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Change portal password"
              subtitle="Update your login password for the member portal"
              action={
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <KeyRound className="h-3.5 w-3.5" />
                  Security
                </div>
              }
            />
            <CardBody>
              <form onSubmit={changePassword} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Current password"
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={pw.currentPassword}
                    onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  />
                  <Input
                    label="New password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={pw.newPassword}
                    onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <Button type="submit" disabled={savingPw} className="w-full sm:w-auto">
                    <KeyRound className="h-4 w-4" />
                    {savingPw ? 'Updating…' : 'Update password'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      <Toast message={message} />
    </div>
  );
}
