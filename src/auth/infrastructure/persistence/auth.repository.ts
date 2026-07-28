import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  AuthRepository,
  CreateUsuarioInput,
} from 'src/auth/domain/repositories/auth.repository.interface';
import { usuarios } from '@prisma/client';

@Injectable()
export class AuthRepositoryImpl implements AuthRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(correo: string): Promise<usuarios | null> {
    return this.prisma.usuarios.findUnique({ where: { correo } });
  }

  async create(data: CreateUsuarioInput): Promise<usuarios> {
    return this.prisma.usuarios.create({ data });
  }
}
