import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { PaymentGateway } from 'src/payments/domain/gateways/payment-gateway.interface';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';
import { calculateIva } from 'src/facturacion/domain/iva.util';
import { CuponService } from 'src/payments/application/services/cupon.service';
import { ConfirmacionPagoService } from 'src/payments/application/services/confirmacion-pago.service';
import { PaymentMethodMapper } from 'src/payments/application/services/payment-method.mapper';
import type { PaymentDataInput } from 'src/payments/application/services/payment-method.mapper';
import {
  PaymentOriginResolver,
  ReservaOrigen,
} from 'src/payments/application/services/payment-origin.resolver';
import type { TipoReserva } from 'src/payments/domain/payment.constants';

interface CreatePaymentInput {
  reserva_id?: bigint;
  tipo_reserva: TipoReserva;
  metodo_pago: string;
  tipo_tarjeta?: string;
  codigo_descuento?: string;
  monto?: number;
  payment_data?: PaymentDataInput;
  ip?: string;
}

@Injectable()
export class CreatePaymentUseCase {
  private readonly logger = new Logger(CreatePaymentUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRepo: PaymentRepository,
    private readonly cuponService: CuponService,
    private readonly confirmacionPagoService: ConfirmacionPagoService,
    private readonly originResolver: PaymentOriginResolver,
  ) {}

