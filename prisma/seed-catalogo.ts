import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureTiposHabitacion() {
  const n = await prisma.tipos_habitacion.count();
  if (n > 0) { console.log('tipos_habitacion:', n, 'ya existen'); return; }
  await prisma.tipos_habitacion.createMany({ data: [
    { id: 1, nombre: 'Estandar', capacidad: 2, precio_noche: 120000, imagen_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=520&fit=crop' },
    { id: 2, nombre: 'Doble', capacidad: 2, precio_noche: 150000, imagen_url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=520&fit=crop' },
    { id: 3, nombre: 'Familiar', capacidad: 4, precio_noche: 240000, imagen_url: 'https://images.unsplash.com/photo-1590490360182-c33d955e8d3e?w=800&h=520&fit=crop' },
  ]});
  console.log('tipos_habitacion: 3 creados');
}

async function ensureHabitaciones() {
  const n = await prisma.habitaciones.count();
  if (n > 0) { console.log('habitaciones:', n, 'ya existen'); return; }
  await prisma.habitaciones.createMany({ data: [
    { id: 1, tipo_habitacion_id: 1, numero: '101', piso: 1 },
    { id: 2, tipo_habitacion_id: 1, numero: '102', piso: 1 },
    { id: 3, tipo_habitacion_id: 2, numero: '201', piso: 2 },
    { id: 4, tipo_habitacion_id: 2, numero: '202', piso: 2 },
    { id: 5, tipo_habitacion_id: 3, numero: '301', piso: 3 },
    { id: 6, tipo_habitacion_id: 3, numero: '302', piso: 3 },
  ]});
  console.log('habitaciones: 6 creadas');
}

async function ensureMesas() {
  const n = await prisma.mesas.count();
  if (n > 0) { console.log('mesas:', n, 'ya existen'); return; }
  await prisma.mesas.createMany({ data: [
    { id: 1, numero: 'M1', capacidad: 2, ubicacion: 'Terraza' },
    { id: 2, numero: 'M2', capacidad: 4, ubicacion: 'Interior' },
    { id: 3, numero: 'M3', capacidad: 6, ubicacion: 'Interior' },
    { id: 4, numero: 'M4', capacidad: 4, ubicacion: 'Terraza' },
    { id: 5, numero: 'M5', capacidad: 8, ubicacion: 'Salon privado' },
    { id: 6, numero: 'M6', capacidad: 2, ubicacion: 'Barra' },
  ]});
  console.log('mesas: 6 creadas');
}

async function ensureSalones() {
  const n = await prisma.salones.count();
  if (n > 0) { console.log('salones:', n, 'ya existen'); return; }
  await prisma.salones.createMany({ data: [
    { id: 1, nombre: 'Salon Principal', capacidad: 100, precio_base: 2000000, ubicacion: 'Piso 1', imagen_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=520&fit=crop' },
    { id: 2, nombre: 'Salon VIP', capacidad: 50, precio_base: 1200000, ubicacion: 'Piso 2', imagen_url: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&h=520&fit=crop' },
  ]});
  console.log('salones: 2 creados');
}

async function ensureTiposEvento() {
  const n = await prisma.tipos_evento.count();
  if (n > 0) { console.log('tipos_evento:', n, 'ya existen'); return; }
  await prisma.tipos_evento.createMany({ data: [
    { id: 1, nombre: 'Conferencia', descripcion: 'Eventos académicos y corporativos' },
    { id: 2, nombre: 'Fiesta', descripcion: 'Festividades y celebraciones' },
    { id: 3, nombre: 'Matrimonio', descripcion: 'Ceremonias y recepciones de bodas' },
  ]});
  console.log('tipos_evento: 3 creados');
}

async function ensureServiciosEvento() {
  const n = await prisma.servicios_evento.count();
  if (n > 0) { console.log('servicios_evento:', n, 'ya existen'); return; }
  await prisma.servicios_evento.createMany({ data: [
    { nombre: 'Catering basico', precio: 35000 },
    { nombre: 'Catering premium', precio: 65000 },
    { nombre: 'Sonido y iluminacion', precio: 500000 },
    { nombre: 'Decoracion', precio: 800000 },
    { nombre: 'Cocteleria', precio: 45000 },
  ]});
  console.log('servicios_evento: 5 creados');
}

async function ensureCategoriasMenu() {
  const n = await prisma.categorias_menu.count();
  if (n > 0) { console.log('categorias_menu:', n, 'ya existen'); return; }
  await prisma.categorias_menu.createMany({ data: [
    { id: 1, nombre: 'Entradas' },
    { id: 2, nombre: 'Platos fuertes' },
    { id: 3, nombre: 'Bebidas' },
    { id: 4, nombre: 'Postres' },
  ]});
  console.log('categorias_menu: 4 creadas');
}

async function ensureProductosMenu() {
  const n = await prisma.productos_menu.count();
  if (n > 0) { console.log('productos_menu:', n, 'ya existen'); return; }
  await prisma.productos_menu.createMany({ data: [
    { categoria_id: 1, nombre: 'Empanadas', precio: 15000, stock: 50, imagen_url: 'https://images.unsplash.com/photo-1604467707321-70d009801bf4?w=600&h=450&fit=crop' },
    { categoria_id: 1, nombre: 'Bruschetta', precio: 22000, stock: 30, imagen_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&h=450&fit=crop' },
    { categoria_id: 2, nombre: 'Bandeja Paisa', precio: 45000, stock: 20, imagen_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=450&fit=crop' },
    { categoria_id: 2, nombre: 'Lomo al trapo', precio: 65000, stock: 15, imagen_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=450&fit=crop' },
    { categoria_id: 3, nombre: 'Gaseosa', precio: 8000, stock: 100, imagen_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=450&fit=crop' },
    { categoria_id: 3, nombre: 'Cerveza artesanal', precio: 18000, stock: 50, imagen_url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=450&fit=crop' },
    { categoria_id: 4, nombre: 'Tres leches', precio: 20000, stock: 25, imagen_url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&h=450&fit=crop' },
  ]});
  console.log('productos_menu: 7 creados');
}

async function main() {
  console.log('=== Seed Catálogo Base ===');
  await ensureTiposHabitacion();
  await ensureHabitaciones();
  await ensureMesas();
  await ensureSalones();
  await ensureTiposEvento();
  await ensureServiciosEvento();
  await ensureCategoriasMenu();
  await ensureProductosMenu();
  console.log('=== Catálogo listo ===');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
