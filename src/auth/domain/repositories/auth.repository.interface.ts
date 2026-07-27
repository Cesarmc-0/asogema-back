import { usuarios } from '@prisma/client';

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

export abstract class AuthRepository {
  abstract findByEmail(correo: string): Promise<usuarios | null>;
  abstract create(data: CreateUsuarioInput): Promise<usuarios>;
}
