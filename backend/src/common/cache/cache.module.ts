import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import * as net from 'net';

function checkRedis(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 2000 });
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('CacheConfigModule');
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const url = new URL(redisUrl);
        const host = url.hostname || 'localhost';
        const port = parseInt(url.port || '6379', 10);

        if (!(await checkRedis(host, port))) {
          logger.warn('Redis not available, falling back to in-memory cache');
          return { ttl: 60000 };
        }

        try {
          const { createKeyv } = await import('@keyv/redis');
          const store = createKeyv(redisUrl);
          logger.log('Redis connected successfully');
          return { stores: [store], ttl: 60000 };
        } catch {
          logger.warn('Redis store init failed, falling back to in-memory cache');
          return { ttl: 60000 };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class CacheConfigModule {}
