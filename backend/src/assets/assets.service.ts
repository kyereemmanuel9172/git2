import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto, CreateMaintenanceDto } from './dto/assets.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    type?: string,
    condition?: string,
    search?: string,
    churchId?: string,
    opts?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const where: Prisma.AssetWhereInput = {
      ...(type ? { type: type as never } : {}),
      ...(condition ? { condition: condition as never } : {}),
      ...(churchId ? { churchId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
              { assignedTo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 20, 100);
    const sortField = opts?.sortBy ?? 'createdAt';
    const sortOrder = opts?.sortOrder ?? 'desc';

    const orderBy: Prisma.AssetOrderByWithRelationInput = {};
    if (sortField === 'name' || sortField === 'purchasePrice' || sortField === 'createdAt' || sortField === 'purchaseDate') {
      orderBy[sortField] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { maintenance: { orderBy: { date: 'desc' }, take: 5 } },
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, churchId?: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
      include: { maintenance: { orderBy: { date: 'desc' } } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async getStats(churchId?: string) {
    const where = churchId ? { churchId } : {};

    const [total, byType, byCondition, valueAgg] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
      this.prisma.asset.groupBy({
        by: ['condition'],
        where,
        _count: { id: true },
      }),
      this.prisma.asset.aggregate({
        where,
        _sum: { purchasePrice: true },
        _avg: { purchasePrice: true },
      }),
    ]);

    const typeBreakdown = byType.map((t) => ({
      type: t.type,
      count: t._count.id,
    }));

    const conditionBreakdown = byCondition.map((c) => ({
      condition: c.condition ?? 'UNKNOWN',
      count: c._count.id,
    }));

    return {
      total,
      totalValue: valueAgg._sum.purchasePrice ?? 0,
      averageValue: valueAgg._avg.purchasePrice ?? 0,
      byType: typeBreakdown,
      byCondition: conditionBreakdown,
    };
  }

  async create(dto: CreateAssetDto, churchId?: string) {
    return this.prisma.asset.create({ data: { ...dto, churchId: churchId ?? '' } });
  }

  async update(id: string, dto: Partial<CreateAssetDto>, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.asset.update({ where: { id }, data: dto });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.asset.delete({ where: { id } });
    return { deleted: true };
  }

  async addMaintenance(assetId: string, dto: CreateMaintenanceDto, churchId?: string) {
    await this.ensureExists(assetId, churchId);
    return this.prisma.assetMaintenance.create({ data: { ...dto, assetId } });
  }

  async removeMaintenance(id: string, churchId?: string) {
    const record = await this.prisma.assetMaintenance.findUnique({ where: { id }, include: { asset: true } });
    if (!record || (churchId && record.asset.churchId !== churchId)) {
      throw new NotFoundException('Maintenance record not found');
    }
    await this.prisma.assetMaintenance.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: string, churchId?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }
}
