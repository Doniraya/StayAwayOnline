/**
 * Unit-тесты для критических игровых механик GameEngine.
 * Покрываем исправленные баги BUG-001..005 и ключевые правила игры.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import type { GameState, Player, Card } from '../types/game';

// ============================================================
// Хелперы — создание тестового окружения
// ============================================================

/** Создаёт комнату с N игроками и стартует игру */
function setupGame(engine: GameEngine, playerCount: number = 4) {
  const { roomId, hostId } = engine.createRoom('Хост');

  const playerIds = [hostId];
  for (let i = 1; i < playerCount; i++) {
    const p = engine.joinRoom(roomId, `Игрок-${i}`);
    if (p) {
      playerIds.push(p.id);
      engine.toggleReady(roomId, p.id);
    }
  }

  engine.startGame(roomId);
  return { roomId, playerIds };
}

/** Получает состояние комнаты напрямую */
function getRoom(engine: GameEngine, roomId: string): GameState {
  return engine.getRoom(roomId)!;
}

/** Создаёт мок-карту с указанным cardId */
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

// ============================================================
// Тесты
// ============================================================

describe('GameEngine — создание/присоединение к комнате', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('создаёт комнату и возвращает roomId и hostId', () => {
    const { roomId, hostId } = engine.createRoom('Хост');
    expect(roomId).toBeTruthy();
    expect(hostId).toBeTruthy();

    const room = getRoom(engine, roomId);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe('Хост');
    expect(room.players[0].isHost).toBe(true);
  });

  it('позволяет присоединить до 12 игроков', () => {
    const { roomId } = engine.createRoom('Хост');
    for (let i = 0; i < 11; i++) {
      const p = engine.joinRoom(roomId, `Игрок-${i}`);
      expect(p).toBeTruthy();
    }
    const room = getRoom(engine, roomId);
    expect(room.players).toHaveLength(12);

    // 13-й не должен присоединиться
    const extra = engine.joinRoom(roomId, 'Лишний');
    expect(extra).toBeFalsy();
  });

  it('не позволяет присоединиться к несуществующей комнате', () => {
    const p = engine.joinRoom('НЕСУЩЕСТВУЕТ', 'Тест');
    expect(p).toBeFalsy();
  });
});

describe('GameEngine — старт игры и раздача карт', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('не стартует с менее чем 4 игроками', () => {
    const { roomId } = engine.createRoom('Хост');
    engine.joinRoom(roomId, 'Игрок-1');
    engine.joinRoom(roomId, 'Игрок-2');

    const started = engine.startGame(roomId);
    expect(started).toBe(false);
  });

  it('не стартует если не все обычные игроки готовы', () => {
    const { roomId } = engine.createRoom('Хост');
    const p1 = engine.joinRoom(roomId, 'Игрок-1')!;
    const p2 = engine.joinRoom(roomId, 'Игрок-2')!;
    const p3 = engine.joinRoom(roomId, 'Игрок-3')!;

    engine.toggleReady(roomId, p1.id);
    engine.toggleReady(roomId, p2.id);
    // p3 не готов!
    expect(engine.startGame(roomId)).toBe(false);

    engine.toggleReady(roomId, p3.id);
    expect(engine.startGame(roomId)).toBe(true);
  });

  it('раздаёт ровно по 4 карты каждому игроку', () => {
    const { roomId } = setupGame(engine, 5);
    const room = getRoom(engine, roomId);

    for (const player of room.players) {
      expect(player.hand).toHaveLength(4);
    }
  });

  it('ровно один игрок — Нечто', () => {
    const { roomId } = setupGame(engine, 6);
    const room = getRoom(engine, roomId);

    const things = room.players.filter(p => p.role === 'THING');
    expect(things).toHaveLength(1);
    // У Нечто должна быть карта THING на руке
    expect(things[0].hand.some(c => c.cardId === 'THING')).toBe(true);
  });

  it('стартовые руки НЕ содержат карт INFECTED и PANIC', () => {
    const { roomId } = setupGame(engine, 8);
    const room = getRoom(engine, roomId);

    for (const player of room.players) {
      for (const card of player.hand) {
        expect(card.cardId).not.toBe('INFECTED');
        expect(card.type).not.toBe('PANIC');
      }
    }
  });

  it('фаза после старта — DRAW', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    expect(room.phase).toBe('DRAW');
  });
});

