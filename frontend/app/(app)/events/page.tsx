'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { api, formatDateTime, titleCase } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  statusColor,
  Textarea,
  Toast,
  useToast,
} from '@/components/ui';

interface EventItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  capacity?: number;
  status: string;
  registrations: number;
}

interface EventForm {
  title: string;
  type: string;
  location: string;
  startDate: string;
  endDate: string;
  capacity: string;
  description: string;
  status: string;
}

const emptyForm: EventForm = {
  title: '',
  type: '',
  location: '',
  startDate: '',
  endDate: '',
  capacity: '',
  description: '',
  status: 'UPCOMING',
};

const statuses = ['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventsPage() {
  const { toast, message } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const loadEvents = () => {
    setLoading(true);
    const path = statusFilter === 'ALL' ? '/events' : `/events?status=${statusFilter}`;
    api<EventItem[]>(path)
      .then(setEvents)
      .catch(() => toast('Failed to load events'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, [statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (ev: EventItem) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      type: ev.type ?? '',
      location: ev.location ?? '',
      startDate: toDatetimeLocal(ev.startDate),
      endDate: toDatetimeLocal(ev.endDate),
      capacity: ev.capacity != null ? String(ev.capacity) : '',
      description: ev.description ?? '',
      status: ev.status,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.startDate) {
      toast('Title and start date are required');
      return;
    }
    try {
      const body = {
        title: form.title,
        type: form.type.trim() || undefined,
        location: form.location.trim() || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        description: form.description.trim() || undefined,
        status: form.status,
      };
      if (editing) {
        await api(`/events/${editing.id}`, { method: 'PATCH', body });
        toast('Event updated');
      } else {
        await api('/events', { method: 'POST', body });
        toast('Event created');
      }
      closeModal();
      loadEvents();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save event');
    }
  };

  const handleDelete = async (ev: EventItem) => {
    if (!window.confirm(`Delete event "${ev.title}"?`)) return;
    try {
      await api(`/events/${ev.id}`, { method: 'DELETE' });
      toast('Event deleted');
      loadEvents();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to delete event');
    }
  };

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Plan and manage church events"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New event
          </Button>
        }
      />

      <div className="mb-6 flex items-center justify-end">
        <Select className="w-44" label="" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner />
      ) : events.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<CalendarDays className="h-10 w-10" />}
              title="No events found"
              subtitle="Create an event to start tracking registrations and attendance."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Card key={ev.id} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">{ev.title}</h3>
                  <Badge color={statusColor(ev.status)}>{titleCase(ev.status)}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {ev.type && <Badge color="indigo">{titleCase(ev.type)}</Badge>}
                  <span className="text-xs text-slate-400">{formatDateTime(ev.startDate)}</span>
                </div>
                {ev.description && (
                  <p className="mt-3 text-xs text-slate-500 line-clamp-2">{ev.description}</p>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {ev.location || 'No location set'}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {ev.registrations} registered{ev.capacity ? ` / ${ev.capacity} capacity` : ''}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <Link
                    href={`/events/${ev.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    View
                  </Link>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(ev)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(ev)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit event' : 'New event'} wide>
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Sunday Worship Service"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Type"
              placeholder="e.g. Worship, Outreach"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <Input
              label="Location"
              placeholder="e.g. Main Sanctuary"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start"
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              label="End"
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capacity"
              type="number"
              min={1}
              placeholder="Optional"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Description"
            rows={3}
            placeholder="Event details..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editing ? 'Save changes' : 'Create event'}</Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
