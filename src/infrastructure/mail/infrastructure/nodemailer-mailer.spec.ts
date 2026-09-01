jest.mock('nodemailer');
import { createTransport } from 'nodemailer';
import { NodemailerMailer } from './nodemailer-mailer';

const sendMail = jest.fn();

(createTransport as jest.Mock).mockReturnValue({
  sendMail,
});

describe('NodemailerMailer', () => {
  let mailer: NodemailerMailer;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MAIL_HOST = 'smtp.test.com';
    process.env.MAIL_PORT = '587';
    process.env.MAIL_USER = 'user@test.com';
    process.env.MAIL_PASS = 'pass';
    process.env.MAIL_FROM = 'Asogema <no-reply@asogema.com>';
    sendMail.mockResolvedValue({ messageId: 'm1' });
    mailer = new NodemailerMailer();
  });

  it('envía correo de bienvenida con el template renderizado', async () => {
    await mailer.sendWelcomeVerification({
      nombre: 'Juan Pérez',
      correo: 'juan@test.com',
      codigo: '123456',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'juan@test.com',
        from: 'Asogema <no-reply@asogema.com>',
        subject: expect.stringContaining('Bienvenido'),
        html: expect.stringContaining('Juan Pérez'),
      }),
    );
    const html = (sendMail.mock.calls[0][0] as { html: string }).html;
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

    expect(sendMail).toHaveBeenCalledWith(
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

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'juan@test.com',
        from: 'Asogema <no-reply@asogema.com>',
        subject: expect.stringContaining('Recuperación de contraseña'),
      }),
    );
    const html = (sendMail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('654321');
    expect(html).toContain('Juan Pérez');
    expect(html).not.toContain('{{codigo}}');
  });
});
