import { Decimal } from '@prisma/client/runtime/library';

export interface CreateFacturaInput {
  usuario_id: bigint;
  subtotal: Decimal;
  impuestos: Decimal;
  total: Decimal;
  estado: string;
}

export interface CreatePagoInput {
  factura_id: bigint;
  metodo_pago: string;
  valor: Decimal;
  referencia: string | null;
  estado: string;
  payment_link_id: string | null;
}

export interface FacturaWithPagos {
  id: bigint;
  usuario_id: bigint;
  subtotal: Decimal;
  impuestos: Decimal | null;
  descuentos: Decimal | null;
  total: Decimal;
  estado: string;
  created_at: Date | null;
  pagos: {
    id: bigint;
    metodo_pago: string;
    valor: Decimal;
    referencia: string | null;
    estado: string | null;
  }[];
}

export abstract class PaymentRepository {
  abstract createFactura(data: CreateFacturaInput): Promise<{ id: bigint }>;
  abstract createPago(data: CreatePagoInput): Promise<{ id: bigint }>;
  abstract updatePagoEstado(pagoId: bigint, estado: string): Promise<void>;
  abstract updatePagoPaymentLinkId(
    pagoId: bigint,
    paymentLinkId: string,
  ): Promise<void>;
  abstract updateFacturaEstado(
    facturaId: bigint,
    estado: string,
  ): Promise<void>;
  abstract findFacturaById(facturaId: bigint): Promise<FacturaWithPagos | null>;
  abstract findPagoByReferencia(
    referencia: string,
  ): Promise<{ id: bigint; factura_id: bigint; estado: string | null } | null>;
  abstract findPagoByPaymentLinkId(
    paymentLinkId: string,
  ): Promise<{ id: bigint; factura_id: bigint; estado: string | null } | null>;
}
