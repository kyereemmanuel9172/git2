'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Church, Lock, ShieldCheck, UserRound, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';

const demoAccounts = [
  { email: 'superadmin@church.org', role: 'Super Admin' },
  { email: 'admin@church.org', role: 'Church Admin' },
  { email: 'pastor@church.org', role: 'Senior Pastor' },
  { email: 'finance@church.org', role: 'Finance Officer' },
  { email: 'leader@church.org', role: 'Department Leader' },
  { email: 'member@church.org', role: 'Member' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [_twoFactorToken, setTwoFactorToken] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, twoFactorCode || undefined);
      if (result.requiresTwoFactor) {
        setShow2FA(true);
        setTwoFactorToken(result.twoFactorToken);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
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
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Church Management System</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your church admin dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Input
            label="Email"
            type="email"
            required
            placeholder="you@church.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>
          {show2FA && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <Input
                label="2FA code"
                placeholder="000000"
                inputMode="numeric"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Enter the code from your authenticator app
              </p>
            </motion.div>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing in…' : show2FA ? 'Verify & sign in' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Lock className="h-3.5 w-3.5" /> Demo accounts · password <code className="rounded bg-slate-100 px-1">Password123!</code>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword('Password123!');
                  setShow2FA(false);
                }}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Link href="/portal/login" className="mt-4 block">
          <Button type="button" variant="outline" size="lg" className="w-full">
            <UserRound className="h-4 w-4" />
            Member portal sign in
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
