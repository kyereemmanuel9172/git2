import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '../common/constants/enums';
import { Request } from 'express';
import { AssetsService } from './assets.service';
import { CreateAssetDto, CreateMaintenanceDto } from './dto/assets.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(
    private assetsService: AssetsService,
    private audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List assets with search, filtering, sorting, and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['EQUIPMENT', 'VEHICLE', 'BUILDING', 'FURNITURE', 'OTHER'] })
  @ApiQuery({ name: 'condition', required: false, enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'REPAIR_NEEDED'] })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'purchasePrice', 'createdAt', 'purchaseDate'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(
    @Query('type') type?: string,
    @Query('condition') condition?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.assetsService.findAll(type, condition, search, churchId ?? undefined, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get asset statistics and value summary' })
  getStats(@CurrentUser('churchId') churchId?: string | null) {
    return this.assetsService.getStats(churchId ?? undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset with maintenance history' })
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.assetsService.findOne(id, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Create a new asset' })
  async create(@Body() dto: CreateAssetDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const asset = await this.assetsService.create(dto, churchId ?? undefined);
    await this.audit.log('ASSET_CREATE', 'Asset', asset.id, `Created asset ${asset.name}`, actorId, req.ip);
    return asset;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Update an asset' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAssetDto>, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const asset = await this.assetsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('ASSET_UPDATE', 'Asset', id, `Updated asset ${asset.name}`, actorId, req.ip);
    return asset;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Delete an asset' })
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.assetsService.remove(id, churchId ?? undefined);
    await this.audit.log('ASSET_DELETE', 'Asset', id, `Deleted asset`, actorId, req.ip);
    return { deleted: true };
  }

  @Post(':id/maintenance')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Add a maintenance record to an asset' })
  addMaintenance(@Param('id') id: string, @Body() dto: CreateMaintenanceDto, @CurrentUser('churchId') churchId?: string | null) {
    return this.assetsService.addMaintenance(id, dto, churchId ?? undefined);
  }

  @Delete('maintenance/:maintenanceId')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Delete a maintenance record' })
  removeMaintenance(@Param('maintenanceId') maintenanceId: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.assetsService.removeMaintenance(maintenanceId, churchId ?? undefined);
  }
}
