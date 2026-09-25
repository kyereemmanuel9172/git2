import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MemberStatus, ServiceType } from '../common/constants/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto } from './dto/attendance.dto';
import { AttendanceService } from './attendance.service';

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-1',
    memberId: 'member-1',
    churchId: 'church-1',
    serviceType: ServiceType.SUNDAY,
    date: new Date('2026-09-25T00:00:00.000Z'),
    checkedInAt: new Date('2026-09-25T08:00:00.000Z'),
    checkedInBy: null,
    checkedOutAt: null,
    checkedOutBy: null,
    notes: null,
    member: { id: 'member-1', membershipStatus: MemberStatus.ACTIVE },
    ...overrides,
  };
}

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    member: { findFirst: jest.Mock };
    attendanceRecord: { findFirst: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      member: {
        findFirst: jest.fn().mockResolvedValue({ id: 'member-1', membershipStatus: MemberStatus.ACTIVE }),
      },
      attendanceRecord: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(makeRecord()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  it('validates checkedInAt as a date', async () => {
    const checkedInAt = new Date('2026-09-25T08:00:00.000Z');
    const valid = plainToInstance(CheckInDto, {
      memberId: 'member-1',
      serviceType: ServiceType.SUNDAY,
      checkedInAt: checkedInAt.toISOString(),
    });
    const invalid = plainToInstance(CheckInDto, {
      memberId: 'member-1',
      serviceType: ServiceType.SUNDAY,
      checkedInAt: 'not-a-date',
    });

    expect(await validate(valid)).toHaveLength(0);
    expect(valid.checkedInAt).toEqual(checkedInAt);
    expect((await validate(invalid)).some((error) => error.property === 'checkedInAt')).toBe(true);
  });

  it('requires a church ID for check-in', async () => {
    await expect(
      service.checkIn({ memberId: 'member-1', serviceType: ServiceType.SUNDAY }, 'actor-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('rejects non-active members for check-in', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1', membershipStatus: MemberStatus.INACTIVE });

    await expect(
      service.checkIn({ memberId: 'member-1', serviceType: ServiceType.SUNDAY }, 'actor-1', 'church-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.attendanceRecord.findFirst).not.toHaveBeenCalled();
  });

  it('preserves the occurrence timestamp when creating a record', async () => {
    const checkedInAt = new Date('2026-09-25T07:30:00.000Z');

    const result = await service.checkIn(
      { memberId: 'member-1', serviceType: ServiceType.SUNDAY, date: new Date('2026-09-25T00:00:00.000Z'), checkedInAt },
      'actor-1',
      'church-1',
    );

    expect(result.alreadyCheckedIn).toBe(false);
    expect(prisma.member.findFirst).toHaveBeenCalledWith({ where: { id: 'member-1', churchId: 'church-1' } });
    expect(prisma.attendanceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ churchId: 'church-1', checkedInAt }),
      }),
    );
  });

  it('reopens with a conditional update and preserves the timestamp', async () => {
    const checkedInAt = new Date('2026-09-25T07:30:00.000Z');
    const closed = makeRecord({ checkedOutAt: new Date('2026-09-25T09:00:00.000Z'), checkedOutBy: 'actor-old' });
    const reopened = makeRecord({ checkedInAt, checkedInBy: 'actor-1' });
    prisma.attendanceRecord.findFirst.mockResolvedValueOnce(closed).mockResolvedValueOnce(reopened);

    const result = await service.checkIn(
      { memberId: 'member-1', serviceType: ServiceType.SUNDAY, date: new Date('2026-09-25T00:00:00.000Z'), checkedInAt },
      'actor-1',
      'church-1',
    );

    expect(result.alreadyCheckedIn).toBe(false);
    expect(result.record.checkedInAt).toEqual(checkedInAt);
    expect(prisma.attendanceRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-1', churchId: 'church-1', checkedOutAt: { not: null } },
      data: { checkedInAt, checkedOutAt: null, checkedOutBy: null, checkedInBy: 'actor-1' },
    });
  });

  it('handles a concurrent record creation', async () => {
    prisma.attendanceRecord.create.mockRejectedValue({ code: 'P2002' });
    prisma.attendanceRecord.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(makeRecord());

    const result = await service.checkIn(
      { memberId: 'member-1', serviceType: ServiceType.SUNDAY, date: new Date('2026-09-25T00:00:00.000Z') },
      'actor-1',
      'church-1',
    );

    expect(result.alreadyCheckedIn).toBe(true);
    expect(prisma.attendanceRecord.findFirst).toHaveBeenLastCalledWith({
      where: expect.objectContaining({ memberId: 'member-1', churchId: 'church-1' }),
    });
  });

  it('returns already checked out when a checkout loses the race', async () => {
    const open = makeRecord();
    const closed = makeRecord({ checkedOutAt: new Date('2026-09-25T09:00:00.000Z'), checkedOutBy: 'actor-2' });
    prisma.attendanceRecord.findFirst.mockResolvedValueOnce(open).mockResolvedValueOnce(closed);
    prisma.attendanceRecord.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.checkOut({ recordId: 'record-1' }, 'actor-1', 'church-1');

    expect(result.alreadyCheckedOut).toBe(true);
    expect(result.record.checkedOutAt).toEqual(closed.checkedOutAt);
    expect(prisma.attendanceRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'record-1', churchId: 'church-1', checkedOutAt: null },
      data: { checkedOutAt: expect.any(Date), checkedOutBy: 'actor-1' },
    });
  });

  it('scopes a member checkout to the requested service', async () => {
    const open = makeRecord({ serviceType: ServiceType.MIDWEEK });
    const closed = makeRecord({
      serviceType: ServiceType.MIDWEEK,
      checkedOutAt: new Date('2026-09-25T09:00:00.000Z'),
      checkedOutBy: 'actor-1',
    });
    prisma.attendanceRecord.findFirst.mockResolvedValueOnce(open).mockResolvedValueOnce(closed);
    prisma.attendanceRecord.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.checkOut(
      { memberId: 'member-1', serviceType: ServiceType.MIDWEEK },
      'actor-1',
      'church-1',
    );

    expect(result.alreadyCheckedOut).toBe(false);
    expect(prisma.attendanceRecord.findFirst).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        memberId: 'member-1',
        churchId: 'church-1',
        serviceType: ServiceType.MIDWEEK,
        checkedOutAt: null,
      }),
    }));
  });
});
