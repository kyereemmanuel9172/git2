import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { MemberJwtStrategy } from './member-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
    }),
  ],
  providers: [PortalService, MemberJwtStrategy],
  controllers: [PortalController],
})
export class PortalModule {}
