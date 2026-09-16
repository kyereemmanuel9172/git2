import { Module } from '@nestjs/common';
import { PodcastsService } from './podcasts.service';
import { PodcastsController } from './podcasts.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [PodcastsService],
  controllers: [PodcastsController],
  exports: [PodcastsService],
})
export class PodcastsModule {}
