import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../common/constants/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ServicesService } from './services.service';
import { CreateServiceDayDto, SetTodayServiceDto } from './dto/services.dto';

@ApiTags('services')
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServicesController {
  constructor(
    private servicesService: ServicesService,
    private audit: AuditService,
  ) {}

  @Get()
  findAll(@CurrentUser('churchId') churchId?: string | null) {
    return this.servicesService.findAll(churchId ?? undefined);
  }

  @Get('today')
  findToday(@CurrentUser('churchId') churchId?: string | null) {
    return this.servicesService.findToday(churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async create(@Body() dto: CreateServiceDayDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const day = await this.servicesService.create(dto, churchId ?? undefined);
    await this.audit.log('SERVICE_DAY_CREATE', 'ServiceDay', day.id, `Created service day ${day.name}`, actorId, req.ip);
    return day;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateServiceDayDto>, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const day = await this.servicesService.update(id, dto, churchId ?? undefined);
    await this.audit.log('SERVICE_DAY_UPDATE', 'ServiceDay', id, `Updated service day ${day.name}`, actorId, req.ip);
    return day;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.servicesService.remove(id, churchId ?? undefined);
    await this.audit.log('SERVICE_DAY_DELETE', 'ServiceDay', id, `Deleted service day ${id}`, actorId, req.ip);
    return { deleted: true };
  }

  @Post('today')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async setToday(@Body() dto: SetTodayServiceDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const schedule = await this.servicesService.setToday(dto, churchId ?? undefined, actorId);
    await this.audit.log('SERVICE_SCHEDULE_SET', 'ServiceSchedule', schedule.id, `Scheduled ${schedule.serviceDay.name} service`, actorId, req.ip);
    return schedule;
  }

  @Delete('today/:date')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async clearToday(@Param('date') date: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.servicesService.clearToday(date, churchId ?? undefined);
    await this.audit.log('SERVICE_SCHEDULE_CLEAR', 'ServiceSchedule', date, `Cleared service for ${date}`, actorId, req.ip);
    return { deleted: true };
  }
}
