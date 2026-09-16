import { Injectable } from '@nestjs/common';

export interface ConferenceParticipant {
  socketId: string;
  roomId: string;
  memberId?: string;
  name: string;
  connectedAt: Date;
}

@Injectable()
export class ConferenceService {
  private participants = new Map<string, ConferenceParticipant>();
  private socketRooms = new Map<string, Set<string>>();

  addParticipant(p: ConferenceParticipant): ConferenceParticipant {
    this.participants.set(p.socketId, p);
    const rooms = this.socketRooms.get(p.socketId) ?? new Set<string>();
    rooms.add(p.roomId);
    this.socketRooms.set(p.socketId, rooms);
    return p;
  }

  getParticipant(socketId: string): ConferenceParticipant | undefined {
    return this.participants.get(socketId);
  }

  getParticipants(roomId: string): ConferenceParticipant[] {
    return [...this.participants.values()].filter((p) => p.roomId === roomId);
  }

  getRoomsFor(socketId: string): string[] {
    return [...(this.socketRooms.get(socketId) ?? [])];
  }

  removeParticipant(socketId: string): void {
    this.participants.delete(socketId);
    this.socketRooms.delete(socketId);
  }
}
