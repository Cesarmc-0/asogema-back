import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import type { Request } from 'express';
import { PaymentsModule } from 'src/payments/payments.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { MisReservasUseCase } from 'src/infrastructure/graphql/use-cases/mis-reservas.use-case';
import { PaymentsResolver } from 'src/infrastructure/graphql/resolvers/payments.resolver';
import { WalletResolver } from 'src/infrastructure/graphql/resolvers/wallet.resolver';
import { ReservasResolver } from 'src/infrastructure/graphql/resolvers/reservas.resolver';
import { ComandaResolver } from './resolvers/comanda.resolver';
import { ListarPedidosComandaUsecase } from 'src/restaurant/application/use-cases/listar-pedidos-comanda.use-case';

@Module({
  imports: [
    PaymentsModule,
    WalletModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(
        process.cwd(),
        'src/infrastructure/graphql/schema.gql',
      ),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      path: '/graphql',
      context: ({ req }: { req: Request }) => ({ req }),
    }),
  ],
  providers: [
    MisReservasUseCase,
    PaymentsResolver,
    WalletResolver,
    ReservasResolver,
    ListarPedidosComandaUsecase,
    ComandaResolver,
  ],
})
export class GraphqlModule {}
