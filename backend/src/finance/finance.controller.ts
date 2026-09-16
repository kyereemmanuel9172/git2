import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Role, TransactionType } from '../common/constants/enums';
import { Request } from 'express';
import { FinanceService } from './finance.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/finance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(
    private financeService: FinanceService,
    private audit: AuditService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Get all financial transactions with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'type', required: false, description: 'Transaction type filter', enum: TransactionType })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'category', required: false, description: 'Category filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
  findAll(@Query('page') page = '1', @Query('limit') limit = '20', @Query('type') type?: TransactionType, @Query('from') from?: string, @Query('to') to?: string, @Query('category') category?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.financeService.findAll(type, from, to, category, Math.max(1, Number(page) || 1), Math.min(100, Number(limit) || 20), churchId ?? undefined);
  }

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Get financial summary for date range' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Financial summary with income, expenses, and balance' })
  summary(@Query('from') from?: string, @Query('to') to?: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.financeService.summary(from, to, churchId ?? undefined);
  }

  @Get('monthly')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Get monthly financial summary' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to look back', example: 6 })
  @ApiResponse({ status: 200, description: 'Monthly summary data' })
  monthly(@Query('months') months = '6', @CurrentUser('churchId') churchId?: string | null) {
    return this.financeService.monthlySummary(Math.min(24, Math.max(1, Number(months) || 6)), churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  @ApiOperation({ summary: 'Create a new financial transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async create(@Body() dto: CreateTransactionDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const txn = await this.financeService.create(dto, actorId, churchId ?? undefined);
    await this.audit.log('TXN_CREATE', 'Transaction', txn.id, `${txn.type} ${txn.amount}`, actorId, req.ip);
    return txn;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  @ApiOperation({ summary: 'Update a financial transaction' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const txn = await this.financeService.update(id, dto, churchId ?? undefined);
    await this.audit.log('TXN_UPDATE', 'Transaction', id, `Updated transaction ${id}`, actorId, req.ip);
    return txn;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.FINANCE_OFFICER)
  @ApiOperation({ summary: 'Delete a financial transaction' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.financeService.remove(id, churchId ?? undefined);
    await this.audit.log('TXN_DELETE', 'Transaction', id, `Deleted transaction ${id}`, actorId, req.ip);
    return { deleted: true };
  }
}
