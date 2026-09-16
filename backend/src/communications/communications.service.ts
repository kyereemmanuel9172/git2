import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CommunicationType, Prisma } from '@prisma/client';
import { Gender, MemberStatus } from '../common/constants/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommunicationDto, UpdateCommunicationDto, DirectMessageDto, LogCallDto } from './dto/communications.dto';
import { DeliveryService } from './delivery.service';

interface RecipientFilter {
  memberStatus?: string[];
  departmentId?: string | null;
  gender?: string | null;
  city?: string | null;
}

interface Recipient {
  id: string;
  channel: CommunicationType;
  email?: string | null;
  phone?: string | null;
  firstName?: string;
  lastName?: string;
}

// Template variable interpolation
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

@Injectable()
export class CommunicationsService {
  constructor(
    private prisma: PrismaService,
    private delivery: DeliveryService,
    @Optional() @InjectQueue('campaign-delivery') private campaignQueue?: Queue,
  ) {}

  async findAll(
    page: number,
    limit: number,
    churchId?: string,
    options?: {
      search?: string;
      type?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const where: Record<string, unknown> = {};
    if (churchId) where.churchId = churchId;
    if (options?.type) where.type = options.type;
    if (options?.status) where.status = options.status;
    if (options?.search) {
      where.OR = [
        { subject: { contains: options.search, mode: 'insensitive' } },
        { message: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> = {};
    const sortField = options?.sortBy ?? 'createdAt';
    orderBy[sortField] = options?.sortOrder ?? 'desc';

    const [items, total] = await Promise.all([
      this.prisma.communicationCampaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.communicationCampaign.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats(churchId?: string) {
    const where = churchId ? { churchId } : {};

    const [total, sent, pending, failed, byType] = await Promise.all([
      this.prisma.communicationCampaign.count({ where }),
      this.prisma.communicationCampaign.count({ where: { ...where, status: 'SENT' } }),
      this.prisma.communicationCampaign.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.communicationCampaign.count({ where: { ...where, status: { in: ['FAILED', 'PARTIAL'] } } }),
      this.prisma.communicationCampaign.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
        _sum: { totalRecipients: true, sentCount: true, failedCount: true },
      }),
    ]);

    const typeStats = byType.map((t) => ({
      type: t.type,
      count: t._count.id,
      totalRecipients: t._sum.totalRecipients ?? 0,
      sentCount: t._sum.sentCount ?? 0,
      failedCount: t._sum.failedCount ?? 0,
    }));

    return { total, sent, pending, failed, byType: typeStats };
  }

  async findOne(id: string, churchId?: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 500,
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const memberIds = [...new Set(campaign.messages.map((m) => m.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    const nameMap = new Map(members.map((m) => [m.id, m]));
    const messages = campaign.messages.map((m) => ({
      ...m,
      member: nameMap.get(m.memberId) ?? null,
    }));

    return { ...campaign, messages };
  }

  async countAudience(type: string, filter: RecipientFilter, churchId?: string) {
    const recipients = await this.resolveRecipients(type, filter, churchId);
    return { count: recipients.length };
  }

  async create(dto: CreateCommunicationDto, actorId?: string, churchId?: string) {
    if (dto.type === 'EMAIL' && !dto.subject?.trim()) {
      throw new BadRequestException('A subject is required for email campaigns');
    }
    if (dto.type === 'SMS' && dto.message.length > 1600) {
      throw new BadRequestException('SMS message exceeds 1600 characters');
    }

    // Duplicate-send protection: check for recent similar campaigns
    const recentDuplicate = await this.prisma.communicationCampaign.findFirst({
      where: {
        type: dto.type as CommunicationType,
        message: dto.message,
        churchId: churchId ?? '',
        createdAt: { gte: new Date(Date.now() - 60000) }, // within last minute
      },
    });
    if (recentDuplicate) {
      throw new BadRequestException('A similar campaign was just sent. Please wait before sending again.');
    }

    const recipients = await this.resolveRecipients(
      dto.type,
      {
        memberStatus: dto.memberStatus,
        departmentId: dto.departmentId,
        gender: dto.gender,
        city: dto.city,
      },
      churchId,
    );
    if (recipients.length === 0) {
      throw new BadRequestException('No recipients match the selected audience');
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        type: dto.type as CommunicationType,
        subject: dto.subject,
        message: dto.message,
        memberStatus: dto.memberStatus?.join(','),
        departmentId: dto.departmentId,
        gender: dto.gender,
        city: dto.city,
        status: isScheduled ? 'PENDING' : 'SENT',
        totalRecipients: recipients.length,
        scheduledAt: isScheduled ? scheduledAt : null,
        createdBy: actorId,
        churchId: churchId ?? '',
      },
    });

    if (isScheduled) {
      return campaign;
    }
    await this.send(campaign.id, recipients);
    return this.findOne(campaign.id, churchId);
  }

  async update(id: string, dto: UpdateCommunicationDto, churchId?: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING') {
      throw new BadRequestException('Only scheduled campaigns can be edited');
    }

    const data: Record<string, unknown> = {};
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.message !== undefined) data.message = dto.message;
    if (dto.scheduledAt !== undefined) {
      data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }
    if (dto.memberStatus !== undefined) data.memberStatus = dto.memberStatus.join(',');
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.city !== undefined) data.city = dto.city;

    // Recalculate recipients if filters changed
    if (dto.memberStatus || dto.departmentId || dto.gender || dto.city) {
      const recipients = await this.resolveRecipients(
        campaign.type,
        {
          memberStatus: dto.memberStatus ?? campaign.memberStatus?.split(','),
          departmentId: dto.departmentId ?? campaign.departmentId,
          gender: dto.gender ?? campaign.gender,
          city: dto.city ?? campaign.city,
        },
        churchId,
      );
      data.totalRecipients = recipients.length;
    }

    return this.prisma.communicationCampaign.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, churchId?: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === 'SENT') {
      throw new BadRequestException('Cannot delete sent campaigns. Cancel or archive instead.');
    }

    await this.prisma.communicationMessage.deleteMany({ where: { campaignId: id } });
    await this.prisma.communicationCampaign.delete({ where: { id } });
    return { deleted: true };
  }

  async logCall(dto: LogCallDto, actorId?: string, churchId?: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId, ...(churchId ? { churchId } : {}) },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const message = dto.note?.trim() || 'Phone call placed';
    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        type: 'CALL',
        message,
        status: 'SENT',
        totalRecipients: 1,
        sentCount: 1,
        sentAt: new Date(),
        createdBy: actorId,
        churchId: churchId ?? '',
      },
    });

    await this.prisma.communicationMessage.create({
      data: {
        campaignId: campaign.id,
        memberId: member.id,
        channel: 'CALL',
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return this.findOne(campaign.id, churchId);
  }

  async cancel(id: string, churchId?: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({ where: { id, ...(churchId ? { churchId } : {}) } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'PENDING') {
      throw new BadRequestException('Only scheduled campaigns can be cancelled');
    }
    return this.prisma.communicationCampaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async sendDirect(dto: DirectMessageDto, actorId?: string, churchId?: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId, ...(churchId ? { churchId } : {}) },
    });
    if (!member) throw new NotFoundException('Member not found');

    const channel = dto.type as CommunicationType;
    if (channel === 'EMAIL') {
      if (!member.email) throw new BadRequestException('This member has no email address on file');
      if (!dto.subject?.trim()) throw new BadRequestException('A subject is required for email');
    } else if (!member.phone) {
      throw new BadRequestException('This member has no phone number on file');
    }
    if (channel === 'SMS' && dto.message.length > 1600) {
      throw new BadRequestException('SMS message exceeds 1600 characters');
    }

    // Interpolate template variables for direct messages
    const interpolatedMessage = interpolate(dto.message, {
      firstName: member.firstName,
      lastName: member.lastName,
      name: `${member.firstName} ${member.lastName}`,
    });

    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        type: channel,
        subject: channel === 'EMAIL' ? dto.subject : null,
        message: interpolatedMessage,
        status: 'SENT',
        totalRecipients: 1,
        createdBy: actorId,
        churchId: churchId ?? '',
      },
    });

    await this.send(campaign.id, [{ id: member.id, channel, email: member.email, phone: member.phone }]);
    return this.findOne(campaign.id, churchId);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduled() {
    if (!this.campaignQueue) return;
    const due = await this.prisma.communicationCampaign.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      take: 25,
    });
    for (const campaign of due) {
      try {
        await this.campaignQueue.add(
          'deliver',
          { campaignId: campaign.id },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
      } catch (err) {
        await this.prisma.communicationCampaign.update({
          where: { id: campaign.id },
          data: { status: 'PARTIAL' },
        });
      }
    }
  }

  private async send(campaignId: string, recipients: Recipient[]) {
    await this.prisma.communicationMessage.deleteMany({ where: { campaignId } });
    const campaign = await this.prisma.communicationCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return;

    if (campaign.type === 'EMAIL') {
      await this.sendEmailCampaign(campaign, recipients);
    } else {
      await this.sendNonEmailCampaign(campaign, recipients);
    }
  }

  private async sendEmailCampaign(
    campaign: { id: string; type: CommunicationType; subject?: string | null; message: string; churchId: string },
    recipients: Recipient[],
  ) {
    const emailRecipients = recipients.filter((r) => r.email);
    const noEmailRecipients = recipients.filter((r) => !r.email);

    let sent = 0;
    let failed = 0;

    for (const r of noEmailRecipients) {
      failed++;
      await this.prisma.communicationMessage.create({
        data: {
          campaignId: campaign.id,
          memberId: r.id,
          channel: 'EMAIL',
          status: 'FAILED',
          error: 'No email address on file',
        },
      });
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < emailRecipients.length; i += BATCH_SIZE) {
      const batch = emailRecipients.slice(i, i + BATCH_SIZE);

      // Interpolate template variables for each recipient
      const personalizedBatch = batch.map((r) => ({
        to: r.email!,
        subject: campaign.subject ?? '',
        text: interpolate(campaign.message, {
          firstName: r.firstName ?? '',
          lastName: r.lastName ?? '',
          name: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
        }),
      }));

      const result = await this.delivery.sendEmailBatch(personalizedBatch);
      sent += result.sent;
      failed += result.failed;

      for (let j = 0; j < batch.length; j++) {
        const recipient = batch[j];
        const batchError = result.errors[j] || null;
        const isSent = j < result.sent;
        const error = !isSent ? (batchError || 'Delivery failed') : null;
        await this.prisma.communicationMessage.create({
          data: {
            campaignId: campaign.id,
            memberId: recipient.id,
            channel: 'EMAIL',
            status: isSent ? 'SENT' : 'FAILED',
            error: error?.slice(0, 500) ?? null,
            sentAt: isSent ? new Date() : null,
          },
        });
      }
    }

    await this.prisma.communicationCampaign.update({
      where: { id: campaign.id },
      data: {
        status: failed > 0 && sent > 0 ? 'PARTIAL' : failed > 0 ? 'FAILED' : 'SENT',
        sentAt: new Date(),
        sentCount: sent,
        failedCount: failed,
      },
    });
  }

  private async sendNonEmailCampaign(
    campaign: { id: string; type: CommunicationType; subject?: string | null; message: string; churchId: string },
    recipients: Recipient[],
  ) {
    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      // Interpolate template variables
      const personalizedMessage = interpolate(campaign.message, {
        firstName: recipient.firstName ?? '',
        lastName: recipient.lastName ?? '',
        name: `${recipient.firstName ?? ''} ${recipient.lastName ?? ''}`.trim(),
      });

      const outcome = await this.deliver({ ...campaign, message: personalizedMessage }, recipient);
      const status = outcome.ok ? 'SENT' : 'FAILED';
      const error = outcome.error ? outcome.error.slice(0, 500) : null;
      if (outcome.ok) {
        sent += 1;
      } else {
        failed += 1;
      }
      await this.prisma.communicationMessage.create({
        data: {
          campaignId: campaign.id,
          memberId: recipient.id,
          channel: campaign.type,
          status,
          error,
          sentAt: outcome.ok ? new Date() : null,
        },
      });
    }

    await this.prisma.communicationCampaign.update({
      where: { id: campaign.id },
      data: {
        status: failed > 0 && sent > 0 ? 'PARTIAL' : failed > 0 ? 'FAILED' : 'SENT',
        sentAt: new Date(),
        sentCount: sent,
        failedCount: failed,
      },
    });
  }

  private async deliver(campaign: { id: string; type: CommunicationType; subject?: string | null; message: string }, recipient: Recipient) {
    try {
      switch (campaign.type) {
        case 'EMAIL':
          if (!recipient.email) return { ok: false, error: 'No email address on file' };
          return await this.delivery.sendEmail(recipient.email, campaign.subject ?? '', campaign.message);
        case 'SMS':
          if (!recipient.phone) return { ok: false, error: 'No phone number on file' };
          return await this.delivery.sendSms(recipient.phone, campaign.message);
        case 'CALL':
          if (!recipient.phone) return { ok: false, error: 'No phone number on file' };
          return await this.delivery.makeCall(recipient.phone, campaign.message);
        default:
          return { ok: false, error: `Unsupported channel ${campaign.type}` };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Delivery failed' };
    }
  }

  private async resolveRecipients(type: string, filter: RecipientFilter, churchId?: string) {
    const where: Prisma.MemberWhereInput = {
      ...(churchId ? { churchId } : {}),
      ...(filter.memberStatus && filter.memberStatus.length > 0
        ? { membershipStatus: { in: filter.memberStatus as MemberStatus[] } }
        : {}),
      ...(filter.departmentId ? { departmentLinks: { some: { departmentId: filter.departmentId } } } : {}),
      ...(filter.gender ? { gender: filter.gender as Gender } : {}),
      ...(filter.city ? { city: filter.city } : {}),
    };

    const members = await this.prisma.member.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    const channel = type as CommunicationType;
    return members
      .filter((m) => (channel === 'EMAIL' ? !!m.email : !!m.phone))
      .map((m) => ({ id: m.id, channel, email: m.email, phone: m.phone, firstName: m.firstName, lastName: m.lastName }));
  }
}
