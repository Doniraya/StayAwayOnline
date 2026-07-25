import { GameState, Player, Card } from '../types/game';
import { randomInt } from 'crypto';

export function isDoorBarredBetween(room: GameState, index1: number, index2: number): boolean {
  const N = room.players.length;
  if (index2 === (index1 + 1) % N) return room.barredDoors[index1];
  if (index2 === (index1 - 1 + N) % N) return room.barredDoors[index2];
  return false;
}

export class CardResolver {
  public resolveInstantPanic(room: GameState, player: Player, panicCard: Card, drawReplacementCard: (room: GameState, player: Player) => void): any {
    switch (panicCard.cardId) {
      case 'PANIC_OLD_ROPES': {
        for (const p of room.players) {
          p.isInQuarantine = false;
          p.quarantineTurnsLeft = 0;
        }
        room.log.push(`🚨 ПАНИКА! "Старые верёвки" - Все карантины сняты!`);
        return null;
      }
      case 'PANIC_THREE_FOUR': {
        room.barredDoors.fill(false);
        room.log.push(`🚨 ПАНИКА! "...Три, четыре..." - Все двери открыты!`);
        return null;
      }
      case 'PANIC_OOPS': {
        room.log.push(`🚨 ПАНИКА! "Уупс!" - ${player.name} случайно показывает все свои карты!`);
        return { type: 'OOPS', playerName: player.name, cards: [...player.hand] };
      }
      case 'PANIC_FORGETFULNESS': {
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

        for (const c of toDiscard) {
          const idx = player.hand.findIndex(handCard => handCard.id === c.id);
          if (idx !== -1) {
            const [discarded] = player.hand.splice(idx, 1);
            room.discardPile.push(discarded);
            drawReplacementCard(room, player);
          }
        }
        room.log.push(`🚨 ПАНИКА! "Забывчивость" - ${player.name} сбрасывает ${discardCount} карты и берет новые!`);
        return null;
      }
      case 'PANIC_PARTY': {
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
      case 'PANIC_CHAIN_REACTION': {
        const N = room.players.length;
        const collectedCards: { playerId: string; card: Card }[] = [];
        for (const p of room.players) {
          if (!p.isAlive) continue;
          const legalCards = p.hand.filter(c => {
            if (c.cardId === 'THING') return false;
            if (p.role === 'HUMAN' && c.cardId === 'INFECTED') return false;
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
          let nextIndex = pIndex;
          do {
            nextIndex = (nextIndex + room.direction + N) % N;
          } while (!room.players[nextIndex].isAlive);

          room.players[nextIndex].hand.push(card);
        }

        room.log.push(`🚨 ПАНИКА! "Цепная реакция" - Все игроки одновременно передали 1 случайную карту соседу!`);
        (room as any).forceEndTurn = true;
        return null;
      }
      case 'PANIC_CONFESSION': {
        const cardsMap: Record<string, Card[]> = {};
        for (const p of room.players) {
          if (p.isAlive) {
            cardsMap[p.name] = [...p.hand];
          }
        }
        room.log.push(`🚨 ПАНИКА! "Время признаний" - Все показывают свои карты!`);
        return { type: 'CONFESSION', cardsMap };
      }
      default:
        return undefined;
    }
  }

  private handleFlamethrower(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      if (victim.isInQuarantine) {
        return { success: false, error: 'Игрок в Карантине защищен от Огнемёта!' };
      }

      const hasDefense = victim.hand.some(c => c.cardId === 'MISS' || c.cardId === 'NO_BARBECUE');

      if (hasDefense) {
        room.phase = 'RESPOND';
        room.pendingDefense = { attackerId: player.id, victimId: victim.id, attackType: 'FLAMETHROWER' };
        room.log.push(`⚠️ ${player.name} целует Огнемётом в ${victim.name}! ${victim.name} решается разыграть карту Защиты...`);
        return { success: true, earlyReturn: true };
      }

      victim.isAlive = false;
      room.log.push(`🔥 ${player.name} сжёг игрока ${victim.name}!`);
    }
    return { success: true };
  }

  private handleAnalysis(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const target = room.players.find(p => p.id === victimPlayerId);
    if (target) {
      room.log.push(`🔍 ${player.name} применил АНАЛИЗ на игрока ${target.name}.`);
      return { success: true, revealData: { type: 'ANALYSIS', targetName: target.name, cards: target.hand } };
    }
    return { success: true };
  }

  private handleWhiskey(room: GameState, player: Player): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    room.log.push(`🥃 ${player.name} выпил ВИСКИ и показал свои карты всем!`);
    return { success: true, revealData: { type: 'WHISKEY', playerName: player.name, cards: player.hand } };
  }

  private handleQuarantine(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      victim.isInQuarantine = true;
      victim.quarantineTurnsLeft = 3;
      room.log.push(`☣️ ${player.name} поместил игрока ${victim.name} в КАРАНТИН!`);
    }
    return { success: true };
  }

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

