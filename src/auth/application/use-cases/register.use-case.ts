import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { RegisterDto } from '../../presentation/dto/register.dto';

@Injectable()
export class RegisterUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(dto: RegisterDto) {
    const existing = await this.authRepository.findByEmail(dto.correo);
    if (existing)
      throw new ConflictException('El correo ya se encuentra registrado');

    const password_hash = await bcrypt.hash(dto.password, 10);

    return this.authRepository.create({
      correo: dto.correo,
      nombre: dto.nombre,
      apellido: dto.apellido,
      numero_documento: dto.numero_documento,
      tipo_documento_id: Number(dto.tipo_documento_id),
      telefono: dto.telefono,
      password_hash,
      rol_id: 5,
    });
  }
}
