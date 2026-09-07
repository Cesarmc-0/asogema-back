import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GenerarFacturaUseCase } from './use-cases/generar-factura.use-case';
import { FACTURA_QUEUE } from './factura-queue.service';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { FactusGateway } from 'src/facturacion/domain/gateways/factus-gateway.interface';

interface FacturaJobData {
  factura_id: string;
}

@Processor(FACTURA_QUEUE)
export class FacturaQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(FacturaQueueProcessor.name);

  constructor(
    private readonly generarFacturaUseCase: GenerarFacturaUseCase,
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
    private readonly factusGateway: FactusGateway,
  ) {
    super();
  }

  async process(job: Job<FacturaJobData>): Promise<void> {
    const { factura_id } = job.data;
    const facturaId = BigInt(factura_id);
    this.logger.log(`Procesando factura electronica ${factura_id}`);

    try {
      await this.generarFacturaUseCase.execute(facturaId);
      await this.enviarPdfAlCorreo(facturaId);
    } catch (error) {
      const e = error as {
        response?: { data?: unknown };
        message?: string;
      };
      this.logger.error(
        `Fallo al generar factura ${factura_id}: ${e.message}`,
        e.response?.data ? { detalle: e.response.data } : undefined,
      );
      throw error;
    }
  }

  private async enviarPdfAlCorreo(facturaId: bigint): Promise<void> {
    const factura = await this.prisma.facturas.findUnique({
      where: { id: facturaId },
      include: { usuarios: true },
    });

    if (
      !factura ||
      !factura.numero_factura ||
      !factura.usuarios?.correo
    ) {
      return;
    }

    const pdfBase64 = await this.factusGateway.descargarPdf(
      factura.numero_factura,
    );

    const fecha = factura.fecha_factura
      ? factura.fecha_factura.toLocaleDateString('es-CO')
      : new Date().toLocaleDateString('es-CO');

    await this.emailSender.sendFacturaElectronica({
      nombre: `${factura.usuarios.nombre} ${factura.usuarios.apellido}`.trim(),
      correo: factura.usuarios.correo,
      factura_id: factura.id,
      numero_factura: factura.numero_factura,
      fecha,
      total: this.formatCop(factura.total),
      pdf_base64: pdfBase64,
    });
  }

  private formatCop(value: unknown): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }
}