  private handleLookAround(room: GameState, player: Player): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    room.direction = (room.direction * -1) as 1 | -1;
    room.log.push(`🔄 ${player.name} сыграл "Гляди по сторонам"! Направление хода изменено.`);
    return { success: true };
  }

  private handleSuspicion(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim && victim.hand.length > 0) {
      const randomVictimCard = victim.hand[randomInt(victim.hand.length)];
      room.log.push(`👀 ${player.name} подозревает ${victim.name} и тайно смотрит одну его карту.`);
      return { success: true, revealData: { type: 'SUSPICION', targetName: victim.name, card: randomVictimCard } };
    }
    return { success: true };
  }

  private handleTemptation(room: GameState, player: Player, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      if (victim.isInQuarantine) {
        return { success: false, error: 'Игрок в Карантине не может участвовать в обмене!' };
      }
      room.phase = 'TRADE';
      room.pendingTrade = { fromPlayerId: player.id, toPlayerId: victim.id, isSeduction: true };
      room.log.push(`🍷 ${player.name} разыграл Соблазн и предлагает обмен игроку ${victim.name}!`);
    }
    return { success: true, revealData: null };
  }

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

      [room.players[playerIndex], room.players[victimIndex]] = [room.players[victimIndex], room.players[playerIndex]];
      room.currentTurnIndex = victimIndex; // update pointer to original player

      room.log.push(`🪑 ${player.name} поменялся местами с ${victim.name}!`);
    }
    return { success: true };
  }

  private handleYouBetterRun(room: GameState, player: Player, targetPlayerId: string, victimPlayerId?: string): { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } {
    const victim = room.players.find(p => p.id === victimPlayerId);
    if (victim) {
      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const victimIndex = room.players.findIndex(p => p.id === victimPlayerId);

      if (victim.isInQuarantine) {
        return { success: false, error: 'Нельзя поменяться местами с игроком в карантине!' };
      }

      [room.players[playerIndex], room.players[victimIndex]] = [room.players[victimIndex], room.players[playerIndex]];
      room.currentTurnIndex = victimIndex; // update pointer to original player

      room.log.push(`🪑 ${player.name} поменялся местами с ${victim.name}!`);
    }
    return { success: true };
  }

  public resolveActionCard(
    room: GameState,
    player: Player,
    playedCard: Card,
    targetPlayerId: string,
    victimPlayerId?: string,
    doorIndex?: number
  ): { success: boolean; error?: string; revealData?: any; isGameOver?: boolean; earlyReturn?: boolean } {
    if (player.isInQuarantine) {
      return { success: false, error: 'Игрок в карантине не может разыгрывать карты, только сбрасывать!' };
    }

    if (['FLAMETHROWER', 'ANALYSIS', 'WHISKEY', 'SUSPICION'].includes(playedCard.cardId) && victimPlayerId) {
      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const victimIndex = room.players.findIndex(p => p.id === victimPlayerId);

      if (playedCard.cardId === 'SUSPICION') {
        const N = room.players.length;
        if (victimIndex !== (playerIndex + 1) % N && victimIndex !== (playerIndex - 1 + N) % N) {
          return { success: false, error: 'Карта "Подозрение" может быть сыграна только на соседа!' };
        }
      }

      if (isDoorBarredBetween(room, playerIndex, victimIndex)) {
        return { success: false, error: 'Нельзя сыграть карту сквозь Заколоченную Дверь!' };
      }
    }

    if (['FLAMETHROWER', 'ANALYSIS', 'QUARANTINE', 'SUSPICION', 'TEMPTATION', 'CHANGE_SEATS', 'YOU_BETTER_RUN'].includes(playedCard.cardId) && !victimPlayerId) {
      return { success: false, error: `Для карты "${playedCard.name}" необходимо выбрать цель!` };
    }

    if (playedCard.cardId === 'BARRED_DOOR' && (doorIndex === undefined || doorIndex === null)) {
      return { success: false, error: 'Необходимо выбрать проход для заколочивания!' };
    }

    if (playedCard.cardId === 'AXE' && !victimPlayerId && (doorIndex === undefined || doorIndex === null)) {
      return { success: false, error: `Для карты "${playedCard.name}" необходимо выбрать цель (игрока или дверь)!` };
    }

    let revealData: any = null;
    let effectResult: { success: boolean; error?: string; revealData?: any; earlyReturn?: boolean } = { success: true };

    switch (playedCard.cardId) {
      case 'FLAMETHROWER':
        effectResult = this.handleFlamethrower(room, player, victimPlayerId);
        break;
      case 'ANALYSIS':
        effectResult = this.handleAnalysis(room, player, victimPlayerId);
        break;
      case 'WHISKEY':
        effectResult = this.handleWhiskey(room, player);
        break;
      case 'QUARANTINE':
        effectResult = this.handleQuarantine(room, player, victimPlayerId);
        break;
      case 'BARRED_DOOR':
        effectResult = this.handleBarredDoor(room, player, targetPlayerId, doorIndex);
        break;
      case 'LOOK_AROUND':
        effectResult = this.handleLookAround(room, player);
        break;
      case 'SUSPICION':
        effectResult = this.handleSuspicion(room, player, victimPlayerId);
        break;
      case 'TEMPTATION':
        effectResult = this.handleTemptation(room, player, victimPlayerId);
        break;
      case 'AXE':
        effectResult = this.handleAxe(room, player, victimPlayerId, doorIndex);
        break;
      case 'CHANGE_SEATS':
        effectResult = this.handleChangeSeats(room, player, targetPlayerId, victimPlayerId);
        break;
      case 'YOU_BETTER_RUN':
        effectResult = this.handleYouBetterRun(room, player, targetPlayerId, victimPlayerId);
        break;
      default:
        break;
    }

    if (!effectResult.success) {
      return { success: false, error: effectResult.error };
    }

    if (effectResult.earlyReturn) {
      return { success: effectResult.success, revealData: effectResult.revealData, earlyReturn: true };
    }

    revealData = effectResult.revealData || null;
    return { success: true, revealData };
  }

  public resolveTargetedPanic(
    room: GameState,
    currentPlayer: Player,
    panicCard: Card,
    targetPlayerId: string,
    victimId?: string,
    cardId?: string,
    drawReplacementCard?: (room: GameState, player: Player) => void
  ): { success: boolean; error?: string; revealData?: any; endsTurn?: boolean } {
    let revealData: any = null;
    let endsTurn = false;

    if (panicCard.cardId === 'PANIC_GET_OUT') {
      if (!victimId) return { success: false, error: 'Необходимо выбрать цель' };
      const victim = room.players.find(p => p.id === victimId);
      if (!victim) return { success: false, error: 'Цель не найдена' };
      if (victim.isInQuarantine) return { success: false, error: 'Игрок в карантине, с ним нельзя поменяться местами' };

      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const victimIndex = room.players.findIndex(p => p.id === victimId);

      room.players[playerIndex] = victim;
      room.players[victimIndex] = currentPlayer;

      // Update current turn index so the current player keeps their turn despite moving
      room.currentTurnIndex = victimIndex;

      room.log.push(`🚨 ПАНИКА! "Убирайся прочь!" - ${currentPlayer.name} меняется местами с ${victim.name}!`);
    } else if (panicCard.cardId === 'PANIC_BLIND_DATE') {
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

      if (drawReplacementCard) {
        drawReplacementCard(room, currentPlayer);
      }
      room.log.push(`🚨 ПАНИКА! "Свидание вслепую" - ${currentPlayer.name} сбрасывает одну карту и берет новую. Его ход заканчивается.`);
      endsTurn = true;
    } else if (panicCard.cardId === 'PANIC_BETWEEN_US') {
      if (!victimId) return { success: false, error: 'Необходимо выбрать соседа' };
      const victim = room.players.find(p => p.id === victimId);
      if (!victim) return { success: false, error: 'Сосед не найден' };

      const N = room.players.length;
      const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
      const victimIndex = room.players.findIndex(p => p.id === victimId);

      if (victimIndex !== (playerIndex + 1) % N && victimIndex !== (playerIndex - 1 + N) % N) {
        return { success: false, error: 'Цель должна быть соседом' };
      }

      revealData = { type: 'PANIC_BETWEEN_US', targetName: victim.name, cards: currentPlayer.hand };
      room.log.push(`🚨 ПАНИКА! "Только между нами..." - ${currentPlayer.name} показывает свои карты игроку ${victim.name}!`);
    } else if (panicCard.cardId === 'PANIC_ONE_TWO') {
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
    } else if (panicCard.cardId === 'PANIC_FRIENDS') {
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
    } else {
      return { success: false, error: 'Неизвестная интерактивная карта паники' };
    }

    return { success: true, revealData, endsTurn };
  }
}
