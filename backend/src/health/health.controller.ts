import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy', type: Object })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthStatus> {
    const result = await this.healthService.check();
    return result;
  }
}
