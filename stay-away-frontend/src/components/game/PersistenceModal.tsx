import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import BaseModal from './BaseModal';

export default function PersistenceModal() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const handleResolvePersistence = useGameStore((s) => s.handleResolvePersistence);

  if (!gameState) return null;

  const activePlayerId = controlledPlayerId || myPlayerId;
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const isControlledTurn = currentTurnPlayer?.id === activePlayerId;

  const isOpen = gameState.phase === 'RESOLVE_PERSISTENCE' && isControlledTurn && Boolean(gameState.pendingPersistence);

  if (!isOpen || !gameState.pendingPersistence) {
    return null;
  }

  const cards = gameState.pendingPersistence.cards;

  return (
    <BaseModal
      isOpen={isOpen}
      maxWidthClass="max-w-2xl"
      containerClass="border-amber-500/50 text-center space-y-4"
      title={
        <h3 className="text-xl font-bold text-amber-400">
          💪 Упорство: вытяуто 3 карты событий. Выберите 1 карту для добавления в руку:
        </h3>
      }
    >
      <div className="flex justify-center gap-4 flex-wrap pt-4 pb-6">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            whileHover={{ scale: 1.08, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleResolvePersistence(card.id)}
            className="w-28 h-42 md:w-36 md:h-52 rounded-xl overflow-hidden border-2 border-slate-700 hover:border-amber-400 cursor-pointer shadow-xl relative bg-slate-950 transition"
          >
            <img
              src={card.imageUrl || '/cards/back.png'}
              alt={card.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[10px] md:text-xs font-semibold text-slate-200 truncate">
              {card.name}
            </div>
          </motion.div>
        ))}
      </div>
    </BaseModal>
  );
}

