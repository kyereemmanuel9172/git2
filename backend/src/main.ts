import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[ERROR] Unhandled Rejection:', reason);
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const rootModule = await AppModule.forRoot();
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3001'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));
  app.use(compression());
  app.useBodyParser('json', { limit: '1mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  if (process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Church Management System API')
      .setDescription('API for the Church Management System')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
    logger.log('Swagger docs available at /api/docs');
  }

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  logger.log(`CMS backend running on http://localhost:${port}/api`);
  logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap();
