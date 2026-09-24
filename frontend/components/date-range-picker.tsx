'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/components/ui';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  placeholder?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toDayStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const fmt = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function DateRangePicker({ from, to, onChange, placeholder = 'Select date range' }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => (from ? new Date(`${from}T00:00:00`) : new Date()));

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (open) setView(from ? new Date(`${from}T00:00:00`) : new Date());
  }, [open, from]);

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = toDayStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T00:00:00`).getTime() : null;

  const select = (dayStr: string) => {
    if (!from || (from && to)) {
      onChange({ from: dayStr, to: '' });
    } else {
      const t = new Date(`${dayStr}T00:00:00`).getTime();
      if (t >= (fromTime ?? 0)) onChange({ from, to: dayStr });
      else onChange({ from: dayStr, to: from });
    }
  };

  const move = (delta: number) => setView(new Date(y, m + delta, 1));

  const label = from && to ? `${fmt(from)} → ${fmt(to)}` : from ? `From ${fmt(from)}` : placeholder;

  return (
    <div className="relative w-full" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={cn('truncate', label === placeholder && 'text-slate-400')}>{label}</span>
        </span>
        {(from || to) && (
          <X
            className="ml-auto h-4 w-4 shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: '', to: '' });
            }}
          />
        )}
        <ChevronRight className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5 sm:absolute sm:left-0 sm:top-full sm:mt-2 sm:w-72 sm:translate-x-0 sm:translate-y-0">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => move(-1)}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-slate-800">
              {MONTHS[m]} {y}
            </p>
            <button
              type="button"
              onClick={() => move(1)}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1 text-[10px] font-semibold uppercase text-slate-400">
                {w}
              </span>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dayStr = toDayStr(y, m, d);
              const time = new Date(y, m, d).getTime();
              const isFrom = dayStr === from;
              const isTo = dayStr === to;
              const isSelected = isFrom || isTo;
              const inRange =
                fromTime !== null && toTime !== null && time > Math.min(fromTime, toTime) && time < Math.max(fromTime, toTime);
              const isToday = dayStr === todayStr;
              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => select(dayStr)}
                  className={cn(
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                    isSelected
                      ? 'bg-brand-600 font-semibold text-white shadow-sm'
                      : inRange
                        ? 'bg-brand-50 font-medium text-brand-700'
                        : 'text-slate-700 hover:bg-slate-100',
                    isToday && !isSelected && 'ring-1 ring-inset ring-brand-400',
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <p className="truncate text-xs text-slate-500">
              {from && !to ? 'Select end date' : from && to ? `${fmt(from)} → ${fmt(to)}` : 'Pick a start date'}
            </p>
            {(from || to) && (
              <button
                type="button"
                onClick={() => onChange({ from: '', to: '' })}
                className="shrink-0 text-xs font-medium text-slate-500 transition-colors hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}