import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/enums';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('entity') entity?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const where = entity ? { entity } : {};
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { user: { select: { name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: pageNum, limit: limitNum };
  }
}
