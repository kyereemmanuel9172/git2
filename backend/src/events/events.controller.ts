import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/constants/enums';
import { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto, RegisterDto, UpdateRegistrationDto } from './dto/events.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(
    private eventsService: EventsService,
    private audit: AuditService,
  ) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('type') type?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.eventsService.findAll(status, type, churchId ?? undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.eventsService.findOne(id, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async create(@Body() dto: CreateEventDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const event = await this.eventsService.create(dto, churchId ?? undefined);
    await this.audit.log('EVENT_CREATE', 'Event', event.id, `Created event ${event.title}`, actorId, req.ip);
    return event;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateEventDto>, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const event = await this.eventsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('EVENT_UPDATE', 'Event', id, `Updated event ${id}`, actorId, req.ip);
    return event;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.eventsService.remove(id, churchId ?? undefined);
    await this.audit.log('EVENT_DELETE', 'Event', id, `Deleted event ${id}`, actorId, req.ip);
    return { deleted: true };
  }

  @Post(':id/register')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR, Role.DEPARTMENT_LEADER)
  register(@Param('id') id: string, @Body() dto: RegisterDto, @CurrentUser('churchId') churchId?: string | null) {
    return this.eventsService.register(id, dto, churchId ?? undefined);
  }

  @Patch('registrations/:registrationId')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  updateRegistration(@Param('registrationId') registrationId: string, @Body() dto: UpdateRegistrationDto, @CurrentUser('churchId') churchId?: string | null) {
    return this.eventsService.updateRegistration(registrationId, dto, churchId ?? undefined);
  }

  @Get(':id/certificates')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  certificates(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.eventsService.certificates(id, churchId ?? undefined);
  }
}