  async execute(usuarioId: bigint, dto: CreatePaymentInput) {
    const tipoTarjeta = this.validarTipoTarjeta(dto);
    const origen = await this.originResolver.resolve(usuarioId, dto);
    const porcentajeCupon = dto.codigo_descuento
      ? await this.cuponService.obtenerPorcentaje(dto.codigo_descuento)
      : 0;

    const subtotal = origen.monto;
    const descuento = Math.round((subtotal * porcentajeCupon) / 100);
    const baseGravable = subtotal - descuento;
    const impuestos =
      dto.tipo_reserva === 'RECARGA' ? 0 : calculateIva(baseGravable);
    const total = baseGravable + impuestos;

    await this.validarMayorDeEdad(usuarioId);

    const factura = await this.paymentRepo.createFactura({
      usuario_id: usuarioId,
      subtotal: new Decimal(subtotal),
      impuestos: new Decimal(impuestos),
      descuentos: new Decimal(descuento),
      total: new Decimal(total),
      estado: 'PENDIENTE',
      reserva_id: origen.reservaId ?? dto.reserva_id ?? null,
      tipo_reserva: dto.tipo_reserva,
      codigo_descuento: dto.codigo_descuento ?? null,
      descripcion_detalle: origen.descripcion,
    });

    const pago = await this.paymentRepo.createPago({
      factura_id: factura.id,
      metodo_pago: dto.metodo_pago,
      valor: new Decimal(total),
      referencia: null,
      estado: 'PENDIENTE',
      payment_link_id: null,
      tipo_tarjeta: tipoTarjeta,
    });

    if (
      PaymentMethodMapper.esDirecto(dto.metodo_pago) ||
      (dto.metodo_pago === 'TARJETA' && dto.payment_data?.card_number)
    ) {
      return this.pagarConTransaccionDirecta(
        usuarioId,
        factura.id,
        pago.id,
        dto,
        total,
        descuento,
        origen,
      );
    }

    if (dto.metodo_pago === 'SALDO') {
      return this.pagarConSaldo(
        usuarioId,
        factura.id,
        pago.id,
        dto,
        total,
        descuento,
        origen,
      );
    }

    const cliente = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
      select: { nombre: true, apellido: true, correo: true },
    });

    const checkoutResult = await this.paymentGateway.createCheckoutSession({
      amount_in_cents: total * 100,
      currency: 'COP',
      reference: String(factura.id),
      customer_email: cliente?.correo ?? '',
      customer_name: cliente
        ? `${cliente.nombre} ${cliente.apellido}`.trim()
        : '',
      redirect_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/payment/result?factura_id=${factura.id}`,
    });

    await this.paymentRepo.updatePagoPaymentLinkId(
      pago.id,
      checkoutResult.payment_link_id,
    );

    this.logger.log(
      `Checkout creado: tipo=${dto.tipo_reserva}, factura=${factura.id}, total=${total}`,
    );

    return {
      factura_id: factura.id,
      pago_id: pago.id,
      checkout_url: checkoutResult.checkout_url,
      total,
      descuento,
      reservation_summary: origen.resumen,
    };
  }

  /**
   * Crea una transacción directa en Wompi (NEQUI/DAVIPLATA/PSE) sin pasar
   * por el link de pago. El usuario confirma en su celular (Nequi/Daviplata)
   * o es redirigido al banco (PSE). La confirmación llega por webhook.
   */
  private async pagarConTransaccionDirecta(
    usuarioId: bigint,
    facturaId: bigint,
    pagoId: bigint,
    dto: CreatePaymentInput,
    total: number,
    descuento: number,
    origen: ReservaOrigen,
  ) {
    const reference = `PAGO-${pagoId}`;
    const mapper = new PaymentMethodMapper(dto.metodo_pago, dto.payment_data);

    // Tarjeta directa: se tokeniza y se crea la transacción CARD.
    const paymentMethod =
      dto.metodo_pago === 'TARJETA'
        ? {
            type: 'CARD',
            token: await this.paymentGateway.tokenizeCard(
              mapper.requireCardData(),
            ),
            installments: 1,
          }
        : mapper.toWompiPaymentMethod(`Pago Asogema - ${dto.tipo_reserva}`);

    const cliente = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
      select: { nombre: true, apellido: true, correo: true, telefono: true },
    });
    if (!cliente) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const transaction = await this.paymentGateway.createTransaction({
      amount_in_cents: total * 100,
      currency: 'COP',
      reference,
      customer_email: cliente.correo,
      customer_name: `${cliente.nombre} ${cliente.apellido}`.trim(),
      redirect_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/payment/result?factura_id=${facturaId}`,
      ip: dto.ip,
      payment_method: paymentMethod,
    });

    await this.paymentRepo.updatePagoReferencia(pagoId, reference);

    this.logger.log(
      `Transaccion directa creada: metodo=${dto.metodo_pago}, factura=${facturaId}, tx=${transaction.transaction_id}`,
    );

    return {
      factura_id: facturaId,
      pago_id: pagoId,
      estado: 'PENDIENTE',
      transaction_id: transaction.transaction_id,
      async_payment_url: transaction.async_payment_url ?? null,
      total,
      descuento,
      reservation_summary: origen.resumen,
    };
  }

  private async pagarConSaldo(
    usuarioId: bigint,
    facturaId: bigint,
    pagoId: bigint,
    dto: CreatePaymentInput,
    total: number,
    descuento: number,
    origen: ReservaOrigen,
  ) {
    if (dto.tipo_reserva === 'RECARGA') {
      throw new BadRequestException('No puedes recargar saldo usando tu saldo');
    }

    const { saldo_restante } = await this.paymentRepo.confirmarPagoCompleto(
      pagoId,
      facturaId,
      dto.tipo_reserva,
      origen.reservaId ?? dto.reserva_id ?? null,
      true,
    );

    await this.confirmacionPagoService.finalizar(
      facturaId,
      dto.tipo_reserva,
      origen.reservaId ?? dto.reserva_id ?? null,
    );

    this.logger.log(
      `Pago con saldo OK: tipo=${dto.tipo_reserva}, factura=${facturaId}, saldo restante=${saldo_restante}`,
    );

    return {
      factura_id: facturaId,
      pago_id: pagoId,
      estado: 'PAGADA',
      checkout_url: null,
      total,
      descuento,
      saldo_restante,
      reservation_summary: origen.resumen,
    };
  }

  /**
   * Solo mayores de 18 años pueden realizar pagos. Se valida con la
   * fecha de nacimiento del usuario (el sistema no está destinado a menores).
   */
  private async validarMayorDeEdad(usuarioId: bigint): Promise<void> {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
      select: { fecha_nacimiento: true },
    });

    if (!usuario?.fecha_nacimiento) {
      throw new BadRequestException(
        'Debes completar tu fecha de nacimiento para realizar pagos',
      );
    }

    const nacimiento = new Date(usuario.fecha_nacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesDiaActual = hoy.getMonth() * 100 + hoy.getDate();
    const mesDiaNacimiento = nacimiento.getMonth() * 100 + nacimiento.getDate();
    if (mesDiaActual < mesDiaNacimiento) edad -= 1;

    if (edad < 18) {
      throw new BadRequestException(
        'Solo mayores de 18 años pueden realizar pagos',
      );
    }
  }

  private validarTipoTarjeta(dto: CreatePaymentInput): string | null {
    if (dto.metodo_pago !== 'TARJETA') {
      this.rechazarTipoTarjetaSobrante(dto.tipo_tarjeta);
      return null;
    }

    // Tarjeta directa: la transacción CARD no distingue crédito/débito.
    if (this.esTarjetaDirecta(dto)) {
      this.rechazarTipoTarjetaSobrante(dto.tipo_tarjeta);
      return null;
    }

    const tipoTarjetaValido = this.extraerTipoTarjetaValido(dto.tipo_tarjeta);
    if (!tipoTarjetaValido) {
      throw new BadRequestException(
        'Para pagos con tarjeta debes indicar tipo_tarjeta: CREDITO o DEBITO',
      );
    }
    return tipoTarjetaValido;
  }

  private esTarjetaDirecta(dto: CreatePaymentInput): boolean {
    return Boolean(dto.payment_data?.card_number);
  }

  private extraerTipoTarjetaValido(
    tipoTarjeta?: string,
  ): 'CREDITO' | 'DEBITO' | null {
    if (tipoTarjeta === 'CREDITO' || tipoTarjeta === 'DEBITO') {
      return tipoTarjeta;
    }
    return null;
  }

  private rechazarTipoTarjetaSobrante(tipoTarjeta?: string): void {
    if (tipoTarjeta) {
      throw new BadRequestException(
        'tipo_tarjeta solo aplica cuando el pago requiere elegir crédito o débito',
      );
    }
  }
}
