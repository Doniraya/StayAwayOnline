import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import type { Card } from '../../types/game';

export default function PlayerHand() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const selectedCardId = useGameStore((s) => s.selectedCardId);
  const setSelectedCardId = useGameStore((s) => s.setSelectedCardId);

  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);

  if (!gameState) return null;

  const activePlayerId = controlledPlayerId || myPlayerId;
  const activePlayer = gameState.players.find((p) => p.id === activePlayerId);
  if (!activePlayer || !activePlayer.hand || activePlayer.hand.length === 0) return null;

  const totalCards = activePlayer.hand.length;
  const activeCard = hoveredCard || activePlayer.hand.find((c) => c.id === selectedCardId);

  const isIllegalTradeCard = (card: Card) => {
    if (!gameState) return false;
    const isTradePhase = gameState.phase === 'TRADE' || gameState.phase === 'TRADE_ACCEPT';
    if (!isTradePhase) return false;

    if (card.cardId === 'THING') return true;

    if (activePlayer?.role === 'HUMAN' && card.cardId === 'INFECTED') return true;

    if (activePlayer?.role === 'INFECTED' && card.cardId === 'INFECTED') {
      const infectedCount = activePlayer.hand.filter((c) => c.cardId === 'INFECTED').length;
      if (infectedCount <= 1) return true;

      let partnerId: string | undefined;
      if (gameState.phase === 'TRADE' && gameState.pendingTrade) {
        partnerId = gameState.pendingTrade.toPlayerId;
      } else if (gameState.phase === 'TRADE_ACCEPT' && gameState.pendingTrade) {
        partnerId = gameState.pendingTrade.fromPlayerId;
      }

      const partner = gameState.players.find((p) => p.id === partnerId);
      if (partner && partner.role !== 'THING') return true;
    }

    return false;
  };

  const getCardAuraClass = (card: Card) => {
    if (card.cardId === 'FLAMETHROWER' || card.cardId === 'THING') {
      return 'border-red-500 shadow-red-600/80 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]';
    }
    if (card.cardId === 'INFECTED' || card.type === 'PANIC') {
      return 'border-emerald-500 shadow-emerald-500/80 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]';
    }
    return 'border-blue-500 shadow-blue-500/80 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]';
  };

  return (
    <div className="relative z-40 flex flex-col items-center justify-end max-w-full overflow-visible select-none pb-2">
      {/* Стилизованное информационное окно карты при наведении или выборе */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[200px] md:bottom-[230px] left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-stone-900/95 border-2 border-amber-500/90 rounded-xl p-3 shadow-2xl backdrop-blur-md text-stone-100 flex items-start gap-3 pointer-events-none z-50"
          >
            <div className="w-11 h-15 shrink-0 rounded-lg overflow-hidden border border-amber-600/60 shadow bg-stone-950">
              <img
                src={
                  activeCard.imageUrl ||
                  ((activeCard as any).image ? `/cards/${(activeCard as any).image}` : '/cards/back.png')
                }
                alt={activeCard.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/cards/back.png';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm md:text-base font-extrabold text-amber-400 tracking-wide uppercase truncate">
                  {activeCard.name}
                </h4>
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                    activeCard.type === 'PANIC'
                      ? 'bg-red-950/80 border-red-700 text-red-300'
                      : 'bg-amber-950/80 border-amber-700 text-amber-300'
                  }`}
                >
                  {activeCard.type === 'PANIC' ? 'ПАНИКА' : 'СОБЫТИЕ'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-stone-200 font-medium leading-relaxed">
                {activeCard.description || 'Описание эффекта данной карты в игре "Нечто".'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end justify-center h-40 md:h-48 px-4 max-w-full overflow-visible">
        <AnimatePresence mode="popLayout">
          {activePlayer.hand.map((card, index) => {
            const isSelected = card.id === selectedCardId;
            const illegal = isIllegalTradeCard(card);

            const centerOffset = index - (totalCards - 1) / 2;
            const rotate = isSelected ? 0 : centerOffset * 5;
            // В спокойном состоянии карты убираются наполовину вниз (y: 70px)
            const baseY = isSelected ? -20 : 70 + Math.abs(centerOffset) * 4;
            const auraClass = getCardAuraClass(card);

            const imageSrc =
              card.imageUrl ||
              ((card as any).image ? `/cards/${(card as any).image}` : '/cards/back.png');

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 120, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: baseY,
                  rotate: rotate,
                  scale: isSelected ? 1.12 : 1,
                  zIndex: isSelected ? 40 : index + 1,
                }}
                exit={{ opacity: 0, scale: 0.5, y: -60 }}
                whileHover={
                  illegal
                    ? {}
                    : {
                        y: -20,
                        scale: 1.12,
                        rotate: 0,
                        zIndex: 40,
                        transition: { type: 'spring', stiffness: 350, damping: 22 },
                      }
                }
                whileTap={
                  illegal
                    ? {}
                    : {
                        scale: 1.15,
                        y: -20,
                      }
                }
                transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                drag={illegal ? false : 'y'}
                dragConstraints={{ top: -150, bottom: 0 }}
                dragElastic={0.2}
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
                onDragEnd={(_, info) => {
                  if (!illegal && info.offset.y < -50) {
                    setSelectedCardId(card.id);
                  }
                }}
                onClick={() => {
                  if (!illegal) {
                    setSelectedCardId(isSelected ? null : card.id);
                  }
                }}
                className={`w-24 h-36 md:w-32 md:h-48 shrink-0 rounded-xl overflow-hidden border-2 shadow-2xl relative cursor-pointer bg-stone-950 origin-bottom transform-gpu transition-shadow duration-300 -mx-2 md:-mx-3 ${
                  illegal
                    ? 'opacity-40 grayscale cursor-not-allowed border-stone-800'
                    : auraClass
                } ${
                  isSelected && !illegal
                    ? 'ring-4 ring-amber-400 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.9)] !z-50'
                    : ''
                }`}
              >
                <img
                  src={imageSrc}
                  alt={card.name}
                  className="w-full h-full object-cover pointer-events-none rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/cards/back.png';
                  }}
                />

                {/* Бейдж названия карты */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-stone-950/95 via-stone-950/70 to-transparent p-1.5 pt-4 text-center pointer-events-none">
                  <span className="text-[10px] md:text-xs font-bold text-stone-200 truncate block drop-shadow-md">
                    {card.name}
                  </span>
                </div>

                {/* Оверлей при запрещенном обмене */}
                {illegal && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-2 text-center pointer-events-none">
                    <span className="bg-red-950/90 text-red-400 border border-red-800/80 rounded-md text-[9px] md:text-[10px] font-bold px-2 py-1 flex items-center gap-1 shadow-lg">
                      <Ban className="w-3 h-3 text-red-400" /> Нельзя отдать
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}



