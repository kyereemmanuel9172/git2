import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, EnableTwoFactorDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private audit: AuditService,
  ) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 200, description: 'Two-factor authentication required', schema: { properties: { requiresTwoFactor: { type: 'boolean', example: true }, twoFactorToken: { type: 'string' } } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto, req.ip);
    if (!result.requiresTwoFactor && result.user) {
      await this.audit.log('LOGIN', 'User', result.user.id, `${result.user.email} logged in`, result.user.id, req.ip);
    }
    return result;
  }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const result = await this.authService.forgotPassword(dto);
    await this.audit.log('PASSWORD_RESET_REQUESTED', 'User', undefined, dto.email, undefined, req.ip);
    return result;
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const result = await this.authService.resetPassword(dto);
    await this.audit.log('PASSWORD_RESET', 'User', undefined, 'Password reset completed', undefined, req.ip);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup two-factor authentication' })
  @ApiResponse({ status: 200, description: 'Returns QR code and secret for authenticator app' })
  setupTwoFactor(@CurrentUser('id') userId: string) {
    return this.authService.setupTwoFactor(userId);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable two-factor authentication with verification code' })
  @ApiResponse({ status: 200, description: 'Two-factor authentication enabled' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  enableTwoFactor(@CurrentUser('id') userId: string, @Body() dto: EnableTwoFactorDto) {
    return this.authService.enableTwoFactor(userId, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiResponse({ status: 200, description: 'Two-factor authentication disabled' })
  disableTwoFactor(@CurrentUser('id') userId: string) {
    return this.authService.disableTwoFactor(userId);
  }
}
