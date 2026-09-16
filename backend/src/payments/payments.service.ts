import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentSource, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payments.dto';

export interface PaymentFilters {
  status?: PaymentStatus;
  method?: PaymentMethod;
  source?: PaymentSource;
  category?: string;
  from?: string;
  to?: string;
  memberId?: string;
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(filters: PaymentFilters, churchId?: string): Prisma.PaymentWhereInput {
    return {
      ...(churchId ? { churchId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.category ? { category: { contains: filters.category } } : {}),
      ...(filters.memberId ? { memberId: filters.memberId } : {}),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    };
  }

  async findAll(filters: PaymentFilters, page = 1, limit = 20, churchId?: string) {
    const where = this.buildWhere(filters, churchId);
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { member: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);
    const summary = await this.summary(filters, churchId);
    return { items, total, page, limit, summary };
  }

  async summary(filters: PaymentFilters, churchId?: string) {
    const where = this.buildWhere(filters, churchId);
    const [total, byStatusGroup] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _sum: { amount: true },
        where,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of byStatusGroup) byStatus[g.status] = Number(g._sum.amount ?? 0);

    return {
      completedValue: Math.round((byStatus['COMPLETED'] ?? 0) * 100) / 100,
      pendingValue: Math.round((byStatus['PENDING'] ?? 0) * 100) / 100,
      failedValue: Math.round((byStatus['FAILED'] ?? 0) * 100) / 100,
      count: total,
      byStatus: Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    };
  }

  async create(dto: CreatePaymentDto, actorId?: string, churchId?: string) {
    return this.prisma.payment.create({
      data: { ...dto, recordedBy: actorId, churchId: churchId ?? '' } as Prisma.PaymentUncheckedCreateInput,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, dto: UpdatePaymentDto, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.payment.update({
      where: { id },
      data: dto,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.payment.delete({ where: { id } });
    return { deleted: true };
  }

  async exportCsv(filters: PaymentFilters, churchId?: string) {
    const where = this.buildWhere(filters, churchId);
    const items = await this.prisma.payment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Date', 'Amount', 'Payer', 'Category', 'Method', 'Status', 'Source', 'Member', 'Reference', 'Notes'].map(escape).join(','),
      ...items.map((p) =>
        [
          p.date.toISOString(),
          Number(p.amount).toFixed(2),
          p.payerName ?? '',
          p.category ?? '',
          p.method,
          p.status,
          p.source,
          p.member ? `${p.member.firstName} ${p.member.lastName}` : '',
          p.reference ?? '',
          p.notes ?? '',
        ]
          .map(escape)
          .join(','),
      ),
    ];
    return rows.join('\r\n');
  }

  private async ensureExists(id: string, churchId?: string) {
    const rec = await this.prisma.payment.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!rec) throw new NotFoundException('Payment not found');
    return rec;
  }
}
