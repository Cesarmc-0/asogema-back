import { Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { GqlCurrentUser } from 'src/infrastructure/graphql/decorators/gql-current-user.decorator';
import { MisReservasType } from 'src/infrastructure/graphql/types/reservas.types';
import { MisReservasUseCase } from 'src/infrastructure/graphql/use-cases/mis-reservas.use-case';

@Resolver()
export class ReservasResolver {
  constructor(private readonly misReservasUseCase: MisReservasUseCase) {}

  @Query(() => MisReservasType, {
    description:
      'Reservas del usuario autenticado (hotel, eventos, restaurante y pedidos) con su estado de pago',
  })
  async misReservas(@GqlCurrentUser() user: AuthenticatedUser) {
    return this.misReservasUseCase.execute(user.id);
  }
}
