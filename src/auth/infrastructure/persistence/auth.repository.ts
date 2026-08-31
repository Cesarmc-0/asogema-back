import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  AuthRepository,
  CreateUsuarioInput,
  UsuarioWithRoles,
  UpdateProfileInput,
} from 'src/auth/domain/repositories/auth.repository.interface';
import { usuarios } from '@prisma/client';

@Injectable()
export class AuthRepositoryImpl implements AuthRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(correo: string): Promise<UsuarioWithRoles | null> {
    return this.prisma.usuarios.findUnique({
      where: { correo },
      include: { roles: true },
    });
  }

  async findByDocument(
    numero_documento: string,
  ): Promise<UsuarioWithRoles | null> {
    return this.prisma.usuarios.findUnique({
      where: { numero_documento },
      include: { roles: true },
    });
  }

  async create(data: CreateUsuarioInput): Promise<usuarios> {
    return this.prisma.usuarios.create({ data });
  }

  async findById(id: bigint): Promise<UsuarioWithRoles | null> {
    return this.prisma.usuarios.findUnique({
      where: { id },
      include: { roles: true },
    });
  }

  async update(
    id: bigint,
    data: UpdateProfileInput,
  ): Promise<UsuarioWithRoles> {
    return this.prisma.usuarios.update({
      where: { id },
      data,
      include: { roles: true },
    });
  }

  async updatePassword(
    id: bigint,
    password_hash: string,
  ): Promise<UsuarioWithRoles> {
    return this.prisma.usuarios.update({
      where: { id },
      data: { password_hash },
      include: { roles: true },
    });
  }
}
