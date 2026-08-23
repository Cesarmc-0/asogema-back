import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { PaymentGateway } from 'src/payments/domain/gateways/payment-gateway.interface';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';

export type TipoReserva = 'EVENTO' | 'HOTEL' | 'RESTAURANTE';

interface ReservaInfo {
  usuario: { nombre: string; apellido: string; correo: string };
  estado: string;
  summary: Record<string, unknown>;
}

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
      tipo_reserva: TipoReserva;
    },
  ) {
    const reservaInfo = await this.fetchReserva(usuarioId, dto);

    this.validateEstado(reservaInfo.estado, dto.tipo_reserva);

    const subtotal = dto.monto;
    const impuestos = Math.round(subtotal * 0.19);
    const total = subtotal + impuestos;

    const factura = await this.paymentRepo.createFactura({
      usuario_id: usuarioId,
      subtotal: new Decimal(subtotal),
      impuestos: new Decimal(impuestos),
      total: new Decimal(total),
      estado: 'PENDIENTE',
      reserva_id: dto.reserva_id,
      tipo_reserva: dto.tipo_reserva,
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
      `${reservaInfo.usuario.nombre} ${reservaInfo.usuario.apellido}`.trim();

    const checkoutResult = await this.paymentGateway.createCheckoutSession({
      amount_in_cents: total * 100,
      currency: 'COP',
      reference: String(factura.id),
      customer_email: reservaInfo.usuario.correo,
      customer_name: clienteNombre,
      redirect_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/payment/result?factura_id=${factura.id}`,
    });

    await this.paymentRepo.updatePagoPaymentLinkId(
      pago.id,
      checkoutResult.payment_link_id,
    );

    this.logger.log(
      `Checkout creado: factura=${factura.id}, pago=${pago.id}, tipo=${dto.tipo_reserva}, ref=${checkoutResult.reference}`,
    );

    return {
      factura_id: factura.id,
      pago_id: pago.id,
      checkout_url: checkoutResult.checkout_url,
      total,
      reservation_summary: reservaInfo.summary,
    };
  }

  private async fetchReserva(
    usuarioId: bigint,
    dto: { reserva_id: bigint; tipo_reserva: TipoReserva },
  ): Promise<ReservaInfo> {
    switch (dto.tipo_reserva) {
      case 'EVENTO': {
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
        return {
          usuario: reserva.usuarios,
          estado: reserva.estado,
          summary: {
            servicio: reserva.salones.nombre,
            fecha: reserva.fecha,
            personas: reserva.cantidad_personas,
          },
        };
      }
      case 'HOTEL': {
        const reserva = await this.prisma.reservas_hotel.findUnique({
          where: { id: dto.reserva_id },
          include: {
            usuarios: true,
            habitaciones: { include: { tipos_habitacion: true } },
          },
        });
        if (!reserva) {
          throw new NotFoundException('Reserva de hotel no encontrada');
        }
        if (reserva.usuario_id !== usuarioId) {
          throw new NotFoundException('Reserva no pertenece al usuario');
        }
        return {
          usuario: reserva.usuarios,
          estado: reserva.estado,
          summary: {
            servicio: `${reserva.habitaciones.numero} - ${reserva.habitaciones.tipos_habitacion.nombre}`,
            fecha: `${reserva.fecha_entrada.toISOString().slice(0, 10)} → ${reserva.fecha_salida.toISOString().slice(0, 10)}`,
            personas: reserva.cantidad_huespedes,
          },
        };
      }
      case 'RESTAURANTE': {
        const reserva = await this.prisma.reservas_restaurante.findUnique({
          where: { id: dto.reserva_id },
          include: { usuarios: true, mesas: true },
        });
        if (!reserva) {
          throw new NotFoundException('Reserva de restaurante no encontrada');
        }
        if (reserva.usuario_id !== usuarioId) {
          throw new NotFoundException('Reserva no pertenece al usuario');
        }
        return {
          usuario: reserva.usuarios,
          estado: reserva.estado,
          summary: {
            servicio: `Mesa ${reserva.mesas.numero}`,
            fecha: this.formatDateTime(reserva.fecha, reserva.hora),
            personas: reserva.cantidad_personas,
          },
        };
      }
      default:
        throw new NotFoundException(
          `Tipo de reserva no soportado: ${String(dto.tipo_reserva)}`,
        );
    }
  }

  private validateEstado(estado: string, tipoReserva: TipoReserva): void {
    const estadosValidos: Record<TipoReserva, string[]> = {
      EVENTO: ['PENDIENTE'],
      HOTEL: ['PENDIENTE'],
      RESTAURANTE: ['PENDIENTE'],
    };

    if (!estadosValidos[tipoReserva].includes(estado)) {
      throw new NotFoundException(
        `La reserva no esta pendiente de pago (estado actual: ${estado})`,
      );
    }
  }

  private formatDateTime(fecha: Date, hora: Date): string {
    const fechaStr = fecha.toLocaleDateString('es-CO');
    const horaStr = hora.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${fechaStr} ${horaStr}`;
  }
}
