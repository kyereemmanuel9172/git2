import { Module } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { VisitorsController } from './visitors.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [VisitorsService],
  controllers: [VisitorsController],
  exports: [VisitorsService],
})
export class VisitorsModule {}
