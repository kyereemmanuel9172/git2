import { Module } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { ChildrenController } from './children.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [ChildrenService],
  controllers: [ChildrenController],
  exports: [ChildrenService],
})
export class ChildrenModule {}
