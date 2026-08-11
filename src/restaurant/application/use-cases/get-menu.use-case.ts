import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import type { CategoriaConProductos } from 'src/restaurant/domain/repositories/restaurant-repository.interface';

@Injectable()
export class GetMenuUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<CategoriaConProductos[]> {
    return await this.prisma.categorias_menu.findMany({
      where: { estado: true },
      include: {
        productos_menu: {
          where: { estado: true },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }
}
