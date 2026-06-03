import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import type { RealtimePayload } from './realtime.types';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  publish(userId: string, payload: RealtimePayload): void {
    this.gateway.emitToUser(userId, 'lifeos:update', payload);
  }
}
