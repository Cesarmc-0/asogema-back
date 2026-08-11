import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { RegisterDto } from '../../presentation/dto/register.dto';

@Injectable()
export class RegisterUseCase {
  constructor(
    private authRepository: AuthRepository,
    private prisma: PrismaService,
  ) {}

  async execute(dto: RegisterDto) {
    const existing = await this.authRepository.findByEmail(dto.correo);
    if (existing)
      throw new ConflictException('El correo ya se encuentra registrado');

    const role = await this.prisma.roles.findFirst({
      where: { nombre: 'Cliente', estado: true },
    });
    if (!role)
      throw new InternalServerErrorException('Rol de cliente no encontrado');

    const password_hash = await bcrypt.hash(dto.password, 10);

    return this.authRepository.create({
      correo: dto.correo,
      nombre: dto.nombre,
      apellido: dto.apellido,
      numero_documento: dto.numero_documento,
      tipo_documento_id: Number(dto.tipo_documento_id),
      telefono: dto.telefono,
      password_hash,
      rol_id: Number(role.id),
    });
  }
}
