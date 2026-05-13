import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class IdempotencyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private redis!: Redis;

  private readonly TTL_SECONDS = 86400; // 24 hours

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set – idempotency cache disabled');
      return;
    }
    this.redis = new Redis(url, { family: 0, lazyConnect: true });
    this.redis.on('error', (err) => this.logger.error({ err }, 'Redis error'));
    this.logger.log('Idempotency Redis client initialised');
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  private key(idempotencyKey: string) {
    return `idempotency:${idempotencyKey}`;
  }

  async get<T>(idempotencyKey: string): Promise<T | null> {
    if (!this.redis) return null;
    const raw = await this.redis.get(this.key(idempotencyKey));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(idempotencyKey: string, value: T): Promise<void> {
    if (!this.redis) return;
    await this.redis.set(this.key(idempotencyKey), JSON.stringify(value), 'EX', this.TTL_SECONDS);
  }
}
