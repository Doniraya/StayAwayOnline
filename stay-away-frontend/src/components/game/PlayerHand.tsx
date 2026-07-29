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

  if (!gameState) return null;

  const activePlayerId = controlledPlayerId || myPlayerId;
  const activePlayer = gameState.players.find((p) => p.id === activePlayerId);
  if (!activePlayer || !activePlayer.hand || activePlayer.hand.length === 0) return null;

  const totalCards = activePlayer.hand.length;

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
    <div className="relative z-40 flex items-end justify-center h-48 md:h-56 pt-8 pb-2 px-4 max-w-full overflow-visible select-none">
      <AnimatePresence mode="popLayout">
        {activePlayer.hand.map((card, index) => {
          const isSelected = card.id === selectedCardId;
          const illegal = isIllegalTradeCard(card);

          // 3D Arc math: rotate (index - (total - 1) / 2) * 6deg, Y offset Math.abs(index - (total - 1) / 2) * 8px
          const centerOffset = index - (totalCards - 1) / 2;
          const rotate = isSelected ? 0 : centerOffset * 6;
          const baseY = isSelected ? -45 : Math.abs(centerOffset) * 8;
          const auraClass = getCardAuraClass(card);

          const imageSrc =
            card.imageUrl ||
            ((card as any).image ? `/cards/${(card as any).image}` : '/cards/back.png');

          return (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 80, rotate: 0 }}
              animate={{
                opacity: 1,
                y: baseY,
                rotate: rotate,
                scale: isSelected ? 1.12 : 1,
                zIndex: isSelected ? 30 : index + 1,
              }}
              exit={{ opacity: 0, scale: 0.5, y: -60 }}
              whileHover={
                illegal
                  ? {}
                  : {
                      y: -45,
                      scale: 1.12,
                      rotate: 0,
                      zIndex: 40,
                      transition: { type: 'spring', stiffness: 300, damping: 20 },
                    }
              }
              whileTap={
                illegal
                  ? {}
                  : {
                      scale: 1.15,
                      y: -50,
                    }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              drag={illegal ? false : 'y'}
              dragConstraints={{ top: -120, bottom: 0 }}
              dragElastic={0.2}
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
  );
}


