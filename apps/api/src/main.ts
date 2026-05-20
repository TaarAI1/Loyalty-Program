import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { SeedService } from './seed/seed.service';

// Fastify's fast-json-stringify can't handle BigInt (used by Prisma for @id autoincrement fields).
// Teach the serializer to emit BigInt values as plain numbers.
(BigInt.prototype as unknown as Record<string, unknown>)['toJSON'] = function (this: bigint) {
  const n = Number(this);
  return Number.isSafeInteger(n) ? n : this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port, '0.0.0.0');

  // Seed default admin user if not present
  const authService = app.get(AuthService);
  await authService.seedDefaultAdmin();

  // Seed test customers & transactions if DB is empty
  const seedService = app.get(SeedService);
  await seedService.seedIfEmpty();

  const logger = app.get(Logger);
  logger.log(`🚀 API running on port ${port}`, 'Bootstrap');
}

bootstrap();
