import { GameState, Player, Card } from '../types/game';
import { isDoorBarredBetween } from './CardResolver';
import { randomInt } from 'crypto';

export class BotAIEngine {
  private botTimers: Map<string, NodeJS.Timeout> = new Map();

  public clearBotTimer(roomId: string): void {
    const timer = this.botTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.botTimers.delete(roomId);
    }
  }

  public checkAndExecuteBotTurn(
    room: GameState,
    gameEngine: any,
    broadcastCallback: (revealData?: any) => void
  ): void {
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
    else if (room.phase === 'RESPOND' && room.pendingDefense) {
      const victim = room.players.find(p => p.id === room.pendingDefense!.victimId);
      if (victim?.isBot && victim?.isAlive) actingBot = victim;
    }
    else if (room.phase === 'RESOLVE_PANIC' && room.pendingPanic) {
      const current = room.players[room.currentTurnIndex];
      if (current?.isBot && current?.isAlive) actingBot = current;
    }
    else if (room.phase === 'RESOLVE_PERSISTENCE' && room.pendingPersistence) {
      const current = room.players[room.currentTurnIndex];
      if (current?.isBot && current?.isAlive) actingBot = current;
    }

    if (!actingBot) {
      this.clearBotTimer(room.roomId);
      return;
    }

    this.clearBotTimer(room.roomId);

    const delay = room.botDelayMs || 3000;
    const timer = setTimeout(() => {
      const result = this.executeBotAction(room, gameEngine, actingBot);
      broadcastCallback(result?.revealData);
    }, delay);

    this.botTimers.set(room.roomId, timer);
  }

  public executeBotAction(room: GameState, gameEngine: any, bot?: Player): { revealData?: any } {
    if (!bot) {
      if (room.phase === 'DRAW' || room.phase === 'PLAY_OR_DISCARD' || room.phase === 'TRADE') {
        const current = room.players[room.currentTurnIndex];
        if (current?.isBot && current?.isAlive) bot = current;
      } 
      else if (room.phase === 'TRADE_ACCEPT' && room.pendingTrade) {
        const target = room.players.find(p => p.id === room.pendingTrade!.toPlayerId);
        if (target?.isBot && target?.isAlive) bot = target;
      } 
      else if (room.phase === 'RESPOND' && room.pendingDefense) {
        const victim = room.players.find(p => p.id === room.pendingDefense!.victimId);
        if (victim?.isBot && victim?.isAlive) bot = victim;
      }
      else if (room.phase === 'RESOLVE_PANIC' && room.pendingPanic) {
        const current = room.players[room.currentTurnIndex];
        if (current?.isBot && current?.isAlive) bot = current;
      }
      else if (room.phase === 'RESOLVE_PERSISTENCE' && room.pendingPersistence) {
        const current = room.players[room.currentTurnIndex];
        if (current?.isBot && current?.isAlive) bot = current;
      }
    }

    if (!bot) return {};

    gameEngine.touchRoom(room);
    const host = room.players.find(p => p.isHost);
    const requesterId = host ? host.id : bot.id;
    let lastRevealData: any;

    if (room.phase === 'DRAW') {
      const res = gameEngine.drawCard(room.roomId, requesterId, bot.id);
      return { revealData: res.revealData };
    }
    else if (room.phase === 'PLAY_OR_DISCARD') {
      const botIndex = room.players.findIndex(p => p.id === bot!.id);
      const N = room.players.length;
      const leftNeighborIndex = (botIndex + 1) % N;
      const rightNeighborIndex = (botIndex - 1 + N) % N;
      const leftNeighbor = room.players[leftNeighborIndex];
      const rightNeighbor = room.players[rightNeighborIndex];

      let played = false;

      // 1. Огнемёт (Flamethrower)
      const flamethrowerCard = bot.hand.find(c => c.cardId === 'FLAMETHROWER');
      if (flamethrowerCard && !bot.isInQuarantine) {
        const validTargets: Player[] = [];
        if (leftNeighbor.isAlive && !leftNeighbor.isInQuarantine && !isDoorBarredBetween(room, botIndex, leftNeighborIndex)) {
          if (bot.role !== 'THING' || leftNeighbor.role !== 'THING') validTargets.push(leftNeighbor);
        }
        if (rightNeighbor.isAlive && !rightNeighbor.isInQuarantine && !isDoorBarredBetween(room, botIndex, rightNeighborIndex)) {
          if (bot.role !== 'THING' || rightNeighbor.role !== 'THING') validTargets.push(rightNeighbor);
        }
        if (validTargets.length > 0) {
          const target = validTargets[randomInt(validTargets.length)];
          const res = gameEngine.playCard(room.roomId, requesterId, bot.id, flamethrowerCard.id, target.id);
          if (res.success) {
            played = true;
            lastRevealData = res.revealData;
          }
        }
      }

      // 2. Топор (Axe)
      if (!played && !bot.isInQuarantine) {
        const axeCard = bot.hand.find(c => c.cardId === 'AXE');
        if (axeCard) {
          const leftDoorIndex = botIndex;
          const rightDoorIndex = (botIndex - 1 + N) % N;
          if (room.barredDoors[leftDoorIndex]) {
            const res = gameEngine.playCard(room.roomId, requesterId, bot.id, axeCard.id, undefined, leftDoorIndex);
            if (res.success) {
              played = true;
              lastRevealData = res.revealData;
            }
          } else if (room.barredDoors[rightDoorIndex]) {
            const res = gameEngine.playCard(room.roomId, requesterId, bot.id, axeCard.id, undefined, rightDoorIndex);
            if (res.success) {
              played = true;
              lastRevealData = res.revealData;
            }
          } else {
            const quarantinedNeighbor = [leftNeighbor, rightNeighbor].find(p => p.isAlive && p.isInQuarantine);
            if (quarantinedNeighbor) {
              const res = gameEngine.playCard(room.roomId, requesterId, bot.id, axeCard.id, quarantinedNeighbor.id);
              if (res.success) {
                played = true;
                lastRevealData = res.revealData;
              }
            }
          }
        }
      }

      // 3. Анализ / Подозрение (Analysis / Suspicion)
      if (!played && !bot.isInQuarantine) {
        const analysisCard = bot.hand.find(c => c.cardId === 'ANALYSIS');
        const suspicionCard = bot.hand.find(c => c.cardId === 'SUSPICION');
        const cardToPlay = analysisCard || suspicionCard;

        if (cardToPlay) {
          const validTargets = [leftNeighbor, rightNeighbor].filter(p => 
            p.isAlive && !isDoorBarredBetween(room, botIndex, room.players.findIndex(rp => rp.id === p.id))
          );
          if (validTargets.length > 0) {
            const target = validTargets[randomInt(validTargets.length)];
            const res = gameEngine.playCard(room.roomId, requesterId, bot.id, cardToPlay.id, target.id);
            if (res.success) {
              played = true;
              lastRevealData = res.revealData;
            }
          }
        }
      }

      // 4. Карантин (Quarantine)
      if (!played && !bot.isInQuarantine) {
        const quarantineCard = bot.hand.find(c => c.cardId === 'QUARANTINE');
        if (quarantineCard) {
          const validTargets = [leftNeighbor, rightNeighbor].filter(p => p.isAlive && !p.isInQuarantine);
          if (validTargets.length > 0) {
            const target = validTargets[randomInt(validTargets.length)];
            const res = gameEngine.playCard(room.roomId, requesterId, bot.id, quarantineCard.id, target.id);
            if (res.success) {
              played = true;
              lastRevealData = res.revealData;
            }
          }
        }
      }

      // 5. Заколоченная дверь (Barred Door)
      if (!played && !bot.isInQuarantine) {
        const doorCard = bot.hand.find(c => c.cardId === 'BARRED_DOOR');
        if (doorCard) {
          const leftDoorIndex = botIndex;
          const rightDoorIndex = (botIndex - 1 + N) % N;
          const openDoors: number[] = [];
          if (!room.barredDoors[leftDoorIndex]) openDoors.push(leftDoorIndex);
          if (!room.barredDoors[rightDoorIndex]) openDoors.push(rightDoorIndex);

          if (openDoors.length > 0) {
            const chosenDoor = openDoors[randomInt(openDoors.length)];
            const res = gameEngine.playCard(room.roomId, requesterId, bot.id, doorCard.id, undefined, chosenDoor);
            if (res.success) {
              played = true;
              lastRevealData = res.revealData;
            }
          }
        }
      }

      // 6. Гляди по сторонам (Look Around)
      if (!played && !bot.isInQuarantine) {
        const lookAroundCard = bot.hand.find(c => c.cardId === 'LOOK_AROUND');
        if (lookAroundCard) {
          const res = gameEngine.playCard(room.roomId, requesterId, bot.id, lookAroundCard.id);
          if (res.success) {
            played = true;
            lastRevealData = res.revealData;
          }
        }
      }

      // Если не сыграна ни одна карта действий — сбрасываем карту
      if (!played) {
        const safeDiscardCards = bot.hand.filter(c => {
          if (c.cardId === 'THING') return false;
          if (bot!.role === 'INFECTED' && c.cardId === 'INFECTED') {
            const count = bot!.hand.filter(hc => hc.cardId === 'INFECTED').length;
            if (count <= 1) return false;
          }
          return true;
        });

        if (safeDiscardCards.length > 0) {
          const randomCard = safeDiscardCards[randomInt(safeDiscardCards.length)];
          gameEngine.discardCard(room.roomId, requesterId, bot.id, randomCard.id);
        }
      }
    }
    else if (room.phase === 'TRADE') {
      let legalCards: Card[] = [];
      const partner = room.players.find(p => p.id === room.pendingTrade?.toPlayerId);

      if (bot.role === 'THING') {
        const infectionCard = bot.hand.find(c => c.cardId === 'INFECTED');
        // 80% chance for thing to offer infection card
        if (infectionCard && randomInt(100) < 80) {
          legalCards = [infectionCard];
        } else {
          legalCards = bot.hand.filter(c => c.cardId !== 'THING');
        }
      } else if (bot.role === 'INFECTED' && partner?.role === 'THING') {
        const infectedCount = bot.hand.filter(c => c.cardId === 'INFECTED').length;
        if (infectedCount > 1) {
          legalCards = bot.hand.filter(c => c.cardId !== 'THING');
        } else {
          legalCards = bot.hand.filter(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED');
        }
      } else {
        legalCards = bot.hand.filter(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED');
      }

      if (legalCards.length === 0) {
        if (bot.role === 'HUMAN' || (bot.role === 'INFECTED' && partner?.role !== 'THING')) {
          legalCards = bot.hand.filter(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED');
        } else {
          legalCards = bot.hand.filter(c => c.cardId !== 'THING');
        }
      }
      if (legalCards.length > 0) {
        const tradeCard = legalCards[randomInt(legalCards.length)];
        gameEngine.offerTrade(room.roomId, requesterId, bot.id, tradeCard.id);
      }
    }
    else if (room.phase === 'TRADE_ACCEPT') {
      if (bot.id !== room.pendingTrade?.toPlayerId) return { revealData: lastRevealData };
      const noThanksCard = bot.hand.find(c => c.cardId === 'NO_THANKS');
      // 30% шанс, что бот отклонит обмен картой "Нет уж, спасибо!"
      if (noThanksCard && randomInt(100) < 30) {
        const res = gameEngine.cancelTradeWithNoThanks(room.roomId, requesterId, bot.id, noThanksCard.id);
        if (res.success) lastRevealData = (res as any).revealData;
        return { revealData: lastRevealData };
      }

      const sender = room.players.find(p => p.id === room.pendingTrade?.fromPlayerId);

      // BUG-003 fix: Формируем список легальных карт с учётом всех правил
      let legalCards = bot.hand.filter(c => {
        if (c.cardId === 'THING') return false;
        if (c.cardId === 'INFECTED') {
          // Человек НЕ может передавать "Заражение!"
          if (bot.role === 'HUMAN') return false;
          // Заражённый обязан держать минимум 1 карту "Заражение!" на руке
          if (bot.role === 'INFECTED') {
            const infectedCount = bot.hand.filter(hc => hc.cardId === 'INFECTED').length;
            if (infectedCount <= 1) return false;
            // Заражённый может передать "Заражение!" только Нечто
            if (sender?.role !== 'THING') return false;
          }
        }
        return true;
      });

      // Фоллбэк: если вообще нечего отдать (кроме THING), отдаём что есть
      if (legalCards.length === 0) {
        legalCards = bot.hand.filter(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED');
      }
      if (legalCards.length === 0) {
        legalCards = bot.hand.filter(c => c.cardId !== 'THING');
      }

      if (legalCards.length > 0) {
        const responseCard = legalCards[randomInt(legalCards.length)];
        const res = gameEngine.acceptTrade(room.roomId, requesterId, bot.id, responseCard.id);
        if (res.success) lastRevealData = (res as any).revealData;
      }
    }
    else if (room.phase === 'RESPOND') {
      const attackType = room.pendingDefense?.attackType;
      let defCard: Card | undefined;
      if (attackType === 'CHANGE_SEATS' || attackType === 'YOU_BETTER_RUN') {
        defCard = bot.hand.find(c => c.cardId === 'IM_FINE_HERE');
      } else {
        defCard = bot.hand.find(c => c.cardId === 'MISS' || c.cardId === 'NO_BARBECUE');
      }
      const res = gameEngine.respondToAttack(room.roomId, requesterId, bot.id, defCard ? defCard.id : undefined);
      if (res.success) lastRevealData = (res as any).revealData;
    }
    else if (room.phase === 'RESOLVE_PANIC' && room.pendingPanic) {
      const panicCard = room.pendingPanic;
      if (panicCard.cardId === 'PANIC_BLIND_DATE') {
        let legalCards = bot.hand.filter(c => c.cardId !== 'THING');
        if (bot.role === 'INFECTED') {
          const infectedCards = legalCards.filter(c => c.cardId === 'INFECTED');
          if (infectedCards.length === 1) {
            legalCards = legalCards.filter(c => c.cardId !== 'INFECTED');
          } else if (infectedCards.length > 1) {
            const firstInfectedId = infectedCards[0].id;
            legalCards = legalCards.filter(c => c.id !== firstInfectedId);
          }
        }
        if (legalCards.length === 0) legalCards = bot.hand.filter(c => c.cardId !== 'THING');

        if (legalCards.length > 0) {
          const chosenCard = legalCards[randomInt(legalCards.length)];
          const res = gameEngine.resolveTargetedPanic(room.roomId, requesterId, bot.id, undefined, chosenCard.id);
          if (res.success) lastRevealData = res.revealData;
        }
      } else if (['PANIC_GET_OUT', 'PANIC_FRIENDS', 'PANIC_BETWEEN_US', 'PANIC_ONE_TWO'].includes(panicCard.cardId)) {
        const N = room.players.length;
        const playerIndex = room.players.findIndex(p => p.id === bot!.id);

        let validTargets = room.players.filter(p => p.isAlive && p.id !== bot!.id);

        if (panicCard.cardId === 'PANIC_BETWEEN_US') {
          validTargets = validTargets.filter(p => {
            const victimIndex = room.players.findIndex(rp => rp.id === p.id);
            return victimIndex === (playerIndex + 1) % N || victimIndex === (playerIndex - 1 + N) % N;
          });
        } else if (panicCard.cardId === 'PANIC_ONE_TWO') {
          validTargets = validTargets.filter(p => {
            if (p.isInQuarantine || bot!.isInQuarantine) return false;
            const victimIndex = room.players.findIndex(rp => rp.id === p.id);
            return victimIndex === (playerIndex + 3) % N || victimIndex === (playerIndex - 3 + N) % N;
          });
        } else if (panicCard.cardId === 'PANIC_GET_OUT' || panicCard.cardId === 'PANIC_FRIENDS') {
          validTargets = validTargets.filter(p => !p.isInQuarantine);
        }

        if (validTargets.length > 0) {
          const chosenVictim = validTargets[randomInt(validTargets.length)];
          const res = gameEngine.resolveTargetedPanic(room.roomId, requesterId, bot.id, chosenVictim.id);
          if (res.success) lastRevealData = res.revealData;
        }
      }
    }
    else if (room.phase === 'RESOLVE_PERSISTENCE' && room.pendingPersistence) {
      const cards = room.pendingPersistence.cards;
      if (cards.length > 0) {
        const safeCards = cards.filter(c => c.cardId !== 'THING' && c.cardId !== 'INFECTED');
        const chosenCard = safeCards.length > 0 ? safeCards[randomInt(safeCards.length)] : cards[randomInt(cards.length)];
        const res = gameEngine.resolvePersistenceCard(room.roomId, requesterId, bot.id, chosenCard.id);
        if (res.success) lastRevealData = (res as any).revealData;
      }
    }

    return { revealData: lastRevealData };
  }
}
