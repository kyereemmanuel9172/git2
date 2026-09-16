import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePodcastDto, UpdatePodcastDto } from './dto/podcasts.dto';
import { PodcastStatus } from '../common/constants/enums';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

@Injectable()
export class PodcastsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    churchId?: string,
    options?: {
      page?: number;
      limit?: number;
      status?: PodcastStatus;
      speaker?: string;
      series?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (churchId) where.churchId = churchId;
    if (options?.status) where.status = options.status;
    if (options?.speaker) where.speaker = { contains: options.speaker, mode: 'insensitive' };
    if (options?.series) where.series = { contains: options.series, mode: 'insensitive' };
    if (options?.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { speaker: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
        { series: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> = {};
    const sortField = options?.sortBy ?? 'publishDate';
    orderBy[sortField] = options?.sortOrder ?? 'desc';

    const [items, total, published, drafts] = await Promise.all([
      this.prisma.podcastEpisode.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.podcastEpisode.count({ where }),
      this.prisma.podcastEpisode.count({ where: { ...where, status: 'PUBLISHED' } }),
      this.prisma.podcastEpisode.count({ where: { ...where, status: 'DRAFT' } }),
    ]);

    return {
      items,
      total,
      published,
      drafts,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, churchId?: string) {
    const episode = await this.prisma.podcastEpisode.findFirst({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }

  async findPublished(churchId?: string, limit = 20) {
    return this.prisma.podcastEpisode.findMany({
      where: {
        status: 'PUBLISHED',
        ...(churchId ? { churchId } : {}),
      },
      orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async getSeries(churchId?: string) {
    const series = await this.prisma.podcastEpisode.groupBy({
      by: ['series'],
      where: {
        series: { not: null },
        ...(churchId ? { churchId } : {}),
      },
      _count: { id: true },
      orderBy: { series: 'asc' },
    });
    return series
      .filter((s) => s.series)
      .map((s) => ({ name: s.series!, count: s._count.id }));
  }

  async getSpeakers(churchId?: string) {
    const speakers = await this.prisma.podcastEpisode.groupBy({
      by: ['speaker'],
      where: {
        speaker: { not: null },
        ...(churchId ? { churchId } : {}),
      },
      _count: { id: true },
      orderBy: { speaker: 'asc' },
    });
    return speakers
      .filter((s) => s.speaker)
      .map((s) => ({ name: s.speaker!, count: s._count.id }));
  }

  async create(dto: CreatePodcastDto, churchId?: string, _userId?: string) {
    if (!churchId) throw new BadRequestException('Church ID is required');

    const { publishDate, tags, episodeNumber, ...rest } = dto;
    return this.prisma.podcastEpisode.create({
      data: {
        ...rest,
        slug: slugify(dto.title) + '-' + Date.now(),
        publishDate: publishDate ? new Date(publishDate) : undefined,
        churchId,
      },
    });
  }

  async update(id: string, dto: UpdatePodcastDto, churchId?: string) {
    await this.ensureExists(id, churchId);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.speaker !== undefined) data.speaker = dto.speaker;
    if (dto.series !== undefined) data.series = dto.series;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.audioUrl !== undefined) data.audioUrl = dto.audioUrl;
    if (dto.artworkUrl !== undefined) data.artworkUrl = dto.artworkUrl;
    if (dto.publishDate !== undefined) {
      data.publishDate = dto.publishDate ? new Date(dto.publishDate) : null;
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }

    return this.prisma.podcastEpisode.update({
      where: { id },
      data,
    });
  }

  async publish(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.podcastEpisode.update({
      where: { id },
      data: { status: 'PUBLISHED', publishDate: new Date() },
    });
  }

  async archive(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    return this.prisma.podcastEpisode.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async remove(id: string, churchId?: string) {
    await this.ensureExists(id, churchId);
    await this.prisma.podcastEpisode.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: string, churchId?: string) {
    const episode = await this.prisma.podcastEpisode.findFirst({
      where: { id, ...(churchId ? { churchId } : {}) },
    });
    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }
}
