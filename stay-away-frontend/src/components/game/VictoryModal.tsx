import { Trophy, Skull, Sparkles, Bot, Users, Flame, Biohazard, RotateCcw } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import BaseModal from './BaseModal';

export default function VictoryModal() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const handleRestartGame = useGameStore((s) => s.handleRestartGame);
  const handleLeaveRoom = useGameStore((s) => s.handleLeaveRoom);

  const isOpen = Boolean(gameState && gameState.phase === 'GAME_OVER');
  if (!isOpen || !gameState) return null;

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;

  const isHumansWin = gameState.winnerRole === 'HUMANS';

  return (
    <BaseModal
      isOpen={isOpen}
      overlayClass="bg-black/90 backdrop-blur-md"
      maxWidthClass="max-w-2xl"
      containerClass={`border-4 p-8 rounded-3xl space-y-6 text-center overflow-hidden ${
        isHumansWin
          ? 'border-emerald-500 shadow-emerald-950'
          : 'border-red-600 shadow-red-950'
      }`}
    >
      <div className="space-y-2">
        <div className="flex justify-center">
          {isHumansWin ? (
            <Trophy className="w-16 h-16 text-emerald-400 animate-bounce" />
          ) : (
            <Skull className="w-16 h-16 text-red-500 animate-pulse" />
          )}
        </div>
        <h2
          className={`text-3xl font-black uppercase tracking-widest ${
            isHumansWin ? 'text-emerald-400' : 'text-red-500'
          }`}
        >
          {isHumansWin ? '🎉 ПОБЕДА ЛЮДЕЙ!' : '👾 НЕЧТО И ЗАРАЖЁННЫЕ ПОБЕДИЛИ!'}
        </h2>
        <p className="text-slate-400 text-xs">
          {isHumansWin
            ? 'Нечто было успешно распознано и сожжено!'
            : 'Человечество пало. Монстр захватил всю станцию!'}
        </p>
      </div>

      <div className="space-y-2 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 max-h-60 overflow-y-auto">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Раскрытие Тайных Ролей
        </h4>
        {gameState.players.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs"
          >
            <div className="flex items-center gap-2 font-bold">
              {p.isBot ? <Bot className="w-4 h-4 text-emerald-400" /> : <Users className="w-4 h-4 text-blue-400" />}
              <span>{p.name}</span>
              {!p.isAlive && (
                <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900">
                  Сгорел
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {p.role === 'THING' && (
                <span className="bg-red-950 text-red-400 font-black px-2.5 py-1 rounded-lg border border-red-700 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> НЕЧТО
                </span>
              )}
              {p.role === 'INFECTED' && (
                <span className="bg-emerald-950 text-emerald-400 font-bold px-2.5 py-1 rounded-lg border border-emerald-800 flex items-center gap-1">
                  <Biohazard className="w-3.5 h-3.5" /> ЗАРАЖЁН
                </span>
              )}
              {p.role === 'HUMAN' && (
                <span className="bg-slate-800 text-slate-300 font-semibold px-2.5 py-1 rounded-lg border border-slate-700">
                  🧑 ЧЕЛОВЕК
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isHost && (
        <button
          onClick={handleRestartGame}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" /> СЫГРАТЬ ЕЩЁ РАЗ
        </button>
      )}
      <button
        onClick={handleLeaveRoom}
        className="w-full mt-2 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-5 h-5" /> ВЫЙТИ ИЗ КОМНАТЫ
      </button>
    </BaseModal>
  );
}
