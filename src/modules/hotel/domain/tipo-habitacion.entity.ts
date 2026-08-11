export class TipoHabitacionEntity {
  constructor(
    public readonly id: bigint,
    public readonly nombre: string,
    public readonly descripcion: string | null,
    public readonly capacidad: number,
    public readonly precioNoche: number,
    public readonly estado: boolean,
  ) {}
}
