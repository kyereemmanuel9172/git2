import { Test, TestingModule } from '@nestjs/testing';
import { PodcastsService } from '../podcasts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PodcastsService', () => {
  let service: PodcastsService;
  let prisma: {
    podcastEpisode: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      podcastEpisode: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data })),
        update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
        delete: jest.fn().mockResolvedValue({ id: '1' }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PodcastsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PodcastsService>(PodcastsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated episodes', async () => {
      prisma.podcastEpisode.findMany.mockResolvedValue([{ id: '1', title: 'Test Episode' }]);
      prisma.podcastEpisode.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(0);

      const result = await service.findAll('church-1', { page: 1, limit: 10 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('published');
      expect(result).toHaveProperty('drafts');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages');
    });

    it('should filter by status', async () => {
      await service.findAll('church-1', { status: 'PUBLISHED' });
      expect(prisma.podcastEpisode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('should filter by search term', async () => {
      await service.findAll('church-1', { search: 'prayer' });
      expect(prisma.podcastEpisode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: 'prayer' }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a new episode', async () => {
      const dto = { title: 'New Episode' };
      const result = await service.create(dto, 'church-1', 'user-1');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title', 'New Episode');
    });

    it('should throw BadRequestException if churchId is missing', async () => {
      await expect(service.create({ title: 'Test' }, undefined)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return episode by id', async () => {
      prisma.podcastEpisode.findFirst.mockResolvedValue({ id: '1', title: 'Test' });

      const result = await service.findOne('1', 'church-1');
      expect(result).toHaveProperty('id', '1');
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findOne('nonexistent', 'church-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish an episode', async () => {
      prisma.podcastEpisode.findFirst.mockResolvedValue({ id: '1', status: 'DRAFT' });

      const result = await service.publish('1', 'church-1');
      expect(result).toHaveProperty('status', 'PUBLISHED');
    });

    it('should throw NotFoundException if episode not found', async () => {
      await expect(service.publish('nonexistent', 'church-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('should archive an episode', async () => {
      prisma.podcastEpisode.findFirst.mockResolvedValue({ id: '1', status: 'PUBLISHED' });

      const result = await service.archive('1', 'church-1');
      expect(result).toHaveProperty('status', 'ARCHIVED');
    });
  });

  describe('remove', () => {
    it('should delete an episode', async () => {
      prisma.podcastEpisode.findFirst.mockResolvedValue({ id: '1' });

      const result = await service.remove('1', 'church-1');
      expect(result).toHaveProperty('deleted', true);
    });

    it('should throw NotFoundException if episode not found', async () => {
      await expect(service.remove('nonexistent', 'church-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSeries', () => {
    it('should return series list', async () => {
      prisma.podcastEpisode.groupBy.mockResolvedValue([
        { series: 'Faith Series', _count: { id: 5 } },
      ]);

      const result = await service.getSeries('church-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('name', 'Faith Series');
      expect(result[0]).toHaveProperty('count', 5);
    });

    it('should filter out null series', async () => {
      prisma.podcastEpisode.groupBy.mockResolvedValue([
        { series: 'Series A', _count: { id: 3 } },
        { series: null, _count: { id: 2 } },
      ]);

      const result = await service.getSeries('church-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getSpeakers', () => {
    it('should return speakers list', async () => {
      prisma.podcastEpisode.groupBy.mockResolvedValue([
        { speaker: 'Pastor John', _count: { id: 10 } },
      ]);

      const result = await service.getSpeakers('church-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('name', 'Pastor John');
    });
  });

  describe('findPublished', () => {
    it('should return only published episodes', async () => {
      await service.findPublished('church-1', 10);
      expect(prisma.podcastEpisode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
          take: 10,
        }),
      );
    });
  });
});
