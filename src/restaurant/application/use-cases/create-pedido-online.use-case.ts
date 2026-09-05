import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { RestaurantRepository } from 'src/restaurant/domain/repositories/restaurant-repository.interface';
import { ComandaGateway } from 'src/restaurant/infrastructure/gateways/comanda.gateway';
import { IVA_DEFAULT_RATE } from 'src/facturacion/domain/iva.util';

export const MESA_FEE = 5000;
export const TIPOS_PEDIDO = ['PARA_LLEVAR', 'EN_MESA'] as const;
export type TipoPedido = (typeof TIPOS_PEDIDO)[number];

interface CreatePedidoOnlineInput {
  items: { producto_id: bigint; cantidad: number }[];
  tipo: TipoPedido;
}

@Injectable()
export class CreatePedidoOnlineUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly comandaGateway: ComandaGateway,
  ) {}

  async execute(usuarioId: bigint, dto: CreatePedidoOnlineInput) {
    if (dto.items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un item');
    }

    const productos = await this.prisma.productos_menu.findMany({
      where: {
        id: { in: dto.items.map((i) => i.producto_id) },
        activo: 'activo',
      },
    });

    if (productos.length !== dto.items.length) {
      throw new BadRequestException('Uno o más productos no existen');
    }

    let subtotal = 0;
    let baseIva = 0;
    const items = dto.items.map((item) => {
      const producto = productos.find((p) => p.id === item.producto_id);
      if (!producto || producto.activo !== 'activo') {
        throw new BadRequestException(
          'Uno o más productos no están disponibles',
        );
      }
      if (item.cantidad < 1) {
        throw new BadRequestException('La cantidad debe ser mayor a cero');
      }
      if (item.cantidad > producto.stock) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})`,
        );
      }

      const linea = Math.round(Number(producto.precio) * item.cantidad);
      subtotal += linea;
      if (producto.aplica_iva !== false) baseIva += linea;

      return {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: producto.precio,
        subtotal: new Decimal(linea),
      };
    });

    const incluyeMesa = dto.tipo === 'EN_MESA';
    const cargoMesa = incluyeMesa ? MESA_FEE : 0;
    const impuestos = Math.round(baseIva * IVA_DEFAULT_RATE);
    const total = subtotal + cargoMesa + impuestos;

    const pedido = await this.restaurantRepo.createPedidoOnline({
      usuario_id: usuarioId,
      tipo: dto.tipo,
      incluye_mesa: incluyeMesa,
      subtotal: new Decimal(subtotal),
      impuestos: new Decimal(impuestos),
      descuento: new Decimal(0),
      total: new Decimal(total),
      items,
    });

    this.comandaGateway.notificarCambio({ pedido_id: Number(pedido.id) });

    return {
      pedido_id: pedido.id,
      tipo: pedido.tipo,
      incluye_mesa: pedido.incluye_mesa,
      subtotal,
      impuestos,
      cargo_mesa: cargoMesa,
      total,
      items: pedido.detalle_pedido_online.map((item) => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      })),
    };
  }
}
