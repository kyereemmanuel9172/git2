import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationType } from '@prisma/client';

interface CampaignJobData {
  campaignId: string;
}

@Processor('campaign-delivery')
export class CampaignDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignDeliveryProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<{ sent: number; failed: number }> {
    this.logger.log(`Processing campaign delivery job ${job.id} for campaign ${job.data.campaignId}`);

    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id: job.data.campaignId },
    });

    if (!campaign || campaign.status !== 'PENDING') {
      this.logger.warn(`Campaign ${job.data.campaignId} not found or not pending`);
      return { sent: 0, failed: 0 };
    }

    const recipients = await this.resolveRecipients(campaign);
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        if (campaign.type === 'EMAIL' && recipient.email) {
          await this.sendEmail(recipient.email, campaign.subject ?? '', campaign.message);
          sent++;
        } else if (campaign.type === 'SMS' && recipient.phone) {
          await this.sendSms(recipient.phone, campaign.message);
          sent++;
        } else {
          failed++;
        }

        await this.prisma.communicationMessage.create({
          data: {
            campaignId: campaign.id,
            memberId: recipient.id,
            channel: campaign.type as CommunicationType,
            status: sent > failed ? 'SENT' : 'FAILED',
            sentAt: sent > failed ? new Date() : null,
          },
        });
      } catch (err) {
        failed++;
        this.logger.error(`Failed to send to ${recipient.id}: ${err}`);
      }

      await job.updateProgress(Math.round(((sent + failed) / recipients.length) * 100));
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

    this.logger.log(`Campaign ${campaign.id} completed: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  private async resolveRecipients(campaign: { departmentId?: string | null; memberStatus?: string | null; gender?: string | null; city?: string | null; churchId?: string | null }) {
    const where: Record<string, unknown> = {
      membershipStatus: 'ACTIVE',
      ...(campaign.churchId ? { churchId: campaign.churchId } : {}),
    };

    if (campaign.departmentId) {
      where.departmentLinks = { some: { departmentId: campaign.departmentId } };
    }
    if (campaign.memberStatus) {
      where.membershipStatus = campaign.memberStatus;
    }
    if (campaign.gender) {
      where.gender = campaign.gender;
    }
    if (campaign.city) {
      where.city = campaign.city;
    }

    return this.prisma.member.findMany({
      where,
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });
  }

  private async sendEmail(to: string, subject: string, _body: string) {
    // Email sending logic - integrate with your email provider
    this.logger.log(`Sending email to ${to}: ${subject}`);
  }

  private async sendSms(to: string, _message: string) {
    // SMS sending logic - integrate with your SMS provider
    this.logger.log(`Sending SMS to ${to}`);
  }
}