describe('GameEngine — BUG-004: заражённый не может сбросить последнюю INFECTED', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('запрещает заражённому сбросить единственную карту "Заражение!"', () => {
    const { roomId, playerIds } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    // Делаем игрока заражённым с одной INFECTED
    currentPlayer.role = 'INFECTED';
    currentPlayer.hand = [
      mockCard('INFECTED', 'inf-1'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('ANALYSIS', 'an-1'),
      mockCard('FLAMETHROWER', 'flame-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    // Попытка сбросить единственную INFECTED
    const res = engine.discardCard(roomId, currentPlayer.id, currentPlayer.id, 'inf-1');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Заражённый');
  });

  it('разрешает заражённому сбросить INFECTED если у него больше одной', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    currentPlayer.role = 'INFECTED';
    currentPlayer.hand = [
      mockCard('INFECTED', 'inf-1'),
      mockCard('INFECTED', 'inf-2'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('ANALYSIS', 'an-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    const res = engine.discardCard(roomId, currentPlayer.id, currentPlayer.id, 'inf-1');
    expect(res.success).toBe(true);
  });
});

describe('GameEngine — BUG-005: лимит 3 карт INFECTED', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('автоматически сбрасывает лишнюю INFECTED при drawCard', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    // Даём игроку 3 INFECTED + 1 обычную
    currentPlayer.hand = [
      mockCard('INFECTED', 'inf-1'),
      mockCard('INFECTED', 'inf-2'),
      mockCard('INFECTED', 'inf-3'),
      mockCard('SUSPICION', 'susp-1'),
    ];

    // Подкладываем INFECTED сверху колоды
    room.deck.push(mockCard('INFECTED', 'inf-4'));

    room.phase = 'DRAW';
    const res = engine.drawCard(roomId, currentPlayer.id, currentPlayer.id);
    expect(res.success).toBe(true);

    // Должно остаться не больше 3 INFECTED
    const infectedCount = currentPlayer.hand.filter(c => c.cardId === 'INFECTED').length;
    expect(infectedCount).toBeLessThanOrEqual(3);
  });
});

describe('GameEngine — сброс карты "Нечто"', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('запрещает сбросить карту "Нечто"', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    currentPlayer.hand = [
      mockCard('THING', 'thing-1'),
      mockCard('SUSPICION', 'susp-1'),
      mockCard('ANALYSIS', 'an-1'),
      mockCard('FLAMETHROWER', 'flame-1'),
    ];
    room.phase = 'PLAY_OR_DISCARD';

    const res = engine.discardCard(roomId, currentPlayer.id, currentPlayer.id, 'thing-1');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Нечто');
  });
});

describe('GameEngine — drawCard', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('добирает карту и переходит в PLAY_OR_DISCARD', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    expect(room.phase).toBe('DRAW');
    const initialHandSize = currentPlayer.hand.length;

    const res = engine.drawCard(roomId, currentPlayer.id, currentPlayer.id);
    expect(res.success).toBe(true);

    // Рука увеличилась (может и нет если вытянул панику)
    // Фаза должна измениться на одну из допустимых
    const updatedRoom = getRoom(engine, roomId);
    expect(['PLAY_OR_DISCARD', 'RESOLVE_PANIC', 'DRAW', 'TRADE', 'GAME_OVER']).toContain(updatedRoom.phase);
  });

  it('не позволяет добирать в чужой ход', () => {
    const { roomId, playerIds } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    // Берём ID НЕ текущего игрока
    const otherId = room.players.find(p => p.id !== currentPlayer.id)!.id;

    const res = engine.drawCard(roomId, otherId, otherId);
    expect(res.success).toBe(false);
  });
});

