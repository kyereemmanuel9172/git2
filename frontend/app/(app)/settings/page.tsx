'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, ShieldOff, LogOut, BookOpen, User as UserIcon, Smartphone, MapPin } from 'lucide-react';
import { api, titleCase } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Modal,
  Toast,
  useToast,
} from '@/components/ui';

interface SetupResponse {
  secret: string;
  qrCode: string;
}

interface ChurchSettings {
  id: string;
  name: string;
  premisesName?: string | null;
  premisesAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  allowedRadiusMeters?: number;
  maxGpsUncertainty?: number;
  requireGpsForMembers?: boolean;
  requireGpsForVisitors?: boolean;
  allowQrFallback?: boolean;
  openBeforeServiceMinutes?: number;
  closeAfterStartMinutes?: number;
}

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const { toast, message } = useToast();
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const [church, setChurch] = useState<ChurchSettings | null>(null);
  const [locForm, setLocForm] = useState({
    premisesName: '',
    premisesAddress: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: '150',
    maxGpsUncertainty: '100',
    requireGpsForMembers: false,
    requireGpsForVisitors: true,
    allowQrFallback: true,
    openBeforeServiceMinutes: '30',
    closeAfterStartMinutes: '30',
  });
  const [locSaving, setLocSaving] = useState(false);

  const loadChurch = useCallback(async () => {
    try {
      const c = await api<ChurchSettings>('/churches/me');
      setChurch(c);
      setLocForm({
        premisesName: c.premisesName ?? '',
        premisesAddress: c.premisesAddress ?? '',
        latitude: c.latitude != null ? String(c.latitude) : '',
        longitude: c.longitude != null ? String(c.longitude) : '',
        allowedRadiusMeters: String(c.allowedRadiusMeters ?? 150),
        maxGpsUncertainty: String(c.maxGpsUncertainty ?? 100),
        requireGpsForMembers: c.requireGpsForMembers ?? false,
        requireGpsForVisitors: c.requireGpsForVisitors ?? true,
        allowQrFallback: c.allowQrFallback ?? true,
        openBeforeServiceMinutes: String(c.openBeforeServiceMinutes ?? 30),
        closeAfterStartMinutes: String(c.closeAfterStartMinutes ?? 30),
      });
    } catch {
      // no church associated
    }
  }, []);

  useEffect(() => {
    loadChurch();
  }, [loadChurch]);

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await api<SetupResponse>('/auth/2fa/setup', { method: 'POST' });
      setSetup(res);
      setCode('');
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyEnable = async () => {
    setBusy(true);
    try {
      await api('/auth/2fa/enable', { method: 'POST', body: { code } });
      setSetup(null);
      setCode('');
      await refresh();
      toast('Two-factor authentication enabled');
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    setBusy(true);
    try {
      await api('/auth/2fa/disable', { method: 'POST' });
      await refresh();
      toast('Two-factor authentication disabled');
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude.toFixed(6)),
          longitude: String(pos.coords.longitude.toFixed(6)),
          maxGpsUncertainty: String(Math.max(f.maxGpsUncertainty ? Number(f.maxGpsUncertainty) : 100, Math.ceil(pos.coords.accuracy))),
        }));
        toast('Current location captured');
      },
      () => toast('Could not access your location'),
    );
  };

  const saveLocation = async () => {
    if (!church) {
      toast('No church is associated with your account');
      return;
    }
    setLocSaving(true);
    try {
      await api(`/churches/${church.id}/location`, {
        method: 'PATCH',
        body: {
          premisesName: locForm.premisesName || undefined,
          premisesAddress: locForm.premisesAddress || undefined,
          latitude: locForm.latitude ? Number(locForm.latitude) : undefined,
          longitude: locForm.longitude ? Number(locForm.longitude) : undefined,
          allowedRadiusMeters: Number(locForm.allowedRadiusMeters) || 150,
          maxGpsUncertainty: Number(locForm.maxGpsUncertainty) || 100,
          requireGpsForMembers: locForm.requireGpsForMembers,
          requireGpsForVisitors: locForm.requireGpsForVisitors,
          allowQrFallback: locForm.allowQrFallback,
          openBeforeServiceMinutes: Number(locForm.openBeforeServiceMinutes) || 30,
          closeAfterStartMinutes: Number(locForm.closeAfterStartMinutes) || 30,
        },
      });
      toast('Location settings saved');
      await loadChurch();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save location settings');
    } finally {
      setLocSaving(false);
    }
  };

  const infoRow = (label: string, value: string | undefined | null) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Profile" subtitle="Your account information" action={<UserIcon className="h-4 w-4 text-slate-400" />} />
        <CardBody>
          {infoRow('Name', user?.name)}
          {infoRow('Email', user?.email)}
          {infoRow('Role', user?.role ? titleCase(user.role) : undefined)}
          {infoRow('Phone', user?.phone)}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Two-factor authentication (2FA)" subtitle="Add an extra layer of security to your account" />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              {user?.twoFactorEnabled ? <Shield className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                {user?.twoFactorEnabled ? '2FA is enabled' : '2FA is not set up'}
              </p>
              <p className="text-xs text-slate-500">
                {user?.twoFactorEnabled
                  ? 'A verification code is required when signing in.'
                  : 'Set up using an authenticator app.'}
              </p>
            </div>
          </div>
          {user?.twoFactorEnabled ? (
            <Button variant="danger" onClick={disable2fa} disabled={busy}>
              {busy ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          ) : (
            <Button onClick={startSetup} disabled={busy}>
              {busy ? 'Setting up...' : 'Set up 2FA'}
            </Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Session" subtitle="Manage your current session" action={<Smartphone className="h-4 w-4 text-slate-400" />} />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Sign out of your account on this device.</p>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </CardBody>
      </Card>

      {church && (
        <Card>
          <CardHeader title="Location & attendance rules" subtitle="Premises coordinates, permitted perimeter and GPS requirements" action={<MapPin className="h-4 w-4 text-slate-400" />} />
          <CardBody className="space-y-5">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Church premises</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <Input
                  label="Venue name"
                  value={locForm.premisesName}
                  onChange={(e) => setLocForm((f) => ({ ...f, premisesName: e.target.value }))}
                  placeholder="e.g. Berekum Cathedral"
                />
                <Input
                  label="Address"
                  value={locForm.premisesAddress}
                  onChange={(e) => setLocForm((f) => ({ ...f, premisesAddress: e.target.value }))}
                  placeholder="Street, town, district"
                />
              </div>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Latitude"
                    value={locForm.latitude}
                    onChange={(e) => setLocForm((f) => ({ ...f, latitude: e.target.value }))}
                    placeholder="6.3236"
                  />
                  <Input
                    label="Longitude"
                    value={locForm.longitude}
                    onChange={(e) => setLocForm((f) => ({ ...f, longitude: e.target.value }))}
                    placeholder="-2.6953"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={useCurrentLocation} className="w-full">
                    <MapPin className="h-4 w-4" />
                    Use my current location
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance perimeter</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <Input
                  label="Allowed radius (metres)"
                  type="number"
                  min="0"
                  value={locForm.allowedRadiusMeters}
                  onChange={(e) => setLocForm((f) => ({ ...f, allowedRadiusMeters: e.target.value }))}
                />
                <Input
                  label="Maximum GPS uncertainty (metres)"
                  type="number"
                  min="0"
                  value={locForm.maxGpsUncertainty}
                  onChange={(e) => setLocForm((f) => ({ ...f, maxGpsUncertainty: e.target.value }))}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Recommended: start with a 150 m radius and 100 m maximum uncertainty, then refine after testing around the premises.
              </p>
            </div>

            <div className="h-px bg-slate-100" />

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance rules</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={locForm.requireGpsForMembers}
                      onChange={(e) => setLocForm((f) => ({ ...f, requireGpsForMembers: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-700">Require GPS for members</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={locForm.requireGpsForVisitors}
                      onChange={(e) => setLocForm((f) => ({ ...f, requireGpsForVisitors: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-700">Require GPS for visitors</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={locForm.allowQrFallback}
                      onChange={(e) => setLocForm((f) => ({ ...f, allowQrFallback: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-700">Allow on-premises QR fallback</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3 content-start">
                  <Input
                    label="Open before service (minutes)"
                    type="number"
                    min="0"
                    value={locForm.openBeforeServiceMinutes}
                    onChange={(e) => setLocForm((f) => ({ ...f, openBeforeServiceMinutes: e.target.value }))}
                  />
                  <Input
                    label="Close after start (minutes)"
                    type="number"
                    min="0"
                    value={locForm.closeAfterStartMinutes}
                    onChange={(e) => setLocForm((f) => ({ ...f, closeAfterStartMinutes: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveLocation} disabled={locSaving}>
                {locSaving ? 'Saving…' : 'Save premises & rules'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="API documentation" subtitle="Explore the backend API endpoints" action={<BookOpen className="h-4 w-4 text-slate-400" />} />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Browse the interactive Swagger documentation for the CMS API.</p>
          <Link
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" />
            View Swagger API docs
          </Link>
        </CardBody>
      </Card>

      <Modal open={!!setup} onClose={() => setSetup(null)} title="Set up two-factor authentication">
        {setup && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Scan the QR code with your authenticator app (e.g. Google Authenticator), then enter the 6-digit code to verify.
            </p>
            <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
              <img src={setup.qrCode} alt="2FA QR code" className="h-48 w-48" />
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Manual secret</p>
              <p className="break-all font-mono text-sm text-slate-800">{setup.secret}</p>
            </div>
            <Input
              label="Verification code"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSetup(null)}>
                Cancel
              </Button>
              <Button onClick={verifyEnable} disabled={busy || code.length < 6}>
                {busy ? 'Verifying...' : 'Verify & enable'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={message} />
    </div>
  );
}
