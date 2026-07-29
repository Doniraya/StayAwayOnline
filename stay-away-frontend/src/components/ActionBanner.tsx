import React from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Баннер инструкций в стиле Board Game Arena (BGA)
 * Отображает текущий статус и точное действие, которое требуется от игрока
 */
export const ActionBanner: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);

  if (!gameState || gameState.phase === 'LOBBY') return null;

  const myId = controlledPlayerId || myPlayerId;
  const activePlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = myId === activePlayer?.id;

  let text = '';
  let bannerStyle = 'bg-slate-800/90 text-slate-200 border-slate-700';

  if (gameState.phase === 'GAME_OVER') {
    text = gameState.winnerRole === 'HUMANS' ? '🎉 Выжившие люди победили!' : '👾 Нечто уничтожило всех людей!';
    bannerStyle = 'bg-amber-900/90 text-amber-200 border-amber-600';
  } else if (gameState.phase === 'TRADE_ACCEPT' && gameState.pendingTrade?.toPlayerId === myId) {
    bannerStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    text = '🔵 Фаза обмена: Выберите карту с руки, чтобы завершить обмен';
  } else if (gameState.phase === 'RESPOND' && gameState.pendingDefense?.victimId === myId) {
    bannerStyle = 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    text = '🛡️ Защита: Сыграйте карту защиты с руки или примите эффект';
  } else if (isMyTurn) {
    bannerStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    switch (gameState.phase) {
      case 'DRAW':
        text = '🟡 Ваш ход: Возьмите 1 карту из колоды в центре стола';
        break;
      case 'PLAY_OR_DISCARD':
        text = '🟢 Ваш ход: Выберите карту с руки, чтобы СЫГРАТЬ или СБРОСИТЬ';
        break;
      case 'TRADE':
        text = '🔵 Фаза обмена: Выберите карту с руки для передачи соседнему игроку';
        break;
      case 'TRADE_ACCEPT':
        text = '🔵 Фаза обмена: Ожидайте, пока соседний игрок выберет карту для обмена...';
        bannerStyle = 'bg-slate-800/90 text-slate-200 border-slate-700';
        break;
      case 'RESPOND':
        text = '🛡️ Ожидание: Соперник выбирает карту защиты...';
        bannerStyle = 'bg-slate-800/90 text-slate-200 border-slate-700';
        break;
      case 'RESOLVE_PANIC':
        text = '⚠️ Карта Паники: Выполните действия, указанные на карте Паники';
        break;
      case 'RESOLVE_PERSISTENCE':
        text = '✨ Упорство: Выберите 1 карту из взятых для добавления в руку';
        break;
      default:
        text = `Ваш ход: Фаза ${gameState.phase}`;
    }
  } else {
    text = `Ход игрока ${activePlayer?.name || 'соперника'}...`;
  }

  return (
    <div className={`w-full max-w-2xl mx-auto px-4 py-2.5 rounded-xl border backdrop-blur-md text-center font-medium text-sm sm:text-base transition-all duration-300 ${bannerStyle}`}>
      {text}
    </div>
  );
};
