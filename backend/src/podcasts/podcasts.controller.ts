import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { Role, PodcastStatus } from '../common/constants/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { PodcastsService } from './podcasts.service';
import { CreatePodcastDto, UpdatePodcastDto } from './dto/podcasts.dto';

@ApiTags('podcasts')
@Controller('podcasts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PodcastsController {
  constructor(
    private podcastsService: PodcastsService,
    private audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all podcast episodes with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: PodcastStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'speaker', required: false, description: 'Filter by speaker name' })
  @ApiQuery({ name: 'series', required: false, description: 'Filter by series name' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title, speaker, description' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (publishDate, title, durationMinutes, createdAt)', example: 'publishDate' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc or desc)', enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated list of podcast episodes' })
  findAll(
    @CurrentUser('churchId') churchId?: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PodcastStatus,
    @Query('speaker') speaker?: string,
    @Query('series') series?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.podcastsService.findAll(churchId ?? undefined, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      speaker,
      series,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('series')
  @ApiOperation({ summary: 'Get all unique series names' })
  @ApiResponse({ status: 200, description: 'List of series with episode counts' })
  getSeries(@CurrentUser('churchId') churchId?: string | null) {
    return this.podcastsService.getSeries(churchId ?? undefined);
  }

  @Get('speakers')
  @ApiOperation({ summary: 'Get all unique speaker names' })
  @ApiResponse({ status: 200, description: 'List of speakers with episode counts' })
  getSpeakers(@CurrentUser('churchId') churchId?: string | null) {
    return this.podcastsService.getSpeakers(churchId ?? undefined);
  }

  @Get('published')
  @ApiOperation({ summary: 'Get published episodes (public feed)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max episodes to return', example: 20 })
  @ApiResponse({ status: 200, description: 'List of published episodes' })
  findPublished(
    @CurrentUser('churchId') churchId?: string | null,
    @Query('limit') limit?: string,
  ) {
    return this.podcastsService.findPublished(churchId ?? undefined, limit ? Number(limit) : 20);
  }

  @Get('feed.xml')
  @ApiOperation({ summary: 'Generate RSS feed for podcast distribution' })
  @ApiResponse({ status: 200, description: 'RSS XML feed', content: { 'application/xml': {} } })
  async getFeed(@CurrentUser('churchId') churchId?: string | null) {
    const episodes = await this.podcastsService.findPublished(churchId ?? undefined, 100);
    return this.generateRssFeed(episodes);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a podcast episode by ID' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode details' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  findOne(@Param('id') id: string, @CurrentUser('churchId') churchId?: string | null) {
    return this.podcastsService.findOne(id, churchId ?? undefined);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.DEPARTMENT_LEADER)
  @ApiOperation({ summary: 'Create a new podcast episode' })
  @ApiResponse({ status: 201, description: 'Episode created successfully' })
  async create(
    @Body() dto: CreatePodcastDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    const episode = await this.podcastsService.create(dto, churchId ?? undefined, actorId);
    await this.audit.log('PODCAST_CREATE', 'PodcastEpisode', episode.id, `Created episode ${episode.title}`, actorId, req.ip);
    return episode;
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR, Role.DEPARTMENT_LEADER)
  @ApiOperation({ summary: 'Update a podcast episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode updated successfully' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePodcastDto,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    const episode = await this.podcastsService.update(id, dto, churchId ?? undefined);
    await this.audit.log('PODCAST_UPDATE', 'PodcastEpisode', id, `Updated episode ${episode.title}`, actorId, req.ip);
    return episode;
  }

  @Post(':id/publish')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Publish a podcast episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode published successfully' })
  async publish(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    const episode = await this.podcastsService.publish(id, churchId ?? undefined);
    await this.audit.log('PODCAST_PUBLISH', 'PodcastEpisode', id, `Published episode ${episode.title}`, actorId, req.ip);
    return episode;
  }

  @Post(':id/archive')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SENIOR_PASTOR)
  @ApiOperation({ summary: 'Archive a podcast episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode archived successfully' })
  async archive(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    const episode = await this.podcastsService.archive(id, churchId ?? undefined);
    await this.audit.log('PODCAST_ARCHIVE', 'PodcastEpisode', id, `Archived episode ${episode.title}`, actorId, req.ip);
    return episode;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Delete a podcast episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode deleted successfully' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
    @CurrentUser('churchId') churchId?: string | null,
  ) {
    await this.podcastsService.remove(id, churchId ?? undefined);
    await this.audit.log('PODCAST_DELETE', 'PodcastEpisode', id, `Deleted episode ${id}`, actorId, req.ip);
    return { deleted: true };
  }

  private generateRssFeed(episodes: Array<{ title: string; description?: string | null; audioUrl?: string | null; publishDate?: Date | null; durationMinutes?: number | null; speaker?: string | null }>): string {
    const items = episodes
      .map(
        (ep) => `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.description ?? ''}]]></description>
      ${ep.audioUrl ? `<enclosure url="${ep.audioUrl}" type="audio/mpeg" />` : ''}
      ${ep.publishDate ? `<pubDate>${new Date(ep.publishDate).toUTCString()}</pubDate>` : ''}
      ${ep.durationMinutes ? `<itunes:duration>${Math.floor(ep.durationMinutes / 60)}:${String(ep.durationMinutes % 60).padStart(2, '0')}</itunes:duration>` : ''}
      ${ep.speaker ? `<itunes:author>${ep.speaker}</itunes:author>` : ''}
      <guid>urn:podcast:${ep.title.toLowerCase().replace(/\s+/g, '-')}</guid>
    </item>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Church Podcast</title>
    <description>Church sermons and messages</description>
    ${items}
  </channel>
</rss>`;
  }
}
