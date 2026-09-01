import { NotificationService } from './notification.service';

const mockQueue = {
  add: jest.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(mockQueue as any);
  });

  it('encola un correo de bienvenida con reintentos y backoff', async () => {
    mockQueue.add.mockResolvedValue({});

    await service.sendWelcomeVerification({
      nombre: 'Juan Pérez',
      correo: 'juan@test.com',
      codigo: '123456',
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'send',
      {
        type: 'welcome-verification',
        nombre: 'Juan Pérez',
        correo: 'juan@test.com',
        codigo: '123456',
      },
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }),
    );
  });

  it('encola una confirmación de reserva con su tipo', async () => {
    mockQueue.add.mockResolvedValue({});

    await service.sendBookingConfirmation('hotel-booking', {
      nombre: 'Juan Pérez',
      correo: 'juan@test.com',
      reserva_id: 5n,
      servicio: '101',
      detalle: 'Standard',
      fecha: '01/08/2026',
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({ type: 'hotel-booking', reserva_id: 5n }),
      expect.any(Object),
    );
  });

  it('encola un correo de recuperación de contraseña', async () => {
    mockQueue.add.mockResolvedValue({});

    await service.sendPasswordRecovery({
      nombre: 'Juan Pérez',
      correo: 'juan@test.com',
      codigo: '654321',
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'send',
      {
        type: 'password-recovery',
        nombre: 'Juan Pérez',
        correo: 'juan@test.com',
        codigo: '654321',
      },
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      }),
    );
  });

  it('no propaga errores de la cola al flujo de negocio', async () => {
    mockQueue.add.mockRejectedValue(new Error('Redis caído'));

    await expect(
      service.sendPurchaseReceipt({
        nombre: 'Juan Pérez',
        correo: 'juan@test.com',
        factura_id: 1n,
        referencia: 'FACT-1',
        descripcion: 'Pedido restaurante - Para llevar',
        fecha: '01/08/2026',
        total: '$ 100.000',
      }),
    ).resolves.toBeUndefined();
  });
});
