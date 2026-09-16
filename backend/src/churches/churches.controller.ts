import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../common/constants/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ChurchesService } from './churches.service';
import { CreateChurchDto, UpdateChurchDto } from './dto/churches.dto';

@ApiTags('churches')
@Controller('churches')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChurchesController {
  constructor(
    private churchesService: ChurchesService,
    private audit: AuditService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll() {
    return this.churchesService.findAll();
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.churchesService.me(userId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.churchesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateChurchDto) {
    return this.churchesService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChurchDto,
    @CurrentUser('role') role: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    if (role !== Role.SUPER_ADMIN && churchId !== id) {
      throw new ForbiddenException('You can only update your own church settings');
    }
    const church = await this.churchesService.update(id, dto);
    await this.audit.log('CHURCH_SETTINGS_UPDATE', 'Church', id, `Updated church settings ${id}`, actorId, req.ip);
    return church;
  }

  @Patch(':id/location')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateChurchDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    if (churchId && churchId !== id) {
      throw new ForbiddenException('You can only update your own church settings');
    }
    const church = await this.churchesService.update(id, dto);
    await this.audit.log('CHURCH_LOCATION_UPDATE', 'Church', id, `Updated premises and attendance rules ${id}`, actorId, req.ip);
    return church;
  }
}
