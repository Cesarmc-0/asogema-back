import { ConfiguracionEntity } from '../entities/configuracion.entity';

export const CONFIGURACION_REPOSITORY = Symbol('CONFIGURACION_REPOSITORY');

export interface IConfiguracionRepository {
  findAll(): Promise<ConfiguracionEntity[]>;
  findByCategoria(categoria: string): Promise<ConfiguracionEntity | null>;
}
