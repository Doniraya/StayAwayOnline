import { GameState, Player, Card } from '../types/game';
import { randomInt } from 'crypto';

/**
 * Вспомогательная функция для проверки наличия заколоченной двери между двумя игроками по их индексам.
 */
export function isDoorBarredBetween(room: GameState, index1: number, index2: number): boolean {
  const N = room.players.length;
  if (index2 === (index1 + 1) % N) return room.barredDoors[index1];
  if (index2 === (index1 - 1 + N) % N) return room.barredDoors[index2];
  return false;
}

/**
 * Класс CardResolver отвечает за обработку и применение эффектов карт
 * (Карты Действий, Карты Защиты и Карты Паники).
 */
export class CardResolver {
  // ==========================================
  // 🌟 ПУБЛИЧНЫЕ МЕТОДЫ РАЗРЕШЕНИЯ КАРТ
  // ==========================================

  /**
   * Разрешает карту действия (события), разыгрываемую игроком в свой ход.
   */
  public resolveActionCard(
    room: GameState,
    player: Player,
    playedCard: Card,
    targetPlayerId: string,
    victimPlayerId?: string,
    doorIndex?: number
  ): { success: boolean; error?: string; revealData?: any; isGameOver?: boolean; earlyReturn?: boolean } {
    // 1. Предварительная валидация применения карты
    const validationError = this.validateActionCardUse(
      room,
      player,
      playedCard,
      targetPlayerId,
      victimPlayerId,
      doorIndex
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    // 2. Выполнение эффекта карты
    const effectResult = this.dispatchActionCardEffect(
      room,
      player,
      playedCard,
      targetPlayerId,
      victimPlayerId,
      doorIndex
    );

    if (!effectResult.success) {
      return { success: false, error: effectResult.error };
    }

    if (effectResult.earlyReturn) {
      return { success: true, revealData: effectResult.revealData, earlyReturn: true };
    }

    return { success: true, revealData: effectResult.revealData || null };
  }

  /**
   * Разрешает эффект мгновенных карт паники, взятых из общей колоды.
   */
  public resolveInstantPanic(
    room: GameState,
    player: Player,
    panicCard: Card,
    drawReplacementCard: (room: GameState, player: Player) => void
  ): any {
    switch (panicCard.cardId) {
      case 'PANIC_OLD_ROPES':
        return this.handlePanicOldRopes(room);
      case 'PANIC_THREE_FOUR':
        return this.handlePanicThreeFour(room);
      case 'PANIC_OOPS':
        return this.handlePanicOops(room, player);
      case 'PANIC_FORGETFULNESS':
        return this.handlePanicForgetfulness(room, player, drawReplacementCard);
      case 'PANIC_PARTY':
        return this.handlePanicParty(room, player);
      case 'PANIC_CHAIN_REACTION':
        return this.handlePanicChainReaction(room);
      case 'PANIC_CONFESSION':
        return this.handlePanicConfession(room);
      default:
        return undefined;
    }
  }

  /**
   * Разрешает интерактивные/адресованные карты паники.
   */
  public resolveTargetedPanic(
    room: GameState,
    currentPlayer: Player,
    panicCard: Card,
    targetPlayerId: string,
    victimId?: string,
    cardId?: string,
    drawReplacementCard?: (room: GameState, player: Player) => void
  ): { success: boolean; error?: string; revealData?: any; endsTurn?: boolean } {
    switch (panicCard.cardId) {
      case 'PANIC_GET_OUT':
        return this.handlePanicGetOut(room, currentPlayer, targetPlayerId, victimId);
      case 'PANIC_BLIND_DATE':
        return this.handlePanicBlindDate(room, currentPlayer, cardId, drawReplacementCard);
      case 'PANIC_BETWEEN_US':
        return this.handlePanicBetweenUs(room, currentPlayer, targetPlayerId, victimId);
      case 'PANIC_ONE_TWO':
        return this.handlePanicOneTwo(room, currentPlayer, victimId);
      case 'PANIC_FRIENDS':
        return this.handlePanicFriends(room, currentPlayer, panicCard, victimId);
      default:
        return { success: false, error: 'Неизвестная интерактивная карта паники' };
    }
  }

  // ==========================================
  // 🎯 КАРТЫ ДЕЙСТВИЙ (Action Cards)
  // ==========================================

  /**
   * Проверяет валидность условий для использования карты действия.
   */
  private validateActionCardUse(
    room: GameState,
    player: Player,
    playedCard: Card,
    targetPlayerId: string,
    victimPlayerId?: string,
    doorIndex?: number
  ): string | null {
    if (player.isInQuarantine) {
      return 'Игрок в карантине не может разыгрывать карты, только сбрасывать!';
    }

    const allowedActionCards = [
      'FLAMETHROWER', 'ANALYSIS', 'WHISKEY', 'QUARANTINE', 'BARRED_DOOR',
      'LOOK_AROUND', 'SUSPICION', 'TEMPTATION', 'AXE', 'CHANGE_SEATS',
      'YOU_BETTER_RUN', 'PERSISTENCE'
    ];

    if (!allowedActionCards.includes(playedCard.cardId)) {
      return 'Эту карту нельзя разыграть как действие!';
    }

    if (victimPlayerId) {
      const victim = room.players.find(p => p.id === victimPlayerId);
      if (victim && victim.isInQuarantine) {
        const quarantineBlockedCards = [
          'ANALYSIS', 'SUSPICION', 'TEMPTATION', 'FLAMETHROWER', 'CHANGE_SEATS', 'QUARANTINE'
        ];
        if (quarantineBlockedCards.includes(playedCard.cardId)) {
          return `Нельзя применить карту "${playedCard.name}" на игрока в Карантине!`;
        }
      }
    }

    if (['FLAMETHROWER', 'ANALYSIS', 'WHISKEY', 'SUSPICION'].includes(playedCard.cardId) && victimPlayerId) {
      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const victimIndex = room.players.findIndex(p => p.id === victimPlayerId);

      // BUG-002 fix: Огнемёт, Анализ и Подозрение — только на соседа!
      if (['FLAMETHROWER', 'ANALYSIS', 'SUSPICION'].includes(playedCard.cardId)) {
        const N = room.players.length;
        if (victimIndex !== (playerIndex + 1) % N && victimIndex !== (playerIndex - 1 + N) % N) {
          return `Карта "${playedCard.name}" может быть сыграна только на соседа!`;
        }
      }

      if (isDoorBarredBetween(room, playerIndex, victimIndex)) {
        return 'Нельзя сыграть карту сквозь Заколоченную Дверь!';
      }
    }

    if (['FLAMETHROWER', 'ANALYSIS', 'QUARANTINE', 'SUSPICION', 'TEMPTATION', 'CHANGE_SEATS', 'YOU_BETTER_RUN'].includes(playedCard.cardId) && !victimPlayerId) {
      return `Для карты "${playedCard.name}" необходимо выбрать цель!`;
    }

    if (playedCard.cardId === 'BARRED_DOOR' && (doorIndex === undefined || doorIndex === null)) {
      return 'Необходимо выбрать проход для заколочивания!';
    }

    if (playedCard.cardId === 'AXE' && !victimPlayerId && (doorIndex === undefined || doorIndex === null)) {
      return `Для карты "${playedCard.name}" необходимо выбрать цель (игрока или дверь)!`;
    }

    return null;
  }

  /**
   * Распределяет вызов конкретного обработчика для карты действия.
   */
  private dispatchActionCardEffect(
    room: GameState,
    player: Player,
    playedCard: Card,
    targetPlayerId: string,
    victimPlayerId?: string,
    doorIndex?: number
  ): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    switch (playedCard.cardId) {
      case 'FLAMETHROWER':
        return this.handleFlamethrower(room, player, victimPlayerId);
      case 'ANALYSIS':
        return this.handleAnalysis(room, player, victimPlayerId);
      case 'WHISKEY':
        return this.handleWhiskey(room, player);
      case 'QUARANTINE':
        return this.handleQuarantine(room, player, victimPlayerId);
      case 'BARRED_DOOR':
        return this.handleBarredDoor(room, player, targetPlayerId, doorIndex);
      case 'LOOK_AROUND':
        return this.handleLookAround(room, player);
      case 'SUSPICION':
        return this.handleSuspicion(room, player, victimPlayerId);
      case 'TEMPTATION':
        return this.handleTemptation(room, player, victimPlayerId);
      case 'AXE':
        return this.handleAxe(room, player, victimPlayerId, doorIndex);
      case 'CHANGE_SEATS':
        return this.handleChangeSeats(room, player, targetPlayerId, victimPlayerId);
      case 'YOU_BETTER_RUN':
        return this.handleYouBetterRun(room, player, targetPlayerId, victimPlayerId);
      case 'PERSISTENCE':
        return this.handlePersistence(room, player);
      default:
        return { success: true };
    }
  }

