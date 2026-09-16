import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    let database: 'connected' | 'disconnected' = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    return {
      status: database === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
    };
  }
}
