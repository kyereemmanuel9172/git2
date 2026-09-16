import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChurchDto, UpdateChurchDto } from './dto/churches.dto';

const DEFAULT_DEPARTMENTS = [
  'Choir',
  'Youth',
  'Ushers',
  'Media',
  "Children's Ministry",
  "Women's Fellowship",
  "Men's Fellowship",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class ChurchesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const churches = await this.prisma.church.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, members: true, events: true, contributions: true },
        },
      },
    });
    return churches.map((c) => ({
      ...c,
      userCount: c._count.users,
      memberCount: c._count.members,
      eventCount: c._count.events,
      contributionCount: c._count.contributions,
    }));
  }

  async findOne(id: string) {
    const church = await this.prisma.church.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, members: true, families: true, departments: true, events: true, contributions: true, payments: true },
        },
      },
    });
    if (!church) throw new NotFoundException('Church not found');
    return {
      ...church,
      userCount: church._count.users,
      memberCount: church._count.members,
      familyCount: church._count.families,
      departmentCount: church._count.departments,
      eventCount: church._count.events,
      contributionCount: church._count.contributions,
      paymentCount: church._count.payments,
    };
  }

  async update(id: string, dto: UpdateChurchDto) {
    await this.ensureExists(id);
    return this.prisma.church.update({ where: { id }, data: dto });
  }

  async create(dto: CreateChurchDto) {
    const slug = (dto.slug ?? slugify(dto.name)).toLowerCase();
    if (!slug) throw new BadRequestException('A valid slug is required');
    const existing = await this.prisma.church.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`Slug "${slug}" is already in use`);

    const existingAdmin = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existingAdmin) throw new BadRequestException('Admin email is already registered');

    const tempPassword = randomBytes(6).toString('base64url').slice(0, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const church = await this.prisma.$transaction(async (tx) => {
      const created = await tx.church.create({
        data: {
          name: dto.name,
          slug,
          email: dto.email,
          phone: dto.phone,
          country: dto.country,
          city: dto.city,
          address: dto.address,
          website: dto.website,
          currency: dto.currency ?? 'USD',
          timezone: dto.timezone ?? 'UTC',
          brandColor: dto.brandColor ?? '#4f46e5',
          serviceTimes: dto.serviceTimes,
          plan: dto.plan ?? 'Starter',
        },
      });

      await tx.user.create({
        data: {
          email: dto.adminEmail,
          name: dto.adminName,
          passwordHash,
          role: 'CHURCH_ADMIN',
          churchId: created.id,
        },
      });

      for (const name of DEFAULT_DEPARTMENTS) {
        await tx.department.create({ data: { name, churchId: created.id } });
      }

      return created;
    });

    return {
      church,
      adminEmail: dto.adminEmail,
      tempPassword,
      message: 'Church created. Share the temporary password with the new administrator to complete setup.',
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { church: true },
    });
    if (!user?.church) throw new NotFoundException('No church associated with this account');
    return user.church;
  }

  private async ensureExists(id: string) {
    const church = await this.prisma.church.findUnique({ where: { id } });
    if (!church) throw new NotFoundException('Church not found');
    return church;
  }
}
