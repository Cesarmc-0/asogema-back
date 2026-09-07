import type { UsuarioWithRoles } from 'src/auth/domain/repositories/auth.repository.interface';

export interface UserProfileResponse {
  id: bigint;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  direccion: string | null;
  fecha_nacimiento: Date | null;
  correo_verificado: boolean;
  rol_id: number;
  rol_nombre: string;
}

/**
 * Mapea un usuario Prisma a la respuesta pública de perfil.
 * Nunca expone `password_hash` ni campos internos.
 */
export function toUserProfileResponse(
  user: UsuarioWithRoles,
): UserProfileResponse {
  return {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    correo: user.correo,
    telefono: user.telefono,
    direccion: user.direccion ?? null,
    fecha_nacimiento: user.fecha_nacimiento ?? null,
    correo_verificado: user.correo_verificado,
    rol_id: Number(user.rol_id),
    rol_nombre: user.roles.nombre,
  };
}
