import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  HOTEL_PORCENTAJE_INICIAL,
  RECARGA_MONTO_MAX,
  RECARGA_MONTO_MIN,
  TipoReserva,
} from 'src/payments/domain/payment.constants';
import { IVA_DEFAULT_RATE } from 'src/facturacion/domain/iva.util';

export interface PaymentOriginInput {
  tipo_reserva: TipoReserva;
  reserva_id?: bigint;
  monto?: number;
}

export interface ReservaOrigen {
  monto: number;
  descripcion: string;
  resumen: Record<string, unknown>;
  reservaId: bigint | null;
  /** ID del pedido online (origen restaurante-comanda) cuando aplica. */
  pedidoOnlineId?: bigint | null;
  /** IVA ya calculado del origen (restaurante: por producto con aplica_iva). */
  impuestos?: number;
}

/**
 * Resuelve el origen de un pago según el tipo de reserva (Strategy).
 * Cada origen valida la propiedad del usuario y calcula su monto base.
 * Responsabilidad única: construir la fuente del pago (SRP).
 */
@Injectable()
export class PaymentOriginResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    usuarioId: bigint,
    input: PaymentOriginInput,
  ): Promise<ReservaOrigen> {
    switch (input.tipo_reserva) {
      case 'EVENTO':
        return this.origenEvento(usuarioId, input.reserva_id);
      case 'HOTEL':
        return this.origenHotel(usuarioId, input.reserva_id);
      case 'HOTEL_SALDO':
        return this.origenHotelSaldo(usuarioId, input.reserva_id);
      case 'RESTAURANTE':
        return this.origenPedidoOnline(usuarioId, input.reserva_id);
      case 'RECARGA':
        return this.origenRecarga(usuarioId, input.monto);
      default:
        throw new BadRequestException('Tipo de reserva no válido');
    }
  }

  private async origenEvento(
    usuarioId: bigint,
    reservaId?: bigint,
  ): Promise<ReservaOrigen> {
    const reserva = await this.obtenerReservaPropia(
      this.prisma.reservas_evento.findUnique({
        where: { id: this.requerirId(reservaId) },
        include: { usuarios: true, salones: true },
      }),
      usuarioId,
      'Reserva de evento no encontrada',
    );

    this.validarPendiente(reserva.estado);

    // El anticipo puede venir NULL en reservas viejas: se usa el precio
    // vigente del salón. Si tampoco hay monto válido se falla explícito en
    // vez de facturar $0 silencioso (antes: `?? 0`).
    const monto = Number(reserva.anticipo ?? reserva.salones.precio_base ?? 0);
    if (!(monto > 0)) {
      throw new BadRequestException(
        'La reserva no tiene un monto válido para pagar',
      );
    }

    return {
      monto,
      descripcion: `Anticipo evento - ${reserva.salones.nombre}`,
      resumen: {
        salon: reserva.salones.nombre,
        fecha: reserva.fecha,
        personas: reserva.cantidad_personas,
      },
      reservaId: null,
    };
  }

  private async origenHotel(
    usuarioId: bigint,
    reservaId?: bigint,
  ): Promise<ReservaOrigen> {
    const reserva = await this.obtenerReservaPropia(
      this.prisma.reservas_hotel.findUnique({
        where: { id: this.requerirId(reservaId) },
        include: { habitaciones: { include: { tipos_habitacion: true } } },
      }),
      usuarioId,
      'Reserva de hotel no encontrada',
    );

    this.validarPendiente(reserva.estado);

    const noches = Math.ceil(
      (reserva.fecha_salida.getTime() - reserva.fecha_entrada.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      monto: Math.round(Number(reserva.total) * HOTEL_PORCENTAJE_INICIAL),
      descripcion: `Pago inicial ${HOTEL_PORCENTAJE_INICIAL * 100}% hotel - Habitación ${reserva.habitaciones.numero}`,
      resumen: {
        habitacion: reserva.habitaciones.numero,
        tipo: reserva.habitaciones.tipos_habitacion.nombre,
        fecha_entrada: reserva.fecha_entrada,
        fecha_salida: reserva.fecha_salida,
        noches,
        huespedes: reserva.cantidad_huespedes,
        porcentaje_inicial: HOTEL_PORCENTAJE_INICIAL * 100,
      },
      reservaId: null,
    };
  }

  private async origenHotelSaldo(
    usuarioId: bigint,
    reservaId?: bigint,
  ): Promise<ReservaOrigen> {
    const id = this.requerirId(reservaId);
    const reserva = await this.obtenerReservaPropia(
      this.prisma.reservas_hotel.findUnique({
        where: { id },
        include: { habitaciones: { include: { tipos_habitacion: true } } },
      }),
      usuarioId,
      'Reserva de hotel no encontrada',
    );

    if (
      !['CONFIRMADA', 'CHECK_IN', 'PENDING_PAYMENT'].includes(reserva.estado)
    ) {
      throw new BadRequestException(
        'La reserva no está disponible para pago de saldo',
      );
    }

    const pagosConfirmados = await this.prisma.pagos_hotel.findMany({
      where: { reserva_id: id, estado: 'CONFIRMADO' },
      select: { monto: true },
    });
    const pagado = pagosConfirmados.reduce(
      (sum, p) => sum + Number(p.monto),
      0,
    );
    const saldoPendiente = Math.max(0, Number(reserva.total) - pagado);

    if (saldoPendiente <= 0) {
      throw new BadRequestException(
        'La reserva no tiene saldo pendiente por pagar',
      );
    }

    const noches = Math.ceil(
      (reserva.fecha_salida.getTime() - reserva.fecha_entrada.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // El saldo pendiente ya es precio final (IVA incluido): se desglosa
    // para que la factura cobre exactamente esa cifra, sin re-sumarlo.
    const subtotal = Math.round(saldoPendiente / (1 + IVA_DEFAULT_RATE));
    const impuestos = saldoPendiente - subtotal;

    return {
      monto: subtotal,
      impuestos,
      descripcion: `Pago saldo hotel - Habitación ${reserva.habitaciones.numero}`,
      resumen: {
        habitacion: reserva.habitaciones.numero,
        tipo: reserva.habitaciones.tipos_habitacion.nombre,
        fecha_entrada: reserva.fecha_entrada,
        fecha_salida: reserva.fecha_salida,
        noches,
        huespedes: reserva.cantidad_huespedes,
        saldo_pendiente: saldoPendiente,
      },
      reservaId: null,
    };
  }

  private async origenPedidoOnline(
    usuarioId: bigint,
    reservaId?: bigint,
  ): Promise<ReservaOrigen> {
    const pedido = await this.obtenerReservaPropia(
      this.prisma.pedidos_online.findUnique({
        where: { id: this.requerirId(reservaId) },
        include: { detalle_pedido_online: true },
      }),
      usuarioId,
      'Pedido no encontrado',
    );

    this.validarPendiente(pedido.estado);

    return {
      monto: Number(pedido.total) - Number(pedido.impuestos ?? 0),
      descripcion: `Pedido restaurante - ${pedido.tipo === 'EN_MESA' ? 'En mesa' : 'Para llevar'}`,
      impuestos: Number(pedido.impuestos ?? 0),
      resumen: {
        tipo: pedido.tipo,
        incluye_mesa: pedido.incluye_mesa,
        items: pedido.detalle_pedido_online.length,
      },
      reservaId: null,
      pedidoOnlineId: pedido.id,
    };
  }

  private async origenRecarga(
    usuarioId: bigint,
    monto?: number,
  ): Promise<ReservaOrigen> {
    if (!monto || monto < RECARGA_MONTO_MIN || monto > RECARGA_MONTO_MAX) {
      throw new BadRequestException(
        `El monto de recarga debe estar entre $${RECARGA_MONTO_MIN} y $${RECARGA_MONTO_MAX}`,
      );
    }

    const recarga = await this.prisma.saldo_recargas.create({
      data: {
        usuario_id: usuarioId,
        monto: new Decimal(monto),
        estado: 'PENDIENTE',
      },
      select: { id: true },
    });

    return {
      monto,
      descripcion: 'Recarga de saldo',
      resumen: { monto },
      reservaId: recarga.id,
    };
  }

  private requerirId(reservaId?: bigint | number): bigint {
    if (!reservaId) {
      throw new BadRequestException('reserva_id es obligatorio');
    }
    try {
      return typeof reservaId === 'bigint' ? reservaId : BigInt(reservaId);
    } catch {
      throw new BadRequestException('reserva_id inválido');
    }
  }

  private validarPendiente(estado: string | null): void {
    if (estado !== 'PENDIENTE') {
      throw new BadRequestException('La reserva no está pendiente de pago');
    }
  }

  private async obtenerReservaPropia<T extends { usuario_id: bigint }>(
    query: Promise<T | null>,
    usuarioId: bigint,
    mensaje: string,
  ): Promise<T> {
    const reserva = await query;
    if (!reserva || reserva.usuario_id !== usuarioId) {
      throw new NotFoundException(mensaje);
    }
    return reserva;
  }
}
