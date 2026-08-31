import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Configuracion, ConfiguracionDocument } from './configuracion.schema';
import { IConfiguracionRepository } from '../../domain/repositories/configuracion.repository.interface';
import { ConfiguracionEntity } from '../../domain/entities/configuracion.entity';

type LeanConfiguracionDoc = {
  _id: Types.ObjectId;
  categoria: string;
  configuracion?: Record<string, unknown>;
  actualizadoPor?: Record<string, unknown>;
  estado?: Record<string, unknown>;
  fecha?: Record<string, unknown>;
};

@Injectable()
export class ConfiguracionRepository implements IConfiguracionRepository {
  constructor(
    @InjectModel(Configuracion.name)
    private readonly model: Model<ConfiguracionDocument>,
  ) {}

  async findAll(): Promise<ConfiguracionEntity[]> {
    const docs = await this.model.find().lean<LeanConfiguracionDoc[]>().exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  async findByCategoria(
    categoria: string,
  ): Promise<ConfiguracionEntity | null> {
    const doc = await this.model
      .findOne({ categoria })
      .lean<LeanConfiguracionDoc>()
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  private toEntity(doc: LeanConfiguracionDoc): ConfiguracionEntity {
    return {
      id: doc._id.toString(),
      categoria: doc.categoria,
      configuracion: doc.configuracion,
      actualizadoPor: doc.actualizadoPor,
      estado: doc.estado,
      fecha: doc.fecha,
    };
  }
}
