import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [PublicController],
})
export class PublicModule {}
