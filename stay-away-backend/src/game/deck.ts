import { Card, CardId } from '../types/game';
import { v4 as uuidv4 } from 'uuid';

interface CardRule {
  cardId: CardId;
  name: string;
  type: 'STAY_AWAY' | 'PANIC';
  imageUrl: string;
  description: string;
  // Таблица кол-ва карт для 4..12 игроков: [4, 5, 6, 7, 8, 9, 10, 11, 12]
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

  // --- ДЕЙСТВИЯ: Узнать карты ---
  {
    cardId: 'SUSPICION' as any,
    name: 'Подозрение',
    type: 'STAY_AWAY',
    imageUrl: '/cards/analysis.png',
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

  // --- ДЕЙСТВИЯ: Обменять карты ---
  {
    cardId: 'TEMPTATION' as any,
    name: 'Соблазн',
    type: 'STAY_AWAY',
    imageUrl: '/cards/no_thanks.png',
    description: 'Предложите обмен любому игроку.',
    quantities: { 4: 2, 5: 2, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 7, 12: 7 }
  },
  {
    cardId: 'PERSISTENCE' as any,
    name: 'Упорство',
    type: 'STAY_AWAY',
    imageUrl: '/cards/no_thanks.png',
    description: 'Повторите попытку обмена.',
    quantities: { 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 4, 10: 5, 11: 5, 12: 5 }
  },

  // --- ДЕЙСТВИЯ: Смена мест / Направления ---
  {
    cardId: 'YOU_BETTER_RUN',
    name: 'Сматывай удочки!',
    type: 'STAY_AWAY',
    imageUrl: '/cards/miss.png',
    description: 'Смените место с любым игроком не в карантине.',
    quantities: { 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 4, 10: 4, 11: 5, 12: 5 }
  },
  {
    cardId: 'CHANGE_SEAT',
    name: 'Меняемся местами!',
    type: 'STAY_AWAY',
    imageUrl: '/cards/miss.png',
    description: 'Поменяйтесь местами с соседним игроком.',
    quantities: { 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 4, 10: 4, 11: 5, 12: 5 }
  },

  // --- ДЕЙСТВИЯ: Особые ---
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
    cardId: 'PANIC_LOOK_AROUND',
    name: 'Гляди по сторонам',
    type: 'PANIC',
    imageUrl: '/cards/panic_look_around.png',
    description: 'Все смотрят карту соседа справа.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_CHAIN_REACTION' as any,
    name: 'Цепная реакция',
    type: 'PANIC',
    imageUrl: '/cards/panic_look_around.png',
    description: 'Все игроки совершают обмен одновременно.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_BLIND_DATE' as any,
    name: 'Свидание вслепую',
    type: 'PANIC',
    imageUrl: '/cards/panic_look_around.png',
    description: 'Сбросьте карту и возьмите новую вслепую.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  },
  {
    cardId: 'PANIC_THREE_FOUR' as any,
    name: '...Три, четыре...',
    type: 'PANIC',
    imageUrl: '/cards/panic_look_around.png',
    description: 'Уберите препятствия или сбросьте карты.',
    quantities: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2 }
  }
];

export function generateDeck(playerCount: number): { deck: Card[]; thingCard: Card } {
  // Ограничиваем состав от 4 до 12 игроков
  const validPlayerCount = Math.min(Math.max(playerCount, 4), 12);
  const deckCards: Card[] = [];

  CARD_RULES.forEach((rule) => {
    if (rule.cardId === 'THING') return; // "Нечто" обрабатываем отдельно

    const count = rule.quantities[validPlayerCount] || 0;
    for (let i = 0; i < count; i++) {
      // Подставляем разные картинки Заражения для эстетики
      const imgUrl = rule.cardId === 'INFECTED' 
        ? `/cards/infected_${(i % 8) + 1}.png` 
        : rule.imageUrl;

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

  // Перемешиваем колоду
  const shuffled = deckCards.sort(() => Math.random() - 0.5);

  // Создаем карту НЕЧТО
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