export type HabitacionInfo = {
  id: string;
  numero: string;
  piso: number;
  tipo_habitacion: string;
  precio_noche: string;
};

export type HotelBookingResponse = {
  id: string;
  habitacion: HabitacionInfo;
  fecha_entrada: string;
  fecha_salida: string;
  cantidad_huespedes: number;
  total: string;
  estado: string;
  observaciones: string | null;
};
