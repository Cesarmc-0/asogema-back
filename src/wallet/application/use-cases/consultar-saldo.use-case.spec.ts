import { ConsultarSaldoUseCase } from './consultar-saldo.use-case';

const mockPrisma = {
  saldos_usuario: {
    findUnique: jest.fn(),
  },
  saldo_recargas: {
    findMany: jest.fn(),
  },
};

describe('ConsultarSaldoUseCase', () => {
  let useCase: ConsultarSaldoUseCase;

  beforeEach(() => {
    useCase = new ConsultarSaldoUseCase(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('usuario sin saldo: devuelve 0 y sin historial', async () => {
    mockPrisma.saldos_usuario.findUnique.mockResolvedValueOnce(null);
    mockPrisma.saldo_recargas.findMany.mockResolvedValueOnce([]);

    const result = await useCase.execute(10n);

    expect(result.saldo).toBe(0);
    expect(result.recargas).toEqual([]);
  });

  it('usuario con saldo: devuelve saldo y recargas ordenadas', async () => {
    mockPrisma.saldos_usuario.findUnique.mockResolvedValueOnce({
      saldo: 150000,
    });
    mockPrisma.saldo_recargas.findMany.mockResolvedValueOnce([
      { id: 2n, monto: 100000, estado: 'CONFIRMADO' },
      { id: 1n, monto: 50000, estado: 'PENDIENTE' },
    ]);

    const result = await useCase.execute(10n);

    expect(result.saldo).toBe(150000);
    expect(result.recargas).toHaveLength(2);
    expect(mockPrisma.saldo_recargas.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuario_id: 10n },
        orderBy: { created_at: 'desc' },
      }),
    );
  });
});
