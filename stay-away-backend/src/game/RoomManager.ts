import { GameState, Player } from '../types/game';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export class RoomManager {
  private rooms: Map<string, GameState> = new Map();

  public getRoom(roomId: string): GameState | undefined {
    return this.rooms.get(roomId);
  }

  public createRoom(hostName: string, avatarUrl?: string): { roomId: string; hostId: string } {
    let roomId = '';
    let attempts = 0;
    const maxAttempts = 100;

    do {
      roomId = randomBytes(3).toString('hex').toUpperCase();
      attempts++;
    } while (this.rooms.has(roomId) && attempts < maxAttempts);

    if (this.rooms.has(roomId)) {
      throw new Error('Не удалось сгенерировать уникальный ID комнаты');
    }

    const hostId = uuidv4();

    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      avatarUrl,
      isBot: false,
      isHost: true,
      hand: [],
      role: 'HUMAN',
      isAlive: true,
      isInQuarantine: false,
      isOnline: true
    };

    const newState: GameState = {
      roomId,
      phase: 'LOBBY',
      players: [hostPlayer],
      currentTurnIndex: 0,
      direction: 1,
      deck: [],
      discardPile: [],
      barredDoors: [],
      log: [`Комната ${roomId} создана. Хост: ${hostName}`],
      lastActivityTimestamp: Date.now(),
      botDelayMs: 3000
    };

    this.rooms.set(roomId, newState);
    return { roomId, hostId };
  }

  public deleteRoom(roomId: string, clearBotTimerFn?: (roomId: string) => void): boolean {
    if (clearBotTimerFn) {
      clearBotTimerFn(roomId);
    }
    return this.rooms.delete(roomId);
  }

  public touchRoom(room: GameState): void {
    room.lastActivityTimestamp = Date.now();
  }

  public cleanupStaleRooms(maxIdleMs: number = 60 * 60 * 1000, clearBotTimerFn?: (roomId: string) => void): void {
    const now = Date.now();
    for (const [roomId, room] of Array.from(this.rooms.entries())) {
      const idleTime = now - (room.lastActivityTimestamp || 0);
      const hasActiveHuman = room.players.some(p => !p.isBot && p.isOnline && p.isAlive);

      if (idleTime > maxIdleMs || (!hasActiveHuman && idleTime > 30 * 60 * 1000)) {
        this.deleteRoom(roomId, clearBotTimerFn);
      }
    }
  }

  public setBotDelay(roomId: string, requesterId: string, delayMs: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    this.touchRoom(room);

    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return false;

    room.botDelayMs = delayMs;
    const delaySec = (delayMs / 1000).toFixed(1);
    room.log.push(`⚙️ Хост установил скорость ходов ботов: ${delaySec} сек.`);
    return true;
  }

  public canControlPlayer(room: GameState, requesterId: string, targetPlayerId: string): boolean {
    if (requesterId === targetPlayerId) return true;
    const requester = room.players.find(p => p.id === requesterId);
    const target = room.players.find(p => p.id === targetPlayerId);
    return Boolean(requester?.isHost && target?.isBot);
  }
}
