import { Module } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { DeliveryService } from './delivery.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [CommunicationsService, DeliveryService],
  controllers: [CommunicationsController],
  exports: [CommunicationsService, DeliveryService],
})
export class CommunicationsModule {}
