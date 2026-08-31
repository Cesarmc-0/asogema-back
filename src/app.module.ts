import { Module } from '@nestjs/common';
import { AppController } from './presentation/controllers/app.controller';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { AdminModule } from './admin/admin.module';
import { PostgresModule } from './infrastructure/persistence/postgres/postgres.module';
import { RedisModule } from './infrastructure/persistence/redis/redis.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { HealthController } from './presentation/controllers/health.controller';
import { BullModule } from '@nestjs/bullmq';
import { RateLimitModule } from './infrastructure/persistence/redis/rate-limit.module';
import { HotelModule } from './hotel/hotel.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfiguracionesModule } from './configuraciones/configuraciones.module';
import { PaymentsModule } from './payments/payments.module';
import { FacturacionModule } from './facturacion/facturacion.module';
import { WalletModule } from './wallet/wallet.module';
import { GraphqlModule } from './infrastructure/graphql/graphql.module';

const hasMongo = !!process.env.MONGODB_URI;

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
    ...(hasMongo ? [MongooseModule.forRoot(process.env.MONGODB_URI!)] : []),
    PostgresModule,
    RedisModule,
    MailModule,
    RateLimitModule,
    AuthModule,
    EventsModule,
    RestaurantModule,
    HotelModule,
    AdminModule,
    PaymentsModule,
    FacturacionModule,
    WalletModule,
    GraphqlModule,
    ...(hasMongo ? [ConfiguracionesModule] : []),
  ],
  controllers: [AppController, HealthController],
  providers: [],
})
export class AppModule {}
