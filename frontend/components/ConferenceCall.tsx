'use client';

import { useState } from 'react';
import { Phone, PhoneCall, Users, CheckCircle2 } from 'lucide-react';
import { Button, Avatar } from '@/components/ui';

interface ConferenceMember {
  id?: string;
  name: string;
  phone?: string | null;
}

interface ConferenceCallProps {
  title: string;
  participants: ConferenceMember[];
  onClose: () => void;
  onCheckIn?: (memberId: string) => void;
}

export default function ConferenceCall({ title, participants, onClose, onCheckIn }: ConferenceCallProps) {
  const [calledIds, setCalledIds] = useState<Set<string>>(new Set());
  const [callingId, setCallingId] = useState<string | null>(null);

  const membersWithPhone = participants.filter((p) => p.phone && p.phone.trim());
  const membersWithoutPhone = participants.filter((p) => !p.phone || !p.phone.trim());

  const dial = (phone: string, memberId?: string) => {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleaned}`;
    if (memberId) {
      setCallingId(memberId);
      setCalledIds((prev) => new Set(prev).add(memberId));
    }
  };

  const callAll = () => {
    if (membersWithPhone.length === 0) return;
    dial(membersWithPhone[0].phone!, membersWithPhone[0].id);
  };

  const markDone = (memberId: string) => {
    setCallingId(null);
    if (onCheckIn) onCheckIn(memberId);
  };

  const calledCount = calledIds.size;
  const totalWithPhone = membersWithPhone.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <Phone className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500">
              {calledCount > 0
                ? `${calledCount} of ${totalWithPhone} called`
                : `${totalWithPhone} members with phone numbers`}
            </p>
          </div>
        </div>
      </div>

      {totalWithPhone > 0 && (
        <div className="rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              Members to call
            </p>
            <Button size="sm" onClick={callAll} className="bg-emerald-600 hover:bg-emerald-700">
              <Phone className="h-3.5 w-3.5" />
              Call all
            </Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {membersWithPhone.map((m) => {
              const isCalled = m.id ? calledIds.has(m.id) : false;
              const isActive = m.id ? callingId === m.id : false;
              return (
                <li key={m.id ?? m.name} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={m.name} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.phone}</p>
                  </div>
                  {isCalled && !isActive ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Called
                    </span>
                  ) : isActive ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-amber-600">In call...</span>
                      {m.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markDone(m.id!)}
                          className="ml-1 h-7 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dial(m.phone!, m.id)}
                      className="h-8"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      Call
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {membersWithoutPhone.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            No phone number ({membersWithoutPhone.length})
          </p>
          <ul className="space-y-1">
            {membersWithoutPhone.map((m) => (
              <li key={m.id ?? m.name} className="flex items-center gap-2 text-sm text-slate-500">
                <Avatar name={m.name} className="h-6 w-6" />
                {m.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {membersWithPhone.length === 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No members have phone numbers recorded. Add phone numbers to member profiles first.
        </div>
      )}

      {totalWithPhone > 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <p className="font-medium text-slate-600">How it works:</p>
          <ol className="mt-1 list-inside list-decimal space-y-0.5">
            <li>Click <strong>Call</strong> next to a member — your phone dialer will open</li>
            <li>Talk to the member, then mark them as <strong>Done</strong></li>
            <li>Use your phone&apos;s built-in <strong>conference</strong> feature to add more callers</li>
            <li>Click <strong>Call all</strong> to start calling everyone one-by-one</li>
          </ol>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