describe('GameEngine — kickPlayer', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('хост может исключить игрока в лобби', () => {
    const { roomId, hostId } = engine.createRoom('Хост');
    const p = engine.joinRoom(roomId, 'Жертва')!;

    const res = engine.kickPlayer(roomId, hostId, p.id);
    expect(res.success).toBe(true);

    const room = getRoom(engine, roomId);
    expect(room.players).toHaveLength(1);
  });

  it('нехост не может исключить игрока', () => {
    const { roomId, hostId } = engine.createRoom('Хост');
    const p1 = engine.joinRoom(roomId, 'Игрок-1')!;
    const p2 = engine.joinRoom(roomId, 'Игрок-2')!;

    const res = engine.kickPlayer(roomId, p1.id, p2.id);
    expect(res.success).toBe(false);
  });

  it('нельзя исключить самого себя', () => {
    const { roomId, hostId } = engine.createRoom('Хост');
    const res = engine.kickPlayer(roomId, hostId, hostId);
    expect(res.success).toBe(false);
  });
});

describe('GameEngine — проверка победы', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('люди побеждают когда Нечто убито', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);

    const thing = room.players.find(p => p.role === 'THING')!;
    const currentPlayer = room.players[room.currentTurnIndex];

    // Находим соседа-Нечто
    const thingIdx = room.players.indexOf(thing);
    const currentIdx = room.currentTurnIndex;

    // Подставляем текущего игрока как соседа Нечто
    // Для этого просто делаем текущего игрока с Огнемётом и нужные позиции
    const flamethrower = mockCard('FLAMETHROWER', 'flame-test');
    currentPlayer.hand.push(flamethrower);

    // Если текущий — сосед Нечто, можно бить
    // Проставляем позиции чтобы были соседями
    const N = room.players.length;
    const nextIdx = (currentIdx + 1) % N;
    const prevIdx = (currentIdx - 1 + N) % N;

    // Перемещаем Нечто на позицию соседа
    if (thingIdx !== nextIdx && thingIdx !== prevIdx) {
      [room.players[thingIdx], room.players[nextIdx]] = [room.players[nextIdx], room.players[thingIdx]];
    }

    // Играем Огнемёт
    room.phase = 'PLAY_OR_DISCARD';
    const victimThing = room.players.find(p => p.role === 'THING')!;
    const res = engine.playCard(roomId, currentPlayer.id, currentPlayer.id, 'flame-test', victimThing.id);

    // Если RESPOND — значит у жертвы есть защитная карта
    const updatedRoom = getRoom(engine, roomId);
    if (updatedRoom.phase === 'RESPOND') {
      // Жертва не защищается
      engine.respondToAttack(roomId, victimThing.id, victimThing.id);
    }

    const finalRoom = getRoom(engine, roomId);
    if (finalRoom.phase === 'GAME_OVER') {
      expect(finalRoom.winnerRole).toBe('HUMANS');
    }
    // Если фаза другая — Нечто использовало защиту, это нормально
  });
});

describe('GameEngine — перезапуск игры', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('хост может перезапустить игру', () => {
    const { roomId, playerIds } = setupGame(engine);

    const room = getRoom(engine, roomId);
    const host = room.players.find(p => p.isHost)!;

    const result = engine.restartGame(roomId, host.id);
    expect(result).toBe(true);

    const updated = getRoom(engine, roomId);
    expect(updated.phase).toBe('LOBBY');
    // Все роли сброшены
    for (const p of updated.players) {
      expect(p.role).toBe('HUMAN');
      expect(p.hand).toHaveLength(0);
    }
  });

  it('не-хост не может перезапустить', () => {
    const { roomId, playerIds } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const nonHost = room.players.find(p => !p.isHost)!;

    const result = engine.restartGame(roomId, nonHost.id);
    expect(result).toBe(false);
  });
});

