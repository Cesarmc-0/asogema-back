import { Decimal } from '@prisma/client/runtime/library';
import { PayHotelBalanceUseCase } from './pay-hotel-balance.use-case';

const mockHotelRepository = {
  findBookingByIdAndUser: jest.fn(),
};

const mockHotelPaymentRepository = {
  calcularSaldoPendiente: jest.fn(),
  findPagoSaldoPendiente: jest.fn(),
  updatePagoSaldoPendiente: jest.fn(),
  createPagoHotel: jest.fn(),
};

const mockPrisma = {};

describe('PayHotelBalanceUseCase', () => {
  let useCase: PayHotelBalanceUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new PayHotelBalanceUseCase(
      mockHotelRepository as never,
      mockHotelPaymentRepository as never,
      mockPrisma as never,
    );
  });

  it('sin pago pendiente: crea el registro de saldo', async () => {
    mockHotelRepository.findBookingByIdAndUser.mockResolvedValue({
      id: 1n,
      estado: 'CHECK_IN',
      total: new Decimal(540000),
    });
    mockHotelPaymentRepository.calcularSaldoPendiente.mockResolvedValue(540000);
    mockHotelPaymentRepository.findPagoSaldoPendiente.mockResolvedValue(null);
    mockHotelPaymentRepository.createPagoHotel.mockResolvedValue({ id: 50n });

    const result = await useCase.execute(2n, 1n);

    expect(mockHotelPaymentRepository.createPagoHotel).toHaveBeenCalledWith({
      reserva_id: 1n,
      tipo: 'SALDO',
      monto: 540000,
      metodo_pago: 'WOMPI',
    });
    expect(
      mockHotelPaymentRepository.updatePagoSaldoPendiente,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      reserva_id: 1n,
      monto_pagado: 540000,
      pago_id: 50n,
      estado: 'PENDIENTE',
    });
  });

  it('ya hay pago pendiente: actualiza en vez de duplicar', async () => {
    mockHotelRepository.findBookingByIdAndUser.mockResolvedValue({
      id: 1n,
      estado: 'CHECK_IN',
      total: new Decimal(540000),
    });
    mockHotelPaymentRepository.calcularSaldoPendiente.mockResolvedValue(540000);
    mockHotelPaymentRepository.findPagoSaldoPendiente.mockResolvedValue({
      id: 77n,
    });

    const result = await useCase.execute(2n, 1n, 'NEQUI');

    expect(
      mockHotelPaymentRepository.updatePagoSaldoPendiente,
    ).toHaveBeenCalledWith(77n, { monto: 540000, metodo_pago: 'NEQUI' });
    expect(mockHotelPaymentRepository.createPagoHotel).not.toHaveBeenCalled();
    expect(result.pago_id).toBe(77n);
    expect(result.estado).toBe('PENDIENTE');
  });
});
