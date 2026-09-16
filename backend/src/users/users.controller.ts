import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/constants/enums';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private usersService: UsersService,
    private audit: AuditService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  findAll(@Query('page') page = '1', @Query('limit') limit = '20', @Query('search') search?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.usersService.findAll(Math.max(1, Number(page) || 1), Math.min(100, Number(limit) || 20), search, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async create(@Body() dto: CreateUserDto, @Req() req: Request, @CurrentUser('id') actorId: string) {
    const user = await this.usersService.create(dto);
    await this.audit.log('USER_CREATE', 'User', user.id, `Created user ${user.email} (${user.role})`, actorId, req.ip);
    return user;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request, @CurrentUser('id') actorId: string) {
    const user = await this.usersService.update(id, dto);
    await this.audit.log('USER_UPDATE', 'User', id, `Updated user ${id}`, actorId, req.ip);
    return user;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  async remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') actorId: string) {
    await this.usersService.remove(id);
    await this.audit.log('USER_DELETE', 'User', id, `Deleted user ${id}`, actorId, req.ip);
    return { deleted: true };
  }

  @Get('me/notifications')
  notifications(@CurrentUser('id') userId: string) {
    return this.usersService.notifications(userId);
  }

  @Put('me/notifications/read')
  markNotificationsRead(@CurrentUser('id') userId: string) {
    return this.usersService.markNotificationsRead(userId);
  }
}
