import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Role } from '../common/constants/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ContributionsService, ContributionFilters } from './contributions.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contributions.dto';

@ApiTags('contributions')
@Controller('contributions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContributionsController {
  constructor(
    private contributionsService: ContributionsService,
    private audit: AuditService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: ContributionFilters['type'],
    @Query('method') method?: ContributionFilters['method'],
    @Query('status') status?: ContributionFilters['status'],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('memberId') memberId?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.contributionsService.findAll(
      { type, method, status, from, to, memberId },
      Math.max(1, Number(page) || 1),
      Math.min(500, Number(limit) || 20),
      churchId ?? undefined,
    );
  }

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  summary(
    @Query('type') type?: ContributionFilters['type'],
    @Query('method') method?: ContributionFilters['method'],
    @Query('status') status?: ContributionFilters['status'],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.contributionsService.summary({ type, method, status, from, to }, churchId ?? undefined);
  }

  @Get('export')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="contributions.csv"')
  export(
    @Query('type') type?: ContributionFilters['type'],
    @Query('method') method?: ContributionFilters['method'],
    @Query('status') status?: ContributionFilters['status'],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.contributionsService.exportCsv({ type, method, status, from, to }, churchId ?? undefined);
  }

  @Get('export/pdf')
  @SkipThrottle()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  async exportPdf(
    @Res() res: Response,
    @Query('type') type?: ContributionFilters['type'],
    @Query('method') method?: ContributionFilters['method'],
    @Query('status') status?: ContributionFilters['status'],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    try {
      const buffer = await this.contributionsService.exportPdf({ type, method, status, from, to }, churchId ?? undefined);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="contributions.pdf"');
      return res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  async create(@Body() dto: CreateContributionDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const rec = await this.contributionsService.create(dto, actorId, churchId ?? undefined);
    await this.audit.log('CONTRIBUTION_CREATE', 'Contribution', rec.id, `${rec.type} ${rec.amount}`, actorId, req.ip);
    return rec;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  async update(@Param('id') id: string, @Body() dto: UpdateContributionDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const rec = await this.contributionsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('CONTRIBUTION_UPDATE', 'Contribution', id, `Updated contribution ${id}`, actorId, req.ip);
    return rec;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.contributionsService.remove(id, churchId ?? undefined);
    await this.audit.log('CONTRIBUTION_DELETE', 'Contribution', id, `Deleted contribution ${id}`, actorId, req.ip);
    return { deleted: true };
  }
}
