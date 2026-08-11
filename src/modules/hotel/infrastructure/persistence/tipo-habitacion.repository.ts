import { Injectable } from '@nestjs/common';
import { TipoHabitacionEntity } from '../../domain/tipo-habitacion.entity';
import { TipoHabitacionRepository } from '../../domain/tipo-habitacion.repository.interface';
import { TipoHabitacionMapper } from '../mappers/tipo-habitacion.mapper';

import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class TipoHabitacionRepositoryImpl implements TipoHabitacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TipoHabitacionEntity[]> {
    const rows = await this.prisma.tipos_habitacion.findMany({
      where: { estado: true },
      orderBy: { capacidad: 'desc' },
    });
    return rows.map((row) => TipoHabitacionMapper.toDomain(row));
  }
}
