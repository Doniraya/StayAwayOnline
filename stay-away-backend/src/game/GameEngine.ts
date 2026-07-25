import { GameState, Player, Card, Role } from '../types/game';
import { generateDeck } from './deck';
import { v4 as uuidv4 } from 'uuid';
import { randomInt, randomBytes } from 'crypto';

function secureShuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export class GameEngine {
  private rooms: Map<string, GameState> = new Map();
  private botTimers: Map<string, NodeJS.Timeout> = new Map();

  // 1. Создание комнаты
  public createRoom(hostName: string): { roomId: string; hostId: string } {
    const roomId = randomBytes(3).toString('hex').toUpperCase();
    const hostId = uuidv4();

    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      isBot: false,
      isHost: true,
      hand: [],
      role: 'HUMAN',
      isAlive: true,
      isInQuarantine: false
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
      log: [`Комната ${roomId} создана. Хост: ${hostName}`]
    };

    this.rooms.set(roomId, newState);
    return { roomId, hostId };
  }

  // 2. Вход в комнату
  public joinRoom(roomId: string, playerName: string): Player | null {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'LOBBY' || room.players.length >= 12) return null;

    const newPlayer: Player = {
      id: uuidv4(),
      name: playerName,
      isBot: false,
      isHost: false,
      hand: [],
      role: 'HUMAN',
      isAlive: true,
      isInQuarantine: false
    };

    room.players.push(newPlayer);
    room.log.push(`Игрок ${playerName} присоединился к игре.`);
    return newPlayer;
  }

  // 3. Добавление Бота
  public addBot(roomId: string): Player | null {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'LOBBY' || room.players.length >= 12) return null;

    const botNumber = room.players.filter(p => p.isBot).length + 1;
    const botPlayer: Player = {
      id: `bot-${uuidv4().substring(0, 5)}`,
      name: `Бот #${botNumber}`,
      isBot: true,
      isHost: false,
      hand: [],
      role: 'HUMAN',
      isAlive: true,
      isInQuarantine: false
    };

    room.players.push(botPlayer);
    room.log.push(`${botPlayer.name} добавлен.`);
    return botPlayer;
  }

  // 4. Старт игры (с правильной стартовой раздачей)
  public startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length < 4) return false;

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
    const room = this.rooms.get(roomId);
    if (!room) return false;

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

  // 6. Проверка прав управления игроком/ботом
  public canControlPlayer(room: GameState, requesterId: string, targetPlayerId: string): boolean {
    if (requesterId === targetPlayerId) return true;
    const requester = room.players.find(p => p.id === requesterId);
    const target = room.players.find(p => p.id === targetPlayerId);
    return Boolean(requester?.isHost && target?.isBot);
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
  public drawCard(roomId: string, requesterId: string, targetPlayerId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'DRAW') return { success: false, error: 'Не фаза добора карт' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

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

    // 🚨 ЕСЛИ ВЫТЯНУТА КАРТА ПАНИКИ — ОНА НЕ ИДЕТ В РУКУ, А СРАЗУ В СБРОС!
    if (drawnCard.type === 'PANIC') {
      room.discardPile.push(drawnCard);
      room.log.push(`🚨 ПАНИКА! ${currentPlayer.name} вытащил карту Паники "${drawnCard.name}"! Карта сброшена.`);
      room.phase = 'PLAY_OR_DISCARD';
      return { success: true };
    }

    currentPlayer.hand.push(drawnCard);
    room.log.push(`${currentPlayer.name} взял карту из колоды.`);

    room.phase = 'PLAY_OR_DISCARD';
    return { success: true };
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
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'PLAY_OR_DISCARD') return { success: false, error: 'Нельзя сыграть карту сейчас' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    const player = room.players.find(p => p.id === targetPlayerId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: 'Карта не найдена в руке' };

    const cardToPlay = player.hand[cardIndex];

    if (['FLAMETHROWER', 'ANALYSIS', 'QUARANTINE'].includes(cardToPlay.cardId) && !victimPlayerId) {
      return { success: false, error: `Для карты "${cardToPlay.name}" необходимо выбрать цель!` };
    }

    if (cardToPlay.cardId === 'BARRED_DOOR' && (doorIndex === undefined || doorIndex === null)) {
      return { success: false, error: 'Необходимо выбрать проход для заколочивания!' };
    }

    const [playedCard] = player.hand.splice(cardIndex, 1);
    room.discardPile.push(playedCard);

    let revealData: any = null;

    if (playedCard.cardId === 'FLAMETHROWER' && victimPlayerId) {
      const victim = room.players.find(p => p.id === victimPlayerId);
      if (victim) {
        if (victim.isInQuarantine) {
          return { success: false, error: 'Игрок в Карантине защищен от Огнемёта!' };
        }

        const hasDefense = victim.hand.some(c => c.cardId === 'MISS' || c.cardId === 'NO_BARBECUE');

        if (hasDefense) {
          room.phase = 'RESPOND';
          (room as any).pendingDefense = { attackerId: player.id, victimId: victim.id, attackType: 'FLAMETHROWER' };
          room.log.push(`⚠️ ${player.name} целует Огнемётом в ${victim.name}! ${victim.name} решается разыграть карту Защиты...`);
          return { success: true };
        }

        victim.isAlive = false;
        room.log.push(`🔥 ${player.name} сжёг игрока ${victim.name}!`);
      }
    }
    else if (playedCard.cardId === 'ANALYSIS' && victimPlayerId) {
      const target = room.players.find(p => p.id === victimPlayerId);
      if (target) {
        revealData = { type: 'ANALYSIS', targetName: target.name, cards: target.hand };
        room.log.push(`🔍 ${player.name} применил АНАЛИЗ на игрока ${target.name}.`);
      }
    }
    else if (playedCard.cardId === 'WHISKEY') {
      revealData = { type: 'WHISKEY', playerName: player.name, cards: player.hand };
      room.log.push(`🥃 ${player.name} выпил ВИСКИ и показал свои карты всем!`);
    }
    else if (playedCard.cardId === 'QUARANTINE' && victimPlayerId) {
      const victim = room.players.find(p => p.id === victimPlayerId);
      if (victim) {
        victim.isInQuarantine = true;
        room.log.push(`☣️ ${player.name} поместил игрока ${victim.name} в КАРАНТИН!`);
      }
    }
    else if (playedCard.cardId === 'BARRED_DOOR' && doorIndex !== undefined) {
      const N = room.players.length;
      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const leftDoorIndex = playerIndex;
      const rightDoorIndex = (playerIndex - 1 + N) % N;

      if (doorIndex !== leftDoorIndex && doorIndex !== rightDoorIndex) {
        return { success: false, error: 'Дверь можно заколотить только между собой и прямым соседом!' };
      }

      room.barredDoors[doorIndex] = true;
      const neighbor = doorIndex === leftDoorIndex 
        ? room.players[(playerIndex + 1) % N] 
        : room.players[(playerIndex - 1 + N) % N];

      room.log.push(`🚪 ${player.name} заколотил дверь между собой и ${neighbor.name}!`);
    }

    const isGameOver = this.checkVictory(room);
    if (!isGameOver) {
      this.prepareTradePhase(room);
    }
    
    return { success: true, revealData };
  }

  // 10. Ответ на атаку ("Мимо!")
  public respondToAttack(roomId: string, requesterId: string, victimId: string, defenseCardId?: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'RESPOND') return { success: false, error: 'Не фаза защиты' };
    if (!this.canControlPlayer(room, requesterId, victimId)) return { success: false, error: 'Нет прав доступа' };

    const victim = room.players.find(p => p.id === victimId);
    if (!victim) return { success: false, error: 'Игрок не найден' };

    if (defenseCardId) {
      const cardIdx = victim.hand.findIndex(c => c.id === defenseCardId);
      if (cardIdx !== -1) {
        const [defCard] = victim.hand.splice(cardIdx, 1);
        room.discardPile.push(defCard);
        room.log.push(`🛡️ ${victim.name} сыграл "${defCard.name}" и успешно увернулся от атаки!`);
      }
    } else {
      victim.isAlive = false;
      room.log.push(`🔥 ${victim.name} не защитился и сгорел от Огнемёта!`);
    }

    (room as any).pendingDefense = undefined;

    const isGameOver = this.checkVictory(room);
    if (!isGameOver) {
      this.prepareTradePhase(room);
    }

    return { success: true };
  }

  // 11. Отмена обмена ("Нет уж, спасибо!")
  public cancelTradeWithNoThanks(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'TRADE_ACCEPT' || !room.pendingTrade) return { success: false, error: 'Не фаза ответа на обмен' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

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

    room.log.push(`🛡️ ${receiver.name} сыграл "Нет уж, спасибо!" и ОТМЕНИЛ ОБМЕН!`);

    this.nextTurn(room);
    return { success: true };
  }

  // 12. Сброс карты
  public discardCard(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || (room.phase !== 'PLAY_OR_DISCARD' && room.phase !== 'DRAW')) return { success: false, error: 'Нельзя сбросить карту' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };

    const player = room.players.find(p => p.id === targetPlayerId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: 'Карта не найдена' };

    if (player.hand[cardIndex].cardId === 'THING') {
      return { success: false, error: 'Нельзя сбросить карту Нечто!' };
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

    room.phase = 'TRADE';
    room.pendingTrade = {
      fromPlayerId: room.players[room.currentTurnIndex].id,
      toPlayerId: room.players[nextIndex].id
    };
    room.log.push(`ОБМЕН: ${room.players[room.currentTurnIndex].name} должен предложить карту игроку ${room.players[nextIndex].name}.`);
  }

  // 14. Предложение обмена
  public offerTrade(roomId: string, requesterId: string, targetPlayerId: string, cardId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'TRADE' || !room.pendingTrade) return { success: false, error: 'Не фаза обмена' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };
    if (room.pendingTrade.fromPlayerId !== targetPlayerId) return { success: false, error: 'Не твой черед предлагать карту' };

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
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'TRADE_ACCEPT' || !room.pendingTrade) return { success: false, error: 'Не фаза ответа на обмен' };
    if (!this.canControlPlayer(room, requesterId, targetPlayerId)) return { success: false, error: 'Нет прав доступа' };
    if (room.pendingTrade.toPlayerId !== targetPlayerId || !room.pendingTrade.offeredCard) return { success: false, error: 'Не твой черед отвечать' };

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

  // 16. Переход хода
  private nextTurn(room: GameState) {
    room.pendingTrade = undefined;
    let nextIndex = room.currentTurnIndex;
    do {
      nextIndex = (nextIndex + room.direction + room.players.length) % room.players.length;
    } while (!room.players[nextIndex].isAlive);

    room.currentTurnIndex = nextIndex;
    room.phase = 'DRAW';
    room.log.push(`Ход переходит к: ${room.players[room.currentTurnIndex].name}`);
  }

  // 17. 🤖 АЛГОРИТМ ИИ БОТОВ
  public checkAndExecuteBotTurn(roomId: string, broadcastCallback: () => void) {
    const room = this.rooms.get(roomId);
    if (!room || room.phase === 'GAME_OVER' || room.phase === 'LOBBY') return;

    let actingBot: Player | undefined;

    if (room.phase === 'DRAW' || room.phase === 'PLAY_OR_DISCARD' || room.phase === 'TRADE') {
      const current = room.players[room.currentTurnIndex];
      if (current?.isBot && current?.isAlive) actingBot = current;
    } 
    else if (room.phase === 'TRADE_ACCEPT' && room.pendingTrade) {
      const target = room.players.find(p => p.id === room.pendingTrade!.toPlayerId);
      if (target?.isBot && target?.isAlive) actingBot = target;
    } 
    else if (room.phase === 'RESPOND' && (room as any).pendingDefense) {
      const victim = room.players.find(p => p.id === (room as any).pendingDefense.victimId);
      if (victim?.isBot && victim?.isAlive) actingBot = victim;
    }

    if (!actingBot) return;

    if (this.botTimers.has(roomId)) {
      clearTimeout(this.botTimers.get(roomId));
    }

    const timer = setTimeout(() => {
      this.executeBotAction(room, actingBot!);
      broadcastCallback();
    }, 1000);

    this.botTimers.set(roomId, timer);
  }

  private executeBotAction(room: GameState, bot: Player) {
    const host = room.players.find(p => p.isHost);
    const requesterId = host ? host.id : bot.id;

    if (room.phase === 'DRAW') {
      this.drawCard(room.roomId, requesterId, bot.id);
    }
    else if (room.phase === 'PLAY_OR_DISCARD') {
      const safeDiscardCards = bot.hand.filter(c => c.cardId !== 'THING');
      if (safeDiscardCards.length > 0) {
        const randomCard = safeDiscardCards[randomInt(safeDiscardCards.length)];
        this.discardCard(room.roomId, requesterId, bot.id, randomCard.id);
      }
    }
    else if (room.phase === 'TRADE') {
      let legalCards: Card[] = [];

      if (bot.role === 'THING') {
        const infectionCard = bot.hand.find(c => c.cardId === 'INFECTED');
        // 80% chance for thing to offer infection card
        if (infectionCard && randomInt(100) < 80) {
          legalCards = [infectionCard];
        } else {
          legalCards = bot.hand.filter(c => c.cardId !== 'THING');
        }
      } else {
        legalCards = bot.hand.filter(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED');
      }

      if (legalCards.length === 0) legalCards = bot.hand.filter(c => c.cardId !== 'THING');
      if (legalCards.length > 0) {
        const tradeCard = legalCards[randomInt(legalCards.length)];
        this.offerTrade(room.roomId, requesterId, bot.id, tradeCard.id);
      }
    }
    else if (room.phase === 'TRADE_ACCEPT') {
      const noThanksCard = bot.hand.find(c => c.cardId === 'NO_THANKS');
      // 30% chance for bot to reject a trade with NO_THANKS
      if (noThanksCard && randomInt(100) < 30) {
        this.cancelTradeWithNoThanks(room.roomId, requesterId, bot.id, noThanksCard.id);
        return;
      }

      let legalCards = bot.role === 'HUMAN' 
        ? bot.hand.filter(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED')
        : bot.hand.filter(c => c.cardId !== 'THING');

      if (legalCards.length === 0) legalCards = bot.hand.filter(c => c.cardId !== 'THING');
      if (legalCards.length > 0) {
        const responseCard = legalCards[randomInt(legalCards.length)];
        this.acceptTrade(room.roomId, requesterId, bot.id, responseCard.id);
      }
    }
    else if (room.phase === 'RESPOND') {
      const defCard = bot.hand.find(c => c.cardId === 'MISS' || c.cardId === 'NO_BARBECUE');
      this.respondToAttack(room.roomId, requesterId, bot.id, defCard ? defCard.id : undefined);
    }
  }

  // 18. Состояние с анонимизацией (и срыванием масок при GAME_OVER)
  public getSanitizedState(roomId: string, targetPlayerId: string): GameState | null {
    const room = this.rooms.get(roomId);
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
      deck: room.deck.map(() => ({ id: 'hidden', cardId: 'UNKNOWN' as any, name: '', type: 'STAY_AWAY', minPlayers: 4, description: '' }))
    };
  }

  public getRoom(roomId: string): GameState | undefined {
    return this.rooms.get(roomId);
  }
}

export const gameEngine = new GameEngine();