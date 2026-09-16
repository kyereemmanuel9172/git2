import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import { Member } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SEGOE_FONT as PDF_FONT, SEGOE_FONT_BOLD as PDF_FONT_BOLD, registerUiFonts } from '../common/pdf-fonts';
import {
  ChangePortalPasswordDto,
  CreatePortalPrayerRequestDto,
  PortalForgotPasswordDto,
  PortalLoginDto,
  PortalResetPasswordDto,
  UpdatePortalProfileDto,
} from './dto/portal.dto';

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: PortalLoginDto) {
    const member = await this.findByIdentifier(dto.identifier);
    if (!member || !member.portalPasswordHash) {
      throw new UnauthorizedException(
        'No portal account found. Check your details or ask your church administrator to set up portal access.',
      );
    }
    if (!(await bcrypt.compare(dto.password, member.portalPasswordHash))) {
      throw new UnauthorizedException('Invalid portal login details');
    }
    if (member.membershipStatus === 'DECEASED' || member.membershipStatus === 'TRANSFERRED') {
      throw new UnauthorizedException('This account is no longer active');
    }

    await this.prisma.member.update({
      where: { id: member.id },
      data: { lastPortalLoginAt: new Date() },
    });

    const accessToken = this.jwtService.sign({
      sub: member.id,
      type: 'member',
      churchId: member.churchId,
    });
    return { member: this.sanitize(member), accessToken };
  }

  async me(memberId: string) {
    return this.getMember(memberId);
  }

  async overview(memberId: string) {
    const member = await this.getMember(memberId);
    const [attendanceCount, givingTotal, registrations, prayerCount, announcements, events] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { memberId } }),
      this.givingTotal(memberId),
      this.prisma.eventRegistration.count({ where: { memberId, status: { not: 'CANCELLED' } } }),
      this.prisma.prayerRequest.count({ where: { memberId } }),
      this.publishedAnnouncements(member, 3),
      this.upcomingEvents(member, 3),
    ]);

    return {
      kpis: {
        attendanceCount,
        givingTotal,
        registrations,
        prayerCount,
      },
      recentAnnouncements: announcements,
      upcomingEvents: events,
    };
  }

  async contributions(memberId: string) {
    const [transactions, contributions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { memberId, type: { not: 'EXPENSE' } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.contribution.findMany({
        where: { memberId, status: { not: 'VOID' } },
        orderBy: { date: 'desc' },
      }),
    ]);

    const items = [
      ...transactions.map((t) => ({
        id: t.id,
        source: 'TRANSACTION' as const,
        type: t.type,
        amount: Number(t.amount),
        currency: t.currency,
        category: t.category,
        description: t.description,
        reference: null,
        date: t.date,
      })),
      ...contributions.map((c) => ({
        id: c.id,
        source: 'CONTRIBUTION' as const,
        type: c.type,
        amount: Number(c.amount),
        currency: c.currency,
        category: c.service,
        description: c.notes,
        reference: c.reference,
        date: c.date,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const total = items.reduce((sum, i) => sum + i.amount, 0);
    const last30 = items
      .filter((i) => i.date.getTime() > Date.now() - 30 * 86400000)
      .reduce((sum, i) => sum + i.amount, 0);
    const thisYear = items
      .filter((i) => i.date.getFullYear() === new Date().getFullYear())
      .reduce((sum, i) => sum + i.amount, 0);

    return { items, summary: { total, last30, thisYear } };
  }

  async generateReceiptPdf(memberId: string): Promise<Buffer> {
    const member = await this.getMember(memberId);
    const church = member.church;

    const [transactions, contributions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { memberId, type: { not: 'EXPENSE' } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.contribution.findMany({
        where: { memberId, status: { not: 'VOID' } },
        orderBy: { date: 'desc' },
      }),
    ]);

    const items = [
      ...transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        currency: t.currency,
        category: t.category,
        description: t.description,
        reference: null as string | null,
        date: t.date,
      })),
      ...contributions.map((c) => ({
        id: c.id,
        type: c.type,
        amount: Number(c.amount),
        currency: c.currency,
        category: c.service,
        description: c.notes,
        reference: c.reference,
        date: c.date,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const total = items.reduce((s, i) => s + i.amount, 0);
    const thisYear = items
      .filter((i) => i.date.getFullYear() === new Date().getFullYear())
      .reduce((s, i) => s + i.amount, 0);
    const last30 = items
      .filter((i) => i.date.getTime() > Date.now() - 30 * 86400000)
      .reduce((s, i) => s + i.amount, 0);

    const now = new Date();
    const receiptNo = `RCP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${memberId.slice(-6).toUpperCase()}`;

    const fmtMoney = (n: number, currency = 'USD') =>
      `${currency === 'USD' ? '$' : currency + ' '}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (d: Date) =>
      d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const titleCase = (s: string) =>
      s ? s.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

    const BRAND = '#4f46e5';
    const BRAND_LIGHT = '#eef2ff';
    const TEXT = '#1e293b';
    const MUTED = '#64748b';
    const BORDER = '#e2e8f0';
    const ROW_ALT = '#f8fafc';

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    registerUiFonts(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const pageW = 595.28;
    const margin = 48;
    const contentW = pageW - margin * 2;
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > doc.page.height - 60) {
        doc.addPage();
        y = 48;
      }
    };

    // ── Header bar ──
    doc.rect(0, 0, pageW, 90).fill(BRAND);
    doc.rect(0, 86, pageW, 4).fill('#3730a3');

    // Church name
    doc.font(PDF_FONT_BOLD).fontSize(20).fillColor('#ffffff');
    doc.text(church?.name ?? 'Church', margin, 28, { width: contentW });

    // Subtitle
    doc.font(PDF_FONT).fontSize(10).fillColor('#c7d2fe');
    doc.text('Giving Receipt', margin, 55);

    // Receipt number (right side)
    doc.font(PDF_FONT).fontSize(9).fillColor('#c7d2fe');
    doc.text(receiptNo, margin, 70, { width: contentW, align: 'right' });

    y = 108;

    // ── Member info card ──
    doc.roundedRect(margin, y, contentW, 56, 6).fill('#ffffff').stroke(BORDER);
    doc.rect(margin, y, 4, 56).fill(BRAND);

    const infoX = margin + 16;
    doc.font(PDF_FONT_BOLD).fontSize(9).fillColor(MUTED);
    doc.text('PREPARED FOR', infoX, y + 10);
    doc.font(PDF_FONT_BOLD).fontSize(13).fillColor(TEXT);
    doc.text(`${member.firstName} ${member.lastName}`, infoX, y + 24);
    doc.font(PDF_FONT).fontSize(9).fillColor(MUTED);
    const memberDetails = [
      member.memberId,
      member.email,
      member.phone,
    ].filter(Boolean).join('  ·  ');
    doc.text(memberDetails, infoX, y + 40, { width: contentW - 32 });

    y += 72;

    // ── Date & receipt info ──
    doc.font(PDF_FONT).fontSize(9).fillColor(MUTED);
    doc.text(`Date issued: ${fmtDate(now)}`, margin, y, { width: contentW, align: 'right' });
    y += 20;

    // ── Summary boxes ──
    const boxW = (contentW - 16) / 3;
    const boxes = [
      { label: 'Total Giving', value: fmtMoney(total), sub: 'Lifetime' },
      { label: 'This Year', value: fmtMoney(thisYear), sub: now.getFullYear().toString() },
      { label: 'Last 30 Days', value: fmtMoney(last30), sub: 'Recent' },
    ];

    boxes.forEach((b, i) => {
      const bx = margin + i * (boxW + 8);
      doc.roundedRect(bx, y, boxW, 58, 6).fill('#ffffff').stroke(BORDER);
      doc.rect(bx, y, boxW, 4).fill(i === 0 ? BRAND : i === 1 ? '#0891b2' : '#7c3aed');
      doc.font(PDF_FONT).fontSize(8).fillColor(MUTED);
      doc.text(b.label.toUpperCase(), bx + 12, y + 14, { width: boxW - 24 });
      doc.font(PDF_FONT_BOLD).fontSize(16).fillColor(TEXT);
      doc.text(b.value, bx + 12, y + 26, { width: boxW - 24 });
      doc.font(PDF_FONT).fontSize(8).fillColor(MUTED);
      doc.text(b.sub, bx + 12, y + 46, { width: boxW - 24 });
    });

    y += 76;

    // ── Transactions table ──
    doc.font(PDF_FONT_BOLD).fontSize(12).fillColor(TEXT);
    doc.text('Transaction History', margin, y);
    y += 20;

    const colWidths = [72, 80, 120, contentW - 72 - 80 - 120 - 80, 80];
    const colHeaders = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rowH = 22;
    const headerH = 26;

    // Table header
    doc.roundedRect(margin, y, contentW, headerH, 4).fill(BRAND);
    let cx = margin + 8;
    colHeaders.forEach((h, i) => {
      doc.font(PDF_FONT_BOLD).fontSize(8).fillColor('#ffffff');
      doc.text(h, cx, y + 8, { width: colWidths[i] - 8, lineBreak: false });
      cx += colWidths[i];
    });
    y += headerH;

    // Table rows
    items.forEach((item, idx) => {
      checkPage(rowH + 20);
      if (idx % 2 === 0) {
        doc.rect(margin, y, contentW, rowH).fill(ROW_ALT);
      }
      // Subtle bottom border
      doc.save()
        .moveTo(margin, y + rowH)
        .lineTo(margin + contentW, y + rowH)
        .lineWidth(0.3)
        .strokeColor(BORDER)
        .stroke()
        .restore();

      cx = margin + 8;
      const cells = [
        fmtDate(item.date),
        titleCase(item.type),
        item.category ?? '—',
        item.description ?? (item.reference ? `Ref: ${item.reference}` : '—'),
        fmtMoney(item.amount, item.currency),
      ];
      cells.forEach((cell, ci) => {
        const isLast = ci === cells.length - 1;
        doc.font(isLast ? PDF_FONT_BOLD : PDF_FONT).fontSize(8.5).fillColor(isLast ? '#059669' : TEXT);
        doc.text(cell, cx, y + 6, {
          width: colWidths[ci] - 8,
          align: isLast ? 'right' : 'left',
          lineBreak: false,
          ellipsis: true,
        });
        cx += colWidths[ci];
      });
      y += rowH;
    });

    // ── Total row ──
    if (items.length > 0) {
      y += 4;
      doc.roundedRect(margin, y, contentW, 30, 4).fill(BRAND_LIGHT);
      doc.font(PDF_FONT_BOLD).fontSize(10).fillColor(BRAND);
      doc.text('TOTAL', margin + 12, y + 9, { width: contentW - 24, align: 'left' });
      doc.font(PDF_FONT_BOLD).fontSize(12).fillColor(BRAND);
      doc.text(fmtMoney(total), margin + 12, y + 7, { width: contentW - 24, align: 'right' });
      y += 46;
    }

    // ── Footer ──
    checkPage(80);
    doc.save()
      .moveTo(margin, y)
      .lineTo(margin + contentW, y)
      .lineWidth(1)
      .strokeColor(BORDER)
      .stroke()
      .restore();
    y += 14;

    doc.font(PDF_FONT).fontSize(8).fillColor(MUTED);
    doc.text(
      'This receipt is for your personal records. For any queries regarding this receipt, please contact your church office.',
      margin,
      y,
      { width: contentW, align: 'center' },
    );
    y += 16;
    doc.text(
      `Generated on ${fmtDate(now)} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}  ·  ${church?.name ?? ''}`,
      margin,
      y,
      { width: contentW, align: 'center' },
    );
    y += 16;

    // Brand color strip at bottom
    doc.rect(0, doc.page.height - 4, pageW, 4).fill(BRAND);

    doc.end();
    return done;
  }

  async attendance(memberId: string) {
    const [records, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { memberId },
        orderBy: { date: 'desc' },
        take: 200,
      }),
      this.prisma.attendanceRecord.count({ where: { memberId } }),
    ]);
    const byType = await this.prisma.attendanceRecord.groupBy({
      by: ['serviceType'],
      where: { memberId },
      _count: { _all: true },
    });
    return {
      items: records,
      total,
      byType: byType.map((g) => ({ serviceType: g.serviceType, count: g._count._all })),
    };
  }

  async announcements(memberId: string) {
    const member = await this.getMember(memberId);
    return this.publishedAnnouncements(member, 50);
  }

  async events(memberId: string) {
    const member = await this.getMember(memberId);
    return this.upcomingEvents(member, 50);
  }

  async registerForEvent(eventId: string, memberId: string) {
    const member = await this.getMember(memberId);
    const event = await this.prisma.churchEvent.findFirst({
      where: { id: eventId, churchId: member.churchId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });
    if (existing) return { registration: existing, message: 'Already registered' };

    const confirmedCount = await this.prisma.eventRegistration.count({
      where: { eventId, status: 'CONFIRMED' },
    });
    const status = event.capacity && confirmedCount >= event.capacity ? 'WAITLIST' : 'CONFIRMED';

    const registration = await this.prisma.eventRegistration.create({
      data: { eventId, memberId, status, churchId: member.churchId },
    });
    return { registration, message: status === 'WAITLIST' ? 'Registered (waitlist)' : 'Registered' };
  }

  async prayer(memberId: string) {
    const [requests, sessions] = await Promise.all([
      this.prisma.prayerRequest.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        include: { member: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.counselingSession.findMany({
        where: { memberId },
        orderBy: { date: 'desc' },
        include: { counselor: { select: { id: true, name: true } } },
      }),
    ]);
    return { requests, sessions };
  }

  async createPrayerRequest(memberId: string, dto: CreatePortalPrayerRequestDto) {
    const member = await this.getMember(memberId);
    return this.prisma.prayerRequest.create({
      data: {
        memberId,
        churchId: member.churchId,
        subject: dto.subject,
        content: dto.content,
        isPublic: dto.isPublic ?? true,
      },
    });
  }

  async updateProfile(memberId: string, dto: UpdatePortalProfileDto) {
    await this.getMember(memberId);
    const updated = await this.prisma.member.update({ where: { id: memberId }, data: dto });
    return this.sanitize(updated);
  }

  async changePassword(memberId: string, dto: ChangePortalPasswordDto) {
    const member = await this.getMember(memberId);
    if (member.portalPasswordHash) {
      const valid = await bcrypt.compare(dto.currentPassword, member.portalPasswordHash);
      if (!valid) throw new BadRequestException('Current password is incorrect');
    }
    const portalPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.member.update({ where: { id: memberId }, data: { portalPasswordHash } });
    return { success: true, message: 'Password updated' };
  }

  async forgotPassword(dto: PortalForgotPasswordDto) {
    const member = await this.findByIdentifier(dto.identifier);
    if (!member || !member.portalPasswordHash) {
      return { message: 'If that identifier matches a member, a reset link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.member.update({
      where: { id: member.id },
      data: { portalPasswordResetToken: tokenHash, portalPasswordResetExpires: expires },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/portal/reset-password?token=${token}`;
    const message = 'If that identifier matches a member, a reset link has been sent.';
    return process.env.NODE_ENV === 'production'
      ? { message }
      : { message, resetUrl };
  }

  async resetPassword(dto: PortalResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const member = await this.prisma.member.findFirst({
      where: { portalPasswordResetToken: tokenHash },
    });

    if (!member) throw new BadRequestException('Invalid or expired reset token');
    if (!member.portalPasswordResetExpires || member.portalPasswordResetExpires < new Date()) {
      throw new BadRequestException('This reset link has expired. Please request a new one.');
    }

    const portalPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.member.update({
      where: { id: member.id },
      data: { portalPasswordHash, portalPasswordResetToken: null, portalPasswordResetExpires: null },
    });
    return { message: 'Password has been reset. You can now sign in.' };
  }

  private async getMember(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        church: { select: { id: true, name: true, logoUrl: true, city: true, website: true, serviceTimes: true } },
        family: { include: { members: { select: { id: true, firstName: true, lastName: true } } } },
        departmentLinks: { include: { department: { select: { id: true, name: true } } } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  private async findByIdentifier(identifier: string) {
    const value = identifier.trim();
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    const candidates: Array<Record<string, unknown>> = [{ memberId: value }];
    if (value.includes('@')) {
      candidates.push({ email: value.toLowerCase() });
    }
    if (digits.length >= 7) {
      candidates.push({ phone: { contains: digits.slice(-10) } });
    }
    return this.prisma.member.findFirst({
      where: {
        OR: candidates,
        portalPasswordHash: { not: null },
      },
    });
  }

  private async publishedAnnouncements(member: Member, take: number) {
    const departmentIds = await this.prisma.memberDepartment.findMany({
      where: { memberId: member.id },
      select: { departmentId: true },
    });
    const deptSet = new Set(departmentIds.map((d) => d.departmentId));

    const all = await this.prisma.announcement.findMany({
      where: { churchId: member.churchId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: { department: { select: { id: true, name: true } } },
      take: 200,
    });

    return all
      .filter((a) => {
        if (a.memberStatus && !a.memberStatus.split(',').includes(member.membershipStatus)) return false;
        if (a.gender && a.gender !== member.gender) return false;
        if (a.city && a.city !== member.city) return false;
        if (a.departmentId && !deptSet.has(a.departmentId)) return false;
        return true;
      })
      .slice(0, take);
  }

  private async upcomingEvents(member: Member, take: number) {
    const events = await this.prisma.churchEvent.findMany({
      where: {
        churchId: member.churchId,
        status: { in: ['UPCOMING', 'ONGOING'] },
        startDate: { gte: new Date(Date.now() - 6 * 3600000) },
      },
      orderBy: { startDate: 'asc' },
      include: {
        _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } },
        registrations: { where: { memberId: member.id }, select: { id: true, status: true } },
      },
    });
    return events
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        capacity: e.capacity,
        status: e.status,
        registrations: e._count.registrations,
        registered: e.registrations.length > 0,
        registrationStatus: e.registrations[0]?.status ?? null,
      }))
      .slice(0, take);
  }

  private async givingTotal(memberId: string) {
    const [txns, contribs] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { memberId, type: { not: 'EXPENSE' } },
        _sum: { amount: true },
      }),
      this.prisma.contribution.aggregate({
        where: { memberId, status: { not: 'VOID' } },
        _sum: { amount: true },
      }),
    ]);
    return Number(txns._sum.amount ?? 0) + Number(contribs._sum.amount ?? 0);
  }

  async birthdays(memberId: string, churchId?: string) {
    await this.getMember(memberId);
    const members = await this.prisma.member.findMany({
      where: {
        dateOfBirth: { not: null },
        membershipStatus: { not: 'DECEASED' },
        ...(churchId ? { churchId } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        photoUrl: true,
        memberId: true,
      },
    });

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayLocal = new Date(todayYear, todayMonth, todayDay).getTime();

    const items = [];
    for (const m of members) {
      if (!m.dateOfBirth) continue;
      const birthMonth = m.dateOfBirth.getMonth();
      const birthDay = m.dateOfBirth.getDate();
      const birthYear = m.dateOfBirth.getFullYear();

      let nextBirthday = new Date(todayYear, birthMonth, birthDay).getTime();
      if (nextBirthday < todayLocal) {
        nextBirthday = new Date(todayYear + 1, birthMonth, birthDay).getTime();
      }
      const daysUntil = Math.round((nextBirthday - todayLocal) / 86400000);

      const isToday = daysUntil === 0;
      const isThisWeek = daysUntil <= 7;
      const age = new Date(nextBirthday).getFullYear() - birthYear;

      items.push({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        memberId: m.memberId,
        photoUrl: m.photoUrl,
        dateOfBirth: m.dateOfBirth.toISOString().slice(0, 10),
        nextBirthday: new Date(nextBirthday).toISOString().slice(0, 10),
        age,
        daysUntil,
        isToday,
        isThisWeek,
        isSelf: m.id === memberId,
      });
    }

    items.sort((a, b) => a.daysUntil - b.daysUntil);

    return {
      items,
      today: items.filter((i) => i.isToday),
      thisWeek: items.filter((i) => i.isThisWeek && !i.isToday),
      later: items.filter((i) => !i.isThisWeek),
      total: items.length,
    };
  }

  private sanitize(member: Member) {
    const { portalPasswordHash, portalPasswordResetToken, portalPasswordResetExpires, ...safe } = member;
    return safe;
  }
}
