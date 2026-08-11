import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './gql-throttler.guard';
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
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
  exports: [RedisThrottlerStorage],
})
export class RateLimitModule {}
