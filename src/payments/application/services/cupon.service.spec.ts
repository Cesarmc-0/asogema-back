import { BadRequestException } from '@nestjs/common';
import { CuponService } from './cupon.service';

const cuponValido = {
  codigo: 'ASOGEMA10',
  porcentaje: 10,
  activo: true,
  usos_max: 100,
  usos_actuales: 1,
  vigencia_hasta: new Date('2099-01-01'),
};

const mockPrisma = {
  codigos_descuento: {
    findUnique: jest.fn(),
  },
};

describe('CuponService', () => {
  let service: CuponService;

  beforeEach(() => {
    service = new CuponService(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('cupón válido: devuelve el porcentaje', async () => {
    mockPrisma.codigos_descuento.findUnique.mockResolvedValueOnce(cuponValido);

    await expect(service.obtenerPorcentaje('ASOGEMA10')).resolves.toBe(10);
  });

  it('cupón inexistente: lanza BadRequestException', async () => {
    mockPrisma.codigos_descuento.findUnique.mockResolvedValueOnce(null);

    await expect(service.obtenerPorcentaje('NOEXISTE')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cupón inactivo: lanza BadRequestException', async () => {
    mockPrisma.codigos_descuento.findUnique.mockResolvedValueOnce({
      ...cuponValido,
      activo: false,
    });

    await expect(service.obtenerPorcentaje('ASOGEMA10')).rejects.toThrow(
      'no está activo',
    );
  });

  it('cupón vencido: lanza BadRequestException', async () => {
    mockPrisma.codigos_descuento.findUnique.mockResolvedValueOnce({
      ...cuponValido,
      vigencia_hasta: new Date('2020-01-01'),
    });

    await expect(service.obtenerPorcentaje('ASOGEMA10')).rejects.toThrow(
      'vencido',
    );
  });

  it('cupón con usos agotados: lanza BadRequestException', async () => {
    mockPrisma.codigos_descuento.findUnique.mockResolvedValueOnce({
      ...cuponValido,
      usos_max: 1,
      usos_actuales: 1,
    });

    await expect(service.obtenerPorcentaje('ASOGEMA10')).rejects.toThrow(
      'agotó sus usos',
    );
  });
});
