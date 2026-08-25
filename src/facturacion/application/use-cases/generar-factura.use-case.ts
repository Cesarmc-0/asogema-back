import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { FactusGateway } from '../../domain/gateways/factus-gateway.interface';
import { getIvaCode, getIvaRate } from '../../domain/iva.util';

@Injectable()
export class GenerarFacturaUseCase {
  private readonly logger = new Logger(GenerarFacturaUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly factusGateway: FactusGateway,
  ) {}

  async execute(facturaId: bigint): Promise<void> {
    const factura = await this.prisma.facturas.findUnique({
      where: { id: facturaId },
      include: { usuarios: true, detalle_factura: true, pagos: true },
    });

    if (!factura) {
      this.logger.warn(`Factura ${facturaId} no encontrada`);
      return;
    }

    if (factura.cufe) {
      this.logger.log(`Factura ${facturaId} ya tiene CUFE, skip`);
      return;
    }

    const payload = this.buildPayload(factura);

    const result = await this.factusGateway.crearFactura(payload);

    await this.prisma.facturas.update({
      where: { id: facturaId },
      data: {
        numero_factura: result.number,
        cufe: result.cufe,
        factus_id: String(facturaId),
        qr_url: result.qr_url,
      },
    });

    this.logger.log(
      `Factura electronica generada: factura=${facturaId}, numero=${result.number}`,
    );
  }

  private buildPayload(factura: any) {
    const cliente = factura.usuarios;
    const items = factura.detalle_factura;

    if (items.length === 0) {
      items.push({
        descripcion: `Reserva evento - ref ${factura.id}`,
        cantidad: 1,
        precio_unitario: factura.subtotal,
      });
    }

    const pago = factura.pagos[0];

    return {
      reference_code: `FACT-${factura.id}`,
      send_email: process.env.FACTUS_SEND_EMAIL === 'true',
      observation: 'Factura generada automaticamente por Asogema',
      payment_details: [
        {
          payment_form: '1',
          payment_method_code: this.getMetodoPagoDian(pago),
          reference_code: `pago-${pago?.id ?? factura.id}`,
          amount: factura.total.toString(),
        },
      ],
      customer: {
        identification_document_code: '13',
        identification: cliente.numero_documento,
        names: `${cliente.nombre} ${cliente.apellido}`.trim(),
        address: cliente.direccion ?? '',
        email: cliente.correo,
        phone: cliente.telefono,
        legal_organization_code: '2',
        country_code: 'CO',
        municipality_code: '66001',
      },
      items: items.map((item: any) => ({
        code_reference: `ITEM-${factura.id}-${item.id}`,
        name: item.descripcion,
        quantity: String(item.cantidad),
        price: item.precio_unitario.toString(),
        unit_measure_code: '94',
        standard_code: '999',
        taxes: [
          {
            code: getIvaCode(factura.subtotal, factura.impuestos),
            rate: getIvaRate(factura.subtotal, factura.impuestos),
          },
        ],
      })),
    };
  }

  private getMetodoPagoDian(pago: any): string {
    if (pago?.tipo_tarjeta === 'CREDITO') return '48';
    if (pago?.tipo_tarjeta === 'DEBITO') return '42';
    if (pago?.metodo_pago === 'TARJETA') return '42';
    return '10';
  }
}
