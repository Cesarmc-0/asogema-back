import { usuarios, Prisma } from '@prisma/client';

export type UsuarioConRol = Prisma.usuariosGetPayload<{
  include: { roles: true };
}>;

export type UsuarioWithRoles = UsuarioConRol;

export interface CreateUsuarioInput {
  correo: string;
  nombre: string;
  apellido: string;
  numero_documento: string;
  tipo_documento_id: number;
  telefono: string;
  password_hash: string;
  rol_id: number;
}

export interface UpdateProfileInput {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: Date;
}

export abstract class AuthRepository {
  abstract findByEmail(correo: string): Promise<UsuarioWithRoles | null>;
  abstract create(data: CreateUsuarioInput): Promise<usuarios>;
  abstract findById(id: bigint): Promise<UsuarioConRol | null>;
  abstract update(id: bigint, data: UpdateProfileInput): Promise<UsuarioConRol>;
}
