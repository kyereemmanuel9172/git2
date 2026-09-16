'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Church, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { portalApi } from '@/lib/portal';
import { Button, Input } from '@/components/ui';

function PortalResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await portalApi('/portal/reset-password', {
        method: 'POST',
        body: { token, newPassword: password },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">This reset link is invalid or incomplete.</p>
        <Link href="/portal/forgot-password" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" /> Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Password updated</h2>
        <p className="text-sm text-slate-500">Your portal password has been reset. You can now sign in with your new password.</p>
        <Link
          href="/portal/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to member sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-slate-700">
        <KeyRound className="h-4 w-4 text-brand-600" />
        <p className="text-sm">Create your new portal password</p>
      </div>
      <Input
        label="New password"
        type="password"
        required
        autoFocus
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Confirm new password"
        type="password"
        required
        placeholder="Re-enter your new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}

export default function PortalResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
            <Church className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a new password for your member portal</p>
        </div>
        <Suspense fallback={null}>
          <PortalResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
