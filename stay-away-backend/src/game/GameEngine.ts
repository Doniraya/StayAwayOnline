import { GameState, Player, Card, Role } from '../types/game';
import { generateDeck } from './deck';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { CardResolver, isDoorBarredBetween } from './CardResolver';
import { RoomManager } from './RoomManager';
import { BotAIEngine } from './BotAIEngine';

const HIDDEN_DECK_CARD = { id: 'hidden', cardId: 'UNKNOWN' as any, name: '', type: 'STAY_AWAY' as const, minPlayers: 4, description: '' };

function secureShuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export class GameEngine {
  private roomManager = new RoomManager();
  private botAIEngine = new BotAIEngine();
  private cardResolver = new CardResolver();

  constructor() {
    const cleanupInterval = setInterval(() => {
      this.cleanupStaleRooms();
    }, 10 * 60 * 1000);
    cleanupInterval.unref();
  }

  public getRoom(roomId: string): GameState | undefined {
    return this.roomManager.getRoom(roomId);
  }

  public touchRoom(room: GameState): void {
    this.roomManager.touchRoom(room);
  }

  public clearBotTimer(roomId: string): void {
    this.botAIEngine.clearBotTimer(roomId);
  }

  public deleteRoom(roomId: string): boolean {
    return this.roomManager.deleteRoom(roomId, (id) => this.clearBotTimer(id));
  }

  public cleanupStaleRooms(maxIdleMs: number = 60 * 60 * 1000): void {
    this.roomManager.cleanupStaleRooms(maxIdleMs, (id) => this.clearBotTimer(id));
  }

  public setBotDelay(roomId: string, requesterId: string, delayMs: number): boolean {
    return this.roomManager.setBotDelay(roomId, requesterId, delayMs);
  }

  public createRoom(hostName: string): { roomId: string; hostId: string } {
    return this.roomManager.createRoom(hostName);
  }

  public canControlPlayer(room: GameState, requesterId: string, targetPlayerId: string): boolean {
    return this.roomManager.canControlPlayer(room, requesterId, targetPlayerId);
  }

  public replaceWithBot(roomId: string, requesterId: string, targetPlayerId: string): { success: boolean, error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return { success: false, error: 'Комната не найдена' };

    this.touchRoom(room);

    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return { success: false, error: 'Нет прав доступа' };

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) return { success: false, error: 'Игрок не найден' };

    if (!targetPlayer.isOnline) {
      targetPlayer.isBot = true;
      targetPlayer.isOnline = true;
      room.log.push(`🤖 Хост заменил отключившегося ${targetPlayer.name} на Бота, чтобы продолжить игру!`);
    }

    return { success: true };
  }

  public leaveRoom(roomId: string, playerId: string): boolean {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return false;

    this.touchRoom(room);

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    const player = room.players[playerIndex];

    if (room.phase === 'LOBBY') {
      room.players.splice(playerIndex, 1);
      room.log.push(`Игрок ${player.name} покинул комнату.`);

      if (player.isHost) {
        const newHost = room.players.find(p => !p.isBot && p.isOnline);
        if (newHost) {
          newHost.isHost = true;
          room.log.push(`👑 ${newHost.name} становится новым Хостом!`);
        }
      }

      if (room.players.every(p => p.isBot || !p.isOnline)) {
        this.deleteRoom(roomId);
      }
      return true;
    } else {
      // In game, handle as disconnect
      return this.handlePlayerDisconnect(roomId, playerId);
    }
  }

  public kickPlayer(roomId: string, requesterId: string, targetPlayerId: string): { success: boolean, error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return { success: false, error: 'Комната не найдена' };

    this.touchRoom(room);

    if (room.phase !== 'LOBBY') return { success: false, error: 'Исключать игроков можно только в Лобби' };

    const requester = room.players.find(p => p.id === requesterId);
    if (!requester || !requester.isHost) return { success: false, error: 'Только хост может исключать игроков' };

    if (requesterId === targetPlayerId) return { success: false, error: 'Нельзя исключить самого себя' };

    const targetIndex = room.players.findIndex(p => p.id === targetPlayerId);
    if (targetIndex === -1) return { success: false, error: 'Игрок не найден' };

    const target = room.players[targetIndex];
    room.players.splice(targetIndex, 1);
    room.log.push(`👢 Игрок ${target.name} был исключён из комнаты.`);

    return { success: true };
  }

  public handlePlayerDisconnect(roomId: string, playerId: string): boolean {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return false;

    this.touchRoom(room);

    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    player.isOnline = false;
    room.log.push(`🔌 Игрок ${player.name} потерял соединение!`);

    if (player.isHost) {
      player.isHost = false;
      const newHost = room.players.find(p => !p.isBot && p.isOnline && p.isAlive);
      if (newHost) {
        newHost.isHost = true;
        room.log.push(`👑 ${newHost.name} становится новым Хостом!`);
      }
    }

    if (room.players.every(p => p.isBot || !p.isOnline)) {
      this.deleteRoom(roomId);
    }

    return true;
  }

  // 2. Вход в комнату
  public joinRoom(roomId: string, playerName: string): Player | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'LOBBY' || room.players.length >= 12) return null;

    this.touchRoom(room);

    const newPlayer: Player = {
      id: uuidv4(),
      name: playerName,
      isBot: false,
      isHost: false,
      hand: [],
      role: 'HUMAN',
      isAlive: true,
      isInQuarantine: false,
      isOnline: true
    };

    room.players.push(newPlayer);
    room.log.push(`Игрок ${playerName} присоединился к игре.`);
    return newPlayer;
  }

  // 3. Добавление Бота
  public addBot(roomId: string): Player | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'LOBBY' || room.players.length >= 12) return null;

    this.touchRoom(room);

    const botNumber = room.players.filter(p => p.isBot).length + 1;
    const botPlayer: Player = {
      id: `bot-${uuidv4().substring(0, 5)}`,
      name: `Бот #${botNumber}`,
      isBot: true,
      isHost: false,
      hand: [],
      role: 'HUMAN',
      isAlive: true,
      isInQuarantine: false,
      isOnline: true
    };

    room.players.push(botPlayer);
    room.log.push(`${botPlayer.name} добавлен.`);
    return botPlayer;
  }

  public toggleReady(roomId: string, playerId: string): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return { success: false, error: 'Комната не найдена' };
    if (room.phase !== 'LOBBY') return { success: false, error: 'Игра уже началась' };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Игрок не найден' };
    if (player.isHost || player.isBot) return { success: false, error: 'Хост и боты всегда готовы' };
    if (!player.isOnline) return { success: false, error: 'Игрок не в сети' };

    player.isReady = !player.isReady;
    this.touchRoom(room);
    room.log.push(`Игрок ${player.name} ${player.isReady ? 'готов' : 'не готов'}.`);

    return { success: true };
  }

  // 4. Старт игры (с правильной стартовой раздачей)
  public startGame(roomId: string): boolean {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.players.length < 4) return false;

    const unreadyHumans = room.players.filter(p => !p.isHost && !p.isBot && (!p.isReady || !p.isOnline));
    if (unreadyHumans.length > 0) return false;

    this.touchRoom(room);

    const { deck, thingCard } = generateDeck(room.players.length);

    // В стартовую руку могут попадать только карты Stay Away (БЕЗ Заражения и Паники)!
    const initialStayAwayCards = deck.filter(c => c.type === 'STAY_AWAY' && c.cardId !== 'INFECTED');
    const infectedCards = deck.filter(c => c.cardId === 'INFECTED');
    const panicCards = deck.filter(c => c.type === 'PANIC');

    secureShuffleInPlace(initialStayAwayCards);

    const thingPlayerIndex = randomInt(room.players.length);

    // Раздаем по 4 карты
    room.players.forEach((player, index) => {
      player.hand = [];
      player.isAlive = true;
      player.isInQuarantine = false;

      if (index === thingPlayerIndex) {
        player.role = 'THING';
        player.hand.push(thingCard);
        player.hand.push(...initialStayAwayCards.splice(0, 3));
      } else {
        // Все остальные — Человек (даже если сходу получили карту Заражения!)
        player.role = 'HUMAN';
        player.hand.push(...initialStayAwayCards.splice(0, 4));
      }
    });

    // Собираем общую колоду из оставшихся карт + Инфекция + Паника
    const mainDrawDeck = [...initialStayAwayCards, ...infectedCards, ...panicCards];
    secureShuffleInPlace(mainDrawDeck);

    room.deck = mainDrawDeck;
    room.discardPile = [];
    room.barredDoors = new Array(room.players.length).fill(false);
    room.phase = 'DRAW';
    room.currentTurnIndex = 0;
    room.winnerRole = undefined;
    room.log.push('=== Игра началась! Стартовые руки разданы. ===');

    return true;
  }

  // 5. Перезапуск игры
  public restartGame(roomId: string, requesterId: string): boolean {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return false;

    this.touchRoom(room);

    const player = room.players.find(p => p.id === requesterId);
    if (!player?.isHost) return false;

    room.phase = 'LOBBY';
    room.winnerRole = undefined;
    room.players.forEach(p => {
      p.hand = [];
      p.isAlive = true;
      p.isInQuarantine = false;
      p.role = 'HUMAN';
    });
    room.log.push('🔄 Игра сброшена. Возврат в Лобби.');
    return true;
  }

  // 7. Проверка условий победы
  private checkVictory(room: GameState): boolean {
    const thing = room.players.find(p => p.role === 'THING');
    
    if (thing && !thing.isAlive) {
      room.phase = 'GAME_OVER';
      room.winnerRole = 'HUMANS';
      room.log.push('🎉 НЕЧТО СГОРЕЛО! ЛЮДИ ПОБЕДИЛИ!');
      return true;
    }

    const livingPlayers = room.players.filter(p => p.isAlive);
    const livingHumans = livingPlayers.filter(p => p.role === 'HUMAN');

    if (livingHumans.length === 0) {
      room.phase = 'GAME_OVER';
      room.winnerRole = 'THING';
      room.log.push('👾 НЕЧТО И ЗАРАЖЕННЫЕ ЗАХВАТИЛИ СТАНЦИЮ! ПОБЕДА МОНСТРА!');
      return true;
    }

    return false;
  }

  // 8. Добор карты
  public drawCard(roomId: string, requesterId: string, targetPlayerId: string): { success: boolean; error?: string; revealData?: any } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'DRAW') return { success: false, error: 'Не фаза добора карт' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer.id !== targetPlayerId) return { success: false, error: 'Не твой ход' };

    if (room.deck.length === 0) {
      room.deck = [...room.discardPile];
      secureShuffleInPlace(room.deck);
      room.discardPile = [];
      room.log.push('Колода закончилась! Сброс перемешан.');
    }

    const drawnCard = room.deck.pop();
    if (!drawnCard) return { success: false, error: 'Колода пуста' };

    // 🚨 ЕСЛИ ВЫТЯНУТА КАРТА ПАНИКИ
    if (drawnCard.type === 'PANIC') {
      const panicRevealData = { type: 'PANIC_DRAWN' as const, playerName: currentPlayer.name, card: drawnCard };
      const instantRevealData = this.cardResolver.resolveInstantPanic(room, currentPlayer, drawnCard, (r, p) => this.drawReplacementCard(r, p));
      const revealData = instantRevealData || panicRevealData;

      if (instantRevealData === undefined) {
        // Требуется решение игрока
        room.phase = 'RESOLVE_PANIC';
        room.pendingPanic = drawnCard;
        room.log.push(`🚨 ПАНИКА! ${currentPlayer.name} вытащил "${drawnCard.name}" и должен принять решение..`);
        return { success: true, revealData };
      }

      room.discardPile.push(drawnCard);
      room.log.push(`🚨 ПАНИКА! ${currentPlayer.name} вытащил карту Паники "${drawnCard.name}"! Карта сброшена.`);

      if ((room as any).forceEndTurn) {
        (room as any).forceEndTurn = false;
        this.nextTurn(room);
        return { success: true, revealData };
      }

      this.prepareTradePhase(room);
      return { success: true, revealData };
    }

    currentPlayer.hand.push(drawnCard);

    // BUG-005: Нельзя держать больше 3 карт "Заражение!" на руке
    const infectedOnHand = currentPlayer.hand.filter(c => c.cardId === 'INFECTED').length;
    if (infectedOnHand > 3) {
      room.log.push(`⚠️ ${currentPlayer.name} превысил лимит карт "Заражение!" (${infectedOnHand}/3). Лишняя карта автоматически сброшена.`);
      const excessIdx = currentPlayer.hand.findIndex(c => c.cardId === 'INFECTED');
      if (excessIdx !== -1) {
        const [excess] = currentPlayer.hand.splice(excessIdx, 1);
        room.discardPile.push(excess);
      }
    }

    room.log.push(`${currentPlayer.name} взял карту из колоды.`);

    room.phase = 'PLAY_OR_DISCARD';
    return { success: true };
  }

  public resolveTargetedPanic(roomId: string, requesterId: string, targetPlayerId: string, victimId?: string, cardId?: string): { success: boolean; error?: string; revealData?: any } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'RESOLVE_PANIC' || !room.pendingPanic) return { success: false, error: 'Сейчас нет ожидающей разыгрывания паники' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const currentPlayer = room.players[room.currentTurnIndex];
    if (currentPlayer.id !== targetPlayerId) return { success: false, error: 'Не твой ход' };

    const panicCard = room.pendingPanic;

    const result = this.cardResolver.resolveTargetedPanic(room, currentPlayer, panicCard, targetPlayerId, victimId, cardId, (r, p) => this.drawReplacementCard(r, p));

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (result.success && !result.error && panicCard.cardId === 'PANIC_FRIENDS') {
      return { success: true };
    }

    room.pendingPanic = undefined;
    room.discardPile.push(panicCard);

    if (result.endsTurn) {
      this.nextTurn(room);
    } else {
      this.prepareTradePhase(room);
    }

    return { success: true, revealData: result.revealData };
  }

  private drawReplacementCard(room: GameState, player: Player) {
    while (true) {
      if (room.deck.length === 0) {
        room.deck = [...room.discardPile];
        secureShuffleInPlace(room.deck);
        room.discardPile = [];
        room.log.push('Колода закончилась! Сброс перемешан.');
      }

      const drawnCard = room.deck.pop();
      if (!drawnCard) break;

      if (drawnCard.type === 'PANIC') {
        room.discardPile.push(drawnCard);
        room.log.push(`🚨 ПАНИКА! ${player.name} вытащил карту Паники при замене, она уходит в сброс лицевой стороной вниз.`);
      } else if (drawnCard.type === 'STAY_AWAY') {
        player.hand.push(drawnCard);
        room.log.push(`🛡️ ${player.name} взял карту на замену.`);
        break;
      }
    }
  }

  // 9. Розыгрыш карты
  public playCard(
    roomId: string,
    requesterId: string,
    targetPlayerId: string,
    cardId: string,
    victimPlayerId?: string,
    doorIndex?: number
  ): { success: boolean; error?: string; revealData?: any } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'PLAY_OR_DISCARD') return { success: false, error: 'Нельзя сыграть карту сейчас' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const player = room.players.find(p => p.id === targetPlayerId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: 'Карта не найдена в руке' };

    const cardToPlay = player.hand[cardIndex];

    const [playedCard] = player.hand.splice(cardIndex, 1);

    const result = this.cardResolver.resolveActionCard(room, player, playedCard, targetPlayerId, victimPlayerId, doorIndex);

    if (!result.success) {
      player.hand.splice(cardIndex, 0, playedCard);
      return { success: false, error: result.error };
    }

    room.discardPile.push(playedCard);

    if (result.earlyReturn) {
      return { success: true, revealData: result.revealData };
    }

    const isGameOver = this.checkVictory(room);
    if (!isGameOver && !room.pendingTrade) {
      this.prepareTradePhase(room);
    }
    
    return { success: true, revealData: result.revealData };
  }

  // 10. Ответ на атаку ("Мимо!")
  public respondToAttack(roomId: string, requesterId: string, victimId: string, defenseCardId?: string): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'RESPOND') return { success: false, error: 'Не фаза защиты' };
    if (!this.canControlPlayer(room, requesterId, victimId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const victim = room.players.find(p => p.id === victimId);
    if (!victim) return { success: false, error: 'Игрок не найден' };

    const defenseInfo = room.pendingDefense;
    const attackType = defenseInfo?.attackType || 'FLAMETHROWER';

    if (defenseCardId) {
      const cardIdx = victim.hand.findIndex(c => c.id === defenseCardId);
      if (cardIdx !== -1) {
        const [defCard] = victim.hand.splice(cardIdx, 1);
        room.discardPile.push(defCard);
        this.drawReplacementCard(room, victim);
        if (attackType === 'CHANGE_SEATS' || attackType === 'YOU_BETTER_RUN') {
          room.log.push(`🛡️ ${victim.name} сыграл "${defCard.name}" и остался на своём месте!`);
        } else {
          room.log.push(`🛡️ ${victim.name} сыграл "${defCard.name}" и успешно увернулся от атаки!`);
        }
      }
    } else {
      if (attackType === 'FLAMETHROWER') {
        victim.isAlive = false;
        room.log.push(`🔥 ${victim.name} не защитился и сгорел от Огнемёта!`);
      } else if (attackType === 'CHANGE_SEATS' || attackType === 'YOU_BETTER_RUN') {
        if (defenseInfo?.attackerId) {
          const attackerIndex = room.players.findIndex(p => p.id === defenseInfo.attackerId);
          const victimIndex = room.players.findIndex(p => p.id === victim.id);
          if (attackerIndex !== -1 && victimIndex !== -1) {
            const attacker = room.players[attackerIndex];
            [room.players[attackerIndex], room.players[victimIndex]] = [room.players[victimIndex], room.players[attackerIndex]];
            room.currentTurnIndex = victimIndex;
            room.log.push(`🪑 ${victim.name} не защитился, и ${attacker.name} поменялся местами с ${victim.name}!`);
          }
        }
      }
    }

    room.pendingDefense = undefined;

    const isGameOver = this.checkVictory(room);
    if (!isGameOver) {
      this.prepareTradePhase(room);
    }

    return { success: true };
  }

  // 11. Отмена обмена ("Нет уж, спасибо!")
  public cancelTradeWithNoThanks(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'TRADE_ACCEPT' || !room.pendingTrade) return { success: false, error: 'Не фаза ответа на обмен' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const receiver = room.players.find(p => p.id === targetPlayerId);
    if (!receiver) return { success: false, error: 'Игрок не найден' };

    const cardIdx = receiver.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { success: false, error: 'Карта не найдена' };

    const card = receiver.hand[cardIdx];
    if (card.cardId !== 'NO_THANKS') {
      return { success: false, error: 'Только карта "Нет уж, спасибо!" может отменить обмен!' };
    }

    const [noThanksCard] = receiver.hand.splice(cardIdx, 1);
    room.discardPile.push(noThanksCard);
    this.drawReplacementCard(room, receiver);

    room.log.push(`🛡️ ${receiver.name} сыграл "Нет уж, спасибо!" и ОТМЕНИЛ ОБМЕН!`);

    this.nextTurn(room);
    return { success: true };
  }

  // 11b. Отмена обмена ("Страх")
  public cancelTradeWithFear(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string; revealData?: any } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'TRADE_ACCEPT' || !room.pendingTrade) return { success: false, error: 'Не фаза ответа на обмен' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const receiver = room.players.find(p => p.id === targetPlayerId);
    if (!receiver) return { success: false, error: 'Игрок не найден' };

    const cardIdx = receiver.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { success: false, error: 'Карта не найдена' };

    const card = receiver.hand[cardIdx];
    if (card.cardId !== 'FEAR') {
      return { success: false, error: 'Только карта "Страх" может быть сыграна здесь!' };
    }

    if (!room.pendingTrade.offeredCard) {
      return { success: false, error: 'Нет предложенной карты для просмотра' };
    }

    const sender = room.players.find(p => p.id === room.pendingTrade!.fromPlayerId);
    if (!sender) return { success: false, error: 'Отправитель не найден' };

    const [fearCard] = receiver.hand.splice(cardIdx, 1);
    room.discardPile.push(fearCard);
    this.drawReplacementCard(room, receiver);

    sender.hand.push(room.pendingTrade.offeredCard);

    room.log.push(`😱 ${receiver.name} сыграл СТРАХ, посмотрел предложенную карту и отказался от обмена!`);

    this.nextTurn(room);
    return { success: true, revealData: { type: 'FEAR', card: room.pendingTrade.offeredCard } };
  }

  // 11c. Перенаправление обмена ("Мимо!")
  public redirectTradeWithMiss(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'TRADE_ACCEPT' || !room.pendingTrade) return { success: false, error: 'Не фаза ответа на обмен' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const receiver = room.players.find(p => p.id === targetPlayerId);
    if (!receiver) return { success: false, error: 'Игрок не найден' };

    const cardIdx = receiver.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { success: false, error: 'Карта не найдена' };

    const card = receiver.hand[cardIdx];
    if (card.cardId !== 'MISS') {
      return { success: false, error: 'Только карта "Мимо!" может быть сыграна здесь!' };
    }

    if (!room.pendingTrade.offeredCard) {
      return { success: false, error: 'Нет предложенной карты' };
    }

    const sender = room.players.find(p => p.id === room.pendingTrade!.fromPlayerId);
    if (!sender) return { success: false, error: 'Отправитель не найден' };

    const receiverIndex = room.players.findIndex(p => p.id === receiver.id);
    let nextIndex = receiverIndex;
    do {
      nextIndex = (nextIndex + room.direction + room.players.length) % room.players.length;
    } while (!room.players[nextIndex].isAlive);

    const nextPlayer = room.players[nextIndex];

    const [missCard] = receiver.hand.splice(cardIdx, 1);
    room.discardPile.push(missCard);
    this.drawReplacementCard(room, receiver);

    if (nextPlayer.isInQuarantine || isDoorBarredBetween(room, receiverIndex, nextIndex)) {
      sender.hand.push(room.pendingTrade.offeredCard);
      room.log.push(`💨 ${receiver.name} сыграл "Мимо!", но путь к ${nextPlayer.name} заблокирован! Обмен сгорает.`);
      this.nextTurn(room);
      return { success: true };
    }

    room.pendingTrade.toPlayerId = nextPlayer.id;
    room.log.push(`💨 ${receiver.name} сыграл "Мимо!" и перевел обмен на ${nextPlayer.name}!`);

    return { success: true };
  }

  // 12. Сброс карты
  public discardCard(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || (room.phase !== 'PLAY_OR_DISCARD' && room.phase !== 'DRAW')) return { success: false, error: 'Нельзя сбросить карту' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    this.touchRoom(room);

    const player = room.players.find(p => p.id === targetPlayerId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: 'Карта не найдена' };

    if (player.hand[cardIndex].cardId === 'THING') {
      return { success: false, error: 'Нельзя сбросить карту Нечто!' };
    }

    // BUG-004: Заражённый обязан держать минимум 1 карту "Заражение!" на руке
    if (player.hand[cardIndex].cardId === 'INFECTED' && player.role === 'INFECTED') {
      const infectedCount = player.hand.filter(c => c.cardId === 'INFECTED').length;
      if (infectedCount <= 1) {
        return { success: false, error: 'Заражённый не может сбросить последнюю карту "Заражение!"!' };
      }
    }

    const [discardedCard] = player.hand.splice(cardIndex, 1);
    room.discardPile.push(discardedCard);
    room.log.push(`${player.name} сбросил карту.`);

    this.prepareTradePhase(room);
    return { success: true };
  }

  // 13. Подготовка фазы обмена
  private prepareTradePhase(room: GameState) {
    let nextIndex = room.currentTurnIndex;
    do {
      nextIndex = (nextIndex + room.direction + room.players.length) % room.players.length;
    } while (!room.players[nextIndex].isAlive);

    const currentPlayer = room.players[room.currentTurnIndex];
    const nextPlayer = room.players[nextIndex];

    if (currentPlayer.isInQuarantine || nextPlayer.isInQuarantine || isDoorBarredBetween(room, room.currentTurnIndex, nextIndex)) {
      this.nextTurn(room);
      return;
    }

    room.phase = 'TRADE';
    room.pendingTrade = {
      fromPlayerId: room.players[room.currentTurnIndex].id,
      toPlayerId: room.players[nextIndex].id
    };
    room.log.push(`ОБМЕН: ${room.players[room.currentTurnIndex].name} должен предложить карту игроку ${room.players[nextIndex].name}.`);
  }

  // 14. Предложение обмена
  public offerTrade(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'TRADE' || !room.pendingTrade) return { success: false, error: 'Не фаза обмена' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };
    if (room.pendingTrade.fromPlayerId !== targetPlayerId) return { success: false, error: 'Не твой черед предлагать карту' };

    this.touchRoom(room);

    const player = room.players.find(p => p.id === targetPlayerId);
    const card = player?.hand.find(c => c.id === cardId);
    if (!player || !card) return { success: false, error: 'Карта не найдена' };

    if (card.cardId === 'THING') {
      return { success: false, error: 'Нечто не может отдавать свою карту!' };
    }

    if (player.role === 'HUMAN' && card.cardId === 'INFECTED') {
      return { success: false, error: 'Человек не может передавать карту "Заражение!"' };
    }

    if (player.role === 'INFECTED' && card.cardId === 'INFECTED') {
      const infectedCount = player.hand.filter(c => c.cardId === 'INFECTED').length;
      if (infectedCount <= 1) {
        return { success: false, error: 'Зараженный не может отдать последнюю карту "Заражение!"' };
      }
      const receiver = room.players.find(p => p.id === room.pendingTrade!.toPlayerId);
      if (receiver && receiver.role !== 'THING') {
        return { success: false, error: 'Зараженный может передать инфекцию только Нечто!' };
      }
    }

    room.pendingTrade.offeredCard = card;
    room.phase = 'TRADE_ACCEPT';
    room.log.push(`${player.name} предложил карту на обмен.`);
    return { success: true };
  }

  // 15. Подтверждение обмена
  public acceptTrade(roomId: string, requesterId: string, targetPlayerId: string, responseCardId: string): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.phase !== 'TRADE_ACCEPT' || !room.pendingTrade) return { success: false, error: 'Не фаза ответа на обмен' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };
    if (room.pendingTrade.toPlayerId !== targetPlayerId || !room.pendingTrade.offeredCard) return { success: false, error: 'Не твой черед отвечать' };

    this.touchRoom(room);

    const sender = room.players.find(p => p.id === room.pendingTrade!.fromPlayerId)!;
    const receiver = room.players.find(p => p.id === targetPlayerId)!;

    const senderCard = room.pendingTrade.offeredCard;
    const receiverCardIndex = receiver.hand.findIndex(c => c.id === responseCardId);
    if (receiverCardIndex === -1) return { success: false, error: 'Карта не найдена' };

    const receiverCard = receiver.hand[receiverCardIndex];

    if (receiverCard.cardId === 'THING') {
      return { success: false, error: 'Нечто не может отдавать свою карту!' };
    }

    if (receiver.role === 'HUMAN' && receiverCard.cardId === 'INFECTED') {
      return { success: false, error: 'Человек не может передавать карту "Заражение!"' };
    }

    if (receiver.role === 'INFECTED' && receiverCard.cardId === 'INFECTED') {
      const infectedCount = receiver.hand.filter(c => c.cardId === 'INFECTED').length;
      if (infectedCount <= 1) {
        return { success: false, error: 'Зараженный не может отдать последнюю карту "Заражение!"' };
      }
      if (sender.role !== 'THING') {
        return { success: false, error: 'Зараженный может передать инфекцию только Нечто!' };
      }
    }

    sender.hand = sender.hand.filter(c => c.id !== senderCard.id);
    receiver.hand.splice(receiverCardIndex, 1);

    sender.hand.push(receiverCard);
    receiver.hand.push(senderCard);

    if (senderCard.cardId === 'INFECTED' && sender.role === 'THING' && receiver.role === 'HUMAN') {
      receiver.role = 'INFECTED';
    }

    if (receiverCard.cardId === 'INFECTED' && receiver.role === 'THING' && sender.role === 'HUMAN') {
      sender.role = 'INFECTED';
    }

    room.log.push(`Обмен между ${sender.name} и ${receiver.name} завершен.`);

    const isGameOver = this.checkVictory(room);
    if (!isGameOver) {
      this.nextTurn(room);
    }

    return { success: true };
  }

  // 15.5. Выбор карты при Упорстве
  public resolvePersistenceCard(
    roomId: string,
    requesterId: string,
    targetPlayerId: string,
    cardId: string
  ): { success: boolean; error?: string } {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return { success: false, error: 'Комната не найдена' };
    if (room.phase !== 'RESOLVE_PERSISTENCE' || !room.pendingPersistence) {
      return { success: false, error: 'Не фаза выбора карты Упорства' };
    }
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) {
      return { success: false, error: 'Нет прав доступа' };
    }

    this.touchRoom(room);

    const player = room.players.find(p => p.id === targetPlayerId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    const cards = room.pendingPersistence.cards;
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Выбранная карта не найдена среди вытянутых' };
    }

    const chosenCard = cards[cardIndex];
    player.hand.push(chosenCard);

    for (let i = 0; i < cards.length; i++) {
      if (i !== cardIndex) {
        room.discardPile.push(cards[i]);
      }
    }

    room.log.push(`💪 ${player.name} выбрал 1 карту по эффекту "Упорство", остальные ${cards.length - 1} сброшены.`);

    room.pendingPersistence = undefined;
    room.phase = 'PLAY_OR_DISCARD';

    return { success: true };
  }

  // 16. Переход хода
  private nextTurn(room: GameState) {
    room.pendingTrade = undefined;
    let nextIndex = room.currentTurnIndex;
    do {
      nextIndex = (nextIndex + room.direction + room.players.length) % room.players.length;
    } while (!room.players[nextIndex].isAlive);

    room.currentTurnIndex = nextIndex;

    const newCurrentPlayer = room.players[room.currentTurnIndex];
    if (newCurrentPlayer.isInQuarantine) {
      newCurrentPlayer.quarantineTurnsLeft = (newCurrentPlayer.quarantineTurnsLeft || 0) - 1;
      if (newCurrentPlayer.quarantineTurnsLeft <= 0) {
        newCurrentPlayer.isInQuarantine = false;
        newCurrentPlayer.quarantineTurnsLeft = 0;
      }
    }

    room.phase = 'DRAW';
    room.log.push(`Ход переходит к: ${room.players[room.currentTurnIndex].name}`);
  }

  // 17. 🤖 АЛГОРИТМ ИИ БОТОВ
  public checkAndExecuteBotTurn(roomId: string, broadcastCallback: (revealData?: any) => void) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;
    this.botAIEngine.checkAndExecuteBotTurn(room, this, broadcastCallback);
  }

  // 18. Состояние с анонимизацией (и срыванием масок при GAME_OVER)
  public getSanitizedState(roomId: string, targetPlayerId: string): GameState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return null;

    const requestingPlayer = room.players.find(p => p.id === targetPlayerId);
    const isHost = requestingPlayer?.isHost ?? false;
    const isGameOver = room.phase === 'GAME_OVER';

    const sanitizedPlayers = room.players.map(p => {
      const isSelf = p.id === targetPlayerId;
      const isBotControlledByHost = p.isBot && isHost;
      const canSeeHidden = isSelf || isBotControlledByHost || isGameOver;

      return {
        ...p,
        hand: canSeeHidden
          ? p.hand
          : p.hand.map(c => ({ id: c.id, cardId: 'UNKNOWN' as any, name: 'Карта', type: 'STAY_AWAY' as const, minPlayers: 4, description: '' })),
        role: canSeeHidden ? p.role : ('HUMAN' as Role)
      };
    });

    return {
      ...room,
      players: sanitizedPlayers,
      deck: Array(room.deck.length).fill(HIDDEN_DECK_CARD)
    };
  }
}

export const gameEngine = new GameEngine();