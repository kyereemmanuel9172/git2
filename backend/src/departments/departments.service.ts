import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignMemberDto, CreateDepartmentDto } from './dto/departments.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(churchId?: string, opts?: { search?: string; page?: number; limit?: number }) {
    const where: Prisma.DepartmentWhereInput = {
      ...(churchId ? { churchId } : {}),
      ...(opts?.search
        ? {
            OR: [
              { name: { contains: opts.search, mode: 'insensitive' } },
              { description: { contains: opts.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 50, 100);

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { members: true } },
          members: { include: { member: true }, take: 20 },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      items: departments.map((d) => ({
        ...d,
        memberCount: d._count.members,
        members: d.members.map((m) => ({ id: m.id, role: m.role, joinedAt: m.joinedAt, member: m.member })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(churchId?: string) {
    const where = churchId ? { churchId } : {};

    const [totalDepts, deptsWithMembers, memberCounts] = await Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.memberDepartment.aggregate({
        where: { department: where },
        _count: { id: true },
      }),
    ]);

    const totalMembers = memberCounts._count.id;
    const avgMembers = totalDepts > 0 ? Math.round((totalMembers / totalDepts) * 10) / 10 : 0;

    const byDept = deptsWithMembers.map((d) => ({
      id: d.id,
      name: d.name,
      memberCount: d._count.members,
    }));

    return {
      totalDepartments: totalDepts,
      totalMembers,
      avgMembers,
      departments: byDept,
    };
  }

  async findOne(id: string, churchId?: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
      include: {
        members: { include: { member: true }, orderBy: { joinedAt: 'desc' } },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto, churchId?: string) {
    const existing = await this.prisma.department.findUnique({ where: { churchId_name: { churchId: churchId ?? '', name: dto.name } } });
    if (existing) throw new BadRequestException('Department with this name already exists');
    return this.prisma.department.create({ data: { ...dto, churchId: churchId ?? '' } });
  }

  async update(id: string, dto: Partial<CreateDepartmentDto>, churchId?: string) {
    await this.ensureExists(id, churchId);
    if (dto.name) {
      const existing = await this.prisma.department.findFirst({
        where: { name: dto.name, id: { not: id }, churchId: churchId ?? '' },
      });
      if (existing) throw new BadRequestException('Another department with this name already exists');
    }
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.memberDepartment.deleteMany({ where: { departmentId: id } });
    await this.prisma.department.delete({ where: { id } });
    return { deleted: true };
  }

  async assignMember(departmentId: string, dto: AssignMemberDto, churchId?: string) {
    await this.ensureExists(departmentId, churchId);
    const member = await this.prisma.member.findUnique({ where: { id: dto.memberId, ...(churchId ? { churchId } : {}) } });
    if (!member) throw new BadRequestException('Member not found');

    const existing = await this.prisma.memberDepartment.findUnique({
      where: { departmentId_memberId: { departmentId, memberId: dto.memberId } },
    });
    if (existing) throw new BadRequestException('Member already in this department');

    return this.prisma.memberDepartment.create({
      data: { departmentId, memberId: dto.memberId, role: dto.role },
      include: { member: true },
    });
  }

  async removeMember(memberDepartmentId: string, churchId?: string) {
    const link = await this.prisma.memberDepartment.findUnique({ where: { id: memberDepartmentId }, include: { department: true } });
    if (!link || (churchId && link.department?.churchId !== churchId)) {
      throw new NotFoundException('Department member not found');
    }
    await this.prisma.memberDepartment.delete({ where: { id: memberDepartmentId } });
    return { deleted: true };
  }

  private async ensureExists(id: string, churchId?: string) {
    const dept = await this.prisma.department.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }
}
