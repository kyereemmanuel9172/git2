import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionType } from '../common/constants/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(type?: TransactionType, from?: string, to?: string, category?: string, page = 1, limit = 20, churchId?: string) {
    const where: Prisma.TransactionWhereInput = {
      ...(type ? { type } : {}),
      ...(category ? { category: { contains: category } } : {}),
      ...(churchId ? { churchId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { member: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    const summary = await this.summary(from, to, churchId);
    return { items, total, page, limit, summary };
  }

  async create(dto: CreateTransactionDto, actorId?: string, churchId?: string) {
    return this.prisma.transaction.create({
      data: { ...dto, recordedBy: actorId, churchId: churchId ?? '' } as Prisma.TransactionUncheckedCreateInput,
      include: { member: true },
    });
  }

  async update(id: string, dto: UpdateTransactionDto, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.transaction.update({ where: { id }, data: dto, include: { member: true } });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.transaction.delete({ where: { id } });
    return { deleted: true };
  }

  async summary(from?: string, to?: string, churchId?: string) {
    const gte = from ? new Date(from) : new Date(Date.now() - 365 * 86400000);
    const lte = to ? new Date(to) : new Date();
    const churchFilter = churchId ? { churchId } : {};
    const incomeTypes: string[] = [TransactionType.TITHE, TransactionType.OFFERING, TransactionType.DONATION];

    const [incomeAgg, expenseAgg, byTypeGroup] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { date: { gte, lte }, type: { in: incomeTypes as any }, ...churchFilter },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { date: { gte, lte }, type: TransactionType.EXPENSE, ...churchFilter },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte, lte }, ...churchFilter },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);
    const byType: Record<string, number> = {};
    for (const g of byTypeGroup) byType[g.type] = Number(g._sum.amount ?? 0);

    return {
      income,
      expense,
      balance: income - expense,
      byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    };
  }

  async monthlySummary(months = 6, churchId?: string) {
    const start = new Date();
    start.setMonth(start.getMonth() - months + 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const txns = await this.prisma.transaction.findMany({
      where: { date: { gte: start }, ...(churchId ? { churchId } : {}) },
      select: { type: true, amount: true, date: true },
    });

    const byMonth: Record<string, { income: number; expense: number }> = {};
    for (const t of txns) {
      const key = t.date.toISOString().slice(0, 7);
      byMonth[key] ??= { income: 0, expense: 0 };
      const amt = Number(t.amount);
      if (t.type === TransactionType.EXPENSE) byMonth[key].expense += amt;
      else byMonth[key].income += amt;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, income: Math.round(v.income * 100) / 100, expense: Math.round(v.expense * 100) / 100 }));
  }

  private async ensureExists(id: string, churchId?: string) {
    const txn = await this.prisma.transaction.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!txn) throw new NotFoundException('Transaction not found');
    return txn;
  }
}
