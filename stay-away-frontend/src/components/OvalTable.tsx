// stay-away-frontend/src/components/OvalTable.tsx
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { PlayerSeat } from './PlayerSeat';
import { TableCenterHub } from './TableCenterHub';
import { BarredDoorSlot } from './BarredDoorSlot';

/**
 * Овальный стол арктической станции с круговым расположением мест
 */
export const OvalTable: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const targetVictimId = useGameStore((s) => s.targetVictimId);
  const setTargetVictimId = useGameStore((s) => s.setTargetVictimId);

  if (!gameState) return null;

  const players = gameState.players;
  const total = players.length;
  const myId = controlledPlayerId || myPlayerId;

  return (
    <div className="relative w-full max-w-5xl aspect-[4/3] sm:aspect-[16/10] my-auto flex items-center justify-center p-4">
      {/* Текстурированный овальный стол */}
      <div className="absolute inset-8 rounded-[100px] sm:rounded-[180px] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-4 border-slate-800 shadow-[inset_0_0_60px_rgba(0,0,0,0.8),0_0_40px_rgba(0,0,0,0.6)]" />

      {/* Центральный хаб */}
      <div className="relative z-10">
        <TableCenterHub />
      </div>

      {/* Игроки по кругу овала */}
      {players.map((player, idx) => {
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        const rx = 42; // процентный радиус по оси X
        const ry = 40; // процентный радиус по оси Y

        const left = 50 + rx * Math.cos(angle);
        const top = 50 + ry * Math.sin(angle);

        const isCurrentTurn = gameState.currentTurnIndex === idx;
        const isMe = player.id === myId;
        const isBarred = gameState.barredDoors[idx] || false;

        return (
          <React.Fragment key={player.id}>
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <PlayerSeat
                player={player}
                isCurrentTurn={isCurrentTurn}
                isMe={isMe}
                isTargetable={targetVictimId === player.id}
                onSelect={() => setTargetVictimId(player.id)}
              />
            </div>

            {/* Межкресельные двери */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + (rx - 8) * Math.cos(angle + Math.PI / total)}%`, top: `${50 + (ry - 8) * Math.sin(angle + Math.PI / total)}%` }}
            >
              <BarredDoorSlot isBarred={isBarred} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
