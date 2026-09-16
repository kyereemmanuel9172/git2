import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '../common/constants/enums';
import { Request } from 'express';
import { DepartmentsService } from './departments.service';
import { AssignMemberDto, CreateDepartmentDto } from './dto/departments.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(
    private departmentsService: DepartmentsService,
    private audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List departments with search and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.departmentsService.findAll(churchId ?? undefined, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get department statistics' })
  getStats(@CurrentUser('churchId') churchId?: string | null) {
    return this.departmentsService.getStats(churchId ?? undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details with members' })
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.departmentsService.findOne(id, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Create a new department' })
  async create(@Body() dto: CreateDepartmentDto, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const dept = await this.departmentsService.create(dto, churchId ?? undefined);
    await this.audit.log('DEPARTMENT_CREATE', 'Department', dept.id, `Created department ${dept.name}`, actorId, req.ip);
    return dept;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Update a department' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateDepartmentDto>, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    const dept = await this.departmentsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('DEPARTMENT_UPDATE', 'Department', id, `Updated department ${dept.name}`, actorId, req.ip);
    return dept;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Delete a department' })
  async remove(@Param('id') id: string, @CurrentUser('id') actorId: string, @Req() req: Request, @CurrentUser('churchId') churchId?: string | null) {
    await this.departmentsService.remove(id, churchId ?? undefined);
    await this.audit.log('DEPARTMENT_DELETE', 'Department', id, `Deleted department`, actorId, req.ip);
    return { deleted: true };
  }

  @Post(':id/members')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEPARTMENT_LEADER)
  @ApiOperation({ summary: 'Add a member to a department' })
  assignMember(@Param('id') id: string, @Body() dto: AssignMemberDto, @CurrentUser('churchId') churchId?: string | null) {
    return this.departmentsService.assignMember(id, dto, churchId ?? undefined);
  }

  @Delete('members/:memberDepartmentId')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEPARTMENT_LEADER)
  @ApiOperation({ summary: 'Remove a member from a department' })
  removeMember(@Param('memberDepartmentId') memberDepartmentId: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.departmentsService.removeMember(memberDepartmentId, churchId ?? undefined);
  }
}
