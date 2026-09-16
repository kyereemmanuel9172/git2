import { Injectable } from '@nestjs/common';
import { ServiceType, TransactionType } from '../common/constants/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  private churchFilter(churchId?: string | null) {
    return churchId ? { churchId } : {};
  }

  async kpis(churchId?: string | null) {
    const cacheKey = `dashboard:kpis:${churchId ?? 'global'}`;
    return this.cache.wrap(cacheKey, async () => {
      const scope = this.churchFilter(churchId);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

      const [totalMembers, activeMembers, visitors, totalAttendance, income, expense, upcomingEvents, openPrayers, departments] = await Promise.all([
        this.prisma.member.count({ where: scope }),
        this.prisma.member.count({ where: { ...scope, membershipStatus: 'ACTIVE' } }),
        this.prisma.member.count({ where: { ...scope, membershipStatus: 'VISITOR' } }),
        this.prisma.attendanceRecord.count({ where: { ...scope, date: { gte: thirtyDaysAgo } } }),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { ...scope, type: { in: [TransactionType.TITHE, TransactionType.OFFERING, TransactionType.DONATION] }, date: { gte: thirtyDaysAgo } },
        }),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { ...scope, type: TransactionType.EXPENSE, date: { gte: thirtyDaysAgo } },
        }),
        this.prisma.churchEvent.count({ where: { ...scope, status: 'UPCOMING', startDate: { gte: new Date() } } }),
        this.prisma.prayerRequest.count({ where: { ...scope, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        this.prisma.department.count({ where: scope }),
      ]);

      return {
        totalMembers,
        activeMembers,
        visitors,
        attendanceLast30Days: totalAttendance,
        incomeLast30Days: Number(income._sum.amount ?? 0),
        expenseLast30Days: Number(expense._sum.amount ?? 0),
        upcomingEvents,
        openPrayers,
        departments,
      };
    }, 60000);
  }

  async attendanceTrend(days = 30, churchId?: string | null) {
    const cacheKey = `dashboard:attendance-trend:${days}:${churchId ?? 'global'}`;
    return this.cache.wrap(cacheKey, async () => {
      const start = new Date(Date.now() - (days - 1) * 86400000);
      start.setHours(0, 0, 0, 0);
      const scope = this.churchFilter(churchId);

      const records = await this.prisma.attendanceRecord.groupBy({
        by: ['date'],
        _count: true,
        where: { ...scope, date: { gte: start } },
      });

      const byDate: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        byDate[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = 0;
      }
      for (const r of records) {
        const d = r.date;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (key in byDate) byDate[key] = r._count;
      }
      return Object.entries(byDate).map(([date, value]) => ({ date, value }));
    }, 30000);
  }

  async attendanceByServiceType(days = 30, churchId?: string | null) {
    const cacheKey = `dashboard:attendance-service:${days}:${churchId ?? 'global'}`;
    return this.cache.wrap(cacheKey, async () => {
      const start = new Date(Date.now() - (days - 1) * 86400000);
      const scope = this.churchFilter(churchId);

      const records = await this.prisma.attendanceRecord.groupBy({
        by: ['serviceType'],
        _count: true,
        where: { ...scope, date: { gte: start } },
      });

      const counts: Record<string, number> = {};
      for (const st of Object.values(ServiceType) as string[]) counts[st] = 0;
      for (const r of records) counts[r.serviceType] = r._count;
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, 30000);
  }

  async recentActivity(limit = 8, churchId?: string | null) {
    const cacheKey = `dashboard:recent-activity:${limit}:${churchId ?? 'global'}`;
    return this.cache.wrap(cacheKey, async () => {
      const where = churchId ? { user: { churchId } } : {};
      return this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      });
    }, 30000);
  }

  async demographics(churchId?: string | null) {
    const cacheKey = `dashboard:demographics:${churchId ?? 'global'}`;
    return this.cache.wrap(cacheKey, async () => {
      const scope = this.churchFilter(churchId);
      const [byGender, byStatus, byCity] = await Promise.all([
        this.prisma.member.groupBy({ by: ['gender'], _count: true, where: scope }),
        this.prisma.member.groupBy({ by: ['membershipStatus'], _count: true, where: scope }),
        this.prisma.member.groupBy({ by: ['city'], _count: true, where: scope }),
      ]);
      return {
        byGender: byGender.map((g) => ({ name: g.gender, value: g._count })),
        byStatus: byStatus.map((s) => ({ name: s.membershipStatus, value: s._count })),
        byCity: byCity.map((c) => ({ name: c.city ?? 'Unknown', value: c._count })),
      };
    }, 60000);
  }
}
