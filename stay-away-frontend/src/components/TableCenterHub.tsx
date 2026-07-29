import React from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Центральный хаб овала: колода брать карт, сброс и анимированная стрелка направления хода
 */
export const TableCenterHub: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const handleDrawCard = useGameStore((s) => s.handleDrawCard);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);

  if (!gameState) return null;

  const isMyTurn = gameState.players[gameState.currentTurnIndex]?.id === (controlledPlayerId || myPlayerId);
  const isDrawPhase = gameState.phase === 'DRAW' && isMyTurn;

  return (
    <div className="relative flex items-center justify-center gap-4 sm:gap-8 p-4 rounded-3xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md shadow-2xl">
      {/* Направление хода */}
      <div className={`absolute -top-3 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-900 text-slate-300 border-slate-700 flex items-center gap-1`}>
        <span>Направление:</span>
        <span className="text-amber-400 font-sans transition-all duration-300">
          {gameState.direction === 1 ? '↻ По часовой' : '↺ Против часовой'}
        </span>
      </div>

      {/* Колода брания карт */}
      <div
        onClick={isDrawPhase ? handleDrawCard : undefined}
        className={`relative w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 overflow-hidden shadow-xl transition-all duration-300 select-none ${
          isDrawPhase
            ? 'border-amber-400 ring-4 ring-amber-400/30 cursor-pointer animate-pulse scale-105'
            : 'border-slate-700 bg-slate-900'
        }`}
      >
        <img src="/cards/back.png" alt="Колода" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center font-black text-white text-lg drop-shadow-md">
          {gameState.deck.length}
        </div>
      </div>

      {/* Стопка сброса */}
      <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 border-slate-800/80 bg-slate-950/40 overflow-hidden relative flex items-center justify-center">
        {gameState.discardPile.length > 0 ? (
          <img
            src={`/cards/${gameState.discardPile[gameState.discardPile.length - 1].cardId.toLowerCase()}.png`}
            alt="Сброс"
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <span className="text-xs text-slate-600 font-medium">Сброс пуст</span>
        )}
      </div>
    </div>
  );
};
