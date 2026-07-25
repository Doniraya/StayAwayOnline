export type CardType = 'STAY_AWAY' | 'PANIC';

export type CardId =
  // Инфекция
  | 'THING'               // Нечто
  | 'INFECTED'            // Заражение!

  // Действия
  | 'SUSPICION'           // Подозрение
  | 'ANALYSIS'            // Анализ
  | 'TEMPTATION'          // Соблазн
  | 'PERSISTENCE'         // Упорство
  | 'YOU_BETTER_RUN'      // Сматывай удочки!
  | 'CHANGE_SEATS'        // Меняемся местами!
  | 'LOOK_AROUND'         // Гляди по сторонам
  | 'FLAMETHROWER'        // Огнемёт
  | 'WHISKEY'             // Виски
  | 'AXE'                 // Топор

  // Защита
  | 'NO_THANKS'           // Нет уж, спасибо!
  | 'FEAR'                // Страх
  | 'MISS'                // Мимо!
  | 'IM_FINE_HERE'        // Мне и здесь неплохо
  | 'NO_BARBECUE'         // Никакого шашлыка!

  // Препятствия
  | 'BARRED_DOOR'         // Заколоченная дверь
  | 'QUARANTINE'          // Карантин

  // Паника
  | 'PANIC_PARTY'         // И это вы называете вечеринкой?
  | 'PANIC_GET_OUT'       // Убирайся прочь!
  | 'PANIC_ONE_TWO'       // Раз, два...
  | 'PANIC_CHAIN_REACTION'// Цепная реакция
  | 'PANIC_BLIND_DATE'    // Свидание вслепую
  | 'PANIC_FRIENDS'       // Давай дружить?
  | 'PANIC_FORGETFULNESS' // Забывчивость
  | 'PANIC_BETWEEN_US'    // Только между нами...
  | 'PANIC_CONFESSION'    // Время признаний
  | 'PANIC_OOPS'          // Уупс!
  | 'PANIC_THREE_FOUR'    // ...Три, четыре...
  | 'PANIC_OLD_ROPES'     // Старые верёвки
  | 'UNKNOWN';

export interface Card {
  id: string;
  cardId: CardId;
  name: string;
  type: CardType;
  minPlayers: number;
  description: string;
  imageUrl?: string;
}

export type Role = 'HUMAN' | 'THING' | 'INFECTED';

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  isHost: boolean;
  hand: Card[];
  role: Role;
  isAlive: boolean;
  isInQuarantine: boolean;
}

export type GamePhase =
  | 'LOBBY'
  | 'DRAW'
  | 'PLAY_OR_DISCARD'
  | 'RESPOND'
  | 'TRADE'
  | 'TRADE_ACCEPT'
  | 'GAME_OVER';

export interface PendingTrade {
  fromPlayerId: string;
  toPlayerId: string;
  offeredCard?: Card;
}

export interface PendingDefense {
  attackerId: string;
  victimId: string;
  attackType: string;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  currentTurnIndex: number;
  direction: 1 | -1;
  deck: Card[];
  discardPile: Card[];
  barredDoors: boolean[];
  pendingTrade?: PendingTrade;
  pendingDefense?: PendingDefense;
  winnerRole?: 'HUMANS' | 'THING';
  log: string[];
}