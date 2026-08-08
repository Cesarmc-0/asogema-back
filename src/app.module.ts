import { Module } from '@nestjs/common';
import { AppController } from './presentation/controllers/app.controller';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { HotelModule } from './hotel/hotel.module';
import { AdminModule } from './admin/admin.module';
import { PostgresModule } from './infrastructure/persistence/postgres/postgres.module';
import { RedisModule } from './infrastructure/persistence/redis/redis.module';
import { HealthController } from './presentation/controllers/health.controller';
import { BullModule } from '@nestjs/bullmq';
import { RateLimitModule } from './infrastructure/persistence/redis/rate-limit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    PostgresModule,
    RedisModule,
    RateLimitModule,
    AuthModule,
    RestaurantModule,
    HotelModule,
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [],
})
export class AppModule {}
