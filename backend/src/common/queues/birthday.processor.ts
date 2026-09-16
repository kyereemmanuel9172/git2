import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('birthday-notifications')
export class BirthdayNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(BirthdayNotificationProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<{ notified: number }> {
    this.logger.log(`Processing birthday notification job ${job.id}`);

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayLocal = new Date(todayYear, todayMonth, todayDay).getTime();

    const members = await this.prisma.member.findMany({
      where: { dateOfBirth: { not: null } },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
    });

    const todayBirthdays = members.filter((m) => {
      if (!m.dateOfBirth) return false;
      const birthMonth = m.dateOfBirth.getMonth();
      const birthDay = m.dateOfBirth.getDate();
      const thisYearBirthday = new Date(todayYear, birthMonth, birthDay).getTime();
      return thisYearBirthday === todayLocal;
    });

    if (todayBirthdays.length === 0) return { notified: 0 };

    const todayStart = new Date(todayYear, todayMonth, todayDay);
    const existing = await this.prisma.notification.findMany({
      where: { title: 'Birthday today', createdAt: { gte: todayStart } },
      select: { message: true },
    });
    const alreadyNotified = new Set(existing.map((n) => n.message));

    const recipients = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let notified = 0;
    for (const b of todayBirthdays) {
      const birthYear = b.dateOfBirth!.getFullYear();
      const age = todayYear - birthYear;
      const message = `${b.firstName} ${b.lastName} is celebrating a birthday today (turning ${age}).`;
      if (alreadyNotified.has(message)) continue;

      await this.prisma.notification.createMany({
        data: recipients.map((u) => ({
          userId: u.id,
          title: 'Birthday today',
          message,
        })),
      });
      notified++;
    }

    this.logger.log(`Birthday notifications sent: ${notified}`);
    return { notified };
  }
}
