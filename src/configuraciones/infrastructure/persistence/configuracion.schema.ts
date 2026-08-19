import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfiguracionDocument = HydratedDocument<Configuracion>;

@Schema({ collection: 'configuraciones', timestamps: false })
export class Configuracion {
  @Prop({ type: String, required: true })
  categoria: string;

  @Prop({ type: Object })
  configuracion: Record<string, any>;

  @Prop({ type: Object })
  actualizadoPor: Record<string, any>;

  @Prop({ type: Object })
  estado: Record<string, any>;

  @Prop({ type: Object })
  fecha: Record<string, any>;
}

export const ConfiguracionSchema = SchemaFactory.createForClass(Configuracion);
