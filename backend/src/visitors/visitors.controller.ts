import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../common/constants/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { VisitorsService } from './visitors.service';
import { CreateVisitorDto } from './dto/visitors.dto';

@ApiTags('visitors')
@Controller('visitors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VisitorsController {
  constructor(
    private visitorsService: VisitorsService,
    private audit: AuditService,
  ) {}

  @Get()
  findAll(@CurrentUser('churchId') churchId?: string | null) {
    return this.visitorsService.findAll(churchId ?? undefined);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="visitors.csv"')
  export(@CurrentUser('churchId') churchId?: string | null) {
    return this.visitorsService.exportCsv(churchId ?? undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.visitorsService.findOne(id, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR, Role.DEPARTMENT_LEADER)
  async create(@Body() dto: CreateVisitorDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const visitor = await this.visitorsService.create(dto, churchId ?? undefined);
    await this.audit.log('VISITOR_CREATE', 'Visitor', visitor.id, `Registered visitor ${visitor.fullName}`, actorId, req.ip);
    return visitor;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateVisitorDto>, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const visitor = await this.visitorsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('VISITOR_UPDATE', 'Visitor', id, `Updated visitor ${visitor.fullName}`, actorId, req.ip);
    return visitor;
  }

  @Post(':id/follow-up')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  async followUp(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const visitor = await this.visitorsService.markFollowedUp(id, churchId ?? undefined);
    await this.audit.log('VISITOR_FOLLOW_UP', 'Visitor', id, `Marked visitor ${visitor.fullName} as followed up`, actorId, req.ip);
    return visitor;
  }

  @Post(':id/convert/:memberId')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async convert(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const visitor = await this.visitorsService.convertToMember(id, memberId, churchId ?? undefined);
    await this.audit.log('VISITOR_CONVERT', 'Visitor', id, `Converted visitor ${visitor.fullName} to member`, actorId, req.ip);
    return visitor;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.visitorsService.remove(id, churchId ?? undefined);
    await this.audit.log('VISITOR_DELETE', 'Visitor', id, `Deleted visitor ${id}`, actorId, req.ip);
    return { deleted: true };
  }
}
