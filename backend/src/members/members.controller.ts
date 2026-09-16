import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Role } from '../common/constants/enums';
import { Request, Response } from 'express';
import { MembersService } from './members.service';
import { CreateFamilyDto, CreateMemberDto, ImportMembersDto, SetPortalPasswordDto, UpdateMemberDto } from './dto/members.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

const EXPORT_COLUMNS: Record<string, string> = {
  memberId: 'Member ID',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  gender: 'Gender',
  dateOfBirth: 'Date of Birth',
  address: 'Address',
  city: 'City',
  maritalStatus: 'Marital Status',
  occupation: 'Occupation',
  motherName: "Mother's Name",
  fatherName: "Father's Name",
  churchBranch: 'Church Branch',
  membershipStatus: 'Membership Status',
  joinDate: 'Join Date',
  baptismDate: 'Baptism Date',
  family: 'Church Group',
  ministries: 'Ministries',
  notes: 'Notes',
};

@ApiTags('members')
@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MembersController {
  constructor(
    private membersService: MembersService,
    private audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all members with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'status', required: false, description: 'Membership status filter' })
  @ApiQuery({ name: 'departmentId', required: false, description: 'Department filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of members' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    return this.membersService.findAll(Math.max(1, Number(page) || 1), Math.min(200, Number(limit) || 20), search, status, departmentId, churchId ?? undefined);
  }

  @Get('families')
  @ApiOperation({ summary: 'Get all church groups' })
  @ApiResponse({ status: 200, description: 'List of church groups' })
  families(@CurrentUser('churchId') churchId?: string | null) {
    return this.membersService.families(churchId ?? undefined);
  }

  @Get('birthdays')
  @ApiOperation({ summary: 'Get upcoming birthdays' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look ahead', example: 30 })
  @ApiResponse({ status: 200, description: 'List of upcoming birthdays' })
  birthdays(@Query('days') days = '30', @CurrentUser('churchId') churchId?: string | null) {
    return this.membersService.birthdays(Math.min(365, Math.max(1, Number(days) || 30)), churchId ?? undefined);
  }

  @Get('export/preview')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Preview member export data' })
  @ApiResponse({ status: 200, description: 'Preview of export data with total count' })
  async exportPreview(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    const rows = await this.membersService.exportCsv(search, status, churchId ?? undefined);
    return { total: rows.length, rows: rows.slice(0, 10) };
  }

  @Get('export/csv')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Export members as CSV file' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('columns') columns?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    try {
      const rows = await this.membersService.exportCsv(search, status, churchId ?? undefined);
      const selected = (columns ? columns.split(',') : ['firstName', 'lastName', 'email', 'phone', 'gender', 'city', 'maritalStatus', 'membershipStatus', 'joinDate']).filter((c) => EXPORT_COLUMNS[c]);
      const header = selected.map((c) => EXPORT_COLUMNS[c]).join(',') + '\n';
      const body = rows.map((r) => selected.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
      return res.send(header + body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Get('export/pdf')
  @SkipThrottle()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Export members as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  async exportPdf(@Res() res: Response, @CurrentUser('churchId') churchId?: string | null) {
    try {
      const buffer = await this.membersService.exportPdf(churchId ?? undefined);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="members.pdf"');
      return res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Get('export/qr')
  @SkipThrottle()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Export member QR ID cards as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file with QR cards' })
  async exportQr(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    try {
      const buffer = await this.membersService.exportQrPdf(search, status, churchId ?? undefined);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="member-qr-cards.pdf"');
      return res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF';
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message });
    }
  }

  @Post('import')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Import members from CSV data' })
  @ApiResponse({ status: 201, description: 'Import results with created and skipped counts' })
  async importMembers(@Body() dto: ImportMembersDto, @Req() req: Request, @CurrentUser('id') actorId: string, @CurrentUser('churchId') churchId?: string | null) {
    const result = await this.membersService.importMembers(dto.members, churchId ?? undefined);
    await this.audit.log('MEMBER_IMPORT', 'Member', undefined, `Imported ${result.created} members, skipped ${result.skipped}`, actorId, req.ip);
    return result;
  }

  @Get('resolve/:memberId')
  @ApiOperation({ summary: 'Resolve member by member ID code' })
  @ApiParam({ name: 'memberId', description: 'Member ID code' })
  @ApiResponse({ status: 200, description: 'Member found' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  resolveByMemberId(@Param('memberId') memberId: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.membersService.findByMemberId(memberId, churchId ?? undefined);
  }

  @Post(':id/portal-password')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Set portal password for a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Portal password set successfully' })
  async setPortalPassword(@Param('id') id: string, @Body() dto: SetPortalPasswordDto, @Req() req: Request, @CurrentUser('id') actorId: string, @CurrentUser('churchId') churchId?: string | null) {
    const result = await this.membersService.setPortalPassword(id, dto.password, churchId ?? undefined);
    await this.audit.log('MEMBER_PORTAL_PASSWORD', 'Member', id, 'Set member portal password', actorId, req.ip);
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a member by ID' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Member details' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.membersService.findOne(id, churchId ?? undefined);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate QR code for a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'QR code data URL' })
  async getQr(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return { qrCode: await this.membersService.generateQr(id, churchId ?? undefined) };
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  @ApiOperation({ summary: 'Create a new member' })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  @ApiResponse({ status: 409, description: 'Member with this email already exists' })
  async create(@Body() dto: CreateMemberDto, @Req() req: Request, @CurrentUser('id') actorId: string, @CurrentUser('churchId') churchId?: string | null) {
    const member = await this.membersService.create(dto, actorId, churchId ?? undefined);
    await this.audit.log('MEMBER_CREATE', 'Member', member.id, `Created member ${member.firstName} ${member.lastName}`, actorId, req.ip);
    return member;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.PASTOR)
  @ApiOperation({ summary: 'Update a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateMemberDto, @Req() req: Request, @CurrentUser('id') actorId: string, @CurrentUser('churchId') churchId?: string | null) {
    const member = await this.membersService.update(id, dto, churchId ?? undefined);
    await this.audit.log('MEMBER_UPDATE', 'Member', id, `Updated member ${id}`, actorId, req.ip);
    return member;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Delete a member' })
  @ApiParam({ name: 'id', description: 'Member UUID' })
  @ApiResponse({ status: 200, description: 'Member deleted successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async remove(@Param('id') id: string, @Req() req: Request, @CurrentUser('id') actorId: string, @CurrentUser('churchId') churchId?: string | null) {
    await this.membersService.remove(id, churchId ?? undefined);
    await this.audit.log('MEMBER_DELETE', 'Member', id, `Deleted member ${id}`, actorId, req.ip);
    return { deleted: true };
  }

  @Post('clear')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clear all members' })
  @ApiResponse({ status: 200, description: 'All members cleared successfully' })
  async clearAll(@Req() req: Request, @CurrentUser('id') actorId: string, @CurrentUser('churchId') churchId?: string | null) {
    const count = await this.membersService.clearAll(churchId ?? undefined);
    await this.audit.log('MEMBER_CLEAR_ALL', 'Member', 'all', `Cleared ${count} members`, actorId, req.ip);
    return { deleted: count };
  }

  @Post('families')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Create a new church group' })
  @ApiResponse({ status: 201, description: 'Church Group created successfully' })
  createFamily(@Body() dto: CreateFamilyDto, @CurrentUser('churchId') churchId?: string | null) {
    return this.membersService.createFamily(dto, churchId ?? undefined);
  }

  @Delete('families/:id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Delete a church group' })
  @ApiResponse({ status: 200, description: 'Church Group deleted successfully' })
  async removeFamily(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser('id') actorId: string,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    await this.membersService.removeFamily(id, churchId ?? undefined);
    await this.audit.log('FAMILY_DELETE', 'Family', id, `Deleted church group ${id}`, actorId, req.ip);
    return { deleted: true };
  }
}
