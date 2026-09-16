'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>}
      <input
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          error && 'border-red-400',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>}
      <select
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>}
      <textarea
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          className,
        )}
        {...props}
      />
    </div>
  );
}

type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'indigo' | 'purple';

const badgeColors: Record<BadgeColor, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
};

export function Badge({ color = 'slate', children }: { color?: BadgeColor; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badgeColors[color])}>
      {children}
    </span>
  );
}

export function statusColor(status: string | null | undefined): BadgeColor {
  const s = (status ?? '').toUpperCase();
  if (['ACTIVE', 'CONFIRMED', 'COMPLETED', 'EXCELLENT', 'PRAYED_FOR', 'GOOD', 'UPCOMING', 'PAID'].includes(s)) return 'green';
  if (['VISITOR', 'IN_PROGRESS', 'FOLLOW_UP', 'ONGOING', 'FAIR', 'WAITLIST', 'SCHEDULED'].includes(s)) return 'blue';
  if (['INACTIVE', 'DRAFT', 'PENDING', 'REPAIR_NEEDED', 'CANCELLED'].includes(s)) return 'amber';
  if (['DECEASED', 'TRANSFERRED', 'POOR', 'CLOSED'].includes(s)) return 'red';
  return 'slate';
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className={cn(
              'relative w-full rounded-2xl bg-white shadow-xl',
              wide ? 'max-w-3xl' : 'max-w-lg',
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-800">{title}</h3>
              <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Table({
  headers,
  children,
}: {
  headers: Array<string | { label: string; align?: 'left' | 'center' | 'right' }>;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {headers.map((h, i) => {
              const label = typeof h === 'string' ? h : h.label;
              const align = typeof h === 'string' ? 'left' : h.align ?? 'left';
              return (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500',
                    align === 'right' && 'text-right',
                    align === 'center' && 'text-center',
                  )}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn('px-4 py-3 text-slate-700', className)}>{children}</td>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useToast(timeout = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), timeout);
    return () => clearTimeout(t);
  }, [message, timeout]);
  return { toast: setMessage, message };
}

const statTones: Record<string, { card: string; chip: string; label: string; value: string; hint: string }> = {
  indigo: {
    card: 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30',
    chip: 'bg-white/25 text-white',
    label: 'text-white/80',
    value: 'text-white',
    hint: 'text-white/70',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30',
    chip: 'bg-white/25 text-white',
    label: 'text-white/80',
    value: 'text-white',
    hint: 'text-white/70',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30',
    chip: 'bg-white/25 text-white',
    label: 'text-white/80',
    value: 'text-white',
    hint: 'text-white/70',
  },
  sky: {
    card: 'bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30',
    chip: 'bg-white/25 text-white',
    label: 'text-white/80',
    value: 'text-white',
    hint: 'text-white/70',
  },
  rose: {
    card: 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30',
    chip: 'bg-white/25 text-white',
    label: 'text-white/80',
    value: 'text-white',
    hint: 'text-white/70',
  },
  violet: {
    card: 'bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/30',
    chip: 'bg-white/25 text-white',
    label: 'text-white/80',
    value: 'text-white',
    hint: 'text-white/70',
  },
};

const statVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: 'easeOut' },
  }),
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone,
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  tone?: string;
  index?: number;
}) {
  const hover = { y: -4, transition: { duration: 0.2, delay: 0, ease: 'easeOut' } as const };
  if (tone && statTones[tone]) {
    const t = statTones[tone];
    return (
      <motion.div
        variants={statVariants}
        custom={index}
        initial="hidden"
        animate="show"
        whileHover={hover}
        className={cn('relative overflow-hidden rounded-xl px-4 py-3.5 shadow-lg', t.card)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn('truncate text-[11px] font-semibold uppercase tracking-wide', t.label)}>{label}</p>
            <div className={cn('mt-1 text-2xl font-bold tabular-nums', t.value)}>{value}</div>
            {hint && <p className={cn('mt-0.5 truncate text-[11px]', t.hint)}>{hint}</p>}
          </div>
          {icon && <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', t.chip)}>{icon}</div>}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div variants={statVariants} custom={index} initial="hidden" animate="show" whileHover={{ ...hover, y: -3 }}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          {icon && <div className="text-brand-500">{icon}</div>}
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </Card>
    </motion.div>
  );
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return src ? (
    <img src={src} alt={name} className={cn('h-10 w-10 shrink-0 rounded-full object-cover', className)} />
  ) : (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700',
        className,
      )}
    >
      {initials}
    </div>
  );
}
