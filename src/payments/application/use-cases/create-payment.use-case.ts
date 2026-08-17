import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { PaymentGateway } from 'src/payments/domain/gateways/payment-gateway.interface';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';

@Injectable()
export class CreatePaymentUseCase {
  private readonly logger = new Logger(CreatePaymentUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRepo: PaymentRepository,
  ) {}

  async execute(
    usuarioId: bigint,
    dto: {
      reserva_id: bigint;
      monto: number;
      metodo_pago: string;
    },
  ) {
    const reserva = await this.prisma.reservas_evento.findUnique({
      where: { id: dto.reserva_id },
      include: { usuarios: true, salones: true },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva de evento no encontrada');
    }

    if (reserva.usuario_id !== usuarioId) {
      throw new NotFoundException('Reserva no pertenece al usuario');
    }

    if (reserva.estado !== 'PENDIENTE') {
      throw new NotFoundException('La reserva no esta pendiente de pago');
    }

    const subtotal = dto.monto;
    const impuestos = Math.round(subtotal * 0.19);
    const total = subtotal + impuestos;

    const factura = await this.paymentRepo.createFactura({
      usuario_id: usuarioId,
      subtotal: new Decimal(subtotal),
      impuestos: new Decimal(impuestos),
      total: new Decimal(total),
      estado: 'PENDIENTE',
    });

    const pago = await this.paymentRepo.createPago({
      factura_id: factura.id,
      metodo_pago: dto.metodo_pago,
      valor: new Decimal(dto.monto),
      referencia: null,
      estado: 'PENDIENTE',
      payment_link_id: null,
    });

    const clienteNombre =
      `${reserva.usuarios.nombre} ${reserva.usuarios.apellido}`.trim();

    const checkoutResult = await this.paymentGateway.createCheckoutSession({
      amount_in_cents: total * 100,
      currency: 'COP',
      reference: String(factura.id),
      customer_email: reserva.usuarios.correo,
      customer_name: clienteNombre,
      redirect_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/payment/result?factura_id=${factura.id}`,
    });

    await this.paymentRepo.updatePagoPaymentLinkId(
      pago.id,
      checkoutResult.payment_link_id,
    );

    this.logger.log(
      `Checkout creado: factura=${factura.id}, pago=${pago.id}, ref=${checkoutResult.reference}`,
    );

    return {
      factura_id: factura.id,
      pago_id: pago.id,
      checkout_url: checkoutResult.checkout_url,
      total,
      reservation_summary: {
        salon: reserva.salones.nombre,
        fecha: reserva.fecha,
        personas: reserva.cantidad_personas,
      },
    };
  }
}
