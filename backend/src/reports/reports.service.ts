import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { TransactionType } from '../common/constants/enums';
import { SEGOE_FONT as PDF_FONT, SEGOE_FONT_BOLD as PDF_FONT_BOLD, registerUiFonts } from '../common/pdf-fonts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async membershipReport(churchId?: string) {
    const where = churchId ? { churchId } : {};
    const [total, byStatus, byGender, joinedThisYear, families] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.groupBy({ by: ['membershipStatus'], where, _count: true }),
      this.prisma.member.groupBy({ by: ['gender'], where, _count: true }),
      this.prisma.member.count({ where: { ...where, joinDate: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
      this.prisma.family.count({ where }),
    ]);
    return {
      total,
      active: byStatus.find((s) => s.membershipStatus === 'ACTIVE')?._count ?? 0,
      joinedThisYear,
      families,
      byStatus: byStatus.map((s) => ({ name: s.membershipStatus, value: s._count })),
      byGender: byGender.map((g) => ({ name: g.gender, value: g._count })),
    };
  }

  async attendanceReport(churchId?: string, from?: string, to?: string) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const dateFilter = { date: { gte: fromDate, lte: toDate } };
    const where = churchId ? { ...dateFilter, member: { churchId } } : dateFilter;
    const [records, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        select: { serviceType: true, date: true, memberId: true },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);
    const byService: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const uniqueMembers = new Set<string>();
    for (const r of records) {
      byService[r.serviceType] = (byService[r.serviceType] ?? 0) + 1;
      const d = r.date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDay[key] = (byDay[key] ?? 0) + 1;
      uniqueMembers.add(r.memberId);
    }
    return { from: fromDate, to: toDate, totalCheckIns: total, uniqueMembers: uniqueMembers.size, byService, byDay };
  }

  async financeReport(churchId?: string, from?: string, to?: string) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const dateFilter = { date: { gte: fromDate, lte: toDate } };
    const where = churchId ? { ...dateFilter, member: { churchId } } : dateFilter;

    const incomeTypes: string[] = [TransactionType.TITHE, TransactionType.OFFERING, TransactionType.DONATION];

    const [incomeAgg, expenseAgg, categoryGroups, totalCount, recentTxns] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...where, type: { in: incomeTypes as TransactionType[] } },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...where, type: TransactionType.EXPENSE },
      }),
      this.prisma.transaction.groupBy({
        by: ['category', 'type'],
        _sum: { amount: true },
        where,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        take: 500,
        orderBy: { date: 'desc' },
        include: { member: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const income = Number(incomeAgg._sum?.amount ?? 0);
    const expense = Number(expenseAgg._sum?.amount ?? 0);

    const byCategory: Record<string, number> = {};
    for (const g of categoryGroups) {
      const cat = g.category ?? g.type;
      byCategory[cat] = (byCategory[cat] ?? 0) + Number(g._sum.amount ?? 0);
    }

    return {
      from: fromDate,
      to: toDate,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      balance: Math.round((income - expense) * 100) / 100,
      transactionCount: totalCount,
      byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      transactions: recentTxns.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        category: t.category,
        date: t.date,
        description: t.description,
        member: t.member ? `${t.member.firstName} ${t.member.lastName}` : null,
      })),
    };
  }

  async eventReport(churchId?: string) {
    const where = churchId ? { churchId } : {};
    const events = await this.prisma.churchEvent.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { registrations: true } }, registrations: { select: { attended: true } } },
    });
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      status: e.status,
      startDate: e.startDate,
      registrations: e._count.registrations,
      attended: e.registrations.filter((r) => r.attended).length,
    }));
  }

  async exportMembersCsv(churchId?: string) {
    const where = churchId ? { churchId } : {};
    const members = await this.prisma.member.findMany({ where, orderBy: { lastName: 'asc' } });
    return members.map((m) => ({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email ?? '',
      phone: m.phone ?? '',
      gender: m.gender,
      city: m.city ?? '',
      status: m.membershipStatus,
      joinDate: m.joinDate ? m.joinDate.toISOString().slice(0, 10) : '',
    }));
  }

  async exportFinanceCsv(churchId?: string, from?: string, to?: string) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(0);
    const dateFilter = { date: { gte: fromDate, lte: toDate } };
    const where = churchId ? { ...dateFilter, member: { churchId } } : dateFilter;
    const txns = await this.prisma.transaction.findMany({
      where,
      include: { member: true },
      orderBy: { date: 'desc' },
    });
    return txns.map((t) => ({
      date: t.date.toISOString().slice(0, 10),
      type: t.type,
      amount: Number(t.amount),
      category: t.category ?? '',
      description: t.description ?? '',
      member: t.member ? `${t.member.firstName} ${t.member.lastName}` : '',
    }));
  }

  async exportPdf(type: string, churchId?: string, from?: string, to?: string): Promise<Buffer> {
    const titleCase = (s: string) =>
      s ? s.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    const fmtDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fmtMoney = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    registerUiFonts(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => { reject(err); });
    });

    const startX = 40;
    const pageWidth = doc.page.width - startX * 2;
    const rowHeight = 18;
    const brand = '#4f46e5';
    const dark = '#111827';
    const muted = '#6b7280';
    const faint = '#9ca3af';

    let y = 0;
    let pageNo = 0;

    const drawPageFooter = () => {
      pageNo += 1;
      doc
        .moveTo(startX, doc.page.height - 44)
        .lineTo(startX + pageWidth, doc.page.height - 44)
        .strokeColor('#e5e7eb')
        .lineWidth(0.5)
        .stroke();
      doc.font(PDF_FONT).fontSize(8).fillColor(faint);
      doc.text(`${titleCase(type)} Report \u00b7 Page ${pageNo}`, startX, doc.page.height - 36, {
        width: pageWidth,
        align: 'center',
        lineBreak: false,
      });
      doc.y = doc.page.margins.top;
    };

    const heading = (text: string) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = doc.y;
      }
      y += 5;
      doc.y = y;
      doc.x = startX;
      doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(dark).text(text);
      doc.moveDown(0.35);
      y = doc.y;
    };

    const drawTable = (headers: string[], widths: number[], rows: string[][], aligns?: Array<'left' | 'right'>) => {
      const totalWeight = widths.reduce((a, b) => a + b, 0);
      const colWidths = widths.map((w) => (w / totalWeight) * pageWidth);
      let rowIndex = 0;

      const drawHeader = () => {
        doc.rect(startX, y, pageWidth, rowHeight).fill(brand);
        let x = startX;
        headers.forEach((h, i) => {
          const align = aligns?.[i] ?? 'left';
          doc.font(PDF_FONT_BOLD).fontSize(8.5).fillColor('#ffffff');
          doc.text(h, x + 4, y + 5, { width: colWidths[i] - 8, align, lineBreak: false, ellipsis: true });
          x += colWidths[i];
        });
        y += rowHeight;
      };

      const drawRow = (cells: string[], isHeader: boolean) => {
        if (y + rowHeight > doc.page.height - 56) {
          doc.addPage();
          y = doc.y;
          drawHeader();
        }
        if (!isHeader && rowIndex % 2 === 1) {
          doc.rect(startX, y, pageWidth, rowHeight).fill('#f8fafc');
        }
        let x = startX;
        cells.forEach((cell, i) => {
          const align = aligns?.[i] ?? 'left';
          doc
            .font(isHeader ? PDF_FONT_BOLD : PDF_FONT)
            .fontSize(8.5)
            .fillColor(isHeader ? '#ffffff' : dark);
          doc.text(cell, x + 4, y + 5, { width: colWidths[i] - 8, align, lineBreak: false, ellipsis: true });
          x += colWidths[i];
        });
        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .moveTo(startX, y)
          .lineTo(startX + pageWidth, y)
          .stroke();
        y += rowHeight;
        rowIndex += 1;
      };

      drawHeader();
      rowIndex = 0;
      rows.forEach((r) => drawRow(r, false));
    };

    let prepare: () => Promise<{ subtitleSuffix: string; render: () => void }>;

    if (type === 'membership') {
      prepare = async () => {
        const m = await this.membershipReport(churchId);
        return {
          subtitleSuffix: `${m.total} members`,
          render: () => {
            heading('By status');
            drawTable(['Status', 'Count'], [300, 150], m.byStatus.map((s) => [titleCase(s.name), String(s.value)]), ['left', 'right']);
            y += 30;
            heading('By gender');
            drawTable(['Gender', 'Count'], [300, 150], m.byGender.map((g) => [titleCase(g.name), String(g.value)]), ['left', 'right']);
          },
        };
      };
    } else if (type === 'attendance') {
      prepare = async () => {
        const a = await this.attendanceReport(churchId, from, to);
        const range = from || to ? `${fmtDate(a.from)} to ${fmtDate(a.to)} · ` : '';
        return {
          subtitleSuffix: `${range}${a.totalCheckIns} check-ins`,
          render: () => {
            heading('By service');
            drawTable(['Service', 'Check-ins'], [300, 150], Object.entries(a.byService).map(([k, v]) => [titleCase(k), String(v)]), ['left', 'right']);
            y += 30;
            heading('Daily attendance');
            const byDayRows = Object.entries(a.byDay).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
            drawTable(['Date', 'Check-ins'], [300, 150], byDayRows.map(([k, v]) => [k, String(v)]), ['left', 'right']);
          },
        };
      };
    } else if (type === 'finance') {
      prepare = async () => {
        const f = await this.financeReport(churchId, from, to);
        const range = from || to ? `${fmtDate(f.from)} to ${fmtDate(f.to)} · ` : '';
        return {
          subtitleSuffix: `${range}${f.transactionCount} transactions`,
          render: () => {
            heading('By category');
            const catRows = Object.entries(f.byCategory).sort((a, b) => b[1] - a[1]);
            drawTable(['Category', 'Amount'], [300, 150], catRows.map(([k, v]) => [titleCase(k), fmtMoney(v)]), ['left', 'right']);
            heading('Transactions');
            drawTable(
              ['Date', 'Type', 'Category', 'Member', 'Amount'],
              [70, 60, 80, 120, 60],
              f.transactions.map((t) => [
                fmtDate(new Date(t.date)),
                titleCase(t.type),
                titleCase(t.category ?? ''),
                t.member ?? '\u2014',
                fmtMoney(t.amount),
              ]),
              ['left', 'left', 'left', 'left', 'right'],
            );
          },
        };
      };
    } else if (type === 'events') {
      prepare = async () => {
        const evts = await this.eventReport(churchId);
        return {
          subtitleSuffix: `${evts.length} events`,
          render: () => {
            heading('Events');
            drawTable(
              ['Title', 'Type', 'Status', 'Date', 'Registrations', 'Attended'],
              [115, 55, 60, 55, 85, 60],
              evts.map((e) => [
                e.title,
                titleCase(e.type),
                titleCase(e.status),
                fmtDate(new Date(e.startDate)),
                String(e.registrations),
                String(e.attended),
              ]),
              ['left', 'left', 'left', 'left', 'right', 'right'],
            );
          },
        };
      };
    } else {
      throw new BadRequestException(`Unsupported report type: ${type}`);
    }

    const { subtitleSuffix, render } = await prepare();

    doc.fontSize(18).fillColor(dark).text(`${titleCase(type)} Report`, { align: 'center' });
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor(muted)
      .text(`Generated on ${new Date().toLocaleDateString()} \u00b7 ${subtitleSuffix}`, { align: 'center' });
    doc.moveDown(0.6);

    y = doc.y;
    render();

    drawPageFooter();
    doc.on('pageAdded', drawPageFooter);

    doc.end();
    return done;
  }
}
