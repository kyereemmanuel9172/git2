import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDayDto, SetTodayServiceDto } from './dto/services.dto';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(churchId?: string) {
    const days = await this.prisma.serviceDay.findMany({
      where: churchId ? { churchId } : {},
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
      include: { _count: { select: { schedules: true } } },
    });
    const schedules = await this.prisma.serviceSchedule.findMany({
      where: { date: new Date(todayString()), ...(churchId ? { churchId } : {}) },
      include: { serviceDay: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      serviceDays: days.map((d) => ({
        ...d,
        weekdayLabel: WEEKDAYS[d.weekday] ?? 'Unknown',
        scheduleCount: d._count.schedules,
      })),
      today: schedules,
    };
  }

  async findToday(churchId?: string) {
    const schedules = await this.prisma.serviceSchedule.findMany({
      where: { date: new Date(todayString()), ...(churchId ? { churchId } : {}) },
      include: { serviceDay: true },
      orderBy: { createdAt: 'asc' },
    });
    return schedules.map((s) => ({
      ...s,
      date: toDateOnly(s.date.toISOString()),
      serviceDay: { ...s.serviceDay, weekdayLabel: WEEKDAYS[s.serviceDay.weekday] ?? 'Unknown' },
    }));
  }

  async create(dto: CreateServiceDayDto, churchId?: string) {
    const existing = await this.prisma.serviceDay.findUnique({
      where: { churchId_name: { churchId: churchId ?? '', name: dto.name } },
    });
    if (existing) throw new BadRequestException('A service day with this name already exists');
    const created = await this.prisma.serviceDay.create({
      data: { ...dto, churchId: churchId ?? '' },
    });
    return { ...created, weekdayLabel: WEEKDAYS[created.weekday] ?? 'Unknown' };
  }

  async update(id: string, dto: Partial<CreateServiceDayDto>, churchId?: string) {
    await this.ensureExists(id, churchId);
    const updated = await this.prisma.serviceDay.update({ where: { id }, data: dto });
    return { ...updated, weekdayLabel: WEEKDAYS[updated.weekday] ?? 'Unknown' };
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.serviceDay.delete({ where: { id } });
    return { deleted: true };
  }

  async setToday(dto: SetTodayServiceDto, churchId?: string, actorId?: string) {
    const day = await this.prisma.serviceDay.findUnique({
      where: { id: dto.serviceDayId, ...(churchId ? { churchId } : {}) },
    });
    if (!day) throw new NotFoundException('Service day not found');

    const date = dto.date ? toDateOnly(dto.date) : todayString();
    const existing = await this.prisma.serviceSchedule.findUnique({
      where: { churchId_date: { churchId: churchId ?? '', date: new Date(date) } },
    });
    if (existing) throw new BadRequestException('A service is already scheduled for this date');

    const created = await this.prisma.serviceSchedule.create({
      data: { date: new Date(date), serviceDayId: day.id, churchId: churchId ?? '', createdBy: actorId },
      include: { serviceDay: true },
    });
    return { ...created, date: toDateOnly(created.date.toISOString()) };
  }

  async clearToday(date?: string, churchId?: string) {
    const d = date ? toDateOnly(date) : todayString();
    await this.prisma.serviceSchedule.deleteMany({
      where: { date: new Date(d), ...(churchId ? { churchId } : {}) },
    });
    return { deleted: true };
  }

  private async ensureExists(id: string, churchId?: string) {
    const day = await this.prisma.serviceDay.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!day) throw new NotFoundException('Service day not found');
    return day;
  }
}