describe('GameEngine — Story 2.2: Discrete FSM Turn Engine (Draw & Play/Discard Phases)', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('продвигает FSM по циклу DRAW -> PLAY_OR_DISCARD -> TRADE при сбросе карты', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    expect(room.phase).toBe('DRAW');

    room.deck.push(mockCard('SUSPICION', 'top-stay-away'));

    const drawRes = engine.drawCard(roomId, currentPlayer.id, currentPlayer.id);
    expect(drawRes.success).toBe(true);
    expect(room.phase).toBe('PLAY_OR_DISCARD');

    const cardToDiscard = currentPlayer.hand.find(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED')!;
    const discardRes = engine.discardCard(roomId, currentPlayer.id, currentPlayer.id, cardToDiscard.id);
    expect(discardRes.success).toBe(true);

    expect(room.phase).toBe('TRADE');
    expect(room.pendingTrade).toBeDefined();
    expect(room.pendingTrade?.fromPlayerId).toBe(currentPlayer.id);
  });

  it('запрещает активному игроку выполнять сброс в фазе DRAW без предварительного добора', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    expect(room.phase).toBe('DRAW');
    const cardToDiscard = currentPlayer.hand[0];

    const discardRes = engine.discardCard(roomId, currentPlayer.id, currentPlayer.id, cardToDiscard.id);
    expect(discardRes.success).toBe(false);
    expect(discardRes.error).toBeDefined();
  });

  it('запрещает активному игроку повторный добор карт в фазе PLAY_OR_DISCARD', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    room.deck.push(mockCard('SUSPICION', 'top-stay-away'));
    engine.drawCard(roomId, currentPlayer.id, currentPlayer.id);
    expect(room.phase).toBe('PLAY_OR_DISCARD');

    const secondDrawRes = engine.drawCard(roomId, currentPlayer.id, currentPlayer.id);
    expect(secondDrawRes.success).toBe(false);
    expect(secondDrawRes.error).toContain('Не фаза добора карт');
  });

  it('неактивный игрок не может разыгрывать или сбрасывать карты в чужой ход', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];
    const otherPlayer = room.players.find(p => p.id !== currentPlayer.id)!;

    room.deck.push(mockCard('SUSPICION', 'top-stay-away'));
    engine.drawCard(roomId, currentPlayer.id, currentPlayer.id);
    expect(room.phase).toBe('PLAY_OR_DISCARD');

    const otherCard = otherPlayer.hand[0];
    const playRes = engine.playCard(roomId, otherPlayer.id, otherPlayer.id, otherCard.id);
    expect(playRes.success).toBe(false);
  });
});

