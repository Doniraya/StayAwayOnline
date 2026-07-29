import React from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Рука карт игрока с интерактивным вызовом действий (сыграть, сбросить, обменять)
 */
export const CardHand: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const selectedCardId = useGameStore((s) => s.selectedCardId);
  const setSelectedCardId = useGameStore((s) => s.setSelectedCardId);
  const handlePlayCard = useGameStore((s) => s.handlePlayCard);
  const handleDiscardCard = useGameStore((s) => s.handleDiscardCard);
  const handleOfferTrade = useGameStore((s) => s.handleOfferTrade);
  const handleAcceptTrade = useGameStore((s) => s.handleAcceptTrade);

  if (!gameState || gameState.phase === 'LOBBY') return null;

  const myId = controlledPlayerId || myPlayerId;
  const me = gameState.players.find((p) => p.id === myId);

  if (!me || !me.hand) return null;

  const activePlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = activePlayer?.id === myId;
  const isPlayPhase = gameState.phase === 'PLAY_OR_DISCARD' && isMyTurn;
  const isOfferTradePhase = gameState.phase === 'TRADE' && isMyTurn;
  const isAcceptTradePhase = gameState.phase === 'TRADE_ACCEPT' && gameState.pendingTrade?.toPlayerId === myId;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Кнопки активных действий для выбранной карты */}
      {selectedCardId && (
        <div className="flex flex-wrap justify-center gap-3 animate-fade-in">
          {isPlayPhase && (
            <>
              <button
                onClick={handlePlayCard}
                className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                🔥 Сыграть карту
              </button>
              <button
                onClick={handleDiscardCard}
                className="px-5 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                🗑️ Сбросить
              </button>
            </>
          )}

          {isOfferTradePhase && (
            <button
              onClick={handleOfferTrade}
              className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            >
              🤝 Предложить обмен
            </button>
          )}

          {isAcceptTradePhase && (
            <button
              onClick={handleAcceptTrade}
              className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              🤝 Передать в ответ
            </button>
          )}
        </div>
      )}

      {/* Рука карт */}
      <div className="flex justify-center -space-x-4 sm:-space-x-6 pb-2 overflow-x-auto max-w-full px-4 pt-4">
        {me.hand.map((card) => {
          const isSelected = selectedCardId === card.id;

          return (
            <div
              key={card.id}
              onClick={() => setSelectedCardId(isSelected ? null : card.id)}
              className={`relative w-24 h-36 sm:w-32 sm:h-48 rounded-xl border-2 overflow-hidden shadow-2xl cursor-pointer transition-all duration-300 transform select-none ${
                isSelected
                  ? '-translate-y-6 scale-110 border-amber-400 ring-4 ring-amber-400/40 z-30'
                  : 'hover:-translate-y-3 hover:scale-105 border-slate-700 bg-slate-900 hover:z-20'
              }`}
            >
              <img
                src={`/cards/${card.cardId.toLowerCase()}.png`}
                alt={card.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/cards/back.png';
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
