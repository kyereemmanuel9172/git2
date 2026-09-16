import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ContributionStatus, ContributionType, Prisma } from '@prisma/client';
import { PaymentMethod } from '../common/constants/enums';
import { SEGOE_FONT as PDF_FONT, SEGOE_FONT_BOLD as PDF_FONT_BOLD, registerUiFonts } from '../common/pdf-fonts';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contributions.dto';

export interface ContributionFilters {
  type?: ContributionType;
  method?: PaymentMethod;
  status?: ContributionStatus;
  from?: string;
  to?: string;
  memberId?: string;
}

@Injectable()
export class ContributionsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(filters: ContributionFilters, churchId?: string): Prisma.ContributionWhereInput {
    return {
      ...(churchId ? { churchId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.status ? { status: filters.status } : {}),
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

  async findAll(filters: ContributionFilters, page = 1, limit = 20, churchId?: string) {
    const where = this.buildWhere(filters, churchId);
    const [items, total] = await Promise.all([
      this.prisma.contribution.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { member: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.contribution.count({ where }),
    ]);
    const summary = await this.summary(filters, churchId);
    return { items, total, page, limit, summary };
  }

  async summary(filters: ContributionFilters, churchId?: string) {
    const where = this.buildWhere(filters, churchId);
    const [verifiedAgg, voidAgg, byTypeGroup] = await Promise.all([
      this.prisma.contribution.aggregate({
        _sum: { amount: true },
        where: { ...where, status: 'VERIFIED' },
      }),
      this.prisma.contribution.aggregate({
        _sum: { amount: true },
        where: { ...where, status: 'VOID' },
      }),
      this.prisma.contribution.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { ...where, status: { not: 'VOID' } },
      }),
    ]);

    const verifiedTotal = Number(verifiedAgg._sum.amount ?? 0);
    const voidTotal = Number(voidAgg._sum.amount ?? 0);
    const byType: Record<string, number> = {};
    for (const g of byTypeGroup) byType[g.type] = Number(g._sum.amount ?? 0);
    const total = Object.values(byType).reduce((a, b) => a + b, 0);

    return {
      total: Math.round(total * 100) / 100,
      tithes: Math.round((byType['TITHE'] ?? 0) * 100) / 100,
      offerings: Math.round((byType['OFFERING'] ?? 0) * 100) / 100,
      byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      verifiedTotal: Math.round(verifiedTotal * 100) / 100,
      voidTotal: Math.round(voidTotal * 100) / 100,
    };
  }

  async create(dto: CreateContributionDto, actorId?: string, churchId?: string) {
    return this.prisma.contribution.create({
      data: { ...dto, recordedBy: actorId, churchId: churchId ?? '' } as Prisma.ContributionUncheckedCreateInput,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, dto: UpdateContributionDto, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.contribution.update({
      where: { id },
      data: dto,
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.contribution.delete({ where: { id } });
    return { deleted: true };
  }

  async exportCsv(filters: ContributionFilters, churchId?: string) {
    const where = this.buildWhere(filters, churchId);
    const items = await this.prisma.contribution.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Date', 'Type', 'Amount', 'Method', 'Status', 'Member', 'Giver', 'Service', 'Reference', 'Notes'].map(escape).join(','),
      ...items.map((c) =>
        [
          c.date.toISOString(),
          c.type,
          Number(c.amount).toFixed(2),
          c.method,
          c.status,
          c.member ? `${c.member.firstName} ${c.member.lastName}` : '',
          c.giverName ?? '',
          c.service ?? '',
          c.reference ?? '',
          c.notes ?? '',
        ]
          .map(escape)
          .join(','),
      ),
    ];
    return rows.join('\r\n');
  }

  async exportPdf(filters: ContributionFilters, churchId?: string): Promise<Buffer> {
    const where = this.buildWhere(filters, churchId);
    const items = await this.prisma.contribution.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });

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
    const faint = '#9ca3af';
    const lineColor = '#e5e7eb';
    let y = 0;
    let pageNo = 0;

    const drawPageFooter = () => {
      pageNo += 1;
      doc
        .moveTo(startX, doc.page.height - 44)
        .lineTo(startX + pageWidth, doc.page.height - 44)
        .strokeColor(lineColor)
        .lineWidth(0.5)
        .stroke();
      doc.font(PDF_FONT).fontSize(8).fillColor(faint);
      doc.text(`Tithes & Offerings Report \u00b7 Page ${pageNo}`, startX, doc.page.height - 36, {
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
      doc.x = startX;
      doc.font(PDF_FONT_BOLD).fontSize(10).fillColor('#111').text(text);
      doc.moveDown(0.35);
      y = doc.y;
    };

    const drawTable = (headers: string[], widths: number[], rows: string[][], aligns?: Array<'left' | 'right'>) => {
      const tableWidth = widths.reduce((a, b) => a + b, 0);

      const drawRow = (cells: string[], isHeader: boolean) => {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = doc.y;
          drawRow(headers, true);
        }
        if (isHeader) {
          doc.rect(startX, y, tableWidth, rowHeight).fill('#f3f4f6');
        }
        let x = startX;
        cells.forEach((cell, i) => {
          const align = aligns?.[i] ?? 'left';
          doc
            .font(isHeader ? PDF_FONT_BOLD : PDF_FONT)
            .fontSize(8.5)
            .fillColor('#111');
          doc.text(cell, x + 4, y + 5, { width: widths[i] - 6, align, lineBreak: false, ellipsis: true });
          x += widths[i];
        });
        doc
          .strokeColor('#d1d5db')
          .lineWidth(0.5)
          .moveTo(startX, y)
          .lineTo(startX + tableWidth, y)
          .stroke();
        y += rowHeight;
      };

      drawRow(headers, true);
      rows.forEach((r) => drawRow(r, false));
    };

    const summary = await this.summary(filters, churchId);
    const range = filters.from || filters.to
      ? `${filters.from ? fmtDate(new Date(filters.from)) : ''} to ${filters.to ? fmtDate(new Date(filters.to)) : ''} \u00b7 `
      : '';

    doc.fontSize(18).fillColor('#111').text('Tithes & Offerings Report', { align: 'center' });
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor('#555')
      .text(`Generated on ${new Date().toLocaleDateString()} \u00b7 ${range}${items.length} contributions`, { align: 'center' });
    doc.moveDown(0.6);
    y = doc.y;

    heading('Summary');
    drawTable(
      ['Total', 'Tithes', 'Offerings', 'Verified', 'Void'],
      [100, 100, 100, 100, 100],
      [[
        fmtMoney(summary.total),
        fmtMoney(summary.tithes),
        fmtMoney(summary.offerings),
        fmtMoney(summary.verifiedTotal),
        fmtMoney(summary.voidTotal),
      ]],
      ['right', 'right', 'right', 'right', 'right'],
    );

    heading('Contributions');
    drawTable(
      ['Date', 'Type', 'Member / Giver', 'Method', 'Status', 'Reference', 'Amount'],
      [70, 60, 90, 70, 60, 60, 60],
      items.map((c) => [
        fmtDate(c.date),
        titleCase(c.type),
        c.member ? `${c.member.firstName} ${c.member.lastName}` : c.giverName ?? '\u2014',
        titleCase(c.method ?? ''),
        titleCase(c.status ?? ''),
        c.reference ?? '\u2014',
        fmtMoney(Number(c.amount)),
      ]),
      ['left', 'left', 'left', 'left', 'left', 'left', 'right'],
    );

    drawPageFooter();
    doc.on('pageAdded', drawPageFooter);

    doc.end();
    return done;
  }

  private async ensureExists(id: string, churchId?: string) {
    const rec = await this.prisma.contribution.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!rec) throw new NotFoundException('Contribution not found');
    return rec;
  }
}
