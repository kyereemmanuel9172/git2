import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import {
  CreateCommunicationDto,
  UpdateCommunicationDto,
  DirectMessageDto,
  LogCallDto,
  AudienceCountQueryDto,
} from './dto/communications.dto';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all campaigns with search, filtering, and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['SMS', 'EMAIL', 'CALL'] })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SENT', 'FAILED', 'PARTIAL', 'CANCELLED'] })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'totalRecipients', 'sentCount', 'type'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.communicationsService.findAll(
      parseInt(page ?? '1', 10),
      Math.min(parseInt(limit ?? '20', 10), 100),
      undefined,
      { search, type, status, sortBy, sortOrder },
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get campaign analytics and stats' })
  async getStats() {
    return this.communicationsService.getStats();
  }

  @Get('audience-count')
  @ApiOperation({ summary: 'Preview audience count for given filters' })
  @ApiQuery({ name: 'type', required: true, enum: ['SMS', 'EMAIL', 'CALL'] })
  @ApiQuery({ name: 'memberStatus', required: false, type: String })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'gender', required: false, enum: ['MALE', 'FEMALE'] })
  @ApiQuery({ name: 'city', required: false, type: String })
  async getAudienceCount(@Query() query: AudienceCountQueryDto) {
    return this.communicationsService.countAudience(query.type, {
      memberStatus: query.memberStatus?.split(','),
      departmentId: query.departmentId,
      gender: query.gender,
      city: query.city,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details with delivery status' })
  async findOne(@Param('id') id: string) {
    return this.communicationsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and send a campaign (or schedule it)' })
  @ApiBody({ type: CreateCommunicationDto })
  async create(@Body() dto: CreateCommunicationDto) {
    return this.communicationsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a scheduled campaign' })
  @ApiBody({ type: UpdateCommunicationDto })
  async update(@Param('id') id: string, @Body() dto: UpdateCommunicationDto) {
    return this.communicationsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a pending/cancelled campaign' })
  async remove(@Param('id') id: string) {
    return this.communicationsService.remove(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a scheduled campaign' })
  async cancel(@Param('id') id: string) {
    return this.communicationsService.cancel(id);
  }

  @Post('send-direct')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a direct message to a single member' })
  @ApiBody({ type: DirectMessageDto })
  async sendDirect(@Body() dto: DirectMessageDto) {
    return this.communicationsService.sendDirect(dto);
  }

  @Post('log-call')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a completed phone call' })
  @ApiBody({ type: LogCallDto })
  async logCall(@Body() dto: LogCallDto) {
    return this.communicationsService.logCall(dto);
  }
}
