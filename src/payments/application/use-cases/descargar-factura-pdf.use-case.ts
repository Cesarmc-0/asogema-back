import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';
import { FactusGateway } from 'src/facturacion/domain/gateways/factus-gateway.interface';

@Injectable()
export class DescargarFacturaPdfUseCase {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly factusGateway: FactusGateway,
  ) {}

  async execute(facturaId: bigint, usuarioId: bigint): Promise<string> {
    const factura = await this.paymentRepo.findFacturaById(facturaId);
    if (!factura || factura.usuario_id !== usuarioId) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (!factura.numero_factura) {
      throw new NotFoundException(
        'La factura electrónica aún no ha sido emitida',
      );
    }

    return this.factusGateway.descargarPdf(factura.numero_factura);
  }
}
