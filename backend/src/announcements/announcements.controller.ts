import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../common/constants/enums';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcements.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

const ANNOUNCEMENT_ROLES = [Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.DEPARTMENT_LEADER];

@ApiTags('announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(...ANNOUNCEMENT_ROLES)
export class AnnouncementsController {
  constructor(
    private announcementsService: AnnouncementsService,
    private audit: AuditService,
  ) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('page') page = '1', @Query('limit') limit = '10', @Query('status') status?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.announcementsService.findAll(Number(page) || 1, Math.min(Number(limit) || 10, 100), status, churchId ?? undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.announcementsService.findOne(id, churchId ?? undefined);
  }

  @Post()
  async create(@Body() dto: CreateAnnouncementDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const announcement = await this.announcementsService.create(dto, actorId, churchId ?? undefined);
    await this.audit.log('ANNOUNCEMENT_CREATE', 'Announcement', announcement.id, `Created announcement "${announcement.title}"`, actorId, req.ip);
    return announcement;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const announcement = await this.announcementsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('ANNOUNCEMENT_UPDATE', 'Announcement', id, `Updated announcement "${announcement.title}"`, actorId, req.ip);
    return announcement;
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const announcement = await this.announcementsService.publish(id, churchId ?? undefined);
    await this.audit.log('ANNOUNCEMENT_PUBLISH', 'Announcement', id, `Published announcement "${announcement.title}"`, actorId, req.ip);
    return announcement;
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const announcement = await this.announcementsService.archive(id, churchId ?? undefined);
    await this.audit.log('ANNOUNCEMENT_ARCHIVE', 'Announcement', id, `Archived announcement "${announcement.title}"`, actorId, req.ip);
    return announcement;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const result = await this.announcementsService.remove(id, churchId ?? undefined);
    await this.audit.log('ANNOUNCEMENT_DELETE', 'Announcement', id, 'Deleted announcement', actorId, req.ip);
    return result;
  }
}
