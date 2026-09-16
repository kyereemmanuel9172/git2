import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
  churchId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private prisma: PrismaService, private cache: CacheService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload) {
    const cacheKey = `user:${payload.sub}`;

    try {
      const cached = await this.cache.get<{ id: string; email: string; name: string; role: string; churchId: string | null }>(cacheKey);
      if (cached) return cached;
    } catch (err) {
      this.logger.warn('Cache read failed, querying database directly');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or not found');
    }

    const result = { id: user.id, email: user.email, name: user.name, role: user.role, churchId: user.churchId };

    try {
      await this.cache.set(cacheKey, result, 60000);
    } catch (err) {
      this.logger.warn('Cache write failed, skipping cache');
    }

    return result;
  }
}
