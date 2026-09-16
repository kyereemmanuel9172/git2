'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CalendarPlus, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { api, formatDate } from '@/lib/api';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Badge,
  Modal,
  Table,
  Td,
  Spinner,
  EmptyState,
  PageHeader,
  Toast,
  useToast,
  StatCard,
} from '@/components/ui';

interface ServiceDay {
  id: string;
  name: string;
  weekday: number;
  startTime: string;
  isActive: boolean;
  weekdayLabel: string;
  scheduleCount: number;
}

interface TodaySchedule {
  id: string;
  date: string;
  serviceDay: ServiceDay;
}

interface ServicesResponse {
  serviceDays: ServiceDay[];
  today: TodaySchedule[];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WEEKDAY_COLORS: Record<number, 'indigo' | 'purple' | 'amber' | 'green' | 'red' | 'blue' | 'slate'> = {
  0: 'red',
  1: 'indigo',
  2: 'purple',
  3: 'green',
  4: 'amber',
  5: 'blue',
  6: 'slate',
};

function toDateInput(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function ServicesPage() {
  const { toast, message } = useToast();
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [dayOpen, setDayOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceDay | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceDay | null>(null);
  const [todayOpen, setTodayOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dayForm, setDayForm] = useState({ name: '', weekday: 0, startTime: '08:30' });
  const [todayForm, setTodayForm] = useState({ date: toDateInput(new Date().toISOString()), serviceDayId: '' });

  const load = useCallback(async () => {
    try {
      const res = await api<ServicesResponse>('/services');
      setData(res);
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (day: ServiceDay) => {
    setEditTarget(day);
    setDayForm({ name: day.name, weekday: day.weekday, startTime: day.startTime });
  };

  const handleSaveDay = async () => {
    if (!dayForm.name.trim()) {
      toast('Please enter a service name');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await api(`/services/${editTarget.id}`, { method: 'PATCH', body: dayForm });
        toast('Service day updated');
      } else {
        await api('/services', { method: 'POST', body: dayForm });
        toast('Service day created');
      }
      setDayOpen(false);
      setEditTarget(null);
      setDayForm({ name: '', weekday: 0, startTime: '08:30' });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save service day');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/services/${deleteTarget.id}`, { method: 'DELETE' });
      toast('Service day deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Failed to delete service day');
    } finally {
      setSaving(false);
    }
  };

  const handleSetToday = async () => {
    if (!todayForm.serviceDayId) {
      toast('Please select a service day');
      return;
    }
    setSaving(true);
    try {
      await api('/services/today', {
        method: 'POST',
        body: { serviceDayId: todayForm.serviceDayId, date: todayForm.date || undefined },
      });
      toast('Service scheduled for this date');
      setTodayOpen(false);
      setTodayForm((f) => ({ ...f, serviceDayId: '' }));
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to schedule service');
    } finally {
      setSaving(false);
    }
  };

  const handleClearToday = async (date: string) => {
    setSaving(true);
    try {
      await api(`/services/today/${date}`, { method: 'DELETE' });
      toast('Service removed for this date');
      load();
    } catch {
      toast('Failed to remove service');
    } finally {
      setSaving(false);
    }
  };

  if (!data && loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        subtitle="Service days and schedules"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setTodayOpen(true)} disabled={data?.serviceDays.length === 0}>
              <CalendarPlus className="h-4 w-4" />
              Set service for a date
            </Button>
            <Button onClick={() => setDayOpen(true)}>
              <Plus className="h-4 w-4" />
              New service day
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard index={0} tone="indigo" label="Service days" value={data?.serviceDays.length ?? 0} icon={<CalendarClock className="h-4 w-4" />} hint="Saved schedule" />
        <StatCard index={1} tone="emerald" label="Scheduled today" value={data?.today.length ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} hint="Today's service(s)" />
        <StatCard index={2} tone="sky" label="Total scheduled" value={data?.serviceDays.reduce((s, d) => s + d.scheduleCount, 0) ?? 0} icon={<CalendarPlus className="h-4 w-4" />} hint="Across all dates" />
      </div>

      <Card>
        <CardHeader title="Today's service" subtitle="What is happening on this date" />
        <CardBody>
          {data?.today.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-8 w-8" />}
              title="No service scheduled today"
              subtitle="Set a service day to begin configuring your schedule"
            />
          ) : (
            <div className="space-y-2">
              {data?.today.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.serviceDay.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(s.date)} · {s.serviceDay.weekdayLabel} · {s.serviceDay.startTime}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleClearToday(s.date)} disabled={saving} title="Remove for this date">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Saved service days" subtitle={`${data?.serviceDays.length ?? 0} reusable service schedules`} />
        <CardBody className="p-0">
          {data?.serviceDays.length === 0 ? (
            <EmptyState icon={<CalendarPlus className="h-8 w-8" />} title="No service days yet" subtitle="Create your first service day to begin configuration" />
          ) : (
            <Table headers={['Service name', 'Day', 'Start time', 'Times scheduled', 'Status', 'Actions']}>
              {data?.serviceDays.map((day) => (
                <tr key={day.id}>
                  <Td className="font-medium text-slate-800">{day.name}</Td>
                  <Td>
                    <Badge color={WEEKDAY_COLORS[day.weekday] ?? 'slate'}>{day.weekdayLabel}</Badge>
                  </Td>
                  <Td className="tabular-nums text-slate-600">{day.startTime}</Td>
                  <Td className="text-slate-500">{day.scheduleCount}</Td>
                  <Td>
                    <Badge color={day.isActive ? 'green' : 'amber'}>{day.isActive ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(day)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(day)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={dayOpen || !!editTarget} onClose={() => { setDayOpen(false); setEditTarget(null); }} title={editTarget ? 'Edit service day' : 'New service day'}>
        <div className="space-y-4">
          <Input
            label="Service name"
            value={dayForm.name}
            onChange={(e) => setDayForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Sunday Service"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Day" value={String(dayForm.weekday)} onChange={(e) => setDayForm((f) => ({ ...f, weekday: Number(e.target.value) }))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
            <Input
              label="Start time"
              type="time"
              value={dayForm.startTime}
              onChange={(e) => setDayForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setDayOpen(false); setEditTarget(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveDay} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={todayOpen} onClose={() => setTodayOpen(false)} title="Set service for a date">
        <div className="space-y-4">
          <Input
            label="Service date"
            type="date"
            value={todayForm.date}
            onChange={(e) => setTodayForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Select label="Select service day" value={todayForm.serviceDayId} onChange={(e) => setTodayForm((f) => ({ ...f, serviceDayId: e.target.value }))}>
            <option value="">Choose a service day</option>
            {data?.serviceDays.map((day) => (
              <option key={day.id} value={day.id}>
                {day.name} — {day.weekdayLabel} · {day.startTime}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setTodayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetToday} disabled={saving}>
              {saving ? 'Saving…' : 'Schedule service'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete service day">
        <p className="text-sm text-slate-600">Are you sure you want to delete this service day? Any schedules linked to it will also be removed.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
