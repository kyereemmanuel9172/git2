import { Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { ContributionsController } from './contributions.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [ContributionsService],
  controllers: [ContributionsController],
  exports: [ContributionsService],
})
export class ContributionsModule {}
