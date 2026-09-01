import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { attachImagenes } from 'src/infrastructure/storage/imagenes.helper';
import type { CategoriaConProductos } from 'src/restaurant/domain/repositories/restaurant-repository.interface';

@Injectable()
export class GetMenuUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<CategoriaConProductos[]> {
    const categorias = await this.prisma.categorias_menu.findMany({
      where: { estado: true, activo: true },
      include: {
        productos_menu: {
          where: { estado: true, activo: true },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    const productos = categorias.flatMap((c) => c.productos_menu);
    const conImagenes = await attachImagenes(
      this.prisma,
      'producto',
      productos,
    );
    const galleryByProduct = new Map<string, (typeof conImagenes)[number]>(
      conImagenes.map((p) => [p.id.toString(), p]),
    );

    return categorias.map((c) => ({
      ...c,
      productos_menu: c.productos_menu.map(
        (p) => galleryByProduct.get(p.id.toString()) ?? { ...p, imagenes: [] },
      ),
    }));
  }
}
