import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { Roles } from 'src/auth/presentation/dto/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@Roles('Administrador')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'KPIs del panel: reservas hoy, ingresos, ocupación',
  })
  async getSummary() {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);

    const [
      reservasHotel,
      reservasRest,
      reservasEvento,
      facturasHoy,
      totalHabitaciones,
      ocupadas,
    ] = await Promise.all([
      this.prisma.reservas_hotel.count({
        where: {
          fecha_entrada: { lte: hoy },
          fecha_salida: { gte: hoy },
          estado: { notIn: ['CANCELADA'] },
        },
      }),
      this.prisma.reservas_restaurante.count({
        where: { fecha: hoy, estado: { notIn: ['CANCELADA'] } },
      }),
      this.prisma.reservas_evento.count({
        where: { fecha: hoy, estado: { notIn: ['CANCELADA'] } },
      }),
      this.prisma.facturas.aggregate({
        where: { fecha_factura: { gte: new Date(hoyStr) } },
        _sum: { total: true },
      }),
      this.prisma.habitaciones.count({ where: { estado: true } }),
      this.prisma.reservas_hotel.count({
        where: {
          fecha_entrada: { lte: hoy },
          fecha_salida: { gte: hoy },
          estado: { in: ['CONFIRMADA', 'CHECK_IN'] },
        },
      }),
    ]);

    const reservasHoy = reservasHotel + reservasRest + reservasEvento;
    const ocupacion =
      totalHabitaciones > 0
        ? Math.round((ocupadas / totalHabitaciones) * 100)
        : 0;

    return {
      reservas_hoy: reservasHoy,
      ingresos_hoy: Number(facturasHoy._sum.total ?? 0),
      ocupacion_porcentaje: ocupacion,
      ocupacion_habitaciones: { ocupadas, totales: totalHabitaciones },
    };
  }

  @Get('reservations/today')
  @ApiOperation({ summary: 'Reservas del día (hotel, restaurante, eventos)' })
  async getTodayReservations() {
    const hoy = new Date();

    const [hotel, restaurante, eventos] = await Promise.all([
      this.prisma.reservas_hotel.findMany({
        where: {
          fecha_entrada: { lte: hoy },
          fecha_salida: { gte: hoy },
          estado: { notIn: ['CANCELADA'] },
        },
        include: {
          usuarios: {
            select: { nombre: true, apellido: true, telefono: true },
          },
          habitaciones: { select: { numero: true } },
        },
      }),
      this.prisma.reservas_restaurante.findMany({
        where: { fecha: hoy, estado: { notIn: ['CANCELADA'] } },
        include: {
          usuarios: {
            select: { nombre: true, apellido: true, telefono: true },
          },
          mesas: { select: { numero: true } },
        },
      }),
      this.prisma.reservas_evento.findMany({
        where: { fecha: hoy, estado: { notIn: ['CANCELADA'] } },
        include: {
          usuarios: {
            select: { nombre: true, apellido: true, telefono: true },
          },
          salones: { select: { nombre: true } },
        },
      }),
    ]);

    return {
      hotel: hotel.map((r) => ({
        id: Number(r.id),
        cliente: `${r.usuarios.nombre} ${r.usuarios.apellido}`,
        servicio: 'Hotel',
        habitacion: r.habitaciones.numero,
        telefono: r.usuarios.telefono,
        personas: r.cantidad_huespedes,
        estado: r.estado,
        fecha_entrada: r.fecha_entrada,
        fecha_salida: r.fecha_salida,
      })),
      restaurante: restaurante.map((r) => ({
        id: Number(r.id),
        cliente: `${r.usuarios.nombre} ${r.usuarios.apellido}`,
        servicio: 'Restaurante',
        mesa: r.mesas.numero,
        telefono: r.usuarios.telefono,
        personas: r.cantidad_personas,
        hora: r.hora,
        estado: r.estado,
      })),
      eventos: eventos.map((r) => ({
        id: Number(r.id),
        cliente: `${r.usuarios.nombre} ${r.usuarios.apellido}`,
        servicio: 'Evento',
        salon: r.salones.nombre,
        telefono: r.usuarios.telefono,
        personas: r.cantidad_personas,
        hora_inicio: r.hora_inicio,
        hora_fin: r.hora_fin,
        estado: r.estado,
      })),
    };
  }

  @Get('income')
  @ApiOperation({ summary: 'Evolución de ingresos' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['diario', 'semanal', 'mensual'],
  })
  async getIncome(@Query('period') period: string = 'mensual') {
    const facturas = await this.prisma.facturas.findMany({
      where: { estado: { not: 'ANULADA' } },
      select: { total: true, fecha_factura: true },
    });

    const ingresos = facturas.map((f) => ({
      total: Number(f.total),
      fecha: f.fecha_factura ?? new Date(),
    }));

    if (period === 'diario') {
      const grupos = new Map<string, number>();
      ingresos.forEach(({ total, fecha }) => {
        const key = fecha.toISOString().slice(0, 10);
        grupos.set(key, (grupos.get(key) ?? 0) + total);
      });
      const dias = Array.from(grupos.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      return {
        period,
        labels: dias.map(([d]) => d),
        values: dias.map(([, v]) => v),
      };
    }

    if (period === 'semanal') {
      const grupos = new Map<string, number>();
      ingresos.forEach(({ total, fecha }) => {
        const inicio = new Date(fecha);
        inicio.setDate(inicio.getDate() - inicio.getDay());
        const key = inicio.toISOString().slice(0, 10);
        grupos.set(key, (grupos.get(key) ?? 0) + total);
      });
      const semanas = Array.from(grupos.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      return {
        period,
        labels: semanas.map((_, i) => `Sem ${i + 1}`),
        values: semanas.map(([, v]) => v),
      };
    }

    const grupos = new Map<string, number>();
    ingresos.forEach(({ total, fecha }) => {
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      grupos.set(key, (grupos.get(key) ?? 0) + total);
    });
    const meses = Array.from(grupos.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const nombreMeses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return {
      period,
      labels: meses.map(([m]) => {
        const [, mes] = m.split('-');
        return nombreMeses[parseInt(mes) - 1] ?? m;
      }),
      values: meses.map(([, v]) => v),
    };
  }

  @Get('services/top')
  @ApiOperation({ summary: 'Ranking de servicios más utilizados' })
  async getTopServices() {
    const [hotel, restaurante, eventos] = await Promise.all([
      this.prisma.reservas_hotel.count({
        where: { estado: { notIn: ['CANCELADA'] } },
      }),
      this.prisma.reservas_restaurante.count({
        where: { estado: { notIn: ['CANCELADA'] } },
      }),
      this.prisma.reservas_evento.count({
        where: { estado: { notIn: ['CANCELADA'] } },
      }),
    ]);

    const total = hotel + restaurante + eventos;
    const services = [
      {
        name: 'Hotel',
        bookings: hotel,
        percentage: total > 0 ? Math.round((hotel / total) * 100) : 0,
      },
      {
        name: 'Restaurante',
        bookings: restaurante,
        percentage: total > 0 ? Math.round((restaurante / total) * 100) : 0,
      },
      {
        name: 'Eventos',
        bookings: eventos,
        percentage: total > 0 ? Math.round((eventos / total) * 100) : 0,
      },
    ].sort((a, b) => b.bookings - a.bookings);

    return services;
  }

  @Get('restaurant/peak-hours')
  @ApiOperation({ summary: 'Afluencia por hora en restaurante' })
  async getPeakHours() {
    const pedidos = await this.prisma.pedidos_restaurante.findMany({
      select: { fecha_pedido: true },
    });

    const horas = new Map<string, number>();
    pedidos.forEach((p) => {
      const h = `${String(p.fecha_pedido.getHours()).padStart(2, '0')}:00`;
      horas.set(h, (horas.get(h) ?? 0) + 1);
    });

    const labels = Array.from(
      { length: 16 },
      (_, i) => `${String(i + 7).padStart(2, '0')}:00`,
    );
    const values = labels.map((h) => horas.get(h) ?? 0);

    return { labels, values };
  }

  @Get('rooms/top')
  @ApiOperation({ summary: 'Habitaciones más reservadas' })
  async getTopRooms() {
    const reservas = await this.prisma.reservas_hotel.groupBy({
      by: ['habitacion_id'],
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const habitaciones = await this.prisma.habitaciones.findMany({
      where: { id: { in: reservas.map((r) => r.habitacion_id) } },
      include: { tipos_habitacion: { select: { nombre: true } } },
    });

    const habitacionesMap = new Map(habitaciones.map((h) => [Number(h.id), h]));
    const totalHabitaciones = await this.prisma.habitaciones.count({
      where: { estado: true },
    });

    return reservas.map((r) => {
      const hab = habitacionesMap.get(Number(r.habitacion_id));
      return {
        nombre: hab ? `Habitación ${hab.numero}` : `#${r.habitacion_id}`,
        tipo: hab?.tipos_habitacion.nombre ?? '',
        reservas: r._count.id,
        ingresos: Number(r._sum.total ?? 0),
        ocupacion_porcentaje:
          totalHabitaciones > 0
            ? Math.round((r._count.id / totalHabitaciones) * 100)
            : 0,
      };
    });
  }

  @Get('events/upcoming')
  @ApiOperation({ summary: 'Próximos eventos' })
  async getUpcomingEvents() {
    const eventos = await this.prisma.reservas_evento.findMany({
      where: { fecha: { gte: new Date() }, estado: { notIn: ['CANCELADA'] } },
      include: {
        usuarios: { select: { nombre: true, apellido: true } },
        salones: { select: { nombre: true, capacidad: true } },
        tipos_evento: { select: { nombre: true } },
      },
      orderBy: { fecha: 'asc' },
      take: 20,
    });

    return eventos.map((e) => ({
      id: Number(e.id),
      nombre: e.tipos_evento.nombre,
      fecha: e.fecha,
      hora_inicio: e.hora_inicio,
      hora_fin: e.hora_fin,
      asistentes: e.cantidad_personas,
      salon: e.salones.nombre,
      cliente: `${e.usuarios.nombre} ${e.usuarios.apellido}`,
      estado: e.estado,
    }));
  }

  @Get('hotel/occupancy')
  @ApiOperation({ summary: 'Ocupación actual y tendencia 14 días' })
  async getOccupancy() {
    const hoy = new Date();

    const totalHabitaciones = await this.prisma.habitaciones.count({
      where: { estado: true },
    });

    const ocupadasAhora = await this.prisma.reservas_hotel.count({
      where: {
        fecha_entrada: { lte: hoy },
        fecha_salida: { gte: hoy },
        estado: { in: ['CONFIRMADA', 'CHECK_IN'] },
      },
    });

    const historico: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const dia = new Date(hoy);
      dia.setDate(dia.getDate() - i);
      const fin = new Date(dia);
      fin.setDate(fin.getDate() + 1);

      const ocupadas = await this.prisma.reservas_hotel.count({
        where: {
          fecha_entrada: { lt: fin },
          fecha_salida: { gte: dia },
          estado: { in: ['CONFIRMADA', 'CHECK_IN'] },
        },
      });
      historico.push(
        totalHabitaciones > 0
          ? Math.round((ocupadas / totalHabitaciones) * 100)
          : 0,
      );
    }

    return {
      actual:
        totalHabitaciones > 0
          ? Math.round((ocupadasAhora / totalHabitaciones) * 100)
          : 0,
      ocupadas: ocupadasAhora,
      totales: totalHabitaciones,
      disponibles: totalHabitaciones - ocupadasAhora,
      historico_14_dias: historico,
    };
  }

  @Get('comparative/income')
  @ApiOperation({ summary: 'Ingresos año actual vs anterior' })
  async getComparativeIncome() {
    const yearActual = new Date().getFullYear();
    const yearAnterior = yearActual - 1;

    const facturas = await this.prisma.facturas.findMany({
      where: {
        estado: { not: 'ANULADA' },
        fecha_factura: { gte: new Date(`${yearAnterior}-01-01`) },
      },
      select: { total: true, fecha_factura: true },
    });

    const nombreMeses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const actual = new Array(12).fill(0);
    const anterior = new Array(12).fill(0);

    facturas.forEach(({ total, fecha_factura }) => {
      if (!fecha_factura) return;
      const mes = fecha_factura.getMonth();
      const year = fecha_factura.getFullYear();
      if (year === yearActual) actual[mes] += Number(total);
      else if (year === yearAnterior) anterior[mes] += Number(total);
    });

    return {
      labels: nombreMeses,
      year_actual: actual,
      year_anterior: anterior,
    };
  }

  @Get('calendar/events')
  @ApiOperation({ summary: 'Todos los eventos para el calendario' })
  async getCalendarEvents() {
    const [eventos, hotel, restaurante] = await Promise.all([
      this.prisma.reservas_evento.findMany({
        where: { estado: { notIn: ['CANCELADA'] } },
        include: {
          salones: { select: { nombre: true } },
          tipos_evento: { select: { nombre: true } },
        },
      }),
      this.prisma.reservas_hotel.findMany({
        where: { estado: { notIn: ['CANCELADA'] } },
        include: { habitaciones: { select: { numero: true } } },
      }),
      this.prisma.reservas_restaurante.findMany({
        where: { estado: { notIn: ['CANCELADA'] } },
        include: { mesas: { select: { numero: true } } },
      }),
    ]);

    return [
      ...eventos.map((e) => ({
        id: `evento-${e.id}`,
        title: `Evento: ${e.tipos_evento.nombre}`,
        date: e.fecha.toISOString().slice(0, 10),
        time: `${e.hora_inicio.toISOString().slice(11, 16)} - ${e.hora_fin.toISOString().slice(11, 16)}`,
        location: e.salones.nombre,
        category: 'eventos',
        color: '#6c5ce7',
      })),
      ...hotel.map((h) => ({
        id: `hotel-${h.id}`,
        title: `Hotel: Hab ${h.habitaciones.numero}`,
        date: h.fecha_entrada.toISOString().slice(0, 10),
        time: 'Reserva',
        location: `Hab ${h.habitaciones.numero}`,
        category: 'reservas',
        color: '#fdcb6e',
      })),
      ...restaurante.map((r) => ({
        id: `rest-${r.id}`,
        title: `Rest: Mesa ${r.mesas.numero}`,
        date: r.fecha.toISOString().slice(0, 10),
        time: r.hora.toISOString().slice(11, 16),
        location: `Mesa ${r.mesas.numero}`,
        category: 'reservas',
        color: '#fdcb6e',
      })),
    ];
  }

  @Get('members')
  @ApiOperation({ summary: 'Lista de socios con resumen' })
  async getMembers() {
    const role = await this.prisma.roles.findFirst({
      where: { nombre: 'Cliente' },
    });
    if (!role) return [];

    const usuarios = await this.prisma.usuarios.findMany({
      where: { rol_id: role.id, estado: true },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correo: true,
        telefono: true,
        _count: {
          select: {
            facturas: true,
            reservas_hotel: true,
            reservas_restaurante: true,
            reservas_evento: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return usuarios.map((u) => ({
      id: Number(u.id),
      nombre: `${u.nombre} ${u.apellido}`,
      correo: u.correo,
      telefono: u.telefono,
      reservas:
        u._count.reservas_hotel +
        u._count.reservas_restaurante +
        u._count.reservas_evento,
      facturas: u._count.facturas,
    }));
  }

  @Get('members/:id')
  @ApiOperation({ summary: 'Detalle de un socio' })
  async getMemberDetail(@Param('id', ParseIntPipe) id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      include: { roles: { select: { nombre: true } } },
    });
    if (!usuario) return null;

    const [facturas, hotel, restaurante, eventos] = await Promise.all([
      this.prisma.facturas.findMany({
        where: { usuario_id: id },
        orderBy: { fecha_factura: 'desc' },
        take: 20,
      }),
      this.prisma.reservas_hotel.findMany({
        where: { usuario_id: id },
        include: { habitaciones: { select: { numero: true } } },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      this.prisma.reservas_restaurante.findMany({
        where: { usuario_id: id },
        include: { mesas: { select: { numero: true } } },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      this.prisma.reservas_evento.findMany({
        where: { usuario_id: id },
        include: {
          salones: { select: { nombre: true } },
          tipos_evento: { select: { nombre: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    return {
      id: Number(usuario.id),
      nombre: `${usuario.nombre} ${usuario.apellido}`,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: usuario.roles.nombre,
      facturas: facturas.map((f) => ({
        id: Number(f.id),
        fecha: f.fecha_factura,
        total: Number(f.total),
        estado: f.estado,
      })),
      reservas_hotel: hotel.map((h) => ({
        id: Number(h.id),
        habitacion: h.habitaciones.numero,
        entrada: h.fecha_entrada,
        salida: h.fecha_salida,
        personas: h.cantidad_huespedes,
        total: Number(h.total),
        estado: h.estado,
      })),
      reservas_restaurante: restaurante.map((r) => ({
        id: Number(r.id),
        mesa: r.mesas.numero,
        fecha: r.fecha,
        hora: r.hora,
        personas: r.cantidad_personas,
        estado: r.estado,
      })),
      reservas_evento: eventos.map((e) => ({
        id: Number(e.id),
        tipo: e.tipos_evento.nombre,
        salon: e.salones.nombre,
        fecha: e.fecha,
        personas: e.cantidad_personas,
        estado: e.estado,
      })),
    };
  }
}
