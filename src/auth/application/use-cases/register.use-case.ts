import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { RegisterDto } from '../../presentation/dto/register.dto';
import { EmailVerificationService } from '../services/email-verification.service';
import { Errors } from 'src/common/errors';

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private authRepository: AuthRepository,
    private prisma: PrismaService,
    private emailVerification: EmailVerificationService,
    private emailSender: EmailSender,
  ) {}

  async execute(dto: RegisterDto) {
    const existing = await this.authRepository.findByEmail(dto.correo);
    if (existing) throw Errors.auth.emailAlreadyExists();

    const existingDoc = await this.authRepository.findByDocument(
      dto.numero_documento,
    );
    if (existingDoc) throw Errors.auth.documentAlreadyExists();

    const role = await this.prisma.roles.findFirst({
      where: { nombre: 'Cliente', estado: true },
    });
    if (!role)
      throw new InternalServerErrorException('Rol de cliente no encontrado');

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.authRepository.create({
      correo: dto.correo,
      nombre: dto.nombre,
      apellido: dto.apellido,
      numero_documento: dto.numero_documento,
      tipo_documento_id: Number(dto.tipo_documento_id),
      telefono: dto.telefono,
      password_hash,
      rol_id: Number(role.id),
    });

    await this.notifyRegistration(user);

    return user;
  }

  private async notifyRegistration(user: {
    correo: string;
    nombre: string;
    apellido: string;
  }): Promise<void> {
    try {
      const codigo = await this.emailVerification.generateCode(user.correo);
      await this.emailSender.sendWelcomeVerification({
        nombre: `${user.nombre} ${user.apellido}`.trim(),
        correo: user.correo,
        codigo,
      });
    } catch (error) {
      // El correo es un efecto secundario: el registro no debe fallar por esto.
      this.logger.error(
        `No se pudo enviar el correo de bienvenida a ${user.correo}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }
}
