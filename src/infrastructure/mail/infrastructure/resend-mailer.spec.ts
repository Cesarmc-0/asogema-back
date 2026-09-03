jest.mock('resend');
import { Resend } from 'resend';
import { ResendMailer } from './resend-mailer';

const send = jest.fn();

(Resend as unknown as jest.Mock).mockImplementation(() => ({
  emails: { send },
}));

describe('ResendMailer', () => {
  let mailer: ResendMailer;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM = 'Asogema <no-reply@asogema.com>';
    send.mockResolvedValue({ data: { id: 'mail-1' }, error: null });
    mailer = new ResendMailer();
  });

  it('envía correo de bienvenida con el template renderizado', async () => {
    await mailer.sendWelcomeVerification({
      nombre: 'Juan Pérez',
      correo: 'juan@test.com',
      codigo: '123456',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Asogema <no-reply@asogema.com>',
        to: 'juan@test.com',
        subject: expect.stringContaining('Bienvenido'),
        html: expect.stringContaining('Juan Pérez'),
      }),
    );
    const html = send.mock.calls[0][0].html;
    expect(html).toContain('123456');
    expect(html).not.toContain('{{codigo}}');
  });

  it('envía confirmación de reserva de salón', async () => {
    await mailer.sendBookingConfirmation('event-booking', {
      nombre: 'Juan Pérez',
      correo: 'juan@test.com',
      reserva_id: 7n,
      servicio: 'Salón Esmeralda',
      detalle: 'Boda',
      fecha: '15/08/2026',
      personas: 80,
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'juan@test.com',
        subject: expect.stringContaining('salón'),
      }),
    );
  });

  it('envía correo de recuperación de contraseña con el template renderizado', async () => {
    await mailer.sendPasswordRecovery({
      nombre: 'Juan Pérez',
      correo: 'juan@test.com',
      codigo: '654321',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'juan@test.com',
        from: 'Asogema <no-reply@asogema.com>',
        subject: expect.stringContaining('Recuperación de contraseña'),
      }),
    );
    const html = send.mock.calls[0][0].html;
    expect(html).toContain('654321');
    expect(html).toContain('Juan Pérez');
    expect(html).not.toContain('{{codigo}}');
  });

  it('lanza un error cuando Resend devuelve un error en el envío', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'Too many requests' },
    });

    await expect(
      mailer.sendWelcomeVerification({
        nombre: 'Juan Pérez',
        correo: 'juan@test.com',
        codigo: '123456',
      }),
    ).rejects.toThrow('rate_limit_exceeded');
  });
});
