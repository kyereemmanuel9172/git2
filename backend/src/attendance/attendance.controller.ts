import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Role, ServiceType } from '../common/constants/enums';
import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private audit: AuditService,
  ) {}

  @Post('checkin')
  @ApiOperation({ summary: 'Check in a member for a service' })
  @ApiResponse({ status: 201, description: 'Check-in successful or already checked in' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async checkIn(@Body() dto: CheckInDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const result = await this.attendanceService.checkIn(dto, actorId, churchId ?? undefined);
    if (!result.alreadyCheckedIn) {
      await this.audit.log('ATTENDANCE_CHECKIN', 'Member', dto.memberId, `Checked in for ${dto.serviceType}`, actorId, req.ip);
    }
    return result;
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Check out a member from a service' })
  @ApiResponse({ status: 200, description: 'Check-out successful or already checked out' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async checkOut(@Body() dto: CheckOutDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const result = await this.attendanceService.checkOut(dto, actorId, churchId ?? undefined);
    if (!result.alreadyCheckedOut) {
      await this.audit.log('ATTENDANCE_CHECKOUT', 'Member', result.record.memberId, `Checked out for ${result.record.serviceType}`, actorId, req.ip);
    }
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get attendance records with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'serviceType', required: false, description: 'Service type filter', enum: ServiceType })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Paginated attendance records' })
  findAll(@Query('page') page = '1', @Query('limit') limit = '20', @Query('serviceType') serviceType?: ServiceType, @Query('from') from?: string, @Query('to') to?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.attendanceService.query(serviceType, from, to, Math.max(1, Number(page) || 1), Math.min(100, Number(limit) || 20), churchId ?? undefined);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get attendance summary for date range' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Attendance summary data' })
  summary(@Query('from') from?: string, @Query('to') to?: string, @CurrentUser('churchId') churchId?: string | null) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    return this.attendanceService.summary(fromDate, toDate, churchId ?? undefined);
  }

  @Get('register')
  @ApiOperation({ summary: 'Get attendance register for today' })
  @ApiResponse({ status: 200, description: 'Today\'s attendance register' })
  register(@CurrentUser('churchId') churchId?: string | null) {
    return this.attendanceService.register(churchId ?? undefined);
  }

  @Get('export/pdf')
  @SkipThrottle()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  @ApiOperation({ summary: 'Export attendance as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  async exportPdf(@Res() res: Response, @CurrentUser('churchId') churchId?: string | null) {
    try {
      const buffer = await this.attendanceService.exportPdf(churchId ?? undefined);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance.pdf"');
      return res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: 'Get attendance history for a member' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Member attendance history' })
  findByMember(@Param('memberId') memberId: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.attendanceService.findByMember(memberId, churchId ?? undefined);
  }
}
