import { Injectable } from '@nestjs/common';
import { CuponService } from 'src/payments/application/services/cupon.service';

@Injectable()
export class ValidarCuponUseCase {
  constructor(private readonly cuponService: CuponService) {}

  async execute(codigo: string, montoBase?: number) {
    const porcentaje = await this.cuponService.obtenerPorcentaje(codigo);

    return {
      valido: true,
      porcentaje,
      descuento: montoBase ? Math.round((montoBase * porcentaje) / 100) : null,
    };
  }
}
