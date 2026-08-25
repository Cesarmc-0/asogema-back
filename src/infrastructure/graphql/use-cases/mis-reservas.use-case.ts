import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class MisReservasUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: bigint) {
    const [hoteles, eventos, restaurante, pedidosOnline] = await Promise.all([
      this.prisma.reservas_hotel.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          fecha_entrada: true,
          fecha_salida: true,
          total: true,
          estado: true,
          habitaciones: { select: { numero: true } },
        },
      }),
      this.prisma.reservas_evento.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          fecha: true,
          anticipo: true,
          estado: true,
          salones: { select: { nombre: true } },
          tipos_evento: { select: { nombre: true } },
        },
      }),
      this.prisma.reservas_restaurante.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          fecha: true,
          hora: true,
          cantidad_personas: true,
          estado: true,
          mesas: { select: { numero: true } },
        },
      }),
      this.prisma.pedidos_online.findMany({
        where: { usuario_id: usuarioId },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          tipo: true,
          total: true,
          estado: true,
          qr_url: true,
        },
      }),
    ]);

    const reservaIds = [
      ...hoteles.map((h) => h.id),
      ...eventos.map((e) => e.id),
      ...restaurante.map((r) => r.id),
      ...pedidosOnline.map((p) => p.id),
    ];

    const facturas =
      reservaIds.length > 0
        ? await this.prisma.facturas.findMany({
            where: {
              usuario_id: usuarioId,
              reserva_id: { in: reservaIds },
            },
            select: {
              id: true,
              estado: true,
              tipo_reserva: true,
              reserva_id: true,
            },
          })
        : [];

    const pagoPorReserva = new Map(
      facturas.map((f) => [
        `${f.tipo_reserva}:${f.reserva_id}`,
        { pago_estado: f.estado, factura_id: String(f.id) },
      ]),
    );

    return {
      hoteles: hoteles.map((h) => ({
        reserva_id: String(h.id),
        habitacion: h.habitaciones?.numero ?? 'N/A',
        fecha_entrada: h.fecha_entrada.toISOString().slice(0, 10),
        fecha_salida: h.fecha_salida.toISOString().slice(0, 10),
        total: Number(h.total),
        estado: h.estado,
        ...pagoPorReserva.get(`HOTEL:${h.id}`),
      })),
      eventos: eventos.map((e) => ({
        reserva_id: String(e.id),
        salon: e.salones?.nombre ?? 'N/A',
        tipo_evento: e.tipos_evento?.nombre ?? 'N/A',
        fecha: e.fecha.toISOString().slice(0, 10),
        anticipo: Number(e.anticipo ?? 0),
        estado: e.estado,
        ...pagoPorReserva.get(`EVENTO:${e.id}`),
      })),
      restaurante: restaurante.map((r) => ({
        reserva_id: String(r.id),
        mesa: r.mesas?.numero ?? 'N/A',
        fecha: r.fecha.toISOString().slice(0, 10),
        hora: r.hora.toISOString().slice(11, 16),
        cantidad_personas: r.cantidad_personas,
        estado: r.estado,
        ...pagoPorReserva.get(`RESTAURANTE:${r.id}`),
      })),
      pedidosOnline: pedidosOnline.map((p) => ({
        pedido_id: String(p.id),
        tipo: p.tipo,
        total: Number(p.total),
        estado: p.estado,
        qr_url: p.qr_url,
        ...pagoPorReserva.get(`RESTAURANTE:${p.id}`),
      })),
    };
  }
}