  /**
   * Обработка карты "Огнемёт": выводит из игры соседнего игрока, если тот не защитился.
   */
  private handleFlamethrower(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      if (victim.isInQuarantine) {
        return { success: false, error: 'Игрок в Карантине защищен от Огнемёта!' };
      }

      if (this.checkAndTriggerFlamethrowerDefense(room, player, victim)) {
        return { success: true, earlyReturn: true };
      }

      victim.isAlive = false;
      room.log.push(`🔥 ${player.name} сжёг игрока ${victim.name}!`);
    }
    return { success: true };
  }

  /**
   * Обработка карты "Анализ": позволяет посмотреть все карты на руке целевого игрока.
   */
  private handleAnalysis(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const target = room.players.find(p => p.id === victimPlayerId);
    if (target) {
      if (target.isInQuarantine) {
        return { success: false, error: 'Нельзя применить АНАЛИЗ на игрока в карантине!' };
      }
      room.log.push(`🔍 ${player.name} применил АНАЛИЗ на игрока ${target.name}.`);
      return { success: true, revealData: { type: 'ANALYSIS', targetName: target.name, cards: target.hand } };
    }
    return { success: true };
  }

  /**
   * Обработка карты "Виски": игрок показывает свои карты всем участникам.
   */
  private handleWhiskey(room: GameState, player: Player): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    room.log.push(`🥃 ${player.name} выпил ВИСКИ и показал свои карты всем!`);
    return { success: true, revealData: { type: 'WHISKEY', playerName: player.name, cards: player.hand } };
  }

  /**
   * Обработка карты "Карантин": помещает игрока в карантин на 3 хода.
   */
  private handleQuarantine(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      if (victim.isInQuarantine) {
        return { success: false, error: 'Игрок уже находится в Карантине!' };
      }
      victim.isInQuarantine = true;
      victim.quarantineTurnsLeft = 3;
      room.log.push(`☣️ ${player.name} поместил игрока ${victim.name} в КАРАНТИН!`);
    }
    return { success: true };
  }

  /**
   * Обработка карты "Заколоченная дверь": заколочивает проход между соседями.
   */
  private handleBarredDoor(room: GameState, player: Player, targetPlayerId: string, doorIndex?: number): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    if (doorIndex !== undefined) {
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
    return { success: true };
  }

  /**
   * Обработка карты "Гляди по сторонам": меняет направление хода на противоположное.
   */
  private handleLookAround(room: GameState, player: Player): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    room.direction = (room.direction * -1) as 1 | -1;
    room.log.push(`🔄 ${player.name} сыграл "Гляди по сторонам"! Направление хода изменено.`);
    return { success: true };
  }

  /**
   * Обработка карты "Подозрение": позволяет посмотреть одну случайную карту соседнего игрока.
   */
  private handleSuspicion(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim && victim.hand.length > 0) {
      if (victim.isInQuarantine) {
        return { success: false, error: 'Нельзя применить Подозрение на игрока в карантине!' };
      }
      const randomVictimCard = victim.hand[randomInt(victim.hand.length)];
      room.log.push(`👀 ${player.name} подозревает ${victim.name} и тайно смотрит одну его карту.`);
      return { success: true, revealData: { type: 'SUSPICION', targetName: victim.name, card: randomVictimCard } };
    }
    return { success: true };
  }

  /**
   * Обработка карты "Соблазн": принуждает выбранного игрока к обмену картами.
   */
  private handleTemptation(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    if (!victimPlayerId) {
      return { success: false, error: 'Для карты "Соблазн" необходимо выбрать цель!' };
    }
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (!victim || !victim.isAlive) {
      return { success: false, error: 'Цель не найдена или мертва!' };
    }
    if (victim.isInQuarantine) {
      return { success: false, error: 'Игрок в Карантине не может участвовать в обмене!' };
    }
    room.phase = 'TRADE';
    room.pendingTrade = { fromPlayerId: player.id, toPlayerId: victim.id, isSeduction: true };
    room.log.push(`🍷 ${player.name} разыграл Соблазн и предлагает обмен игроку ${victim.name}!`);
    return { success: true, earlyReturn: true };
  }

  /**
   * Обработка карты "Топор": снимает карантин с игрока или убирает заколоченную дверь.
   */
  private handleAxe(room: GameState, player: Player, victimPlayerId?: string, doorIndex?: number): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    if (doorIndex !== undefined && doorIndex !== null) {
      room.barredDoors[doorIndex] = false;
      room.log.push(`🪓 ${player.name} разрубил Заколоченную Дверь Топором!`);
    } else if (victimPlayerId) {
      const victim = room.players.find(p => p.id === victimPlayerId);
      if (victim && victim.isInQuarantine) {
        victim.isInQuarantine = false;
        victim.quarantineTurnsLeft = 0;
        room.log.push(`🪓 ${player.name} освободил ${victim.name} из Карантина с помощью Топора!`);
      }
    }
    return { success: true };
  }

  /**
   * Обработка карты "Меняемся местами!": подмена мест с соседним игроком.
   */
  private handleChangeSeats(room: GameState, player: Player, targetPlayerId: string, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      const N = room.players.length;
      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const victimIndex = room.players.findIndex(p => p.id === victimPlayerId);

      if (victimIndex !== (playerIndex + 1) % N && victimIndex !== (playerIndex - 1 + N) % N) {
        return { success: false, error: 'Карта "Меняемся местами!" может быть сыграна только на соседа!' };
      }
      if (victim.isInQuarantine) {
        return { success: false, error: 'Нельзя поменяться местами с игроком в карантине!' };
      }
      if (isDoorBarredBetween(room, playerIndex, victimIndex)) {
        return { success: false, error: 'Нельзя поменяться местами сквозь заколоченную дверь!' };
      }

      if (this.checkAndTriggerSeatChangeDefense(room, player, victim, 'CHANGE_SEATS')) {
        return { success: true, earlyReturn: true };
      }

      [room.players[playerIndex], room.players[victimIndex]] = [room.players[victimIndex], room.players[playerIndex]];
      room.currentTurnIndex = victimIndex;

      room.log.push(`🪑 ${player.name} поменялся местами с ${victim.name}!`);
    }
    return { success: true };
  }

  /**
   * Обработка карты "Тебе лучше бежать!": подмена мест с любым игроком.
   */
  private handleYouBetterRun(room: GameState, player: Player, targetPlayerId: string, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const victimIndex = room.players.findIndex(p => p.id === victimPlayerId);

      if (victim.isInQuarantine) {
        return { success: false, error: 'Нельзя поменяться местами с игроком в карантине!' };
      }

      if (this.checkAndTriggerSeatChangeDefense(room, player, victim, 'YOU_BETTER_RUN')) {
        return { success: true, earlyReturn: true };
      }

      [room.players[playerIndex], room.players[victimIndex]] = [room.players[victimIndex], room.players[playerIndex]];
      room.currentTurnIndex = victimIndex;

      room.log.push(`🪑 ${player.name} поменялся местами с ${victim.name}!`);
    }
    return { success: true };
  }

  /**
   * Обработка карты "Упорство": берёт 3 карты событий из колоды и предлагает выбрать 1.
   */
  private handlePersistence(room: GameState, player: Player): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const drawnStayAway: Card[] = [];

    while (drawnStayAway.length < 3) {
      if (room.deck.length === 0) {
        if (room.discardPile.length === 0) break;
        room.deck = [...room.discardPile];
        for (let i = room.deck.length - 1; i > 0; i--) {
          const j = randomInt(i + 1);
          [room.deck[i], room.deck[j]] = [room.deck[j], room.deck[i]];
        }
        room.discardPile = [];
        room.log.push('Колода закончилась! Сброс перемешан.');
      }

      const card = room.deck.pop();
      if (!card) break;

      if (card.type === 'PANIC') {
        room.discardPile.push(card);
        room.log.push(`🚨 ПАНИКА! ${player.name} пропустил карту Паники "${card.name}" при розыгрыше Упорства.`);
      } else {
        drawnStayAway.push(card);
      }
    }

    if (drawnStayAway.length > 1) {
      room.phase = 'RESOLVE_PERSISTENCE';
      room.pendingPersistence = { cards: drawnStayAway };
      room.log.push(`💪 ${player.name} разыграл "Упорство" и выбирает 1 карту из ${drawnStayAway.length} вытянутых.`);
      return { success: true, earlyReturn: true };
    } else if (drawnStayAway.length === 1) {
      player.hand.push(drawnStayAway[0]);
      room.log.push(`💪 ${player.name} разыграл "Упорство" и взял единственную доступную карту Stay Away.`);
      return { success: true };
    } else {
      room.log.push(`💪 ${player.name} разыграл "Упорство", но в колоде не осталось карт Stay Away.`);
      return { success: true };
    }
  }

  // ==========================================
  // 🛡️ КАРТЫ ЗАЩИТЫ (Defense Cards)
  // ==========================================

  /**
   * Проверяет, есть ли у жертвы карта защиты ("Мимо!" или "Никакого шашлыка!"),
   * и при её наличии переводит фазу игры в RESPOND для ожидания реакции жертвы.
   */
  private checkAndTriggerFlamethrowerDefense(room: GameState, attacker: Player, victim: Player): boolean {
    const hasDefense = victim.hand.some(c => c.cardId === 'MISS' || c.cardId === 'NO_BARBECUE');
    if (hasDefense) {
      room.phase = 'RESPOND';
      room.pendingDefense = { attackerId: attacker.id, victimId: victim.id, attackType: 'FLAMETHROWER' };
      room.log.push(`⚠️ ${attacker.name} целует Огнемётом в ${victim.name}! ${victim.name} решается разыграть карту Защиты...`);
      return true;
    }
    return false;
  }

  /**
   * Проверяет, есть ли у жертвы карта защиты ("Я и здесь отлично сижу"),
   * и при её наличии переводит фазу игры в RESPOND.
   */
  private checkAndTriggerSeatChangeDefense(
    room: GameState,
    attacker: Player,
    victim: Player,
    attackType: 'CHANGE_SEATS' | 'YOU_BETTER_RUN'
  ): boolean {
    const hasDefense = victim.hand.some(c => c.cardId === 'IM_FINE_HERE');
    if (hasDefense) {
      room.phase = 'RESPOND';
      room.pendingDefense = { attackerId: attacker.id, victimId: victim.id, attackType };
      if (attackType === 'CHANGE_SEATS') {
        room.log.push(`⚠️ ${attacker.name} пытается поменяться местами с ${victim.name}! ${victim.name} может разыграть карту Защиты...`);
      } else {
        room.log.push(`⚠️ ${attacker.name} хочет сменить место с ${victim.name}! ${victim.name} может разыграть карту Защиты...`);
      }
      return true;
    }
    return false;
  }

  // ==========================================
  // 🚨 КАРТЫ ПАНИКИ (Panic Cards)
  // ==========================================

  /**
   * Карты Паники: "Старые верёвки" - снимает Карантин со всех игроков.
   */
  private handlePanicOldRopes(room: GameState): null {
    for (const p of room.players) {
      p.isInQuarantine = false;
      p.quarantineTurnsLeft = 0;
    }
    room.log.push(`🚨 ПАНИКА! "Старые верёвки" - Все карантины сняты!`);
    return null;
  }

  /**
   * Карты Паники: "...Три, четыре..." - открывает все заколоченные двери.
   */
  private handlePanicThreeFour(room: GameState): null {
    room.barredDoors.fill(false);
    room.log.push(`🚨 ПАНИКА! "...Три, четыре..." - Все двери открыты!`);
    return null;
  }

  /**
   * Карты Паники: "Уупс!" - игрок показывает свои карты всем.
   */
  private handlePanicOops(room: GameState, player: Player): { type: string; playerName: string; cards: Card[] } {
    room.log.push(`🚨 ПАНИКА! "Уупс!" - ${player.name} случайно показывает все свои карты!`);
    return { type: 'OOPS', playerName: player.name, cards: [...player.hand] };
  }

  /**
   * Карты Паники: "Забывчивость" - сбрасывает до 3 карт и берет новые.
   */
  private handlePanicForgetfulness(
    room: GameState,
    player: Player,
    drawReplacementCard: (room: GameState, player: Player) => void
  ): null {
    let discardCount = 0;
    const toDiscard: Card[] = [];

    for (const c of player.hand) {
      if (discardCount >= 3) break;
      if (c.cardId === 'THING') continue;

      if (player.role === 'INFECTED' && c.cardId === 'INFECTED') {
        const infectedCardsCount = player.hand.filter(card => card.cardId === 'INFECTED').length;
        const discardedInfectedCount = toDiscard.filter(card => card.cardId === 'INFECTED').length;
        if (infectedCardsCount - discardedInfectedCount <= 1) continue;
      }

      toDiscard.push(c);
      discardCount++;
    }

    room.log.push(`🚨 ПАНИКА! "Забывчивость" - ${player.name} сбрасывает ${discardCount} карты и берет новые!`);

    for (const c of toDiscard) {
      const idx = player.hand.findIndex(handCard => handCard.id === c.id);
      if (idx !== -1) {
        const [discarded] = player.hand.splice(idx, 1);
        room.discardPile.push(discarded);
        drawReplacementCard(room, player);
      }
    }
    (room as any).forceEndTurn = true;
    return null;
  }

  /**
   * Карты Паники: "И это вы называете вечеринкой?" - снимает карантины, открывает двери и перемешивает попарно места игроков.
   */
  private handlePanicParty(room: GameState, player: Player): null {
    for (const p of room.players) {
      p.isInQuarantine = false;
      p.quarantineTurnsLeft = 0;
    }
    room.barredDoors.fill(false);
    for (let i = 0; i < room.players.length - 1; i += 2) {
      const temp = room.players[i];
      room.players[i] = room.players[i + 1];
      room.players[i + 1] = temp;
    }
    const newPlayerIndex = room.players.findIndex(p => p.id === player.id);
    room.currentTurnIndex = newPlayerIndex;
    room.log.push(`🚨 ПАНИКА! "И это вы называете вечеринкой?" - Карантины сняты, двери открыты, все меняются местами!`);
    return null;
  }

  /**
   * Карты Паники: "Цепная реакция" - передача по кругу по 1 случайной карте каждым живым игроком.
   */
  private handlePanicChainReaction(room: GameState): null {
    const N = room.players.length;
    const collectedCards: { playerId: string; card: Card }[] = [];
    for (const p of room.players) {
      if (!p.isAlive) continue;
      const legalCards = p.hand.filter(c => {
        if (c.cardId === 'THING') return false;
        if (p.role === 'HUMAN' && c.cardId === 'INFECTED') return false;
        if (p.role === 'INFECTED' && c.cardId === 'INFECTED') {
          const infCount = p.hand.filter(hc => hc.cardId === 'INFECTED').length;
          if (infCount <= 1) return false;
        }
        return true;
      });
      if (legalCards.length > 0) {
        const randomCard = legalCards[randomInt(legalCards.length)];
        const idx = p.hand.findIndex(c => c.id === randomCard.id);
        const [removedCard] = p.hand.splice(idx, 1);
        collectedCards.push({ playerId: p.id, card: removedCard });
      }
    }

    for (const { playerId, card } of collectedCards) {
      const pIndex = room.players.findIndex(p => p.id === playerId);
      const sender = room.players[pIndex];
      let nextIndex = pIndex;
      do {
        nextIndex = (nextIndex + room.direction + N) % N;
      } while (!room.players[nextIndex].isAlive);

      const receiver = room.players[nextIndex];
      receiver.hand.push(card);

      if (card.cardId === 'INFECTED' && sender.role === 'THING' && receiver.role === 'HUMAN') {
        receiver.role = 'INFECTED';
        room.log.push(`🦠 ${receiver.name} был заражён от Нечто в результате "Цепной реакции"!`);
      }
    }

    room.log.push(`🚨 ПАНИКА! "Цепная реакция" - Все игроки одновременно передали 1 случайную карту соседу!`);
    (room as any).forceEndTurn = true;
    return null;
  }

  /**
   * Карты Паники: "Время признаний" - все игроки открывают свои руки.
   */
  private handlePanicConfession(room: GameState): { type: string; cardsMap: Record<string, Card[]> } {
    const cardsMap: Record<string, Card[]> = {};
    for (const p of room.players) {
      if (p.isAlive) {
        cardsMap[p.name] = [...p.hand];
      }
    }
    room.log.push(`🚨 ПАНИКА! "Время признаний" - Все показывают свои карты!`);
    return { type: 'CONFESSION', cardsMap };
  }

  /**
   * Карты Паники (Интерактивная): "Убирайся прочь!" - обмен местами с выбранным игроком.
   */
  private handlePanicGetOut(
    room: GameState,
    currentPlayer: Player,
    targetPlayerId: string,
    victimId?: string
  ): { success: boolean; error?: string } {
    if (!victimId) return { success: false, error: 'Необходимо выбрать цель' };
    const victim = room.players.find(p => p.id === victimId);
    if (!victim) return { success: false, error: 'Цель не найдена' };
    if (victim.isInQuarantine) return { success: false, error: 'Игрок в карантине, с ним нельзя поменяться местами' };

    const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
    const victimIndex = room.players.findIndex(p => p.id === victimId);

    room.players[playerIndex] = victim;
    room.players[victimIndex] = currentPlayer;
    room.currentTurnIndex = victimIndex;

    room.log.push(`🚨 ПАНИКА! "Убирайся прочь!" - ${currentPlayer.name} меняется местами с ${victim.name}!`);
    return { success: true };
  }

  /**
   * Карты Паники (Интерактивная): "Свидание вслепую" - сброс выбранной карты из руки и добор новой.
   */
  private handlePanicBlindDate(
    room: GameState,
    currentPlayer: Player,
    cardId?: string,
    drawReplacementCard?: (room: GameState, player: Player) => void
  ): { success: boolean; error?: string; endsTurn?: boolean } {
    if (!cardId) return { success: false, error: 'Необходимо выбрать карту из руки' };
    const handIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
    if (handIndex === -1) return { success: false, error: 'Карта не найдена в руке' };

    const cardToDiscard = currentPlayer.hand[handIndex];
    if (cardToDiscard.cardId === 'THING') return { success: false, error: 'Нельзя сбросить Нечто' };

    if (currentPlayer.role === 'INFECTED' && cardToDiscard.cardId === 'INFECTED') {
      const infectedCardsCount = currentPlayer.hand.filter(c => c.cardId === 'INFECTED').length;
      if (infectedCardsCount === 1) return { success: false, error: 'Нельзя сбросить последнюю карту "Заражение!"' };
    }

    const [discarded] = currentPlayer.hand.splice(handIndex, 1);
    room.discardPile.push(discarded);

    room.log.push(`🚨 ПАНИКА! "Свидание вслепую" - ${currentPlayer.name} сбрасывает одну карту и берет новую. Его ход заканчивается.`);

    if (drawReplacementCard) {
      drawReplacementCard(room, currentPlayer);
    }
    return { success: true, endsTurn: true };
  }

  /**
   * Карты Паники (Интерактивная): "Только между нами..." - показ руки соседу.
   */
  private handlePanicBetweenUs(
    room: GameState,
    currentPlayer: Player,
    targetPlayerId: string,
    victimId?: string
  ): { success: boolean; error?: string; revealData?: any } {
    if (!victimId) return { success: false, error: 'Необходимо выбрать соседа' };
    const victim = room.players.find(p => p.id === victimId);
    if (!victim) return { success: false, error: 'Сосед не найден' };

    const N = room.players.length;
    const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
    const victimIndex = room.players.findIndex(p => p.id === victimId);

    if (victimIndex !== (playerIndex + 1) % N && victimIndex !== (playerIndex - 1 + N) % N) {
      return { success: false, error: 'Цель должна быть соседом' };
    }

    room.log.push(`🚨 ПАНИКА! "Только между нами..." - ${currentPlayer.name} показывает свои карты игроку ${victim.name}!`);
    return {
      success: true,
      revealData: { type: 'PANIC_BETWEEN_US', targetName: victim.name, cards: currentPlayer.hand }
    };
  }

  /**
   * Карты Паники (Интерактивная): "Раз, два..." - смена мест с игроком через 2 человека.
   */
  private handlePanicOneTwo(
    room: GameState,
    currentPlayer: Player,
    victimId?: string
  ): { success: boolean; error?: string } {
    if (!victimId) return { success: false, error: 'Необходимо выбрать цель' };
    const victim = room.players.find(p => p.id === victimId);
    if (!victim) return { success: false, error: 'Цель не найдена' };
    if (victim.isInQuarantine || currentPlayer.isInQuarantine) return { success: false, error: 'Игрок в карантине, с ним нельзя поменяться местами' };

    const N = room.players.length;
    const playerIndex = room.players.findIndex(p => p.id === currentPlayer.id);
    const victimIndex = room.players.findIndex(p => p.id === victimId);

    if (victimIndex !== (playerIndex + 3) % N && victimIndex !== (playerIndex - 3 + N) % N) {
      return { success: false, error: 'Цель должна находиться ровно через 2 человек от вас' };
    }

    room.players[playerIndex] = victim;
    room.players[victimIndex] = currentPlayer;
    room.currentTurnIndex = victimIndex;

    room.log.push(`🚨 ПАНИКА! "Раз, два..." - ${currentPlayer.name} меняется местами с ${victim.name}!`);
    return { success: true };
  }

  /**
   * Карты Паники (Интерактивная): "Давай дружить?" - принудительный обмен картой с соседом/выбранным игроком.
   */
  private handlePanicFriends(
    room: GameState,
    currentPlayer: Player,
    panicCard: Card,
    victimId?: string
  ): { success: boolean; error?: string } {
    if (!victimId) return { success: false, error: 'Необходимо выбрать цель' };
    const victim = room.players.find(p => p.id === victimId);
    if (!victim) return { success: false, error: 'Цель не найдена' };
    if (victim.isInQuarantine) return { success: false, error: 'Игрок в карантине, с ним нельзя меняться картами' };

    room.pendingTrade = {
      fromPlayerId: currentPlayer.id,
      toPlayerId: victim.id,
      isSeduction: true
    };
    room.phase = 'TRADE';
    room.pendingPanic = undefined;
    room.discardPile.push(panicCard);
    room.log.push(`🚨 ПАНИКА! "Давай дружить?" - ${currentPlayer.name} принудительно обменивается картой с ${victim.name}!`);
    return { success: true };
  }
}
