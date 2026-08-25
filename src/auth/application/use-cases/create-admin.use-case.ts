import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

const ROLE_NAMES = ['Administrador', 'Admin'];
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@asogema.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

@Injectable()
export class CreateAdminService {
  private readonly logger = new Logger(CreateAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureAdmin(): Promise<void> {
    try {
      const role = await this.prisma.roles.findFirst({
        where: { nombre: { in: ROLE_NAMES }, estado: true },
      });

      if (!role) {
        this.logger.warn(
          'No se encontró rol de Administrador. Admin no creado.',
        );
        return;
      }

      const existing = await this.prisma.usuarios.findUnique({
        where: { correo: ADMIN_EMAIL },
      });

      const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const adminData = {
        rol_id: role.id,
        tipo_documento_id: 1,
        nombre: 'Administrador',
        apellido: 'Sistema',
        numero_documento: '0000000000',
        correo: ADMIN_EMAIL,
        password_hash,
        telefono: '0000000000',
        correo_verificado: true,
      };

      if (existing) {
        const needsUpdate =
          existing.rol_id !== role.id ||
          existing.nombre !== adminData.nombre ||
          existing.apellido !== adminData.apellido ||
          !existing.correo_verificado;

        if (needsUpdate) {
          await this.prisma.usuarios.update({
            where: { id: existing.id },
            data: {
              rol_id: role.id,
              nombre: adminData.nombre,
              apellido: adminData.apellido,
              password_hash,
              correo_verificado: true,
            },
          });
          this.logger.log(`Admin ${ADMIN_EMAIL} actualizado.`);
        } else {
          this.logger.log(`Admin ${ADMIN_EMAIL} ya existe y está correcto.`);
        }
        return;
      }

      await this.prisma.usuarios.create({ data: adminData });

      this.logger.log(`Admin creado: ${ADMIN_EMAIL}`);
    } catch (error) {
      this.logger.error('Error al crear admin', error);
    }
  }
}
