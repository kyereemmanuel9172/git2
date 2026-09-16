import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/enums';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('membership')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  membership(@CurrentUser('churchId') churchId?: string | null) {
    return this.reportsService.membershipReport(churchId ?? undefined);
  }

  @Get('attendance')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  attendance(@CurrentUser('churchId') churchId: string | null, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.attendanceReport(churchId ?? undefined, from, to);
  }

  @Get('finance')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  finance(@CurrentUser('churchId') churchId: string | null, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.financeReport(churchId ?? undefined, from, to);
  }

  @Get('events')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  events(@CurrentUser('churchId') churchId?: string | null) {
    return this.reportsService.eventReport(churchId ?? undefined);
  }

  @Get('export/members')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async exportMembers(@Res() res: Response, @CurrentUser('churchId') churchId?: string | null) {
    try {
      const rows = await this.reportsService.exportMembersCsv(churchId ?? undefined);
      this.sendCsv(res, rows, 'members-report.csv');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Get('export/finance')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  async exportFinance(@Res() res: Response, @CurrentUser('churchId') churchId: string | null, @Query('from') from?: string, @Query('to') to?: string) {
    try {
      const rows = await this.reportsService.exportFinanceCsv(churchId ?? undefined, from, to);
      this.sendCsv(res, rows, 'finance-report.csv');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Get('export/pdf')
  @SkipThrottle()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  async exportPdf(@Res() res: Response, @CurrentUser('churchId') churchId: string | null, @Query('type') type = 'membership', @Query('from') from?: string, @Query('to') to?: string) {
    try {
      const buffer = await this.reportsService.exportPdf(type, churchId ?? undefined, from, to);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
      return res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  private sendCsv(res: Response, rows: Record<string, unknown>[], filename: string) {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const lines = rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }
}
