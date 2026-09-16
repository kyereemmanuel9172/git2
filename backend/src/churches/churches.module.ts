import { Module } from '@nestjs/common';
import { ChurchesService } from './churches.service';
import { ChurchesController } from './churches.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ChurchesController],
  providers: [ChurchesService],
})
export class ChurchesModule {}
