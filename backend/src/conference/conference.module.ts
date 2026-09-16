import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConferenceGateway } from './conference.gateway';
import { ConferenceService } from './conference.service';
import { ConferenceController } from './conference.controller';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
    }),
    CommunicationsModule,
  ],
  providers: [ConferenceGateway, ConferenceService],
  controllers: [ConferenceController],
  exports: [ConferenceService],
})
export class ConferenceModule {}
