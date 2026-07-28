import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asogema.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';
const ROLE_NAMES = ['Administrador', 'Admin'];

async function main() {
  const role = await prisma.roles.findFirst({
    where: { nombre: { in: ROLE_NAMES }, estado: true },
  });

  if (!role) {
    console.log('No se encontró un rol de Administrador en la BD. Créalo manualmente y vuelve a ejecutar el seed.');
    return;
  }

  const existing = await prisma.usuarios.findUnique({
    where: { correo: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(`El admin ${ADMIN_EMAIL} ya existe.`);
    return;
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.usuarios.create({
    data: {
      rol_id: role.id,
      tipo_documento_id: 1,
      nombre: 'Administrador',
      apellido: 'Sistema',
      numero_documento: '0000000000',
      correo: ADMIN_EMAIL,
      password_hash,
      telefono: '0000000000',
    },
  });

  console.log(`Admin creado: ${ADMIN_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
