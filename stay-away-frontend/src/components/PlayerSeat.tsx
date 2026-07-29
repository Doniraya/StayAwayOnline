// stay-away-frontend/src/components/PlayerSeat.tsx
import React from 'react';
import type { Player } from '../types/game';

interface PlayerSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  isMe: boolean;
  isTargetable?: boolean;
  onSelect?: () => void;
}

/**
 * Карточка игрока на овальном столе с карантином и роли
 */
export const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isCurrentTurn, isMe, isTargetable, onSelect }) => {
  return (
    <div
      onClick={isTargetable ? onSelect : undefined}
      className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 select-none ${
        isCurrentTurn
          ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-105 ring-2 ring-amber-400/50'
          : isTargetable
          ? 'border-red-500/80 bg-red-950/30 cursor-pointer animate-pulse scale-105'
          : 'border-slate-800 bg-slate-900/80'
      } ${!player.isAlive ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Аватар */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950">
        <img src={player.avatarUrl || '/cards/back.png'} alt={player.name} className="w-full h-full object-cover" />
        {!player.isAlive && (
          <div className="absolute inset-0 bg-red-950/90 flex items-center justify-center text-red-500 font-black text-xs uppercase">
            Сожжён
          </div>
        )}
      </div>

      {/* Имя игрока */}
      <div className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-200 max-w-[90px] truncate text-center">
        {player.name} {isMe && <span className="text-amber-400">(Вы)</span>}
      </div>

      {/* Оверлей Карантина */}
      {player.isInQuarantine && (
        <div className="absolute inset-0 rounded-2xl bg-amber-950/80 backdrop-blur-[2px] border border-amber-600/80 flex flex-col items-center justify-center p-1 text-center">
          <span className="text-xl">☣️</span>
          <span className="text-[10px] font-bold text-amber-400 uppercase">Карантин ({player.quarantineTurnsLeft || 1}х)</span>
        </div>
      )}
    </div>
  );
};
