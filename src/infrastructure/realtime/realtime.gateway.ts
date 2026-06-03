import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { RealtimePayload } from './realtime.types';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });
      const userId = payload.sub;
      await client.join(this.userRoom(userId));
      client.data.userId = userId;
    } catch {
      this.logger.warn(`Rejected socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    void client.data.userId;
  }

  emitToUser(userId: string, event: string, payload: RealtimePayload): void {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
