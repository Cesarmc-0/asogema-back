import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './redis-throttler.storage';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ name: 'default', limit: 10, ttl: 1000 }],
        storage,
      }),
    }),
  ],
  providers: [
    RedisThrottlerStorage,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [RedisThrottlerStorage],
})
export class RateLimitModule {}
