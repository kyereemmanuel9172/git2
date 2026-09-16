import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export interface MemberJwtPayload {
  sub: string;
  type: 'member';
  churchId: string | null;
}

@Injectable()
export class MemberJwtStrategy extends PassportStrategy(Strategy, 'member-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          const token = req.query?.token;
          return typeof token === 'string' ? token : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: MemberJwtPayload) {
    if (payload.type !== 'member') {
      throw new UnauthorizedException('Invalid member token');
    }
    const member = await this.prisma.member.findUnique({ where: { id: payload.sub } });
    if (!member) throw new UnauthorizedException('Member not found');
    if (member.membershipStatus === 'DECEASED' || member.membershipStatus === 'TRANSFERRED') {
      throw new UnauthorizedException('This account is no longer active');
    }
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      memberId: member.memberId,
      churchId: member.churchId,
    };
  }
}
