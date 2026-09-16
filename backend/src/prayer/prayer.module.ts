import { Module } from '@nestjs/common';
import { PrayerService } from './prayer.service';
import { PrayerController } from './prayer.controller';

@Module({
  providers: [PrayerService],
  controllers: [PrayerController],
  exports: [PrayerService],
})
export class PrayerModule {}
