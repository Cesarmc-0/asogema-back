import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  PaymentRepository,
  CreateFacturaInput,
  CreatePagoInput,
  FacturaWithPagos,
} from 'src/payments/domain/repositories/payment.repository.interface';
import type { PrismaPromise, Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentRepositoryImpl implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFactura(data: CreateFacturaInput): Promise<{ id: bigint }> {
    const crear = this.prisma.facturas.create({
      data: {
        usuario_id: data.usuario_id,
        subtotal: data.subtotal,
        impuestos: data.impuestos,
        descuentos: data.descuentos,
        total: data.total,
        estado: data.estado,
        reserva_id: data.reserva_id,
        pedido_online_id: data.pedido_online_id,
        tipo_reserva: data.tipo_reserva,
        codigo_descuento: data.codigo_descuento,
        detalle_factura: {
          create: {
            descripcion: data.descripcion_detalle,
            cantidad: 1,
            precio_unitario: data.subtotal,
          },
        },
      },
      select: { id: true },
    });

    if (data.codigo_descuento) {
      const incrementarUso = this.prisma.codigos_descuento.update({
        where: { codigo: data.codigo_descuento },
        data: { usos_actuales: { increment: 1 } },
      });

      const [factura] = await this.prisma.$transaction([crear, incrementarUso]);
      return { id: factura.id };
    }

    const factura = await crear;
    return { id: factura.id };
  }

  async createPago(data: CreatePagoInput): Promise<{ id: bigint }> {
    const pago = await this.prisma.pagos.create({
      data: {
        factura_id: data.factura_id,
        metodo_pago: data.metodo_pago,
        valor: data.valor,
        referencia: data.referencia,
        estado: data.estado,
        payment_link_id: data.payment_link_id,
        tipo_tarjeta: data.tipo_tarjeta ?? null,
      },
      select: { id: true },
    });
    return { id: pago.id };
  }

  async updatePagoEstado(pagoId: bigint, estado: string): Promise<void> {
    await this.prisma.pagos.update({
      where: { id: pagoId },
      data: { estado },
    });
  }

  async updatePagoReferencia(
    pagoId: bigint,
    referencia: string,
  ): Promise<void> {
    await this.prisma.pagos.update({
      where: { id: pagoId },
      data: { referencia },
    });
  }

  async updatePagoPaymentLinkId(
    pagoId: bigint,
    paymentLinkId: string,
  ): Promise<void> {
    await this.prisma.pagos.update({
      where: { id: pagoId },
      data: { payment_link_id: paymentLinkId },
    });
  }

  async updateFacturaEstado(facturaId: bigint, estado: string): Promise<void> {
    await this.prisma.facturas.update({
      where: { id: facturaId },
      data: { estado },
    });
  }

  async cancelarPagoCompleto(
    pagoId: bigint,
    facturaId: bigint,
    tipoReserva: string,
    estadoPago: string,
  ): Promise<void> {
    const [factura, pago] = await Promise.all([
      this.prisma.facturas.findUnique({
        where: { id: facturaId },
        select: { usuario_id: true, total: true },
      }),
      this.prisma.pagos.findUnique({
        where: { id: pagoId },
        select: { metodo_pago: true },
      }),
    ]);

    const actualizaciones: PrismaPromise<unknown>[] = [
      this.prisma.pagos.update({
        where: { id: pagoId },
        data: { estado: estadoPago },
      }),
      this.prisma.facturas.update({
        where: { id: facturaId },
        data: { estado: 'ANULADA' },
      }),
    ];

    if (tipoReserva === 'RECARGA' && factura) {
      // La recarga acreditó saldo al confirmarse: anularla revierte ese crédito.
      actualizaciones.push(
        this.prisma.saldo_recargas.updateMany({
          where: { factura_id: facturaId },
          data: { estado: 'RECHAZADO' },
        }),
        this.prisma.saldos_usuario.upsert({
          where: { usuario_id: factura.usuario_id },
          create: {
            usuario_id: factura.usuario_id,
            saldo: 0,
          },
          update: {
            saldo: { decrement: factura.total },
          },
        }),
      );
    } else if (
      tipoReserva !== 'RECARGA' &&
      pago?.metodo_pago === 'SALDO' &&
      factura
    ) {
      // Consumo pagado con saldo: anularlo devuelve el saldo descontado.
      actualizaciones.push(
        this.prisma.saldos_usuario.upsert({
          where: { usuario_id: factura.usuario_id },
          create: {
            usuario_id: factura.usuario_id,
            saldo: factura.total,
          },
          update: {
            saldo: { increment: factura.total },
          },
        }),
      );
    }

    await this.prisma.$transaction(actualizaciones);
  }

  async confirmarPagoCompleto(
    pagoId: bigint,
    facturaId: bigint,
    tipoReserva: string,
    reservaId: bigint | null,
    cobrarConSaldo = false,
  ): Promise<{ saldo_restante?: number }> {
    const factura = await this.prisma.facturas.findUnique({
      where: { id: facturaId },
    });
    if (!factura) {
      return {};
    }

    const pedidoId =
      tipoReserva === 'RESTAURANTE' ? factura.pedido_online_id : null;
    const pedido =
      pedidoId != null
        ? await this.prisma.pedidos_online.findUnique({
            where: { id: pedidoId },
            include: { detalle_pedido_online: true },
          })
        : null;

    return this.prisma.$transaction(async (tx) => {
      if (cobrarConSaldo) {
        const saldo = await tx.saldos_usuario.findUnique({
          where: { usuario_id: factura.usuario_id },
        });
        const disponible = Number(saldo?.saldo ?? 0);
        const total = Number(factura.total);

        if (disponible < total) {
          throw new BadRequestException(
            `Saldo insuficiente: disponible $${disponible}, requerido $${total}`,
          );
        }

        await tx.saldos_usuario.update({
          where: { usuario_id: factura.usuario_id },
          data: { saldo: { decrement: total } },
        });
      }

      await tx.pagos.update({
        where: { id: pagoId },
        data: { estado: 'CONFIRMADO' },
      });

      await tx.facturas.update({
        where: { id: facturaId },
        data: { estado: 'PAGADA' },
      });

      if (tipoReserva === 'EVENTO' && reservaId) {
        await tx.reservas_evento.update({
          where: { id: reservaId },
          data: { estado: 'CONFIRMADA' },
        });
      }

      if (tipoReserva === 'HOTEL' && reservaId) {
        await tx.reservas_hotel.update({
          where: { id: reservaId },
          data: { estado: 'CONFIRMADA' },
        });
      }

      if (tipoReserva === 'RESTAURANTE' && pedido) {
        await tx.pedidos_online.update({
          where: { id: pedido.id },
          data: { estado: 'CONFIRMADA' },
        });

        for (const item of pedido.detalle_pedido_online ?? []) {
          const res = await tx.productos_menu.updateMany({
            where: { id: item.producto_id, stock: { gte: item.cantidad } },
            data: { stock: { decrement: item.cantidad } },
          });
          if (res.count === 0) {
            throw new BadRequestException(
              `Stock insuficiente para el producto ${item.producto_id}`,
            );
          }
        }
      }

      if (tipoReserva === 'RECARGA' && reservaId) {
        await tx.saldos_usuario.upsert({
          where: { usuario_id: factura.usuario_id },
          create: {
            usuario_id: factura.usuario_id,
            saldo: factura.total,
          },
          update: {
            saldo: { increment: factura.total },
          },
        });
        await tx.saldo_recargas.update({
          where: { id: reservaId },
          data: { estado: 'CONFIRMADO', factura_id: facturaId },
        });
      }

      if (cobrarConSaldo) {
        const saldo = await tx.saldos_usuario.findUnique({
          where: { usuario_id: factura.usuario_id },
        });
        const disponible = Number(saldo?.saldo ?? 0);
        return { saldo_restante: disponible };
      }

      return {};
    });
  }

  private construirActualizaciones(
    client: Prisma.TransactionClient,
    params: {
      pagoId: bigint;
      facturaId: bigint;
      tipoReserva: string;
      reservaId: bigint | null;
      pedido: {
        id: bigint;
        detalle_pedido_online: { producto_id: bigint; cantidad: number }[];
      } | null;
      factura: { usuario_id: bigint; total: Decimal };
    },
  ): PrismaPromise<unknown>[] {
    const updates: PrismaPromise<unknown>[] = [
      client.pagos.update({
        where: { id: params.pagoId },
        data: { estado: 'CONFIRMADO' },
      }),
      client.facturas.update({
        where: { id: params.facturaId },
        data: { estado: 'PAGADA' },
      }),
    ];

    if (params.tipoReserva === 'EVENTO' && params.reservaId) {
      updates.push(
        client.reservas_evento.update({
          where: { id: params.reservaId },
          data: { estado: 'CONFIRMADA' },
        }),
      );
    }

    if (params.tipoReserva === 'HOTEL' && params.reservaId) {
      updates.push(
        client.reservas_hotel.update({
          where: { id: params.reservaId },
          data: { estado: 'CONFIRMADA' },
        }),
      );
    }

    if (params.tipoReserva === 'RESTAURANTE' && params.pedido) {
      updates.push(
        client.pedidos_online.update({
          where: { id: params.pedido.id },
          data: { estado: 'CONFIRMADA' },
        }),
      );

      for (const item of params.pedido.detalle_pedido_online ?? []) {
        updates.push(
          client.productos_menu.update({
            where: { id: item.producto_id },
            data: { stock: { decrement: item.cantidad } },
          }),
        );
      }
    }

    if (params.tipoReserva === 'RECARGA' && params.reservaId) {
      updates.push(
        client.saldos_usuario.upsert({
          where: { usuario_id: params.factura.usuario_id },
          create: {
            usuario_id: params.factura.usuario_id,
            saldo: params.factura.total,
          },
          update: {
            saldo: { increment: params.factura.total },
          },
        }),
        client.saldo_recargas.update({
          where: { id: params.reservaId },
          data: { estado: 'CONFIRMADO', factura_id: params.facturaId },
        }),
      );
    }

    return updates;
  }

  async findFacturaById(facturaId: bigint): Promise<FacturaWithPagos | null> {
    return this.prisma.facturas.findUnique({
      where: { id: facturaId },
      include: { pagos: true },
    });
  }

  async findPagoByReferencia(referencia: string): Promise<{
    id: bigint;
    factura_id: bigint;
    estado: string | null;
    referencia: string | null;
  } | null> {
    return this.prisma.pagos.findFirst({
      where: { referencia },
      select: { id: true, factura_id: true, estado: true, referencia: true },
    });
  }

  async findPagoByPaymentLinkId(paymentLinkId: string): Promise<{
    id: bigint;
    factura_id: bigint;
    estado: string | null;
    referencia: string | null;
  } | null> {
    return this.prisma.pagos.findFirst({
      where: { payment_link_id: paymentLinkId },
      select: { id: true, factura_id: true, estado: true, referencia: true },
    });
  }

  async findPagoByTransaction(
    referencia: string,
    paymentLinkId?: string | null,
  ): Promise<{
    id: bigint;
    factura_id: bigint;
    estado: string | null;
    referencia: string | null;
  } | null> {
    const porReferencia = await this.findPagoByReferencia(referencia);
    if (porReferencia) return porReferencia;
    if (paymentLinkId) return this.findPagoByPaymentLinkId(paymentLinkId);
    return null;
  }
}
