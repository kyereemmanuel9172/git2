import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { MemberJwtAuthGuard } from '../common/guards/member-jwt-auth.guard';
import { CurrentMember } from '../common/decorators/current-member.decorator';
import { PortalService } from './portal.service';
import {
  ChangePortalPasswordDto,
  CreatePortalPrayerRequestDto,
  PortalForgotPasswordDto,
  PortalLoginDto,
  PortalResetPasswordDto,
  UpdatePortalProfileDto,
} from './dto/portal.dto';

@ApiTags('portal')
@Controller('portal')
export class PortalController {
  constructor(private portalService: PortalService) {}

  @Post('auth/login')
  @UseGuards(ThrottlerGuard)
  login(@Body() dto: PortalLoginDto) {
    return this.portalService.login(dto);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  forgotPassword(@Body() dto: PortalForgotPasswordDto) {
    return this.portalService.forgotPassword(dto);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  resetPassword(@Body() dto: PortalResetPasswordDto) {
    return this.portalService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentMember('id') memberId: string) {
    return this.portalService.me(memberId);
  }

  @Get('overview')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  overview(@CurrentMember('id') memberId: string) {
    return this.portalService.overview(memberId);
  }

  @Get('contributions')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  contributions(@CurrentMember('id') memberId: string) {
    return this.portalService.contributions(memberId);
  }

  @Get('receipt/pdf')
  @SkipThrottle()
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  async receiptPdf(@CurrentMember('id') memberId: string, @Res() res: Response) {
    try {
      const buffer = await this.portalService.generateReceiptPdf(memberId);
      const now = new Date();
      const filename = `giving-receipt-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      });
      res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate receipt';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Get('attendance')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  attendance(@CurrentMember('id') memberId: string) {
    return this.portalService.attendance(memberId);
  }

  @Get('announcements')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  announcements(@CurrentMember('id') memberId: string) {
    return this.portalService.announcements(memberId);
  }

  @Get('events')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  events(@CurrentMember('id') memberId: string) {
    return this.portalService.events(memberId);
  }

  @Post('events/:id/register')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  registerForEvent(@Param('id') eventId: string, @CurrentMember('id') memberId: string) {
    return this.portalService.registerForEvent(eventId, memberId);
  }

  @Get('prayer')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  prayer(@CurrentMember('id') memberId: string) {
    return this.portalService.prayer(memberId);
  }

  @Post('prayer')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  createPrayerRequest(@Body() dto: CreatePortalPrayerRequestDto, @CurrentMember('id') memberId: string) {
    return this.portalService.createPrayerRequest(memberId, dto);
  }

  @Patch('profile')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  updateProfile(@Body() dto: UpdatePortalProfileDto, @CurrentMember('id') memberId: string) {
    return this.portalService.updateProfile(memberId, dto);
  }

  @Post('change-password')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@Body() dto: ChangePortalPasswordDto, @CurrentMember('id') memberId: string) {
    return this.portalService.changePassword(memberId, dto);
  }

  @Get('birthdays')
  @UseGuards(MemberJwtAuthGuard)
  @ApiBearerAuth()
  birthdays(@CurrentMember('id') memberId: string, @CurrentMember('churchId') churchId?: string | null) {
    return this.portalService.birthdays(memberId, churchId ?? undefined);
  }
}
