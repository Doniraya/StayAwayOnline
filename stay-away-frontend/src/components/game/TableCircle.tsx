import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, Lock, Biohazard, Megaphone } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

const DECK_STATS: Record<number, { infected: number; panic: number; flamethrower: number; other: number }> = {
  4: { infected: 8, panic: 4, flamethrower: 2, other: 16 },
  5: { infected: 8, panic: 7, flamethrower: 2, other: 16 },
  6: { infected: 10, panic: 8, flamethrower: 3, other: 24 },
  7: { infected: 12, panic: 10, flamethrower: 3, other: 27 },
  8: { infected: 13, panic: 11, flamethrower: 3, other: 30 },
  9: { infected: 15, panic: 19, flamethrower: 4, other: 30 },
  10: { infected: 17, panic: 20, flamethrower: 4, other: 33 },
  11: { infected: 20, panic: 20, flamethrower: 5, other: 42 },
  12: { infected: 20, panic: 20, flamethrower: 5, other: 42 },
};

const getDeckComposition = (playerCount: number) => {
  const stats = DECK_STATS[playerCount] || DECK_STATS[4];
  return [
    { label: 'Нечто', count: 1, color: 'text-red-500', icon: '💀' },
    { label: 'Заражение', count: stats.infected, color: 'text-emerald-400', icon: '🦠' },
    { label: 'Огнемёт', count: stats.flamethrower, color: 'text-amber-500', icon: '🔥' },
    { label: 'Карты Паники', count: stats.panic, color: 'text-purple-400', icon: '😱' },
    { label: 'Защита и Действия', count: stats.other, color: 'text-blue-400', icon: '🛡️' },
  ];
};

