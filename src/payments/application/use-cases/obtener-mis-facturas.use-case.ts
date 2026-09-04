import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class ObtenerMisFacturasUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: bigint) {
    const facturas = await this.prisma.facturas.findMany({
      where: { usuario_id: usuarioId },
      include: {
        pagos: {
          select: {
            id: true,
            metodo_pago: true,
            valor: true,
            estado: true,
            fecha_pago: true,
          },
          orderBy: { fecha_pago: 'desc' },
        },
        detalle_factura: {
          select: {
            id: true,
            descripcion: true,
            cantidad: true,
            precio_unitario: true,
            subtotal: true,
          },
        },
      },
      orderBy: { fecha_factura: 'desc' },
    });

    return {
      facturas: facturas.map((f) => ({
        factura_id: f.id,
        reserva_id:
          f.tipo_reserva === 'RESTAURANTE'
            ? f.pedido_online_id
            : f.reserva_id,
        tipo_reserva: f.tipo_reserva,
        fecha_factura: f.fecha_factura,
        estado: f.estado,
        subtotal: f.subtotal,
        impuestos: f.impuestos,
        descuentos: f.descuentos,
        total: f.total,
        numero_factura: f.numero_factura,
        cufe: f.cufe,
        qr_url: f.qr_url,
        codigo_descuento: f.codigo_descuento,
        detalle: f.detalle_factura.map((d) => ({
          id: d.id,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal,
        })),
        pagos: f.pagos.map((p) => ({
          id: p.id,
          metodo_pago: p.metodo_pago,
          valor: p.valor,
          estado: p.estado,
          fecha_pago: p.fecha_pago,
        })),
      })),
      total: facturas.length,
    };
  }
}