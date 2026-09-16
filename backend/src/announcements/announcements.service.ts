import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcements.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number, status?: string, churchId?: string) {
    const where = {
      ...(churchId ? { churchId } : {}),
      ...(status ? { status: status as AnnouncementStatus } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { department: { select: { id: true, name: true } } },
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string, churchId?: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  async create(dto: CreateAnnouncementDto, actorId?: string, churchId?: string) {
    const published = dto.status === 'PUBLISHED';
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        departmentId: dto.departmentId,
        memberStatus: dto.memberStatus?.join(','),
        gender: dto.gender,
        city: dto.city,
        status: (dto.status as AnnouncementStatus) ?? 'DRAFT',
        publishedAt: published ? new Date() : null,
        createdBy: actorId,
        churchId: churchId ?? '',
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto, churchId?: string) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const publishingNow = dto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
    const archiving = dto.status === 'ARCHIVED' && existing.status !== 'ARCHIVED';

    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        departmentId: dto.departmentId,
        memberStatus: dto.memberStatus?.join(','),
        gender: dto.gender,
        city: dto.city,
        status: dto.status as AnnouncementStatus,
        publishedAt: publishingNow ? new Date() : archiving ? null : existing.publishedAt,
      },
    });
  }

  async publish(id: string, churchId?: string) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('Archived announcements cannot be republished');
    }
    return this.prisma.announcement.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async archive(id: string, churchId?: string) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.update({
      where: { id },
      data: { status: 'ARCHIVED', publishedAt: null },
    });
  }

  async remove(id: string, churchId?: string) {
    const existing = await this.prisma.announcement.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }
}
