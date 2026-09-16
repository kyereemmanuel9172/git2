import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/children.dto';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  async findAll(churchId?: string) {
    const children = await this.prisma.child.findMany({
      where: churchId ? { churchId } : {},
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const total = await this.prisma.child.count({ where: churchId ? { churchId } : {} });
    return { items: children, total };
  }

  async findOne(id: string, churchId?: string) {
    const child = await this.prisma.child.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!child) throw new NotFoundException('Child not found');
    return child;
  }

  async create(dto: CreateChildDto, churchId?: string) {
    const { dateOfBirth, ...rest } = dto;
    return this.prisma.child.create({
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        churchId: churchId ?? '',
      },
    });
  }

  async update(id: string, dto: Partial<CreateChildDto>, churchId?: string) {
    await this.ensureExists(id, churchId);
    const { dateOfBirth, ...rest } = dto;
    return this.prisma.child.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : dateOfBirth === null ? null : undefined,
      },
    });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.child.delete({ where: { id } });
    return { deleted: true };
  }

  async exportCsv(churchId?: string) {
    const children = await this.prisma.child.findMany({
      where: churchId ? { churchId } : {},
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ['First Name', 'Last Name', 'Gender', 'Date of Birth', 'Guardian Name', 'Guardian Phone', 'Ministry', 'Notes'];
    const rows = children.map((c) => [
      c.firstName,
      c.lastName,
      c.gender ?? '',
      c.dateOfBirth ? c.dateOfBirth.toISOString() : '',
      c.guardianName ?? '',
      c.guardianPhone ?? '',
      c.ministry ?? '',
      c.notes ?? '',
    ]);
    return [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  }

  private async ensureExists(id: string, churchId?: string) {
    const child = await this.prisma.child.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!child) throw new NotFoundException('Child not found');
    return child;
  }
}
