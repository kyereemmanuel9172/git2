import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, RegisterDto, UpdateRegistrationDto } from './dto/events.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, type?: string, churchId?: string) {
    const events = await this.prisma.churchEvent.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(type ? { type } : {}),
        ...(churchId ? { churchId } : {}),
      },
      orderBy: { startDate: 'asc' },
      include: { _count: { select: { registrations: true } } },
    });
    return events.map((e) => ({ ...e, registrations: e._count.registrations }));
  }

  async findOne(id: string, churchId?: string) {
    const event = await this.prisma.churchEvent.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
      include: {
        registrations: {
          include: { member: true },
          orderBy: { registeredAt: 'asc' },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async create(dto: CreateEventDto, churchId?: string) {
    return this.prisma.churchEvent.create({ data: { ...dto, churchId: churchId ?? '' } });
  }

  async update(id: string, dto: Partial<CreateEventDto>, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.churchEvent.update({ where: { id }, data: dto });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.churchEvent.delete({ where: { id } });
    return { deleted: true };
  }

  async register(eventId: string, dto: RegisterDto, churchId?: string) {
    const event = await this.ensureExists(eventId, churchId);
    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId: dto.memberId } },
    });
    if (existing) throw new BadRequestException('Member is already registered for this event');

    const confirmedCount = await this.prisma.eventRegistration.count({
      where: { eventId, status: 'CONFIRMED' },
    });
    const status = event.capacity && confirmedCount >= event.capacity ? 'WAITLIST' : 'CONFIRMED';

    return this.prisma.eventRegistration.create({
      data: { eventId, memberId: dto.memberId, status, churchId: churchId ?? '' },
      include: { member: true },
    });
  }

  async updateRegistration(registrationId: string, dto: UpdateRegistrationDto, churchId?: string) {
    if (churchId) {
      const link = await this.prisma.eventRegistration.findUnique({ where: { id: registrationId }, select: { churchId: true } });
      if (!link || link.churchId !== churchId) throw new NotFoundException('Registration not found');
    }
    const data: Record<string, unknown> = {};
    if (dto.attended !== undefined) data.attended = dto.attended;
    if (dto.status) data.status = dto.status;
    return this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data,
      include: { member: true },
    });
  }

  async certificates(eventId: string, churchId?: string) {
    const event = await this.findOne(eventId, churchId);
    const attended = event.registrations.filter((r) => r.attended);
    return { event, attendees: attended };
  }

  private async ensureExists(id: string, churchId?: string) {
    const event = await this.prisma.churchEvent.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
