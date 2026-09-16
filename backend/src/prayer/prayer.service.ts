import { Injectable, NotFoundException } from '@nestjs/common';
import { PrayerStatus } from '../common/constants/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCounselingDto, CreatePrayerRequestDto, UpdatePrayerRequestDto } from './dto/prayer.dto';

@Injectable()
export class PrayerService {
  constructor(private prisma: PrismaService) {}

  async findPrayerRequests(status?: string, publicOnly = false, churchId?: string) {
    return this.prisma.prayerRequest.findMany({
      where: {
        ...(status ? { status: status as PrayerStatus } : {}),
        ...(publicOnly ? { isPublic: true } : {}),
        ...(churchId ? { churchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async createPrayerRequest(dto: CreatePrayerRequestDto, actorId?: string, churchId?: string) {
    return this.prisma.prayerRequest.create({
      data: { ...dto, prayedBy: dto.isPublic ? undefined : actorId, churchId: churchId ?? '' },
    });
  }

  async updatePrayerRequest(id: string, dto: UpdatePrayerRequestDto, churchId?: string) {
    await this.ensurePrayer(id, churchId);
    const data: Record<string, unknown> = { ...dto };
    if (dto.status === 'PRAYED_FOR' && !dto.prayedBy) {
      data.prayedForAt = new Date();
    }
    return this.prisma.prayerRequest.update({ where: { id }, data });
  }

  async removePrayerRequest(id: string, churchId?: string) {
    await this.ensurePrayer(id, churchId);
    await this.prisma.prayerRequest.delete({ where: { id } });
    return { deleted: true };
  }

  async counselingSessions(status?: string, churchId?: string) {
    return this.prisma.counselingSession.findMany({
      where: { ...(status ? { status: status as never } : {}), ...(churchId ? { churchId } : {}) },
      orderBy: { date: 'desc' },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, phone: true } },
        counselor: { select: { id: true, name: true } },
      },
    });
  }

  async createCounseling(dto: CreateCounselingDto, churchId?: string) {
    return this.prisma.counselingSession.create({
      data: { ...dto, status: (dto.status ?? 'SCHEDULED') as never, churchId: churchId ?? '' },
    });
  }

  async updateCounseling(id: string, dto: Partial<CreateCounselingDto>, churchId?: string) {
    await this.ensureCounseling(id, churchId);
    const data = dto.status ? { ...dto, status: dto.status as never } : { ...dto };
    return this.prisma.counselingSession.update({
      where: { id },
      data: data as never,
    });
  }

  async removeCounseling(id: string, churchId?: string) {
    await this.ensureCounseling(id, churchId);
    await this.prisma.counselingSession.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensurePrayer(id: string, churchId?: string) {
    const req = await this.prisma.prayerRequest.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!req) throw new NotFoundException('Prayer request not found');
    return req;
  }

  private async ensureCounseling(id: string, churchId?: string) {
    const session = await this.prisma.counselingSession.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!session) throw new NotFoundException('Counseling session not found');
    return session;
  }
}
