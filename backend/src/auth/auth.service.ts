import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { User } from '@prisma/client';
import { Role } from '../common/constants/enums';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, _ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        return { requiresTwoFactor: true, twoFactorToken: this.jwtService.sign({ sub: user.id, step: '2fa' }, { expiresIn: '5m' }) };
      }
      const valid = authenticator.verify({ token: dto.twoFactorCode, secret: user.twoFactorSecret ?? '' });
      if (!valid) throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = this.signToken(user);
    return {
      user: this.sanitize(user),
      accessToken: token.accessToken,
      requiresTwoFactor: false,
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new BadRequestException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: Role.MEMBER,
      },
    });
    return { user: this.sanitize(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { church: true },
    });
    if (!user) throw new UnauthorizedException();
    return { ...this.sanitize(user), church: user.church };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('No 2FA secret generated yet');

    const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new BadRequestException('Invalid verification code');

    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    return { twoFactorEnabled: true };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const otpauth = authenticator.keyuri(user.email, 'Church Management System', secret);
    const qrCode = await toDataURL(otpauth);
    return { secret, qrCode };
  }

  async disableTwoFactor(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { twoFactorEnabled: false };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: tokenHash, passwordResetExpires: expires },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const message = 'If that email is registered, a reset link has been sent.';
    return process.env.NODE_ENV === 'production'
      ? { message }
      : { message, resetUrl };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: tokenHash },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('This reset link has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    return { message: 'Password has been reset. You can now sign in.' };
  }

  private signToken(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, name: user.name, churchId: user.churchId };
    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    };
  }

  private sanitize(user: User) {
    const { passwordHash, twoFactorSecret, passwordResetToken, passwordResetExpires, ...safe } = user;
    return safe;
  }
}
