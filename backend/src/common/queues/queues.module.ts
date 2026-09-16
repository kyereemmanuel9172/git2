import { Module, Global, Logger } from '@nestjs/common';
import * as net from 'net';

const logger = new Logger('QueuesModule');

function checkRedis(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 2000 });
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

@Global()
@Module({})
export class QueuesModule {
  static async forRootAsync() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    if (!(await checkRedis(host, port))) {
      logger.warn('Redis not available, background job queues disabled');
      return { module: QueuesModule };
    }

    const { BullModule } = await import('@nestjs/bullmq');
    const { ConfigModule, ConfigService } = await import('@nestjs/config');

    return {
      module: QueuesModule,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: any) => ({
            connection: {
              host: config.get('REDIS_HOST', 'localhost'),
              port: config.get('REDIS_PORT', 6379),
            },
          }),
        }),
        BullModule.registerQueue(
          { name: 'birthday-notifications' },
          { name: 'campaign-delivery' },
        ),
      ],
      exports: [BullModule],
    };
  }
}
