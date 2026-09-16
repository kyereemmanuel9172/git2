import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConferenceService } from './conference.service';

interface JoinPayload {
  roomId: string;
  memberId?: string;
  name: string;
  token: string;
}

interface SignalPayload {
  roomId: string;
  to: string;
  signal: unknown;
}

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3001'], credentials: true } })
export class ConferenceGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly conference: ConferenceService,
    private readonly jwtService: JwtService,
  ) {}

  private verifyToken(token: string): boolean {
    try {
      this.jwtService.verify(token);
      return true;
    } catch {
      return false;
    }
  }

  @SubscribeMessage('conference:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    if (!payload.token || !this.verifyToken(payload.token)) {
      client.emit('conference:error', { message: 'Unauthorized' });
      return { ok: false, error: 'Unauthorized' };
    }

    const participant = this.conference.addParticipant({
      socketId: client.id,
      roomId: payload.roomId,
      memberId: payload.memberId,
      name: payload.name,
      connectedAt: new Date(),
    });

    void client.join(payload.roomId);
    void client.emit('conference:joined', participant);

    const peers = this.conference.getParticipants(payload.roomId);
    void client.emit('conference:participants', peers);
    void client.to(payload.roomId).emit('conference:new-participant', participant);
    return { ok: true };
  }

  @SubscribeMessage('conference:signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SignalPayload,
  ) {
    const from = this.conference.getParticipant(client.id);
    if (!from) return;
    void client.to(payload.to).emit('conference:signal', {
      from: client.id,
      fromName: from.name,
      signal: payload.signal,
    });
  }

  @SubscribeMessage('conference:leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    this.removeFromRooms(client);
  }

  @SubscribeMessage('conference:get-participants')
  handleGetParticipants(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    void client.emit('conference:participants', this.conference.getParticipants(payload.roomId));
  }

  private removeFromRooms(client: Socket) {
    for (const room of this.conference.getRoomsFor(client.id)) {
      this.conference.removeParticipant(client.id);
      void client.to(room).emit('conference:participant-left', client.id);
      void client.leave(room);
    }
  }

  handleDisconnect(client: Socket) {
    this.removeFromRooms(client);
  }
}
