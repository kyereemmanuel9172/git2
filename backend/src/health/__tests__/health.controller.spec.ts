import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: { check: jest.Mock };

  beforeEach(async () => {
    service = { check: jest.fn().mockResolvedValue({ status: 'ok', timestamp: new Date().toISOString(), uptime: 100, database: 'connected' }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: service }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(service.check).toHaveBeenCalled();
  });
});
