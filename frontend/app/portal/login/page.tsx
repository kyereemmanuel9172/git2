'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Church, Lock } from 'lucide-react';
import { usePortalAuth } from '@/lib/portal-auth';
import { Button, Input } from '@/components/ui';

export default function PortalLoginPage() {
  const { login } = usePortalAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.push('/portal/dashboard');
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
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Member Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to view your profile, giving and more</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Input
            label="Member ID, phone or email"
            required
            placeholder="e.g. GRAC-0001"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <div className="flex items-center justify-end">
            <Link href="/portal/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/login" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700">
            <Lock className="h-3 w-3" /> Church staff? Sign in to the admin dashboard
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
