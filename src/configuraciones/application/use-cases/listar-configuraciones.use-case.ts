import { Inject, Injectable } from '@nestjs/common';
import { CONFIGURACION_REPOSITORY } from '../../domain/repositories/configuracion.repository.interface';
import type { IConfiguracionRepository } from '../../domain/repositories/configuracion.repository.interface';

@Injectable()
export class ListarConfiguracionesUseCase {
  constructor(
    @Inject(CONFIGURACION_REPOSITORY)
    private readonly repo: IConfiguracionRepository,
  ) {}

  execute() {
    return this.repo.findAll();
  }

  findByCategoria(categoria: string) {
    return this.repo.findByCategoria(categoria);
  }
}
