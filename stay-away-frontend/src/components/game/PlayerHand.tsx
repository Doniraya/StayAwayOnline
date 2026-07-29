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

  const isIllegalTradeCard = (card: Card) => {
    if (!gameState) return false;
    const isTradePhase = gameState.phase === 'TRADE' || gameState.phase === 'TRADE_ACCEPT';
    if (!isTradePhase) return false;

    if (card.cardId === 'THING') return true;

    if (activePlayer?.role === 'HUMAN' && card.cardId === 'INFECTED') return true;

    if (activePlayer?.role === 'INFECTED' && card.cardId === 'INFECTED') {
      const infectedCount = activePlayer.hand.filter(c => c.cardId === 'INFECTED').length;
      if (infectedCount <= 1) return true;

      let partnerId: string | undefined;
      if (gameState.phase === 'TRADE' && gameState.pendingTrade) {
        partnerId = gameState.pendingTrade.toPlayerId;
      } else if (gameState.phase === 'TRADE_ACCEPT' && gameState.pendingTrade) {
        partnerId = gameState.pendingTrade.fromPlayerId;
      }

      const partner = gameState.players.find(p => p.id === partnerId);
      if (partner && partner.role !== 'THING') return true;
    }

    return false;
  };

  return (
    <div className="relative z-40 flex gap-3 max-w-full pt-10 pb-4 px-4 justify-center overflow-visible">
      <AnimatePresence mode="popLayout">
        {activePlayer?.hand.map((card) => {
          const isSelected = card.id === selectedCardId;
          const illegal = isIllegalTradeCard(card);

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0, zIndex: isSelected ? 10 : 1 }}
              exit={{ opacity: 0, scale: 0.5, y: -50 }}
              whileHover={
                illegal
                  ? {}
                  : {
                      scale: 1.08,
                      y: -12,
                      zIndex: 9999,
                      transition: { duration: 0.15, ease: 'easeOut' },
                    }
              }
              onClick={() => !illegal && setSelectedCardId(card.id)}
              className={`w-[110px] h-[150px] shrink-0 rounded-xl overflow-hidden border-2 shadow-2xl relative cursor-pointer bg-[#161b26] origin-bottom transform-gpu transition-all ${
                illegal
                  ? 'opacity-40 grayscale cursor-not-allowed border-[#263042]'
                  : card.cardId === 'INFECTED'
                  ? 'border-[#27ae60] shadow-[0_4px_12px_rgba(39,174,96,0.3)]'
                  : 'border-[#d35400] shadow-[0_4px_12px_rgba(211,84,0,0.3)]'
              } ${isSelected ? 'ring-4 ring-[#f39c12] -translate-y-4 border-[#f39c12] z-10 shadow-[0_0_20px_#f39c12]' : ''}`}
            >
              <img src={card.imageUrl || '/cards/back.png'} alt={card.name} className="w-full h-full object-cover" />

              {illegal && (
                <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-2 text-center">
                  <span className="bg-[#c0392b] text-white border border-red-400 rounded text-[9px] font-bold px-2 py-1 flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Нельзя отдать
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

