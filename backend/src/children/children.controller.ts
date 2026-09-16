import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../common/constants/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/children.dto';

@ApiTags('children')
@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChildrenController {
  constructor(
    private childrenService: ChildrenService,
    private audit: AuditService,
  ) {}

  @Get()
  findAll(@CurrentUser('churchId') churchId?: string | null) {
    return this.childrenService.findAll(churchId ?? undefined);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="children.csv"')
  export(@CurrentUser('churchId') churchId?: string | null) {
    return this.childrenService.exportCsv(churchId ?? undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.childrenService.findOne(id, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.DEPARTMENT_LEADER)
  async create(@Body() dto: CreateChildDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const child = await this.childrenService.create(dto, churchId ?? undefined);
    await this.audit.log('CHILD_CREATE', 'Child', child.id, `Added child ${child.firstName} ${child.lastName}`, actorId, req.ip);
    return child;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateChildDto>, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const child = await this.childrenService.update(id, dto, churchId ?? undefined);
    await this.audit.log('CHILD_UPDATE', 'Child', id, `Updated child ${child.firstName} ${child.lastName}`, actorId, req.ip);
    return child;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.childrenService.remove(id, churchId ?? undefined);
    await this.audit.log('CHILD_DELETE', 'Child', id, `Deleted child ${id}`, actorId, req.ip);
    return { deleted: true };
  }
}
