import { Decimal } from '@prisma/client/runtime/library';

export interface CreateFacturaInput {
  usuario_id: bigint;
  subtotal: Decimal;
  impuestos: Decimal;
  descuentos: Decimal;
  total: Decimal;
  estado: string;
  reserva_id: bigint | null;
  tipo_reserva: string;
  codigo_descuento: string | null;
  descripcion_detalle: string;
}

export interface CreatePagoInput {
  factura_id: bigint;
  metodo_pago: string;
  valor: Decimal;
  referencia: string | null;
  estado: string;
  payment_link_id: string | null;
  tipo_tarjeta?: string | null;
}

export interface FacturaWithPagos {
  id: bigint;
  usuario_id: bigint;
  subtotal: Decimal;
  impuestos: Decimal | null;
  descuentos: Decimal | null;
  total: Decimal;
  estado: string;
  numero_factura: string | null;
  cufe: string | null;
  qr_url: string | null;
  reserva_id: bigint | null;
  tipo_reserva: string | null;
  created_at: Date | null;
  pagos: {
    id: bigint;
    metodo_pago: string;
    valor: Decimal;
    referencia: string | null;
    estado: string | null;
    fecha_pago: Date | null;
  }[];
}

export abstract class PaymentRepository {
  abstract createFactura(data: CreateFacturaInput): Promise<{ id: bigint }>;
  abstract createPago(data: CreatePagoInput): Promise<{ id: bigint }>;
  abstract updatePagoEstado(pagoId: bigint, estado: string): Promise<void>;
  abstract updatePagoReferencia(
    pagoId: bigint,
    referencia: string,
  ): Promise<void>;
  abstract updatePagoPaymentLinkId(
    pagoId: bigint,
    paymentLinkId: string,
  ): Promise<void>;
  abstract updateFacturaEstado(
    facturaId: bigint,
    estado: string,
  ): Promise<void>;
  /** Marca el pago como rechazado/anulado y la factura como ANULADA (cancelación). */
  abstract cancelarPagoCompleto(
    pagoId: bigint,
    facturaId: bigint,
    tipoReserva: string,
    estadoPago: string,
  ): Promise<void>;
  abstract confirmarPagoCompleto(
    pagoId: bigint,
    facturaId: bigint,
    tipoReserva: string,
    reservaId: bigint | null,
    cobrarConSaldo?: boolean,
  ): Promise<{ saldo_restante?: number }>;
  abstract findFacturaById(facturaId: bigint): Promise<FacturaWithPagos | null>;
  abstract findPagoByReferencia(
    referencia: string,
  ): Promise<PagoResumen | null>;
  abstract findPagoByPaymentLinkId(
    paymentLinkId: string,
  ): Promise<PagoResumen | null>;
  /** Busca el pago por referencia de transacción, con fallback al payment link. */
  abstract findPagoByTransaction(
    referencia: string,
    paymentLinkId?: string | null,
  ): Promise<PagoResumen | null>;
}

export type PagoResumen = {
  id: bigint;
  factura_id: bigint;
  estado: string | null;
  referencia: string | null;
};
