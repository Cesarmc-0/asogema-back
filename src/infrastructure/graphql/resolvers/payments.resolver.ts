import { BadRequestException } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GetPaymentStatusUseCase } from 'src/payments/application/use-cases/get-payment-status.use-case';
import { GqlCurrentUser } from 'src/infrastructure/graphql/decorators/gql-current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { EstadoPagoType } from 'src/infrastructure/graphql/types/pagos.types';

@Resolver()
export class PaymentsResolver {
  constructor(
    private readonly getPaymentStatusUseCase: GetPaymentStatusUseCase,
  ) {}

  @Query(() => EstadoPagoType, {
    description: 'Estado de pago de una factura del usuario autenticado',
  })
  async estadoPago(
    @Args('factura_id', { description: 'Id de la factura' })
    facturaId: string,
    @GqlCurrentUser() user: AuthenticatedUser,
  ) {
    if (!/^\d+$/.test(facturaId)) {
      throw new BadRequestException('factura_id debe ser numérico');
    }
    const resultado = await this.getPaymentStatusUseCase.execute(
      BigInt(facturaId),
      BigInt(user.id),
    );
    return {
      factura_id: String(resultado.factura_id),
      estado: resultado.estado,
      total: Number(resultado.total),
      numero_factura: resultado.numero_factura,
      cufe: resultado.cufe,
      qr_url: resultado.qr_url,
      tipo_reserva: resultado.tipo_reserva,
      reserva_id: resultado.reserva_id ? String(resultado.reserva_id) : null,
      qr_pedido: resultado.qr_pedido,
      pagos: resultado.pagos.map((p) => ({
        id: String(p.id),
        metodo_pago: p.metodo_pago,
        valor: Number(p.valor),
        estado: p.estado,
        fecha_pago: p.fecha_pago ? p.fecha_pago.toISOString() : null,
      })),
    };
  }
}
