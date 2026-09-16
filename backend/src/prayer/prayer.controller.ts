import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/constants/enums';
import { PrayerService } from './prayer.service';
import { CreateCounselingDto, CreatePrayerRequestDto, UpdatePrayerRequestDto } from './dto/prayer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('prayer')
@Controller('prayer')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PrayerController {
  constructor(private prayerService: PrayerService) {}

  @Get('requests')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR, Role.DEPARTMENT_LEADER)
  requests(@Query('status') status?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.findPrayerRequests(status, false, churchId ?? undefined);
  }

  @Post('requests')
  createRequest(@Body() dto: CreatePrayerRequestDto, @CurrentUser('id') actorId: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.createPrayerRequest(dto, actorId, churchId ?? undefined);
  }

  @Patch('requests/:id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  updateRequest(@Param('id') id: string, @Body() dto: UpdatePrayerRequestDto, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.updatePrayerRequest(id, dto, churchId ?? undefined);
  }

  @Delete('requests/:id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  removeRequest(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.removePrayerRequest(id, churchId ?? undefined);
  }

  @Get('counseling')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  counseling(@Query('status') status?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.counselingSessions(status, churchId ?? undefined);
  }

  @Post('counseling')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  createCounseling(@Body() dto: CreateCounselingDto, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.createCounseling(dto, churchId ?? undefined);
  }

  @Patch('counseling/:id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  updateCounseling(@Param('id') id: string, @Body() dto: Partial<CreateCounselingDto>, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.updateCounseling(id, dto, churchId ?? undefined);
  }

  @Delete('counseling/:id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  removeCounseling(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.prayerService.removeCounseling(id, churchId ?? undefined);
  }
}
