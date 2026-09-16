import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheConfigModule } from './common/cache/cache.module';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MembersModule } from './members/members.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FinanceModule } from './finance/finance.module';
import { ContributionsModule } from './contributions/contributions.module';
import { PaymentsModule } from './payments/payments.module';
import { DepartmentsModule } from './departments/departments.module';
import { EventsModule } from './events/events.module';
import { PrayerModule } from './prayer/prayer.module';
import { AssetsModule } from './assets/assets.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { CommunicationsModule } from './communications/communications.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ChurchesModule } from './churches/churches.module';
import { ServicesModule } from './services/services.module';
import { VisitorsModule } from './visitors/visitors.module';
import { ChildrenModule } from './children/children.module';
import { PodcastsModule } from './podcasts/podcasts.module';
import { PublicModule } from './public/public.module';
import { PortalModule } from './portal/portal.module';
import { ConferenceModule } from './conference/conference.module';
import { BirthdayNotificationProcessor } from './common/queues/birthday.processor';
import { CampaignDeliveryProcessor } from './common/queues/campaign.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
      },
    }),
    CacheConfigModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MembersModule,
    AttendanceModule,
    FinanceModule,
    ContributionsModule,
    PaymentsModule,
    DepartmentsModule,
    EventsModule,
    PrayerModule,
    AssetsModule,
    ReportsModule,
    DashboardModule,
    AuditModule,
    CommunicationsModule,
    AnnouncementsModule,
    ChurchesModule,
    ServicesModule,
    VisitorsModule,
    ChildrenModule,
    PodcastsModule,
    PublicModule,
    PortalModule,
    ConferenceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    BirthdayNotificationProcessor,
    CampaignDeliveryProcessor,
  ],
})
export class AppModule {
  static async forRoot() {
    const { QueuesModule } = await import('./common/queues/queues.module');
    const queuesConfig = await QueuesModule.forRootAsync();

    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule.forRoot({
          pinoHttp: {
            level: process.env.LOG_LEVEL || 'info',
          },
        }),
        CacheConfigModule,
        queuesConfig,
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
        PrismaModule,
        HealthModule,
        AuthModule,
        UsersModule,
        MembersModule,
        AttendanceModule,
        FinanceModule,
        ContributionsModule,
        PaymentsModule,
        DepartmentsModule,
        EventsModule,
        PrayerModule,
        AssetsModule,
        ReportsModule,
        DashboardModule,
        AuditModule,
        CommunicationsModule,
        AnnouncementsModule,
        ChurchesModule,
        ServicesModule,
        VisitorsModule,
        ChildrenModule,
        PodcastsModule,
        PublicModule,
        PortalModule,
        ConferenceModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        BirthdayNotificationProcessor,
        CampaignDeliveryProcessor,
      ],
    };
  }
}
