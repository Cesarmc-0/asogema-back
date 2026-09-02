import { OnModuleInit } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/comanda', cors: { origin: '*' } })
export class ComandaGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  onModuleInit() {
    console.log('ComandaGateway inicializado');
  }

  notificarPedidoListo(payload: { pedido_id: number; mesero_id: number }) {
    this.server.to(`mesero:${payload.mesero_id}`).emit('pedido_listo', {
      pedido_id: payload.pedido_id,
    });
  }

  /** Notifica a todos los conectados de la comanda que algo cambió. */
  notificarCambio(payload?: { pedido_id?: number }) {
    this.server.to('comanda').emit('pedidos_actualizados', payload ?? {});
  }

  @SubscribeMessage('unirse_mesero')
  async handleJoin(
    @MessageBody() data: { mesero_id: number },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`mesero:${data.mesero_id}`);
    return { ok: true };
  }

  @SubscribeMessage('unirse_comanda')
  async handleJoinComanda(@ConnectedSocket() client: Socket) {
    await client.join('comanda');
    return { ok: true };
  }
}
