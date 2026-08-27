import { BadRequestException } from '@nestjs/common';
import { CrearRecargaUseCase } from './crear-recarga.use-case';

const mockCreatePayment = {
  execute: jest.fn().mockResolvedValue({
    factura_id: 100n,
    checkout_url: 'https://checkout.wompi.co/l/xyz',
    total: 50000,
  }),
};

describe('CrearRecargaUseCase', () => {
  let useCase: CrearRecargaUseCase;

  beforeEach(() => {
    useCase = new CrearRecargaUseCase(mockCreatePayment as never);
    jest.clearAllMocks();
  });

  it('recarga válida: delega en create-payment con tipo RECARGA', async () => {
    const result = await useCase.execute(10n, {
      monto: 50000,
      metodo_pago: 'TARJETA',
      tipo_tarjeta: 'DEBITO',
    });

    expect(result.total).toBe(50000);
    expect(mockCreatePayment.execute).toHaveBeenCalledWith(10n, {
      tipo_reserva: 'RECARGA',
      metodo_pago: 'TARJETA',
      tipo_tarjeta: 'DEBITO',
      monto: 50000,
    });
  });

  it('redondea el monto a pesos enteros', async () => {
    await useCase.execute(10n, {
      monto: 50000.6,
      metodo_pago: 'NEQUI',
    });

    expect(mockCreatePayment.execute).toHaveBeenCalledWith(
      10n,
      expect.objectContaining({ monto: 50001 }),
    );
  });

  it('monto menor al mínimo: lanza BadRequestException', async () => {
    await expect(
      useCase.execute(10n, { monto: 9999, metodo_pago: 'TARJETA' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('monto mayor al máximo: lanza BadRequestException', async () => {
    await expect(
      useCase.execute(10n, {
        monto: 2000001,
        metodo_pago: 'TARJETA',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
