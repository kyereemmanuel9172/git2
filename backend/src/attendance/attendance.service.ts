import { BadRequestException, Injectable } from '@nestjs/common';
import { AttendanceRecord, Prisma } from '@prisma/client';
import { MemberStatus, ServiceType } from '../common/constants/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInDto, CheckOutDto } from './dto/attendance.dto';
import { SEGOE_FONT as PDF_FONT, SEGOE_FONT_BOLD as PDF_FONT_BOLD, registerUiFonts } from '../common/pdf-fonts';
import PDFDocument from 'pdfkit';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkIn(dto: CheckInDto, actorId?: string, churchId?: string) {
    const scopedChurchId = this.requireChurchId(churchId);
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, churchId: scopedChurchId },
    });
    if (!member) throw new BadRequestException('Member not found');
    if (member.membershipStatus !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Only active members can check in');
    }

    const now = new Date();
    const checkedInAt = dto.checkedInAt ?? now;
    const { start: date, end: dayEnd } = this.dayRange(dto.date ?? checkedInAt);
    const existingWhere: Prisma.AttendanceRecordWhereInput = {
      memberId: dto.memberId,
      churchId: scopedChurchId,
      serviceType: dto.serviceType,
      date: { gte: date, lte: dayEnd },
    };

    const existing = await this.prisma.attendanceRecord.findFirst({ where: existingWhere });
    if (existing) return this.reopenOrReturn(existing, scopedChurchId, checkedInAt, actorId);

    try {
      const record = await this.prisma.attendanceRecord.create({
        data: {
          memberId: dto.memberId,
          churchId: scopedChurchId,
          serviceType: dto.serviceType,
          date,
          checkedInAt,
          checkedInBy: actorId ?? null,
          notes: dto.notes,
        },
        include: { member: true },
      });
      return { alreadyCheckedIn: false, record };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const concurrent = await this.prisma.attendanceRecord.findFirst({ where: existingWhere });
      if (!concurrent) throw error;
      return this.reopenOrReturn(concurrent, scopedChurchId, checkedInAt, actorId);
    }
  }

  async checkOut(dto: CheckOutDto, actorId?: string, churchId?: string) {
    const scopedChurchId = this.requireChurchId(churchId);
    let record: AttendanceRecord | null;
    if (dto.recordId) {
      record = await this.prisma.attendanceRecord.findFirst({
        where: { id: dto.recordId, churchId: scopedChurchId },
      });
      if (!record) throw new BadRequestException('Attendance record not found');
      if (dto.serviceType && record.serviceType !== dto.serviceType) {
        throw new BadRequestException('Attendance record is for a different service');
      }
      if (record.checkedOutAt) return { alreadyCheckedOut: true, record };
    } else {
      if (!dto.memberId) throw new BadRequestException('Record ID or member ID is required');
      const member = await this.prisma.member.findFirst({
        where: { id: dto.memberId, churchId: scopedChurchId },
      });
      if (!member) throw new BadRequestException('Member not found');
      const { start, end } = this.dayRange(new Date());
      record = await this.prisma.attendanceRecord.findFirst({
        where: {
          memberId: dto.memberId,
          churchId: scopedChurchId,
          checkedOutAt: null,
          ...(dto.serviceType ? { serviceType: dto.serviceType } : {}),
          date: { gte: start, lte: end },
        },
        orderBy: { checkedInAt: 'desc' },
      });
      if (!record) throw new BadRequestException('This member has no open check-in today');
    }

    const update = await this.prisma.attendanceRecord.updateMany({
      where: { id: record.id, churchId: scopedChurchId, checkedOutAt: null },
      data: { checkedOutAt: new Date(), checkedOutBy: actorId ?? null },
    });
    if (update.count === 0) {
      const current = await this.findRecord(record.id, scopedChurchId);
      if (!current) throw new BadRequestException('Attendance record not found');
      if (current.checkedOutAt) return { alreadyCheckedOut: true, record: current };
      throw new BadRequestException('Attendance record could not be checked out');
    }

    const updated = await this.findRecord(record.id, scopedChurchId);
    if (!updated) throw new BadRequestException('Attendance record not found');
    return { alreadyCheckedOut: false, record: updated };
  }

  private async reopenOrReturn(
    existing: AttendanceRecord,
    churchId: string,
    checkedInAt: Date,
    actorId?: string,
  ) {
    if (!existing.checkedOutAt) return { alreadyCheckedIn: true, record: existing };

    const data = {
      checkedInAt,
      checkedOutAt: null,
      checkedOutBy: null,
      checkedInBy: actorId ?? null,
    };
    let update = await this.prisma.attendanceRecord.updateMany({
      where: { id: existing.id, churchId, checkedOutAt: { not: null } },
      data,
    });

    if (update.count === 0) {
      const current = await this.findRecord(existing.id, churchId);
      if (!current) throw new BadRequestException('Attendance record not found');
      if (!current.checkedOutAt) return { alreadyCheckedIn: true, record: current };
      update = await this.prisma.attendanceRecord.updateMany({
        where: { id: existing.id, churchId, checkedOutAt: { not: null } },
        data,
      });
    }

    if (update.count === 0) {
      const current = await this.findRecord(existing.id, churchId);
      if (current && !current.checkedOutAt) return { alreadyCheckedIn: true, record: current };
      throw new BadRequestException('Attendance record could not be reopened');
    }

    const record = await this.findRecord(existing.id, churchId);
    if (!record) throw new BadRequestException('Attendance record not found');
    return { alreadyCheckedIn: false, record };
  }

  private findRecord(id: string, churchId: string) {
    return this.prisma.attendanceRecord.findFirst({
      where: { id, churchId },
      include: { member: true },
    });
  }

  private dayRange(value: Date) {
    const start = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const end = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
    return { start, end };
  }

  private requireChurchId(churchId?: string) {
    if (typeof churchId !== 'string' || churchId.trim().length === 0) {
      throw new BadRequestException('Church ID is required');
    }
    return churchId;
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
  }

  async findByMember(memberId: string, churchId?: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { memberId, ...(churchId ? { churchId } : {}) },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async query(serviceType?: ServiceType, from?: string, to?: string, page = 1, limit = 20, churchId?: string) {
    const where: Prisma.AttendanceRecordWhereInput = {
      ...(serviceType ? { serviceType } : {}),
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
      this.prisma.attendanceRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { member: true },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async summary(from: Date, to: Date, churchId?: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { date: { gte: from, lte: to }, ...(churchId ? { churchId } : {}) },
      select: { serviceType: true, date: true, memberId: true },
    });
    const byType: Record<string, number> = {};
    const byDate: Record<string, number> = {};
    const uniqueByType: Record<string, Set<string>> = {};
    for (const r of records) {
      byType[r.serviceType] = (byType[r.serviceType] ?? 0) + 1;
      const d = r.date;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      byDate[key] = (byDate[key] ?? 0) + 1;
      (uniqueByType[r.serviceType] ??= new Set()).add(r.memberId);
    }
    const uniqueMembers: Record<string, number> = {};
    for (const [k, v] of Object.entries(uniqueByType)) uniqueMembers[k] = v.size;
    return { total: records.length, byType, byDate, uniqueMembers };
  }

  async register(churchId?: string) {
    const church = churchId
      ? await this.prisma.church.findUnique({ where: { id: churchId }, select: { serviceTimes: true } })
      : null;
    const serviceTimes = church?.serviceTimes ?? '';
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[new Date().getUTCDay()];
    const serviceScheduled = serviceTimes ? serviceTimes.toLowerCase().includes(todayName) : true;

    const activeMembers = await this.prisma.member.findMany({
      where: { membershipStatus: MemberStatus.ACTIVE, ...(churchId ? { churchId } : {}) },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        memberId: true,
        photoUrl: true,
        departmentLinks: { include: { department: { select: { name: true } } } },
      },
    });

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const records = await this.prisma.attendanceRecord.findMany({
      where: { date: { gte: start, lte: end }, ...(churchId ? { churchId } : {}) },
      orderBy: { checkedInAt: 'desc' },
      select: {
        id: true,
        memberId: true,
        serviceType: true,
        checkedInAt: true,
        checkedOutAt: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            memberId: true,
            phone: true,
          },
        },
      },
    });

    const presentSet = new Set(records.map((r) => r.memberId));
    const byType: Record<string, number> = {};
    for (const r of records) byType[r.serviceType] = (byType[r.serviceType] ?? 0) + 1;

    const present = presentSet.size;
    const notCheckedIn = activeMembers.filter((m) => !presentSet.has(m.id));
    const attendanceRate = activeMembers.length === 0 ? 0 : Math.round((present / activeMembers.length) * 1000) / 10;

    return {
      date: start.toISOString().slice(0, 10),
      serviceScheduled,
      activeMembers: activeMembers.length,
      present,
      notCheckedIn,
      attendanceRate,
      byType,
      records,
    };
  }

  async exportPdf(churchId?: string): Promise<Buffer> {
    const reg = await this.register(churchId);
    const church = churchId
      ? await this.prisma.church.findUnique({ where: { id: churchId }, select: { name: true } })
      : null;

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    registerUiFonts(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => { reject(err); });
    });

    const pageWidth = doc.page.width - 48 * 2;
    const primary = '#4f46e5';
    const dark = '#111827';
    const muted = '#6b7280';
    const lineColor = '#e5e7eb';

    const formatGmt = (v: Date | string | null | undefined) =>
      v ? `${new Date(v).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} GMT` : '—';
    const formatService = (s: string) => s[0] + s.slice(1).toLowerCase();

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - 56) doc.addPage();
    };

    // Header
    doc.moveDown(0.7);
    doc.font(PDF_FONT_BOLD).fontSize(20).fillColor(dark).text(church?.name ?? 'Church', { align: 'center' });
    doc.moveDown(0.12);
    doc.font(PDF_FONT_BOLD).fontSize(10.5).fillColor(primary).text('ATTENDANCE REPORT', { align: 'center' });
    doc.moveDown(0.25);
    doc.font(PDF_FONT).fontSize(9).fillColor(muted).text(`Date: ${reg.date}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(48 + pageWidth, doc.y).strokeColor(primary).lineWidth(1.5).stroke();
    doc.moveDown(0.6);

    // Summary boxes
    const summary = [
      { label: 'Active', value: reg.activeMembers },
      { label: 'Present', value: reg.present },
      { label: 'Absent', value: reg.activeMembers - reg.present },
      { label: 'Rate', value: Math.round(reg.attendanceRate) },
    ];
    const accentColors = ['#4f46e5', '#059669', '#db2777', '#2563eb'];
    const boxGap = 12;
    const boxW = (pageWidth - boxGap * 3) / 4;
    const boxH = 56;
    const boxY = doc.y;
    summary.forEach((s, i) => {
      const x = 48 + i * (boxW + boxGap);
      doc.roundedRect(x, boxY, boxW, boxH, 8).fillAndStroke('#ffffff', lineColor);
      doc.roundedRect(x + boxW / 2 - 12, boxY + 10, 24, 3, 2).fill(accentColors[i]);
      doc.font(PDF_FONT).fontSize(7).fillColor(muted).text(s.label.toUpperCase(), x, boxY + 20, { width: boxW, align: 'center' });
      doc.font(PDF_FONT_BOLD).fontSize(18).fillColor(dark).text(i === 3 ? `${s.value}%` : String(s.value), x, boxY + 30, { width: boxW, align: 'center' });
    });
    doc.y = boxY + boxH + 12;

    const sectionTitle = (title: string) => {
      ensureSpace(80);
      doc.x = 48;
      doc.moveDown(1.5);
      doc.font(PDF_FONT_BOLD).fontSize(11).fillColor(primary).text(title.toUpperCase());
      doc.moveDown(0.1);
      doc.moveTo(48, doc.y).lineTo(78, doc.y).strokeColor(primary).lineWidth(2.5).stroke();
      doc.moveDown(0.5);
    };

    // Checked-in members table
    sectionTitle('Checked In Members');
    const headers = ['NAME', 'MEMBER ID', 'SERVICE', 'CHECKED IN', 'CHECKED OUT'];
    const widths = [120, 80, 80, 100, 100];
    const startX = 48;
    const headerH = 24;
    const rowHeight = 22;

    const drawHeader = () => {
      const top = doc.y;
      doc.rect(startX, top, pageWidth, headerH).fill(primary);
      let x = startX;
      headers.forEach((h, i) => {
        doc.font(PDF_FONT_BOLD).fontSize(7.5).fillColor('#ffffff');
        doc.text(h, x + 6, top + 8, { width: widths[i] - 12, lineBreak: false, ellipsis: true });
        x += widths[i];
      });
      doc.moveTo(startX, top).lineTo(startX + pageWidth, top).strokeColor(primary).lineWidth(1).stroke();
      doc.moveTo(startX, top + headerH).lineTo(startX + pageWidth, top + headerH).strokeColor(primary).lineWidth(1).stroke();
      doc.y = top + headerH;
    };

    if (reg.records.length === 0) {
      doc.font(PDF_FONT).fontSize(9).fillColor(muted).text('No check-ins yet.', 48, doc.y);
    } else {
      drawHeader();
      reg.records.forEach((r, _i) => {
        if (doc.y + rowHeight > doc.page.height - 56) {
          doc.addPage();
          doc.y = doc.page.margins.top;
          drawHeader();
        }
        const rowY = doc.y;
        const cells = [
          `${r.member.firstName} ${r.member.lastName}`,
          r.member.memberId ?? '—',
          formatService(r.serviceType),
          formatGmt(r.checkedInAt),
          r.checkedOutAt ? formatGmt(r.checkedOutAt) : '—',
        ];
        let x = startX;
        cells.forEach((cell, ci) => {
          if (ci === 0) doc.font(PDF_FONT_BOLD).fontSize(9).fillColor('#1f2937');
          else doc.font(PDF_FONT).fontSize(9).fillColor('#1f2937');
          doc.text(cell, x + 6, rowY + 7, { width: widths[ci] - 12, lineBreak: false, ellipsis: true });
          x += widths[ci];
        });
        doc.moveTo(startX, rowY + rowHeight).lineTo(startX + pageWidth, rowY + rowHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
        let gx = startX;
        for (const w of widths) {
          doc.moveTo(gx, rowY).lineTo(gx, rowY + rowHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
          gx += w;
        }
        doc.moveTo(gx, rowY).lineTo(gx, rowY + rowHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
        doc.y = rowY + rowHeight;
      });
    }

    // Absent members table — extra vertical space + separator line before section
    doc.x = 48;
    doc.moveDown(1.2);
    doc.moveTo(48, doc.y).lineTo(48 + pageWidth, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    sectionTitle('Not Checked In');
    if (reg.notCheckedIn.length === 0) {
      doc.font(PDF_FONT).fontSize(9).fillColor(muted).text('All active members are present.', 48, doc.y);
    } else {
      const absHeaders = ['NAME', 'MEMBER ID', 'PHONE', 'MINISTRY'];
      const absWidths = [140, 100, 120, 120];
      drawAbsentHeader();
      function drawAbsentHeader() {
        const top = doc.y;
        doc.rect(startX, top, pageWidth, headerH).fill(primary);
        let x = startX;
        absHeaders.forEach((h, i) => {
          doc.font(PDF_FONT_BOLD).fontSize(7.5).fillColor('#ffffff');
          doc.text(h, x + 6, top + 8, { width: absWidths[i] - 12, lineBreak: false, ellipsis: true });
          x += absWidths[i];
        });
        doc.moveTo(startX, top).lineTo(startX + pageWidth, top).strokeColor(primary).lineWidth(1).stroke();
        doc.moveTo(startX, top + headerH).lineTo(startX + pageWidth, top + headerH).strokeColor(primary).lineWidth(1).stroke();
        doc.y = top + headerH;
      }

      reg.notCheckedIn.forEach((m) => {
        if (doc.y + rowHeight > doc.page.height - 56) {
          doc.addPage();
          doc.y = doc.page.margins.top;
          drawAbsentHeader();
        }
        const rowY = doc.y;
        const cells = [
          `${m.firstName} ${m.lastName}`,
          m.memberId ?? '—',
          m.phone ?? '—',
          m.departmentLinks.length ? m.departmentLinks.filter((l) => l.department).map((l) => l.department!.name).join(', ') : '—',
        ];
        let x = startX;
        cells.forEach((cell, ci) => {
          if (ci === 0) doc.font(PDF_FONT_BOLD).fontSize(9).fillColor('#1f2937');
          else doc.font(PDF_FONT).fontSize(9).fillColor('#1f2937');
          doc.text(cell, x + 6, rowY + 7, { width: absWidths[ci] - 12, lineBreak: false, ellipsis: true });
          x += absWidths[ci];
        });
        doc.moveTo(startX, rowY + rowHeight).lineTo(startX + pageWidth, rowY + rowHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
        let gx = startX;
        for (const w of absWidths) {
          doc.moveTo(gx, rowY).lineTo(gx, rowY + rowHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
          gx += w;
        }
        doc.moveTo(gx, rowY).lineTo(gx, rowY + rowHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
        doc.y = rowY + rowHeight;
      });
    }

    doc.end();
    return done;
  }
}
