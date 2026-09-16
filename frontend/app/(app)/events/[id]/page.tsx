'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  MapPin,
  Printer,
  UserPlus,
  Users,
} from 'lucide-react';
import { api, formatDate, formatDateTime, titleCase } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardBody,
  EmptyState,
  Modal,
  Select,
  Spinner,
  StatCard,
  statusColor,
  Table,
  Td,
  Toast,
  useToast,
} from '@/components/ui';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

interface Registration {
  id: string;
  status: string;
  attended?: boolean;
  registeredAt: string;
  member: Member;
}

interface EventDetail {
  id: string;
  title: string;
  description?: string;
  type?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  capacity?: number;
  status: string;
  registrations: Registration[];
}

interface CertificatesResponse {
  event: EventDetail;
  attendees: Registration[];
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast, message } = useToast();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [certData, setCertData] = useState<CertificatesResponse | null>(null);

  const loadEvent = () => {
    api<EventDetail>(`/events/${id}`)
      .then(setEvent)
      .catch(() => toast('Failed to load event'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  useEffect(() => {
    api<{ items: Member[] }>('/members?limit=200')
      .then((res) => setMembers(res.items))
      .catch(() => {});
  }, []);

  const handleRegister = async () => {
    if (!memberId) return;
    setRegistering(true);
    try {
      await api(`/events/${id}/register`, { method: 'POST', body: { memberId } });
      toast('Member registered');
      setRegisterOpen(false);
      setMemberId('');
      loadEvent();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to register member');
    } finally {
      setRegistering(false);
    }
  };

  const openCertificates = () => {
    setCertOpen(true);
    api<CertificatesResponse>(`/events/${id}/certificates`)
      .then(setCertData)
      .catch(() => toast('Failed to load certificates'));
  };

  const toggleAttended = async (reg: Registration, attended: boolean) => {
    try {
      await api(`/events/registrations/${reg.id}`, { method: 'PATCH', body: { attended } });
      setEvent((prev) =>
        prev
          ? { ...prev, registrations: prev.registrations.map((r) => (r.id === reg.id ? { ...r, attended } : r)) }
          : prev,
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to update attendance');
    }
  };

  const removeRegistration = async (reg: Registration) => {
    if (!window.confirm(`Cancel registration for ${reg.member.firstName} ${reg.member.lastName}?`)) return;
    try {
      await api(`/events/registrations/${reg.id}`, { method: 'PATCH', body: { status: 'CANCELLED' } });
      toast('Registration cancelled');
      loadEvent();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to cancel registration');
    }
  };

  if (loading || !event) return <Spinner />;

  return (
    <div>
      <div className="print:hidden">
        <Link
          href="/events"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
              <Badge color={statusColor(event.status)}>{titleCase(event.status)}</Badge>
              {event.type && <Badge color="indigo">{titleCase(event.type)}</Badge>}
            </div>
            {event.description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{event.description}</p>}
            {event.location && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {event.location}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setRegisterOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Register member
            </Button>
            <Button variant="secondary" onClick={openCertificates}>
              <Award className="h-4 w-4" />
              Certificates
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Registrations" value={event.registrations.length} icon={<Users className="h-4 w-4" />} />
          <StatCard label="Capacity" value={event.capacity ?? 'Unlimited'} icon={<CalendarDays className="h-4 w-4" />} />
          <StatCard label="Start" value={formatDateTime(event.startDate)} />
          <StatCard label="End" value={event.endDate ? formatDateTime(event.endDate) : '—'} />
        </div>

        <Card>
          <CardHeader title="Registrations" subtitle={`${event.registrations.length} member(s) registered`} />
          <CardBody>
            {event.registrations.length === 0 ? (
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title="No registrations yet"
                subtitle="Register members to track their attendance."
              />
            ) : (
              <Table headers={['Member', 'Status', 'Attended', 'Registered', '']}>
                {event.registrations.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <p className="font-medium text-slate-800">
                        {r.member.firstName} {r.member.lastName}
                      </p>
                      {r.member.email && <p className="text-xs text-slate-400">{r.member.email}</p>}
                    </Td>
                    <Td>
                      <Badge color={statusColor(r.status)}>{titleCase(r.status)}</Badge>
                    </Td>
                    <Td>
                      <input
                        type="checkbox"
                        checked={!!r.attended}
                        onChange={(e) => toggleAttended(r, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </Td>
                    <Td>{formatDate(r.registeredAt)}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => removeRegistration(r)}>
                        Remove
                      </Button>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </CardBody>
        </Card>

        <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Register member">
          <div className="space-y-4">
            <Select label="Member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setRegisterOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRegister} disabled={!memberId || registering}>
                {registering ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={certOpen} onClose={() => setCertOpen(false)} title="Certificates" wide>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              {certData?.attendees.length ?? 0} attendee(s) eligible for certificates
            </p>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print certificates
            </Button>
          </div>
          {!certData ? (
            <Spinner className="py-8" />
          ) : certData.attendees.length === 0 ? (
            <EmptyState
              icon={<Award className="h-10 w-10" />}
              title="No attendees yet"
              subtitle="Mark registrations as attended to generate certificates."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {certData.attendees.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-slate-700">
                    {a.member.firstName} {a.member.lastName}
                  </span>
                  <Badge color="green">Attended</Badge>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      </div>

      {certData && certData.attendees.length > 0 && (
        <div className="hidden print:block">
          {certData.attendees.map((a, idx) => (
            <div
              key={a.id}
              className="mx-auto my-8 flex min-h-[75vh] w-4/5 max-w-2xl flex-col items-center justify-center border-4 border-double border-slate-800 p-12 text-center"
              style={idx > 0 ? { pageBreakBefore: 'always' } : undefined}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Church Administration</p>
              <h2 className="mt-6 text-3xl font-bold uppercase text-slate-900">Certificate of Participation</h2>
              <div className="my-6 h-px w-40 bg-slate-300" />
              <p className="text-sm text-slate-600">This is to certify that</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {a.member.firstName} {a.member.lastName}
              </p>
              <p className="mt-6 text-sm text-slate-600">
                participated in <span className="font-semibold text-slate-900">{event.title}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                held on <span className="font-semibold text-slate-900">{formatDate(event.startDate)}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
