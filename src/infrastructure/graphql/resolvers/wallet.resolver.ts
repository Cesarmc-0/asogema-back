import { Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { GqlCurrentUser } from 'src/infrastructure/graphql/decorators/gql-current-user.decorator';
import { MiSaldoType } from 'src/infrastructure/graphql/types/wallet.types';
import { ConsultarSaldoUseCase } from 'src/wallet/application/use-cases/consultar-saldo.use-case';

@Resolver()
export class WalletResolver {
  constructor(private readonly consultarSaldoUseCase: ConsultarSaldoUseCase) {}

  @Query(() => MiSaldoType, {
    description: 'Saldo de la billetera del usuario autenticado',
  })
  async miSaldo(@GqlCurrentUser() user: AuthenticatedUser) {
    const resultado = await this.consultarSaldoUseCase.execute(user.id);
    return {
      saldo: Number(resultado.saldo),
      recargas: resultado.recargas.map((r) => ({
        id: String(r.id),
        monto: Number(r.monto),
        estado: r.estado,
        factura_id: r.factura_id ? String(r.factura_id) : null,
        created_at: r.created_at.toISOString(),
      })),
    };
  }
}
