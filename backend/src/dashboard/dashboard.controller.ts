import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('kpis')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR, Role.FINANCE_OFFICER)
  kpis(@CurrentUser('churchId') churchId?: string | null) {
    return this.dashboardService.kpis(churchId);
  }

  @Get('attendance-trend')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  attendanceTrend(@Query('days') days = '30', @CurrentUser('churchId') churchId?: string | null) {
    return this.dashboardService.attendanceTrend(Math.min(90, Math.max(7, Number(days) || 30)), churchId);
  }

  @Get('attendance-by-service')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  attendanceByServiceType(@Query('days') days = '30', @CurrentUser('churchId') churchId?: string | null) {
    return this.dashboardService.attendanceByServiceType(Math.min(90, Math.max(7, Number(days) || 30)), churchId);
  }

  @Get('recent-activity')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  recentActivity(@CurrentUser('churchId') churchId?: string | null) {
    return this.dashboardService.recentActivity(8, churchId);
  }

  @Get('demographics')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  demographics(@CurrentUser('churchId') churchId?: string | null) {
    return this.dashboardService.demographics(churchId);
  }
}
