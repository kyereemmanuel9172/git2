import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../common/constants/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { PaymentFilters, PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payments.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private audit: AuditService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: PaymentFilters['status'],
    @Query('method') method?: PaymentFilters['method'],
    @Query('source') source?: PaymentFilters['source'],
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('memberId') memberId?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.paymentsService.findAll(
      { status, method, source, category, from, to, memberId },
      Math.max(1, Number(page) || 1),
      Math.min(500, Number(limit) || 20),
      churchId ?? undefined,
    );
  }

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  summary(
    @Query('status') status?: PaymentFilters['status'],
    @Query('method') method?: PaymentFilters['method'],
    @Query('source') source?: PaymentFilters['source'],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.paymentsService.summary({ status, method, source, from, to }, churchId ?? undefined);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="payments.csv"')
  export(
    @Query('status') status?: PaymentFilters['status'],
    @Query('method') method?: PaymentFilters['method'],
    @Query('source') source?: PaymentFilters['source'],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.paymentsService.exportCsv({ status, method, source, from, to }, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  async create(@Body() dto: CreatePaymentDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const rec = await this.paymentsService.create(dto, actorId, churchId ?? undefined);
    await this.audit.log('PAYMENT_CREATE', 'Payment', rec.id, `${rec.status} ${rec.amount}`, actorId, req.ip);
    return rec;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const rec = await this.paymentsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('PAYMENT_UPDATE', 'Payment', id, `Updated payment ${id}`, actorId, req.ip);
    return rec;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.paymentsService.remove(id, churchId ?? undefined);
    await this.audit.log('PAYMENT_DELETE', 'Payment', id, `Deleted payment ${id}`, actorId, req.ip);
    return { deleted: true };
  }
}
