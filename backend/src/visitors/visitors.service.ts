import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitorDto } from './dto/visitors.dto';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(churchId?: string) {
    const visitors = await this.prisma.visitor.findMany({
      where: churchId ? { churchId } : {},
      orderBy: { visitedAt: 'desc' },
    });
    const total = await this.prisma.visitor.count({ where: churchId ? { churchId } : {} });
    const pending = await this.prisma.visitor.count({
      where: { followedUp: false, ...(churchId ? { churchId } : {}) },
    });
    return { items: visitors, total, pendingFollowUp: pending };
  }

  async findOne(id: string, churchId?: string) {
    const visitor = await this.prisma.visitor.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!visitor) throw new NotFoundException('Visitor not found');
    return visitor;
  }

  async create(dto: CreateVisitorDto, churchId?: string) {
    return this.prisma.visitor.create({ data: { ...dto, churchId: churchId ?? '' } });
  }

  async update(id: string, dto: Partial<CreateVisitorDto>, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.visitor.update({ where: { id }, data: dto });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.visitor.delete({ where: { id } });
    return { deleted: true };
  }

  async markFollowedUp(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.visitor.update({ where: { id }, data: { followedUp: true } });
  }

  async convertToMember(id: string, memberId: string, churchId?: string) {
    const visitor = await this.ensureExists(id, churchId);
    const member = await this.prisma.member.findUnique({
      where: { id: memberId, ...(churchId ? { churchId } : {}) },
    });
    if (!member) throw new BadRequestException('Member not found');
    return this.prisma.visitor.update({
      where: { id: visitor.id },
      data: { convertedMemberId: memberId, followedUp: true },
    });
  }

  async exportCsv(churchId?: string) {
    const visitors = await this.prisma.visitor.findMany({
      where: churchId ? { churchId } : {},
      orderBy: { visitedAt: 'desc' },
    });
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ['Full Name', 'Phone', 'Email', 'Gender', 'Member Type', 'Visited At', 'Host', 'Followed Up', 'Converted Member ID', 'Notes'];
    const rows = visitors.map((v) => [
      v.fullName,
      v.phone ?? '',
      v.email ?? '',
      v.gender ?? '',
      v.memberType ?? '',
      v.visitedAt.toISOString(),
      v.hostName ?? '',
      v.followedUp ? 'Yes' : 'No',
      v.convertedMemberId ?? '',
      v.notes ?? '',
    ]);
    return [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  }

  private async ensureExists(id: string, churchId?: string) {
    const visitor = await this.prisma.visitor.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!visitor) throw new NotFoundException('Visitor not found');
    return visitor;
  }
}