export default function TableCircle() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const handleSelectSeat = useGameStore((s) => s.handleSelectSeat);

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const activePlayerId = controlledPlayerId || myPlayerId;

  const lastLog = gameState.log[gameState.log.length - 1];
  const isBotAction = Boolean(
    lastLog && (lastLog.includes('🤖') || gameState.players.some((p) => p.isBot && lastLog.includes(p.name)))
  );

  const topDiscard = gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center my-2 px-2 md:px-8 w-full">
      {/* Анимированный баннер с последним событием лога (с чётким отступом НАД столиком) */}
      <AnimatePresence mode="wait">
        {lastLog && (
          <motion.div
            key={lastLog}
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`mt-1 mb-6 md:mb-8 max-w-xl px-4 py-2 rounded-xl backdrop-blur-md flex items-center justify-center gap-2.5 text-xs md:text-sm font-semibold text-center shadow-2xl z-40 border ${
              isBotAction
                ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-emerald-950/90 border-emerald-500/80 text-emerald-200 shadow-emerald-950/50 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-black/60'
            }`}
          >
            {isBotAction ? (
              <Bot className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            ) : (
              <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="truncate max-w-md">{lastLog}</span>
            {isBotAction && (
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full shrink-0">
                🤖 Бот
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Деревянный полярный стол с зелёным кругом сукна */}
      <div className="w-full max-w-[850px] aspect-[5/3] bg-gradient-to-b from-[#2a170b] via-[#1b0d05] to-[#120703] border-[12px] md:border-[16px] border-[#3a2213] rounded-[120px] md:rounded-[180px] flex items-center justify-center shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.12)] ring-2 ring-[#52331c]/60 relative overflow-visible">
        {/* Зелёное сукно */}
        <div className="absolute inset-2 md:inset-3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d472a] via-[#052c1a] to-[#02170d] rounded-[105px] md:rounded-[165px] border-2 border-[#1e3a29]/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.85)] flex items-center justify-center overflow-visible">
          
          {/* Анимированная керосиновая лампа по центру со светящимся градиентом (.glow-lamp) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-64 h-64 rounded-full glow-lamp opacity-90 blur-lg absolute" />
            <div className="w-36 h-36 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-transparent animate-pulse absolute" />

            {/* Корпус керосиновой лампы */}
            <div className="relative flex flex-col items-center justify-center -translate-y-1">
              {/* Пульсирующее пламя */}
              <motion.div
                animate={{
                  scale: [1, 1.18, 0.92, 1.1, 1],
                  opacity: [0.85, 1, 0.75, 0.95, 0.85],
                  rotate: [-2, 2, -1, 3, 0],
                }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                className="w-3.5 h-6 bg-gradient-to-t from-amber-600 via-yellow-400 to-amber-100 rounded-full blur-[1px] shadow-[0_0_15px_#f59e0b,0_0_25px_#d97706] absolute -top-4 z-20"
              />
              {/* Стеклянная колба и подсвечник */}
              <div className="w-8 h-10 bg-gradient-to-b from-amber-200/30 via-amber-500/20 to-amber-900/60 border border-amber-400/40 rounded-t-full rounded-b-md backdrop-blur-xs flex items-center justify-center relative shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                <div className="w-2 h-4 bg-amber-300/80 rounded-full blur-[1px] animate-pulse" />
              </div>
              <div className="w-12 h-2.5 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-900 rounded-sm border border-amber-500/50 shadow-md -mt-0.5" />
              <div className="w-10 h-2 bg-amber-950 rounded-b-md border-t border-amber-700/60" />
            </div>
          </div>

          {/* Центральные 2 колоды (слева и справа от керосиновой лампы) */}
          <div className="grid grid-cols-2 gap-x-24 md:gap-x-40 items-center justify-center relative z-40">
            {/* 1. ОБЩАЯ КОЛОДА (слева от лампы) */}
            <div className="flex flex-col items-center group relative cursor-help z-50">
              <div className="w-16 h-24 md:w-20 md:h-28 bg-slate-900 border-metal border-metal-glow rounded-xl overflow-hidden shadow-2xl relative transition-transform group-hover:scale-105">
                <img src="/cards/back.png" alt="Рубашка общей колоды" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-slate-950/40 flex flex-col items-center justify-center">
                  <span className="font-extrabold text-white text-base md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {gameState.deck.length}
                  </span>
                  <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-wider text-amber-300">Карт</span>
                </div>
              </div>
              <span className="text-[10px] md:text-[11px] font-bold text-slate-300 mt-1 font-cinzel group-hover:text-amber-400 transition-colors drop-shadow">
                ОБЩАЯ КОЛОДА
              </span>

              {/* Состав колоды (подсказка при наведении) */}
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none">
                <div className="bg-slate-950/95 backdrop-blur-md border border-amber-500/40 rounded-xl p-3 shadow-2xl shadow-black">
                  <div className="text-xs font-bold text-amber-400 mb-2 border-b border-amber-500/20 pb-1 text-center font-cinzel">
                    Состав колоды на {gameState.players.length} чел.
                  </div>
                  <div className="space-y-1.5">
                    {getDeckComposition(gameState.players.length).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-slate-300">{item.label}</span>
                        </div>
                        <span className={`font-bold ${item.color}`}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-950 border-b border-r border-amber-500/40 rotate-45 backdrop-blur-md" />
              </div>
            </div>

            {/* 2. СТОПКА СБРОСА (справа от лампы) */}
            <div className="flex flex-col items-center relative">
              <div className="w-16 h-24 md:w-20 md:h-28 relative flex items-center justify-center">
                {topDiscard ? (
                  <div className="w-16 h-24 md:w-20 md:h-28 bg-slate-950 border-2 border-slate-600 rounded-xl shadow-2xl overflow-hidden relative">
                    <img
                      src={topDiscard.imageUrl || '/cards/back.png'}
                      alt={topDiscard.name || 'Сброшенная карта'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/50 flex flex-col items-center justify-center">
                      <span className="font-black text-amber-400 text-sm md:text-base drop-shadow">
                        {gameState.discardPile.length}
                      </span>
                      <span className="text-[8px] text-slate-300 uppercase font-semibold">Сброшено</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-24 md:w-20 md:h-28 bg-slate-950/80 border-2 border-dashed border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-[10px] text-slate-500 font-semibold shadow-inner">
                    <span>Пусто</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] md:text-[11px] font-bold text-slate-300 mt-1 font-cinzel drop-shadow">
                СТОПКА СБРОСА
              </span>
            </div>
          </div>

          {/* Указатель хода */}
          <motion.div
            animate={{ rotate: (gameState.currentTurnIndex / gameState.players.length) * 360 * gameState.direction }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            className="absolute top-1/2 left-1/2 w-64 h-64 -mt-32 -ml-32 rounded-full border-2 border-dashed border-amber-500/25 pointer-events-none flex justify-center z-10"
          >
            <div className="absolute top-0 -mt-4 text-amber-500 animate-bounce drop-shadow-[0_0_10px_rgba(245,158,11,0.9)] text-lg">
              ▼
            </div>
          </motion.div>

          {/* Заколоченные двери (засовы / деревянные доски) */}
          {gameState.players.map((_, i) => {
            if (!gameState.barredDoors[i]) return null;
            const N = gameState.players.length;
            const angle = ((i + 0.5) / N) * 2 * Math.PI - Math.PI / 2;

            const radiusX = 43;
            const radiusY = 43;
            const xPercent = Math.cos(angle) * radiusX;
            const yPercent = Math.sin(angle) * radiusY;

            return (
              <div
                key={`door-${i}`}
                style={{ left: `calc(50% + ${xPercent}%)`, top: `calc(50% + ${yPercent}%)`, transform: 'translate(-50%, -50%)' }}
                className="absolute origin-center z-30 bg-gradient-to-r from-amber-950 via-[#3d2413] to-amber-950 border-2 border-amber-500 text-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.9)] ring-1 ring-amber-400/50"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="tracking-wider uppercase font-cinzel">ДВЕРЬ</span>
              </div>
            );
          })}

          {/* Прямоугольные плашки игроков по кругу стола */}
          {gameState.players.map((player, index) => {
            const angle = (index / gameState.players.length) * 2 * Math.PI - Math.PI / 2;
            const radiusX = 43;
            const radiusY = 43;
            const xPercent = Math.cos(angle) * radiusX;
            const yPercent = Math.sin(angle) * radiusY;

            const isCurrentTurn = index === gameState.currentTurnIndex;
            const isSelectedSeat = player.id === activePlayerId;

            return (
              <div
                key={player.id}
                style={{ left: `calc(50% + ${xPercent}%)`, top: `calc(50% + ${yPercent}%)`, transform: 'translate(-50%, -50%)' }}
                className="absolute origin-center z-30"
              >
                {/* Плашка игрока */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={!isSelectedSeat && player.isAlive ? { scale: 1.05 } : {}}
                  onClick={() => isHost && handleSelectSeat(player.id)}
                  className={`relative p-2.5 md:p-3 rounded-xl border flex flex-col items-center w-32 md:w-36 backdrop-blur-md shadow-2xl cursor-pointer transition-all ${
                    isSelectedSeat
                      ? 'ring-4 ring-amber-400 border-amber-500 scale-105 z-30 bg-slate-900/95 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                      : isCurrentTurn
                      ? 'bg-amber-950/90 border-amber-500 ring-2 ring-amber-500/60 z-20 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-900/85 border-slate-800 hover:border-slate-600 z-10'
                  } ${!player.isAlive ? 'opacity-40 grayscale line-through' : ''}`}
                >
                  {/* Жёлтый круглый значок с номером хода (1, 2, 3, 4, 5, 6) */}
                  <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 font-black text-xs border-2 border-amber-100 shadow-[0_2px_8px_rgba(245,158,11,0.6)] flex items-center justify-center z-40">
                    {index + 1}
                  </div>

                  {/* Индикатор Карантина (цепи и замок) */}
                  {player.isInQuarantine && (
                    <div className="absolute -top-3 right-2 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-200 shadow-md flex items-center gap-0.5 z-40 animate-pulse">
                      <Biohazard className="w-3 h-3" /> КАРАНТИН
                    </div>
                  )}

                  {/* Имя игрока */}
                  <div className="flex items-center gap-1.5 font-bold text-xs md:text-sm truncate max-w-full text-slate-100 mt-1">
                    {player.isBot ? (
                      <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Users className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                    <span className="truncate">{player.name}</span>
                  </div>

                  {/* Количество карт */}
                  <span className="text-[10px] text-amber-300/80 font-medium mt-0.5">
                    🎴 Карт: <strong className="text-amber-200">{player.hand.length}</strong>
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
