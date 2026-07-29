/**
 * Unit-тесты для CardResolver.
 * Покрываем BUG-002 (проверка соседства для Огнемёта/Анализа) и валидацию карт.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import type { Card } from '../types/game';

// ============================================================
// Хелперы
// ============================================================

function mockCard(cardId: string, id?: string): Card {
  return {
    id: id || `card-${cardId}-${Math.random().toString(36).slice(2, 7)}`,
    cardId: cardId as any,
    name: cardId,
    type: 'STAY_AWAY',
    minPlayers: 4,
    description: '',
  };
}

function setupGame(engine: GameEngine, count: number = 6) {
  const { roomId, hostId } = engine.createRoom('Хост');
  const playerIds = [hostId];
  for (let i = 1; i < count; i++) {
    const p = engine.joinRoom(roomId, `Игрок-${i}`);
    if (p) playerIds.push(p.id);
  }
  engine.startGame(roomId);
  return { roomId, playerIds };
}

// ============================================================
// BUG-002: Огнемёт, Анализ, Подозрение — только на соседа
// ============================================================

describe('CardResolver — BUG-002: проверка соседства', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('Огнемёт на НЕ-соседа — ошибка', () => {
    const { roomId } = setupGame(engine, 6);
    const room = engine.getRoom(roomId)!;
    const currentPlayer = room.players[room.currentTurnIndex];

    // Находим игрока, который НЕ является соседом (через 2+ позиции)
    const N = room.players.length;
    const currentIdx = room.currentTurnIndex;
    const farIdx = (currentIdx + 3) % N; // Через 3 позиции — точно не сосед
    const farPlayer = room.players[farIdx];

    currentPlayer.hand = [
      mockCard('FLAMETHROWER', 'flame-test'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('ANALYSIS', 'an-1'),
      mockCard('AXE', 'axe-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    const res = engine.playCard(roomId, currentPlayer.id, currentPlayer.id, 'flame-test', farPlayer.id);
    expect(res.success).toBe(false);
    expect(res.error).toContain('соседа');
  });

  it('Анализ на НЕ-соседа — ошибка', () => {
    const { roomId } = setupGame(engine, 6);
    const room = engine.getRoom(roomId)!;
    const currentPlayer = room.players[room.currentTurnIndex];

    const N = room.players.length;
    const currentIdx = room.currentTurnIndex;
    const farIdx = (currentIdx + 3) % N;
    const farPlayer = room.players[farIdx];

    currentPlayer.hand = [
      mockCard('ANALYSIS', 'an-test'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('FLAMETHROWER', 'flame-1'),
      mockCard('AXE', 'axe-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    const res = engine.playCard(roomId, currentPlayer.id, currentPlayer.id, 'an-test', farPlayer.id);
    expect(res.success).toBe(false);
    expect(res.error).toContain('соседа');
  });

  it('Подозрение на НЕ-соседа — ошибка', () => {
    const { roomId } = setupGame(engine, 6);
    const room = engine.getRoom(roomId)!;
    const currentPlayer = room.players[room.currentTurnIndex];

    const N = room.players.length;
    const currentIdx = room.currentTurnIndex;
    const farIdx = (currentIdx + 3) % N;
    const farPlayer = room.players[farIdx];

    currentPlayer.hand = [
      mockCard('SUSPICION', 'susp-test'),
      mockCard('ANALYSIS', 'an-1'),
      mockCard('FLAMETHROWER', 'flame-1'),
      mockCard('AXE', 'axe-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    const res = engine.playCard(roomId, currentPlayer.id, currentPlayer.id, 'susp-test', farPlayer.id);
    expect(res.success).toBe(false);
    expect(res.error).toContain('соседа');
  });

  it('Огнемёт на соседа СПРАВА — работает', () => {
    const { roomId } = setupGame(engine, 6);
    const room = engine.getRoom(roomId)!;
    const currentPlayer = room.players[room.currentTurnIndex];

    const N = room.players.length;
    const currentIdx = room.currentTurnIndex;
    const rightIdx = (currentIdx + 1) % N;
    const rightNeighbor = room.players[rightIdx];

    currentPlayer.hand = [
      mockCard('FLAMETHROWER', 'flame-right'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('ANALYSIS', 'an-1'),
      mockCard('AXE', 'axe-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    const res = engine.playCard(roomId, currentPlayer.id, currentPlayer.id, 'flame-right', rightNeighbor.id);
    // Успех (или RESPOND если у жертвы есть защита)
    expect(res.success).toBe(true);
  });

  it('Огнемёт на соседа СЛЕВА — работает', () => {
    const { roomId } = setupGame(engine, 6);
    const room = engine.getRoom(roomId)!;
    const currentPlayer = room.players[room.currentTurnIndex];

    const N = room.players.length;
    const currentIdx = room.currentTurnIndex;
    const leftIdx = (currentIdx - 1 + N) % N;
    const leftNeighbor = room.players[leftIdx];

    currentPlayer.hand = [
      mockCard('FLAMETHROWER', 'flame-left'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('ANALYSIS', 'an-1'),
      mockCard('AXE', 'axe-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    const res = engine.playCard(roomId, currentPlayer.id, currentPlayer.id, 'flame-left', leftNeighbor.id);
    expect(res.success).toBe(true);
  });
});

describe('CardResolver — обмен картами (trade)', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('человек НЕ может предложить INFECTED в обмен', () => {
    const { roomId } = setupGame(engine, 4);
    const room = engine.getRoom(roomId)!;
    const currentPlayer = room.players[room.currentTurnIndex];

    // Подготавливаем фазу TRADE
    currentPlayer.role = 'HUMAN';
    currentPlayer.hand = [
      mockCard('INFECTED', 'inf-trade'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('ANALYSIS', 'an-1'),
      mockCard('AXE', 'axe-1'),
    ];

    // Определяем следующего игрока
    const N = room.players.length;
    let nextIdx = room.currentTurnIndex;
    do {
      nextIdx = (nextIdx + room.direction + N) % N;
    } while (!room.players[nextIdx].isAlive);

    room.phase = 'TRADE';
    room.pendingTrade = {
      fromPlayerId: currentPlayer.id,
      toPlayerId: room.players[nextIdx].id,
    };

    const res = engine.offerTrade(roomId, currentPlayer.id, currentPlayer.id, 'inf-trade');
    expect(res.success).toBe(false);
  });
});
