import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureReservasHotel(clientes: { id: bigint }[]) {
  const existing = await prisma.reservas_hotel.count();
  if (existing > 0) {
    console.log(`${existing} reservas de hotel ya existen.`);
    return;
  }

  const hoy = new Date();
  const data = [
    { cliente: clientes[0], entrada: new Date(hoy.getTime() - 86400000 * 2), salida: new Date(hoy.getTime() + 86400000), habId: 3, personas: 2, total: 540000, estado: 'CHECK_IN' },
    { cliente: clientes[1], entrada: new Date(hoy.getTime() - 86400000), salida: new Date(hoy.getTime() + 86400000 * 2), habId: 6, personas: 2, total: 1350000, estado: 'CONFIRMADA' },
    { cliente: clientes[2], entrada: new Date(hoy.getTime() + 86400000 * 3), salida: new Date(hoy.getTime() + 86400000 * 5), habId: 5, personas: 3, total: 960000, estado: 'CONFIRMADA' },
    { cliente: clientes[0], entrada: new Date('2026-06-10'), salida: new Date('2026-06-13'), habId: 4, personas: 2, total: 540000, estado: 'FINALIZADA' },
    { cliente: clientes[1], entrada: new Date('2026-07-05'), salida: new Date('2026-07-07'), habId: 1, personas: 1, total: 240000, estado: 'FINALIZADA' },
  ];

  for (const r of data) {
    await prisma.reservas_hotel.create({
      data: {
        usuario_id: r.cliente.id,
        habitacion_id: BigInt(r.habId),
        fecha_reserva: new Date(r.entrada.getTime() - 86400000 * 7),
        fecha_entrada: r.entrada,
        fecha_salida: r.salida,
        cantidad_huespedes: r.personas,
        total: r.total,
        estado: r.estado,
      },
    });
  }
  console.log(`${data.length} reservas de hotel creadas.`);
}

async function ensureReservasRestaurante(clientes: { id: bigint }[]) {
  const existing = await prisma.reservas_restaurante.count();
  if (existing > 0) {
    console.log(`${existing} reservas de restaurante ya existen.`);
    return;
  }

  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);
  const data = [
    { cliente: clientes[0], mesaId: 3, fecha: hoyStr, hora: '19:30', personas: 4, estado: 'CONFIRMADA' },
    { cliente: clientes[1], mesaId: 5, fecha: hoyStr, hora: '20:00', personas: 6, estado: 'CONFIRMADA' },
    { cliente: clientes[2], mesaId: 2, fecha: hoyStr, hora: '12:30', personas: 2, estado: 'CONFIRMADA' },
  ];

  for (const r of data) {
    const [h, m] = r.hora.split(':').map(Number);
    const horaDate = new Date();
    horaDate.setHours(h, m, 0, 0);

    await prisma.reservas_restaurante.create({
      data: {
        usuario_id: r.cliente.id,
        mesa_id: BigInt(r.mesaId),
        fecha: new Date(r.fecha),
        hora: horaDate,
        cantidad_personas: r.personas,
        estado: r.estado,
      },
    });
  }
  console.log(`${data.length} reservas de restaurante creadas.`);
}

async function ensureReservasEvento(clientes: { id: bigint }[]) {
  const existing = await prisma.reservas_evento.count();
  if (existing > 0) {
    console.log(`${existing} reservas de evento ya existen.`);
    return;
  }

  const data = [
    { cliente: clientes[1], salonId: 2, tipoId: 3, fecha: new Date('2026-08-15'), horaInicio: '09:00', horaFin: '17:00', personas: 80, total: 1800000, estado: 'CONFIRMADA' },
    { cliente: clientes[2], salonId: 1, tipoId: 1, fecha: new Date('2026-08-22'), horaInicio: '16:00', horaFin: '23:00', personas: 50, total: 800000, estado: 'CONFIRMADA' },
  ];

  for (const r of data) {
    const [h1, m1] = r.horaInicio.split(':').map(Number);
    const [h2, m2] = r.horaFin.split(':').map(Number);
    const inicio = new Date(); inicio.setHours(h1, m1, 0, 0);
    const fin = new Date(); fin.setHours(h2, m2, 0, 0);

    await prisma.reservas_evento.create({
      data: {
        usuario_id: r.cliente.id,
        salon_id: BigInt(r.salonId),
        tipo_evento_id: BigInt(r.tipoId),
        fecha: r.fecha,
        hora_inicio: inicio,
        hora_fin: fin,
        cantidad_personas: r.personas,
        anticipo: r.total * 0.3,
        estado: r.estado,
      },
    });
  }
  console.log(`${data.length} reservas de evento creadas.`);
}

async function ensureFacturas(clientes: { id: bigint }[]) {
  const existing = await prisma.facturas.count();
  if (existing > 0) {
    console.log(`${existing} facturas ya existen.`);
    return;
  }

  const data = [
    { cliente: clientes[0], fecha: new Date('2026-07-20'), subtotal: 450000, total: 495000, estado: 'PAGADA' },
    { cliente: clientes[0], fecha: new Date('2026-07-15'), subtotal: 1200000, total: 1320000, estado: 'PAGADA' },
    { cliente: clientes[1], fecha: new Date('2026-07-22'), subtotal: 850000, total: 935000, estado: 'PAGADA' },
    { cliente: clientes[2], fecha: new Date('2026-07-25'), subtotal: 320000, total: 352000, estado: 'PENDIENTE' },
    { cliente: clientes[0], fecha: new Date('2026-06-10'), subtotal: 540000, total: 594000, estado: 'PAGADA' },
    { cliente: clientes[1], fecha: new Date('2026-07-05'), subtotal: 240000, total: 264000, estado: 'PAGADA' },
    { cliente: clientes[2], fecha: new Date('2026-07-28'), subtotal: 1800000, total: 1980000, estado: 'PAGADA' },
    { cliente: clientes[1], fecha: new Date(), subtotal: 3500000, total: 3850000, estado: 'PENDIENTE' },
  ];

  for (const f of data) {
    await prisma.facturas.create({
      data: {
        usuario_id: f.cliente.id,
        fecha_factura: f.fecha,
        subtotal: f.subtotal,
        impuestos: f.subtotal * 0.1,
        total: f.total,
        estado: f.estado,
      },
    });
  }
  console.log(`${data.length} facturas creadas.`);
}

async function main() {
  console.log('=== Seed Datos de Negocio ===\n');

  const role = await prisma.roles.findFirst({ where: { nombre: 'Cliente' } });
  if (!role) {
    console.log('Rol Cliente no encontrado.');
    return;
  }
  const clientes = await prisma.usuarios.findMany({
    where: { rol_id: role.id },
    take: 10,
  });
  if (clientes.length === 0) {
    console.log('No hay clientes registrados.');
    return;
  }

  await ensureReservasHotel(clientes);
  await ensureReservasRestaurante(clientes);
  await ensureReservasEvento(clientes);
  await ensureFacturas(clientes);

  console.log('\n=== Seed de negocio completado ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
