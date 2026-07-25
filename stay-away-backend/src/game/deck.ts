import { Card, CardId } from '../types/game';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';

interface CardRule {
  cardId: CardId;
  name: string;
  type: 'STAY_AWAY' | 'PANIC';
  imageUrl: string;
  description: string;
  quantities: { [playerCount: number]: number };
}

const CARD_RULES: CardRule[] = [
  // --- ИНФЕКЦИЯ ---
  {
    cardId: 'THING',
    name: 'Нечто',
    type: 'STAY_AWAY',
    imageUrl: '/cards/thing.png',
    description: 'Вы — Главный монстр. Заражайте остальных!',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 }
  },
  {
    cardId: 'INFECTED',
    name: 'Заражение!',
    type: 'STAY_AWAY',
    imageUrl: '/cards/infected_1.png',
    description: 'Получив эту карту от Нечто, вы становитесь Зараженным.',
    quantities: { 4: 8, 5: 8, 6: 10, 7: 12, 8: 13, 9: 15, 10: 17, 11: 20, 12: 20 }
  },

  // --- ДЕЙСТВИЯ ---
  {
    cardId: 'SUSPICION',
    name: 'Подозрение',
    type: 'STAY_AWAY',
    imageUrl: '/cards/suspicion.png',
    description: 'Посмотрите 1 случайную карту соседа.',
    quantities: { 4: 4, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 8, 12: 8 }
  },
  {
    cardId: 'ANALYSIS',
    name: 'Анализ',
    type: 'STAY_AWAY',
    imageUrl: '/cards/analysis.png',
    description: 'Посмотрите все карты на руке соседа.',
    quantities: { 4: 0, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 3 }
  },
  {
    cardId: 'TEMPTATION',
    name: 'Соблазн',
    type: 'STAY_AWAY',
    imageUrl: '/cards/temptation.png',
    description: 'Предложите обмен любому игроку.',
    quantities: { 4: 2, 5: 2, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 7, 12: 7 }
  },
  {
    cardId: 'PERSISTENCE',
    name: 'Упорство',
    type: 'STAY_AWAY',
    imageUrl: '/cards/persistence.png',
    description: 'Повторите попытку обмена.',
    quantities: { 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 4, 10: 5, 11: 5, 12: 5 }
  },
  {
    cardId: 'YOU_BETTER_RUN',
    name: 'Сматывай удочки!',
    type: 'STAY_AWAY',
    imageUrl: '/cards/you_better_run.png',
    description: 'Смените место с любым игроком.',
    quantities: { 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 4, 10: 4, 11: 5, 12: 5 }
  },
  {
    cardId: 'CHANGE_SEATS',
    name: 'Меняемся местами!',
    type: 'STAY_AWAY',
    imageUrl: '/cards/change_seats.png',
    description: 'Поменяйтесь местами с соседним игроком.',
    quantities: { 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 4, 10: 4, 11: 5, 12: 5 }
  },
  {
    cardId: 'LOOK_AROUND',
    name: 'Гляди по сторонам',
    type: 'STAY_AWAY',
    imageUrl: '/cards/panic_look_around.png',
    description: 'Все смотрят карту соседа справа.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'FLAMETHROWER',
    name: 'Огнемёт',
    type: 'STAY_AWAY',
    imageUrl: '/cards/flamethrower.png',
    description: 'Убейте соседнего игрока.',
    quantities: { 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4, 11: 5, 12: 5 }
  },
  {
    cardId: 'WHISKEY',
    name: 'Виски',
    type: 'STAY_AWAY',
    imageUrl: '/cards/whiskey.png',
    description: 'Покажите все свои карты всем игрокам.',
    quantities: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 2, 10: 3, 11: 3, 12: 3 }
  },
  {
    cardId: 'AXE',
    name: 'Топор',
    type: 'STAY_AWAY',
    imageUrl: '/cards/axe.png',
    description: 'Сломайте запертую дверь или карантин.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },

  // --- ЗАЩИТА ---
  {
    cardId: 'NO_THANKS',
    name: 'Нет уж, спасибо!',
    type: 'STAY_AWAY',
    imageUrl: '/cards/no_thanks.png',
    description: 'Отмените обмен картами.',
    quantities: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 3, 11: 4, 12: 4 }
  },
  {
    cardId: 'MISS',
    name: 'Мимо!',
    type: 'STAY_AWAY',
    imageUrl: '/cards/miss.png',
    description: 'Отмените атаку против вас.',
    quantities: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 3, 12: 3 }
  },

  // --- ПРЕПЯТСТВИЯ ---
  {
    cardId: 'BARRED_DOOR',
    name: 'Заколоченная дверь',
    type: 'STAY_AWAY',
    imageUrl: '/cards/barred_door.png',
    description: 'Заблокируйте проход между соседями.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 2, 8: 2, 9: 2, 10: 2, 11: 3, 12: 3 }
  },
  {
    cardId: 'QUARANTINE',
    name: 'Карантин',
    type: 'STAY_AWAY',
    imageUrl: '/cards/quarantine.png',
    description: 'Поместите игрока в карантин на 3 хода.',
    quantities: { 4: 0, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },

  // --- КАРТЫ ПАНИКИ ---
  {
    cardId: 'PANIC_PARTY',
    name: 'И это вы называете вечеринкой?',
    type: 'PANIC',
    imageUrl: '/cards/panic_party.png',
    description: 'Все игроки меняются местами.',
    quantities: { 4: 0, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_GET_OUT',
    name: 'Убирайся прочь!',
    type: 'PANIC',
    imageUrl: '/cards/panic_get_out.png',
    description: 'Поменяйтесь местами с любым игроком.',
    quantities: { 4: 0, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 }
  },
  {
    cardId: 'PANIC_ONE_TWO',
    name: 'Раз, два...',
    type: 'PANIC',
    imageUrl: '/cards/panic_one_two.png',
    description: 'Поменяйтесь местами с третьим игроком.',
    quantities: { 4: 0, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_CHAIN_REACTION',
    name: 'Цепная реакция',
    type: 'PANIC',
    imageUrl: '/cards/panic_chain_reaction.png',
    description: 'Все игроки одновременно отдают 1 карту.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_BLIND_DATE',
    name: 'Свидание вслепую',
    type: 'PANIC',
    imageUrl: '/cards/panic_blind_date.png',
    description: 'Поменяйте 1 карту с колодой.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_FRIENDS',
    name: 'Давай дружить?',
    type: 'PANIC',
    imageUrl: '/cards/panic_friends.png',
    description: 'Поменяйтесь 1 картой с любым игроком.',
    quantities: { 4: 0, 5: 0, 6: 0, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_FORGETFULNESS',
    name: 'Забывчивость',
    type: 'PANIC',
    imageUrl: '/cards/panic_forgetfulness.png',
    description: 'Сбросьте 3 карты с руки.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 }
  },
  {
    cardId: 'PANIC_BETWEEN_US',
    name: 'Только между нами...',
    type: 'PANIC',
    imageUrl: '/cards/panic_between_us.png',
    description: 'Покажите карты соседа только вам.',
    quantities: { 4: 0, 5: 0, 6: 0, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_CONFESSION',
    name: 'Время признаний',
    type: 'PANIC',
    imageUrl: '/cards/panic_confession.png',
    description: 'Все показывают свои карты.',
    quantities: { 4: 0, 5: 0, 6: 0, 7: 0, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 }
  },
  {
    cardId: 'PANIC_OOPS',
    name: 'Уупс!',
    type: 'PANIC',
    imageUrl: '/cards/panic_oops.png',
    description: 'Покажите все карты всем.',
    quantities: { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 1, 11: 1, 12: 1 }
  },
  {
    cardId: 'PANIC_THREE_FOUR',
    name: '...Три, четыре...',
    type: 'PANIC',
    imageUrl: '/cards/panic_three_four.png',
    description: 'Сбросьте все заколоченные двери.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_OLD_ROPES',
    name: 'Старые верёвки',
    type: 'PANIC',
    imageUrl: '/cards/panic_old_ropes.png',
    description: 'Сбросьте все карты Карантина.',
    quantities: { 4: 0, 5: 0, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  }
];

const IMAGE_MAPPING: Partial<Record<CardId, string>> = {
  THING: '/cards/thing.png',
  FLAMETHROWER: '/cards/flamethrower.png',
  ANALYSIS: '/cards/analysis.png',
  AXE: '/cards/axe.png',
  SUSPICION: '/cards/suspicion.png',
  WHISKEY: '/cards/whiskey.png',
  PERSISTENCE: '/cards/persistence.png',
  TEMPTATION: '/cards/temptation.png',
  CHANGE_SEATS: '/cards/change_seats.png',
  YOU_BETTER_RUN: '/cards/you_better_run.png',
  LOOK_AROUND: '/cards/panic_look_around.png',
  NO_THANKS: '/cards/no_thanks.png',
  FEAR: '/cards/fear.png',
  MISS: '/cards/miss.png',
  IM_FINE_HERE: '/cards/im_fine_here.png',
  NO_BARBECUE: '/cards/no_barbecue.png',
  BARRED_DOOR: '/cards/barred_door.png',
  QUARANTINE: '/cards/quarantine.png',
  PANIC_PARTY: '/cards/panic_party.png',
  PANIC_GET_OUT: '/cards/panic_get_out.png',
  PANIC_ONE_TWO: '/cards/panic_one_two.png',
  PANIC_CHAIN_REACTION: '/cards/panic_chain_reaction.png',
  PANIC_BLIND_DATE: '/cards/panic_blind_date.png',
  PANIC_FRIENDS: '/cards/panic_friends.png',
  PANIC_FORGETFULNESS: '/cards/panic_forgetfulness.png',
  PANIC_BETWEEN_US: '/cards/panic_between_us.png',
  PANIC_CONFESSION: '/cards/panic_confession.png',
  PANIC_OOPS: '/cards/panic_oops.png',
  PANIC_THREE_FOUR: '/cards/panic_three_four.png',
  PANIC_OLD_ROPES: '/cards/panic_old_ropes.png',
};

export function generateDeck(playerCount: number): { deck: Card[]; thingCard: Card } {
  const validPlayerCount = Math.min(Math.max(playerCount, 4), 12);
  const deckCards: Card[] = [];

  CARD_RULES.forEach((rule) => {
    if (rule.cardId === 'THING') return;

    const count = rule.quantities[validPlayerCount] || 0;
    for (let i = 0; i < count; i++) {
      const imgUrl = rule.cardId === 'INFECTED' 
        ? `/cards/infected_${Math.floor(Math.random() * 8) + 1}.png`
        : (IMAGE_MAPPING[rule.cardId] || rule.imageUrl);

      deckCards.push({
        id: uuidv4(),
        cardId: rule.cardId,
        name: rule.name,
        type: rule.type,
        minPlayers: validPlayerCount,
        imageUrl: imgUrl,
        description: rule.description
      });
    }
  });

  const shuffled = [...deckCards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const thingCard: Card = {
    id: uuidv4(),
    cardId: 'THING',
    name: 'Нечто',
    type: 'STAY_AWAY',
    minPlayers: validPlayerCount,
    imageUrl: '/cards/thing.png',
    description: 'Вы — Главный монстр!'
  };

  return { deck: shuffled, thingCard };
}