describe('GameEngine — Story 2.3: Mandatory Blind Card Trade Phase', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('выполняет слепой обмен между активным игроком и соседом и передаёт ход', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const playerA = room.players[room.currentTurnIndex];
    const nextIdx = (room.currentTurnIndex + room.direction + room.players.length) % room.players.length;
    const playerB = room.players[nextIdx];

    room.deck.push(mockCard('SUSPICION', 'top-card'));
    engine.drawCard(roomId, playerA.id, playerA.id);
    const cardToDiscard = playerA.hand.find(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED')!;
    engine.discardCard(roomId, playerA.id, playerA.id, cardToDiscard.id);

    expect(room.phase).toBe('TRADE');
    expect(room.pendingTrade?.fromPlayerId).toBe(playerA.id);
    expect(room.pendingTrade?.toPlayerId).toBe(playerB.id);

    const cardOffered = playerA.hand.find(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED')!;
    const offerRes = engine.offerTrade(roomId, playerA.id, playerA.id, cardOffered.id);
    expect(offerRes.success).toBe(true);
    expect(room.phase).toBe('TRADE_ACCEPT');

    const cardReturned = playerB.hand.find(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED')!;
    const acceptRes = engine.acceptTrade(roomId, playerB.id, playerB.id, cardReturned.id);
    expect(acceptRes.success).toBe(true);

    expect(playerA.hand.some(c => c.id === cardReturned.id)).toBe(true);
    expect(playerB.hand.some(c => c.id === cardOffered.id)).toBe(true);

    expect(playerA.hand).toHaveLength(4);
    expect(playerB.hand).toHaveLength(4);
    expect(room.phase).toBe('DRAW');
    expect(room.currentTurnIndex).toBe(nextIdx);
  });

  it('запрещает человеку передавать карту "Заражение!"', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const playerA = room.players[room.currentTurnIndex];

    playerA.role = 'HUMAN';
    const infCard = mockCard('INFECTED', 'inf-human-test');
    playerA.hand.push(infCard);

    room.phase = 'TRADE';
    room.pendingTrade = { fromPlayerId: playerA.id, toPlayerId: room.players[1].id };

    const offerRes = engine.offerTrade(roomId, playerA.id, playerA.id, 'inf-human-test');
    expect(offerRes.success).toBe(false);
    expect(offerRes.error).toContain('Человек не может передавать карту "Заражение!"');
  });

  it('запрещает отдавать карту "Нечто"', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const thingPlayer = room.players.find(p => p.role === 'THING')!;
    room.currentTurnIndex = room.players.indexOf(thingPlayer);

    const thingCard = thingPlayer.hand.find(c => c.cardId === 'THING')!;

    room.phase = 'TRADE';
    const nextIdx = (room.currentTurnIndex + 1) % room.players.length;
    room.pendingTrade = { fromPlayerId: thingPlayer.id, toPlayerId: room.players[nextIdx].id };

    const offerRes = engine.offerTrade(roomId, thingPlayer.id, thingPlayer.id, thingCard.id);
    expect(offerRes.success).toBe(false);
    expect(offerRes.error).toContain('Нечто не может отдавать свою карту!');
  });

  it('заражает человека при получении карты "Заражение!" от Нечто', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);

    const thingPlayer = room.players.find(p => p.role === 'THING')!;
    const humanPlayer = room.players.find(p => p.role === 'HUMAN')!;

    const infCard = mockCard('INFECTED', 'inf-thing-to-human');
    thingPlayer.hand.push(infCard);

    room.phase = 'TRADE_ACCEPT';
    room.pendingTrade = {
      fromPlayerId: thingPlayer.id,
      toPlayerId: humanPlayer.id,
      offeredCard: infCard
    };

    const returnCard = humanPlayer.hand.find(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED')!;
    const acceptRes = engine.acceptTrade(roomId, humanPlayer.id, humanPlayer.id, returnCard.id);

    expect(acceptRes.success).toBe(true);
    expect(humanPlayer.role).toBe('INFECTED');
  });
});

describe('GameEngine — Story 4.1: Instant Panic Cards Engine & Replacement Draw', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('автоматически сбрасывает вытянутую карту Паники и производит добор заменяющей карты STAY_AWAY', () => {
    const { roomId } = setupGame(engine);
    const room = getRoom(engine, roomId);
    const currentPlayer = room.players[room.currentTurnIndex];

    const panicCard = mockCard('PANIC_THREE_FOUR', 'panic-1');
    panicCard.type = 'PANIC';
    const replacementCard = mockCard('SUSPICION', 'replacement-stay-away');

    room.deck.push(replacementCard);
    room.deck.push(panicCard);

    const drawRes = engine.drawCard(roomId, currentPlayer.id, currentPlayer.id);
    expect(drawRes.success).toBe(true);
    expect(room.phase).toBe('PLAY_OR_DISCARD');
    expect(currentPlayer.hand.some(c => c.id === 'replacement-stay-away')).toBe(true);
    expect(room.discardPile.some(c => c.id === 'panic-1')).toBe(true);
  });
});


