'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Church, Copy, Check, MailCheck, ArrowLeft } from 'lucide-react';
import { portalApi } from '@/lib/portal';
import { Button, Input } from '@/components/ui';

export default function PortalForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await portalApi<{ message: string; resetUrl?: string }>('/portal/forgot-password', {
        method: 'POST',
        body: { identifier },
      });
      setResetUrl(result.resetUrl ?? null);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

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
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Forgot password</h1>
          <p className="mt-1 text-sm text-slate-500">Reset your member portal password</p>
        </div>

        {!done ? (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Input
              label="Member ID, phone or email"
              required
              autoFocus
              placeholder="e.g. GRAC-0001"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Enter the ID, phone or email you use to sign in and we will send you a link to create a new password.
            </p>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <MailCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Check your inbox</h2>
            <p className="text-sm text-slate-500">
              {resetUrl
                ? 'A reset link was generated for this identifier. Click the link below to choose a new password.'
                : 'If a member exists for that identifier, a reset link has been sent. Check your inbox (and spam folder).'}
            </p>

            {resetUrl && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-left">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Development mode · reset link
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={resetUrl}
                    className="flex-1 truncate break-all text-sm font-medium text-brand-700 underline"
                  >
                    {resetUrl}
                  </a>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="rounded-md bg-white p-1.5 text-brand-600 ring-1 ring-brand-200 hover:bg-brand-100"
                    title="Copy link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <Link
              href="/portal/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back to member sign in
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
