export interface ConfiguracionEntity {
  id: string;
  categoria: string;
  configuracion?: Record<string, unknown>;
  actualizadoPor?: Record<string, unknown>;
  estado?: Record<string, unknown>;
  fecha?: Record<string, unknown>;
}
