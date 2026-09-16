import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Gender, MemberStatus } from '../common/constants/enums';
import { SEGOE_FONT as PDF_FONT, SEGOE_FONT_BOLD as PDF_FONT_BOLD, registerUiFonts } from '../common/pdf-fonts';
import * as qrcode from 'qrcode';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { CreateFamilyDto, CreateMemberDto, UpdateMemberDto } from './dto/members.dto';

@Injectable()
export class MembersService implements OnModuleInit {
  private readonly logger = new Logger(MembersService.name);
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    @Optional() @InjectQueue('birthday-notifications') private birthdayQueue?: Queue,
  ) {}

  async onModuleInit() {
    // Queue-based notification runs via processor on schedule
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduleBirthdayNotifications() {
    if (!this.birthdayQueue) return;
    try {
      await this.birthdayQueue.add('daily-birthdays', {}, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
      this.logger.log('Birthday notification job queued');
    } catch (err) {
      this.logger.error('Failed to queue birthday notifications', err as Error);
    }
  }

  async findAll(page: number, limit: number, search?: string, status?: string, departmentId?: string, churchId?: string) {
    const where: Prisma.MemberWhereInput = {
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { memberId: { contains: search } },
              { departmentLinks: { some: { department: { name: { contains: search } } } } },
            ],
          }
        : {}),
      ...(status ? { membershipStatus: status as MemberStatus } : {}),
      ...(departmentId ? { departmentLinks: { some: { departmentId } } } : {}),
      ...(churchId ? { churchId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { family: true, departmentLinks: { include: { department: true } } },
      }),
      this.prisma.member.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async birthdays(days = 30, churchId?: string) {
    const cacheKey = `birthdays:${days}:${churchId ?? 'global'}`;
    return this.cache.wrap(cacheKey, async () => {
      const [members, withoutDob] = await Promise.all([
        this.prisma.member.findMany({
          where: { dateOfBirth: { not: null }, ...(churchId ? { churchId } : {}) },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true },
        }),
        this.prisma.member.count({ where: { dateOfBirth: null, ...(churchId ? { churchId } : {}) } }),
      ]);

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDay = now.getDate();
      const todayLocal = new Date(todayYear, todayMonth, todayDay).getTime();

      const items: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        dateOfBirth: string;
        nextBirthday: string;
        age: number;
        daysUntil: number;
      }> = [];

      for (const m of members) {
        if (!m.dateOfBirth) continue;
        const birthYear = m.dateOfBirth.getFullYear();
        const birthMonth = m.dateOfBirth.getMonth();
        const birthDay = m.dateOfBirth.getDate();

        let nextBirthday = new Date(todayYear, birthMonth, birthDay).getTime();
        if (nextBirthday < todayLocal) {
          nextBirthday = new Date(todayYear + 1, birthMonth, birthDay).getTime();
        }
        const daysUntil = Math.round((nextBirthday - todayLocal) / 86400000);
        if (daysUntil < 0 || daysUntil >= days) continue;

        items.push({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          phone: m.phone,
          dateOfBirth: m.dateOfBirth.toISOString().slice(0, 10),
          nextBirthday: new Date(nextBirthday).toISOString().slice(0, 10),
          age: new Date(nextBirthday).getFullYear() - birthYear,
          daysUntil,
        });
      }

      items.sort((a, b) => a.daysUntil - b.daysUntil);
      return { days, total: items.length, withoutDob, items };
    }, 300000);
  }

  async findOne(id: string, churchId?: string) {
    const member = await this.prisma.member.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
      include: {
        church: { select: { id: true, name: true, logoUrl: true, city: true } },
        family: { include: { members: true } },
        departmentLinks: { include: { department: true } },
        attendance: { orderBy: { date: 'desc' }, take: 10 },
        transactions: { orderBy: { date: 'desc' }, take: 10 },
        eventRegistrations: { include: { event: true } },
        prayerRequests: { orderBy: { createdAt: 'desc' } },
        counselingSessions: {
          orderBy: { date: 'desc' },
          include: { counselor: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const prayedByIds = [...new Set(member.prayerRequests.map((p) => p.prayedBy).filter(Boolean))] as string[];
    const prayerUsers = prayedByIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: prayedByIds } }, select: { id: true, name: true } })
      : [];
    const prayedByMap = new Map(prayerUsers.map((u) => [u.id, u.name]));
    const prayerRequests = member.prayerRequests.map((p) => ({
      ...p,
      prayedByName: p.prayedBy ? (prayedByMap.get(p.prayedBy) ?? null) : null,
    }));

    const { portalPasswordHash, ...safeMember } = member;
    return { ...safeMember, prayerRequests, portalEnabled: Boolean(portalPasswordHash) };
  }

  async create(dto: CreateMemberDto, _actorId?: string, churchId?: string) {
    const { departmentIds, ...rest } = dto;
    this.guardPhotoSize(rest.photoUrl);
    let member: { id: string } | null = null;
    for (let attempt = 0; attempt < 3 && !member; attempt++) {
      try {
        member = await this.prisma.member.create({
          data: {
            ...rest,
            memberId: rest.memberId?.trim() || (await this.nextMemberId(churchId ?? '')),
            churchId: churchId ?? '',
          },
        });
      } catch (err) {
        const p2002 = err as { code?: string };
        if (p2002?.code !== 'P2002' || rest.memberId) throw err;
      }
    }
    if (!member) throw new BadRequestException('Could not assign a unique member ID. Try again.');
    await this.syncDepartments(member.id, departmentIds ?? []);
    const qr = await this.generateQr(member.id, churchId);
    await this.prisma.member.update({ where: { id: member.id }, data: { qrCode: qr } });
    return this.findOne(member.id, churchId);
  }

  async update(id: string, dto: UpdateMemberDto, churchId?: string) {
    await this.ensureExists(id, churchId);
    const { departmentIds, ...rest } = dto;
    this.guardPhotoSize(rest.photoUrl);
    if (departmentIds) {
      await this.prisma.memberDepartment.deleteMany({ where: { memberId: id } });
      await this.syncDepartments(id, departmentIds);
    }
    return this.prisma.member.update({ where: { id }, data: rest });
  }

  async setPortalPassword(id: string, password: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    const portalPasswordHash = await bcrypt.hash(password, 10);
    await this.prisma.member.update({ where: { id }, data: { portalPasswordHash } });
    return { success: true, message: 'Portal password updated' };
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.member.delete({ where: { id } });
    return { deleted: true };
  }

  async clearAll(churchId?: string): Promise<number> {
    const where = churchId ? { churchId } : {};
    const count = await this.prisma.member.count({ where });
    await this.prisma.memberDepartment.deleteMany({ where: { member: where } });
    await this.prisma.member.deleteMany({ where });
    return count;
  }

  async generateQr(memberId: string, churchId?: string) {
    const member = await this.ensureExists(memberId, churchId);
    const base = (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
    const data = `${base}/member/${encodeURIComponent(member.memberId ?? member.id)}`;
    return qrcode.toDataURL(data, { width: 256, margin: 1 });
  }

  async findByMemberId(code: string, churchId?: string) {
    let identifier = code.trim();
    try {
      const url = new URL(identifier);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length) identifier = decodeURIComponent(segments[segments.length - 1]);
    } catch {
      // not a URL; use the value as-is
    }
    let member = await this.prisma.member.findFirst({
      where: { memberId: identifier, ...(churchId ? { churchId } : {}) },
    });
    if (!member) {
      member = await this.prisma.member.findUnique({ where: { id: identifier } });
      if (member && churchId && member.churchId !== churchId) member = null;
    }
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.member.findUnique({
      where: { id: member.id },
      include: {
        family: { include: { head: { select: { id: true, firstName: true, lastName: true } } } },
        departmentLinks: {
          include: {
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async families(churchId?: string) {
    return this.prisma.family.findMany({
      where: churchId ? { churchId } : {},
      include: { members: { select: { id: true, firstName: true, lastName: true } }, head: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createFamily(dto: CreateFamilyDto, churchId?: string) {
    return this.prisma.family.create({ data: { ...dto, churchId: churchId ?? '' } });
  }

  async removeFamily(id: string, churchId?: string) {
    const where = churchId ? { id, churchId } : { id };
    const family = await this.prisma.family.findFirst({ where });
    if (!family) throw new NotFoundException('Church Group not found');
    await this.prisma.member.updateMany({ where: { familyId: id }, data: { familyId: null } });
    await this.prisma.family.delete({ where: { id } });
    return { deleted: true };
  }

  async exportCsv(search?: string, status?: string, churchId?: string): Promise<Array<Record<string, string>>> {
    const where: Prisma.MemberWhereInput = {
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { memberId: { contains: search } },
              { departmentLinks: { some: { department: { name: { contains: search } } } } },
            ],
          }
        : {}),
      ...(status ? { membershipStatus: status as MemberStatus } : {}),
      ...(churchId ? { churchId } : {}),
    };
    const members = await this.prisma.member.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { family: true, departmentLinks: { include: { department: true } } },
    });
    return members.map((m) => ({
      memberId: m.memberId ?? '',
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email ?? '',
      phone: m.phone ?? '',
      gender: m.gender ?? '',
      dateOfBirth: m.dateOfBirth ? m.dateOfBirth.toISOString().slice(0, 10) : '',
      address: m.address ?? '',
      city: m.city ?? '',
      maritalStatus: m.maritalStatus ?? '',
      occupation: m.occupation ?? '',
      membershipStatus: m.membershipStatus ?? '',
      joinDate: m.joinDate ? m.joinDate.toISOString().slice(0, 10) : '',
      baptismDate: m.baptismDate ? m.baptismDate.toISOString().slice(0, 10) : '',
      family: m.family?.name ?? '',
      ministries: m.departmentLinks.map((l) => l.department?.name ?? '').join('; '),
      notes: m.notes ?? '',
    }));
  }

  async exportPdf(churchId?: string): Promise<Buffer> {
    const members = await this.prisma.member.findMany({
      where: churchId ? { churchId } : {},
      include: { departmentLinks: { include: { department: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const church = churchId
      ? await this.prisma.church.findUnique({ where: { id: churchId } })
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
    const faint = '#9ca3af';
    const lineColor = '#e5e7eb';

    const titleCase = (s: string | null | undefined) => {
      if (!s) return '\u2014';
      return s
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - 56) doc.addPage();
    };

    // ── Header ──
    doc.moveDown(0.7);
    doc.font(PDF_FONT_BOLD).fontSize(20).fillColor(dark).text(church?.name ?? 'Church', { align: 'center' });
    doc.moveDown(0.12);
    doc.font(PDF_FONT_BOLD).fontSize(10.5).fillColor(primary).text('MEMBER DIRECTORY', { align: 'center' });
    doc.moveDown(0.25);
    doc.font(PDF_FONT).fontSize(9).fillColor(muted).text(`Generated ${new Date().toLocaleDateString()}  \u00b7  ${members.length} member${members.length === 1 ? '' : 's'}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(48 + pageWidth, doc.y).strokeColor(primary).lineWidth(1.5).stroke();
    doc.moveDown(0.6);

    const sectionTitle = (title: string) => {
      ensureSpace(70);
      doc.x = 48;
      doc.moveDown(0.6);
      doc.font(PDF_FONT_BOLD).fontSize(11).fillColor(primary).text(title.toUpperCase());
      doc.moveDown(0.1);
      doc.moveTo(48, doc.y).lineTo(78, doc.y).strokeColor(primary).lineWidth(2.5).stroke();
      doc.moveDown(0.5);
    };

    // ── Summary strip ──
    const statuses: MemberStatus[] = ['ACTIVE', 'INACTIVE', 'VISITOR', 'TRANSFERRED', 'DECEASED'];
    const genders: Gender[] = ['MALE', 'FEMALE'];
    const statusCounts = statuses
      .map((s) => ({ key: s, count: members.filter((m) => m.membershipStatus === s).length }))
      .filter((s) => s.count > 0);
    const genderCounts = genders
      .map((g) => ({ key: g, count: members.filter((m) => m.gender === g).length }))
      .filter((g) => g.count > 0);
    const activeCount = members.filter((m) => m.membershipStatus === 'ACTIVE').length;
    const maleCount = members.filter((m) => m.gender === 'MALE').length;
    const femaleCount = members.filter((m) => m.gender === 'FEMALE').length;

    const summary = [
      { label: 'Total', value: members.length },
      { label: 'Active', value: activeCount },
      { label: 'Male', value: maleCount },
      { label: 'Female', value: femaleCount },
    ];
    const accentColors = ['#4f46e5', '#059669', '#2563eb', '#db2777'];

    sectionTitle('Summary');
    const boxGap = 12;
    const boxW = (pageWidth - boxGap * 3) / 4;
    const boxH = 60;
    const boxY = doc.y;
    summary.forEach((s, i) => {
      const x = 48 + i * (boxW + boxGap);
      doc.roundedRect(x, boxY, boxW, boxH, 8).fillAndStroke('#ffffff', lineColor);
      doc.roundedRect(x + boxW / 2 - 12, boxY + 10, 24, 3, 2).fill(accentColors[i]);
      doc.font(PDF_FONT_BOLD).fontSize(7).fillColor(muted).text(s.label.toUpperCase(), x, boxY + 21, { width: boxW, align: 'center' });
      doc.font(PDF_FONT_BOLD).fontSize(20).fillColor(dark).text(String(s.value), x, boxY + 31, { width: boxW, align: 'center' });
    });
    doc.y = boxY + boxH + 8;

    // ── Breakdown sections ──
    const breakdownCard = (
      title: string,
      rows: Array<{ key: string; count: number }>,
      barColor: string,
      x: number,
      w: number,
      y: number,
      h: number,
    ): void => {
      const total = rows.reduce((sum, r) => sum + r.count, 0);
      const max = Math.max(1, ...rows.map((r) => r.count));
      const rowH = 26;

      doc.roundedRect(x, y, w, h, 8).fillAndStroke('#ffffff', lineColor);
      doc.font(PDF_FONT_BOLD).fontSize(9).fillColor(primary).text(title.toUpperCase(), x + 16, y + 12);
      doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(dark).text(String(total), x + w - 44, y + 11, { width: 26, align: 'right' });
      doc.moveTo(x + 16, y + 28).lineTo(x + w - 16, y + 28).strokeColor(lineColor).lineWidth(0.5).stroke();

      let ry = y + 36;
      for (const r of rows) {
        doc.font(PDF_FONT_BOLD).fontSize(9).fillColor(dark).text(titleCase(r.key), x + 16, ry, { width: w - 112, lineBreak: false, ellipsis: true });
        doc.font(PDF_FONT).fontSize(8).fillColor(faint).text(total ? `${Math.round((r.count / total) * 100)}%` : '0%', x + w - 66, ry + 1.5, { width: 20, align: 'right' });
        doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(dark).text(String(r.count), x + w - 44, ry - 0.5, { width: 26, align: 'right' });
        doc.rect(x + 16, ry + 14, w - 32, 4).fill('#eef2f7');
        doc.rect(x + 16, ry + 14, Math.max(2, (r.count / max) * (w - 32)), 4).fill(barColor);
        ry += rowH;
      }
    };

    sectionTitle('Membership Breakdown');
    const gap = 16;
    const cardW = (pageWidth - gap) / 2;
    const cardStartX = 48;
    const statusCardH = 28 + statusCounts.length * 26 + 10;
    const genderCardH = 28 + genderCounts.length * 26 + 10;
    const cardH = Math.max(statusCardH, genderCardH);
    ensureSpace(cardH + 12);
    const cardY = doc.y;
    breakdownCard('By Status', statusCounts, '#6366f1', cardStartX, cardW, cardY, cardH);
    breakdownCard('By Gender', genderCounts, '#a855f7', cardStartX + cardW + gap, cardW, cardY, cardH);
    doc.y = cardY + cardH + 12;

    // ── Member directory table ──
    sectionTitle('Member Directory');

    const headers = ['NAME', 'PHONE', 'EMAIL', 'MINISTRY', 'STATUS'];
    const widths = [106, 78, 150, 107, 58];
    const tableWidth = widths.reduce((a, b) => a + b, 0);
    const startX = 48;
    const headerH = 26;
    const rowHeight = 24;
    const headerBg = '#4f46e5';
    const headerRule = '#4338ca';
    const zebraBg = '#f8fafc';
    const rowLine = '#cbd5e1';
    const statusColor: Record<string, string> = {
      ACTIVE: '#047857',
      INACTIVE: '#b45309',
      VISITOR: '#1d4ed8',
      TRANSFERRED: '#b91c1c',
      DECEASED: '#64748b',
    };

    const drawHeader = () => {
      const top = doc.y;
      doc.rect(startX, top, tableWidth, headerH).fill(headerBg);
      let x = startX;
      headers.forEach((h, i) => {
        doc.font(PDF_FONT_BOLD).fontSize(7.5).fillColor('#ffffff');
        doc.text(h, x + 8, top + 9, { width: widths[i] - 16, lineBreak: false, ellipsis: true });
        x += widths[i];
      });
      doc.opacity(0.35);
      let gx = startX;
      for (const w of widths) {
        doc.moveTo(gx, top).lineTo(gx, top + headerH).strokeColor('#ffffff').lineWidth(0.5).stroke();
        gx += w;
      }
      doc.moveTo(gx, top).lineTo(gx, top + headerH).strokeColor('#ffffff').lineWidth(0.5).stroke();
      doc.opacity(1);
      doc.moveTo(startX, top).lineTo(startX + tableWidth, top).strokeColor(headerRule).lineWidth(1).stroke();
      doc
        .moveTo(startX, top + headerH)
        .lineTo(startX + tableWidth, top + headerH)
        .strokeColor(headerRule)
        .lineWidth(1)
        .stroke();
      doc.y = top + headerH;
    };

    const drawRowCells = (cells: string[], rowY: number) => {
      let x = startX;
      cells.forEach((cell, i) => {
        if (i === 0) {
          doc.font(PDF_FONT_BOLD).fontSize(9).fillColor('#1f2937');
        } else if (i === 4) {
          doc.font(PDF_FONT_BOLD).fontSize(8).fillColor(statusColor[cell] ?? '#475569');
        } else {
          doc.font(PDF_FONT).fontSize(9).fillColor('#1f2937');
        }
        doc.text(cell, x + 8, rowY + 7, { width: widths[i] - 16, lineBreak: false, ellipsis: true });
        x += widths[i];
      });
      doc.moveTo(startX, rowY + rowHeight).lineTo(startX + tableWidth, rowY + rowHeight).strokeColor(rowLine).lineWidth(0.5).stroke();
      let gx = startX;
      for (const w of widths) {
        doc.moveTo(gx, rowY).lineTo(gx, rowY + rowHeight).strokeColor(rowLine).lineWidth(0.5).stroke();
        gx += w;
      }
      doc.moveTo(gx, rowY).lineTo(gx, rowY + rowHeight).strokeColor(rowLine).lineWidth(0.5).stroke();
    };

    if (members.length === 0) {
      doc.font(PDF_FONT).fontSize(9.5).fillColor(muted).text('No members found.', 48, doc.y);
    } else {
      drawHeader();
      members.forEach((m, i) => {
        if (doc.y + rowHeight > doc.page.height - 56) {
          doc.addPage();
          drawHeader();
        }
        const ministryNames = m.departmentLinks.map((l) => l.department?.name).filter(Boolean) as string[];
        const ministryLabel =
          ministryNames.length === 0
            ? '\u2014'
            : ministryNames.length <= 2
              ? ministryNames.join(', ')
              : `${ministryNames.slice(0, 2).join(', ')}, +${ministryNames.length - 2} more`;
        if (i % 2 === 1) doc.rect(startX, doc.y, tableWidth, rowHeight).fill(zebraBg);
        drawRowCells(
          [
            `${m.firstName} ${m.lastName}`,
            m.phone ?? '\u2014',
            m.email ?? '\u2014',
            ministryLabel,
            m.membershipStatus ?? '\u2014',
          ],
          doc.y,
        );
        doc.y += rowHeight;
      });
    }

    // ── Header + footer on each page ──
    const docName = `${church?.name ?? 'Church'} \u00b7 Member Directory`;
    let pageNo = 0;
    const drawPageDecorations = () => {
      pageNo += 1;
      if (pageNo > 1) {
        doc.font(PDF_FONT_BOLD).fontSize(8).fillColor(muted).text(docName, 48, 24);
        doc.font(PDF_FONT).fontSize(8).fillColor(faint).text(String(pageNo), 48 + pageWidth - 20, 24, { width: 20, align: 'right' });
      }
      doc.moveTo(48, doc.page.height - 44).lineTo(48 + pageWidth, doc.page.height - 44).strokeColor(lineColor).lineWidth(0.5).stroke();
      doc.font(PDF_FONT).fontSize(8).fillColor(faint);
      doc.text(`Page ${pageNo}`, 48, doc.page.height - 36, { align: 'center', lineBreak: false });
      doc.y = doc.page.margins.top;
    };
    drawPageDecorations();
    doc.on('pageAdded', drawPageDecorations);

    doc.end();
    return done;
  }

  async exportQrPdf(search?: string, status?: string, churchId?: string): Promise<Buffer> {
    const where: Prisma.MemberWhereInput = {
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { memberId: { contains: search } },
              { departmentLinks: { some: { department: { name: { contains: search } } } } },
            ],
          }
        : {}),
      ...(status ? { membershipStatus: status as MemberStatus } : {}),
      ...(churchId ? { churchId } : {}),
    };
    const members = await this.prisma.member.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    registerUiFonts(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => { reject(err); });
    });

    const base = (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
    const margin = 36;
    const cols = 3;
    const gap = 16;
    const cardW = (doc.page.width - margin * 2 - gap * (cols - 1)) / cols;
    const qrSize = 100;
    const cardH = qrSize + 10 + 6 + 12 + 12 + 10;

    doc.fontSize(16).fillColor('#111').text('Member QR Cards', { align: 'center' });
    doc.moveDown(0.2);
    doc
      .fontSize(9)
      .fillColor('#555')
      .text(`Generated on ${new Date().toLocaleDateString()} \u00b7 ${members.length} member${members.length === 1 ? '' : 's'}`, {
        align: 'center',
      });
    doc.moveDown(0.5);

    if (members.length === 0) {
      doc.font(PDF_FONT).fontSize(11).fillColor('#555').text('No members found for the current filters.', { align: 'center' });
      doc.end();
      return done;
    }

    let x = margin;
    let y = doc.y;
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (y + cardH > doc.page.height - margin) {
        doc.addPage();
        x = margin;
        y = margin;
      }

      const qrData = `${base}/member/${encodeURIComponent(m.memberId ?? m.id)}`;
      const qrBuffer = await qrcode.toBuffer(qrData, { width: 220, margin: 1 });

      doc.roundedRect(x, y, cardW, cardH, 8).lineWidth(1).strokeColor('#cbd5e1').stroke();

      const cx = x + cardW / 2;
      doc.image(qrBuffer, cx - qrSize / 2, y + 10, { width: qrSize, height: qrSize });

      const nameY = y + 10 + qrSize + 6;
      doc
        .font(PDF_FONT_BOLD)
        .fontSize(9)
        .fillColor('#111')
        .text(`${m.firstName} ${m.lastName}`, x + 6, nameY, {
          width: cardW - 12,
          align: 'center',
          lineBreak: false,
          ellipsis: true,
        });
      doc
        .font(PDF_FONT)
        .fontSize(8)
        .fillColor('#64748b')
        .text(m.memberId ?? '\u2014', x + 6, nameY + 12, {
          width: cardW - 12,
          align: 'center',
          lineBreak: false,
        });

      x += cardW + gap;
      if ((i + 1) % cols === 0) {
        x = margin;
        y += cardH + gap;
      }
    }

    doc.end();
    return done;
  }

  async importMembers(rows: Array<Record<string, unknown>>, churchId?: string) {
    const parsed: Array<{
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      memberId?: string;
      gender: Gender;
      membershipStatus: MemberStatus;
      city?: string;
      address?: string;
      maritalStatus?: string;
      joinDate?: Date;
      churchId: string;
    }> = [];
    let skipped = 0;

    for (const row of rows) {
      const firstName = String(row.firstName ?? row['First Name'] ?? '').trim();
      const lastName = String(row.lastName ?? row['Last Name'] ?? '').trim();
      if (!firstName || !lastName) {
        skipped++;
        continue;
      }
      const email = String(row.email ?? row.Email ?? '').trim() || undefined;
      const phone = String(row.phone ?? row.Phone ?? '').trim() || undefined;
      const memberId = String(row.memberId ?? row['Member ID'] ?? '').trim() || undefined;
      const gender = String(row.gender ?? row.Gender ?? 'MALE').toUpperCase() === 'FEMALE' ? Gender.FEMALE : Gender.MALE;
      const membership = String(row.membershipStatus ?? row['Membership Status'] ?? 'ACTIVE').toUpperCase();

      parsed.push({
        firstName,
        lastName,
        email,
        phone,
        memberId,
        gender,
        membershipStatus: (Object.values(MemberStatus) as string[]).includes(membership) ? (membership as MemberStatus) : MemberStatus.ACTIVE,
        city: String(row.city ?? row.City ?? '') || undefined,
        address: String(row.address ?? row.Address ?? row.Residence ?? '') || undefined,
        maritalStatus: String(row.maritalStatus ?? row['Marital Status'] ?? '') || undefined,
        joinDate: row.joinDate ? new Date(String(row.joinDate)) : undefined,
        churchId: churchId ?? '',
      });
    }

    if (parsed.length === 0) return { created: 0, skipped };

    const identifiers = parsed
      .filter((p) => p.email || p.phone || p.memberId)
      .flatMap((p) => [
        ...(p.email ? [{ email: p.email }] : []),
        ...(p.phone ? [{ phone: p.phone }] : []),
        ...(p.memberId ? [{ memberId: p.memberId }] : []),
      ]);

    const existing = identifiers.length
      ? await this.prisma.member.findMany({
          where: {
            ...(churchId ? { churchId } : {}),
            OR: identifiers,
          },
          select: { email: true, phone: true, memberId: true },
        })
      : [];

    const existingSet = new Set(
      existing.flatMap((e) => [e.email, e.phone, e.memberId].filter(Boolean)),
    );

    const valid = parsed.filter((p) => {
      if (p.email && existingSet.has(p.email)) return false;
      if (p.phone && existingSet.has(p.phone)) return false;
      if (p.memberId && existingSet.has(p.memberId)) return false;
      return true;
    });

    skipped += parsed.length - valid.length;

    if (valid.length === 0) return { created: 0, skipped };

    const nextId = await this.nextMemberId(churchId ?? '');
    const idNum = parseInt(nextId.split('-').pop() ?? '1', 10);

    const toCreate = valid.map((v, i) => ({
      ...v,
      memberId: v.memberId || `${nextId.split('-')[0]}-${String(idNum + i).padStart(4, '0')}`,
    }));

    await this.prisma.member.createMany({ data: toCreate, skipDuplicates: true });

    return { created: toCreate.length, skipped };
  }

  private async nextMemberId(churchId: string) {
    const church = await this.prisma.church.findUnique({ where: { id: churchId }, select: { slug: true } });
    const prefix = (church?.slug ?? 'CH').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'CH';
    const result = await this.prisma.$queryRaw<Array<{ max_num: bigint }>>`
      SELECT MAX(CAST(SPLIT_PART("memberId", '-', 2) AS BIGINT)) as max_num
      FROM "Member"
      WHERE "churchId" = ${churchId}
    `;
    const max = result[0]?.max_num ? Number(result[0].max_num) : 0;
    return `${prefix}-${String(max + 1).padStart(4, '0')}`;
  }

  private async syncDepartments(memberId: string, departmentIds: string[]) {
    const unique = [...new Set(departmentIds.filter(Boolean))];
    if (unique.length === 0) return;
    await this.prisma.memberDepartment.createMany({
      data: unique.map((departmentId) => ({ departmentId, memberId })),
      skipDuplicates: true,
    });
  }

  private guardPhotoSize(photoUrl?: string) {
    if (photoUrl && photoUrl.length > 14_000_000) {
      throw new BadRequestException('Profile photo is too large (max 10 MB).');
    }
  }

  private async ensureExists(id: string, churchId?: string) {
    const member = await this.prisma.member.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }
}
