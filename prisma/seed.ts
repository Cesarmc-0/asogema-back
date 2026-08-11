import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asogema.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

async function ensureAdmin() {
  const role = await prisma.roles.findFirst({
    where: { nombre: { in: ['Administrador', 'Admin'] }, estado: true },
  });
  if (!role) {
    console.log('Rol Administrador no encontrado. Créalo manualmente y vuelva a ejecutar.');
    return null;
  }
  const existing = await prisma.usuarios.findUnique({ where: { correo: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin ${ADMIN_EMAIL} ya existe.`);
    return role;
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.usuarios.create({
    data: {
      rol_id: role.id,
      tipo_documento_id: 1,
      nombre: 'Administrador',
      apellido: 'Sistema',
      numero_documento: '0000000000',
      correo: ADMIN_EMAIL,
      password_hash: hash,
      telefono: '0000000000',
    },
  });
  console.log(`Admin creado: ${ADMIN_EMAIL}`);
  return role;
}

async function ensureClientes() {
  const role = await prisma.roles.findFirst({ where: { nombre: 'Cliente' } });
  if (!role) {
    console.log('Rol Cliente no encontrado.');
    return [];
  }

  const clientesData = [
    { correo: 'cliente1@asogema.com', nombre: 'Carlos', apellido: 'Martínez', numDoc: '100000001', tel: '3001112233' },
    { correo: 'cliente2@asogema.com', nombre: 'María', apellido: 'López', numDoc: '100000002', tel: '3104445566' },
    { correo: 'cliente3@asogema.com', nombre: 'Ana', apellido: 'Rodríguez', numDoc: '100000003', tel: '3012223344' },
  ];

  const creados: { id: bigint; nombre: string }[] = [];
  for (const c of clientesData) {
    let user = await prisma.usuarios.findUnique({ where: { correo: c.correo } });
    if (!user) {
      const hash = await bcrypt.hash('Cliente123456', 10);
      user = await prisma.usuarios.create({
        data: {
          rol_id: role.id,
          tipo_documento_id: 1,
          nombre: c.nombre,
          apellido: c.apellido,
          numero_documento: c.numDoc,
          correo: c.correo,
          password_hash: hash,
          telefono: c.tel,
        },
      });
      console.log(`Cliente creado: ${c.correo}`);
    }
    creados.push({ id: user.id, nombre: `${user.nombre} ${user.apellido}` });
  }
  return creados;
}

async function main() {
  console.log('=== Seed Autenticación ===\n');

  const adminRole = await ensureAdmin();
  if (!adminRole) return;

  const clientes = await ensureClientes();
  if (clientes.length === 0) return;

  console.log('\n=== Seed autenticación completado ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });