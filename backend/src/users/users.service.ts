import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(page: number, limit: number, search?: string, churchId?: string) {
    const where = {
      ...(churchId ? { churchId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };
    return Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, name: true, role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]).then(([items, total]) => ({ items, total, page, limit }));
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, email: dto.email.toLowerCase(), passwordHash },
      select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    return this.prisma.user.update({ where: { id }, data: dto, select: { id: true, email: true, name: true, role: true, phone: true, isActive: true } });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async notifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { updated: true };
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
