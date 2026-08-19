import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';

@Injectable()
export class GetPaymentStatusUseCase {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  async execute(facturaId: bigint) {
    const factura = await this.paymentRepo.findFacturaById(facturaId);
    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return {
      factura_id: factura.id,
      estado: factura.estado,
      total: factura.total,
      pagos: factura.pagos.map((p) => ({
        id: p.id,
        metodo_pago: p.metodo_pago,
        valor: p.valor,
        estado: p.estado,
        referencia: p.referencia,
      })),
    };
  }
}
