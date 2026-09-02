import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/presentation/dto/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/infrastructure/guards/roles.guard';
import { GqlCurrentUser } from 'src/infrastructure/graphql/decorators/gql-current-user.decorator';
import { ListarPedidosComandaUsecase } from 'src/restaurant/application/use-cases/listar-pedidos-comanda.use-case';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { PedidoComandaType } from 'src/infrastructure/graphql/types/comanda.types';

@Resolver()
export class ComandaResolver {
  constructor(
    private readonly listarPedidosUseCase: ListarPedidosComandaUsecase,
  ) {}

  @Query(() => [PedidoComandaType], {
    description: 'Lista los pedidos de la comanda segun el rol',
  })
  @UseGuards(RolesGuard)
  @Roles('Mesero', 'Comanda', 'Empleado')
  async pedidosComanda(@GqlCurrentUser() user: AuthenticatedUser) {
    return this.listarPedidosUseCase.execute(BigInt(user.id), user.rol_nombre);
  }
}
