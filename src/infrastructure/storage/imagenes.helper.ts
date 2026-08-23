import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { imagenes as ImagenRow } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

/** Entidades que soportan galería de imágenes (valor de la columna `entidad`). */
export const IMAGEN_ENTIDADES = ['habitacion', 'salon', 'producto'] as const;

export type ImagenEntidad = (typeof IMAGEN_ENTIDADES)[number];

const ENTITY_TABLE: Record<
  ImagenEntidad,
  'habitaciones' | 'salones' | 'productos_menu'
> = {
  habitacion: 'habitaciones',
  salon: 'salones',
  producto: 'productos_menu',
};

function tableFor(entidad: string): ImagenEntidad {
  if (!(IMAGEN_ENTIDADES as readonly string[]).includes(entidad)) {
    throw new BadRequestException(
      `entidad inválida. Valores permitidos: ${IMAGEN_ENTIDADES.join(', ')}`,
    );
  }
  return entidad as ImagenEntidad;
}

/** Verifica que la entidad exista en su tabla; lanza 404 si no. */
export async function assertImagenEntity(
  prisma: PrismaService,
  entidad: string,
  entidadId: bigint,
): Promise<ImagenEntidad> {
  const valid = tableFor(entidad);
  const table = ENTITY_TABLE[valid];
  const row = await (
    prisma as unknown as Record<
      string,
      { findUnique(args: unknown): Promise<unknown> }
    >
  )[table].findUnique({ where: { id: entidadId }, select: { id: true } });
  if (!row) {
    throw new NotFoundException(
      `No existe ${valid} con id ${entidadId.toString()}`,
    );
  }
  return valid;
}

/**
 * Sincroniza la columna legacy imagen_url (portada) de la entidad dueña.
 * Devuelve el PrismaPromise para poder incluirlo en una $transaction.
 */
export function syncImagenPrincipal(
  prisma: PrismaService,
  entidad: string,
  entidadId: bigint,
  url: string | null,
): Prisma.PrismaPromise<unknown> {
  const table = ENTITY_TABLE[tableFor(entidad)];
  return (
    prisma as unknown as Record<
      string,
      { update(args: unknown): Prisma.PrismaPromise<unknown> }
    >
  )[table].update({ where: { id: entidadId }, data: { imagen_url: url } });
}

export type { ImagenRow };

/**
 * Devuelve las imágenes de la galería "desnudadas" para no exponer la metadata
 * interna de la tabla polimórfica en respuestas públicas.
 */
export function toImagenDto(
  img: Pick<ImagenRow, 'id' | 'url' | 'es_principal' | 'orden'>,
) {
  return {
    id: img.id,
    url: img.url,
    es_principal: img.es_principal,
    orden: img.orden,
  };
}

export type ImagenItem = ReturnType<typeof toImagenDto>;

/**
 * Adjunta `imagenes: ImagenItem[]` a una lista de ítems con `id: bigint`.
 * Una sola query extra por colección (patrón estándar para relaciones
 * polimórficas, que Prisma/Postgres no pueden resolver con JOIN+FK).
 */
export async function attachImagenes<T extends { id: bigint }>(
  prisma: PrismaService,
  entidad: ImagenEntidad,
  items: T[],
): Promise<(T & { imagenes: ImagenItem[] })[]> {
  if (items.length === 0) return items.map((it) => ({ ...it, imagenes: [] }));

  const rows = await prisma.imagenes.findMany({
    where: { entidad, entidad_id: { in: items.map((it) => it.id) } },
    select: {
      id: true,
      entidad_id: true,
      url: true,
      es_principal: true,
      orden: true,
    },
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
  });

  const byItem = new Map<string, ImagenItem[]>();
  for (const row of rows) {
    const key = row.entidad_id.toString();
    const list = byItem.get(key) ?? [];
    if (!byItem.has(key)) byItem.set(key, list);
    list.push(toImagenDto(row));
  }

  return items.map((it) => ({
    ...it,
    imagenes: byItem.get(it.id.toString()) ?? [],
  }));
}
