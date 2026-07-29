import { Shield } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export default function ActionControlBar() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const selectedCardId = useGameStore((s) => s.selectedCardId);
  const targetVictimId = useGameStore((s) => s.targetVictimId);
  const setTargetVictimId = useGameStore((s) => s.setTargetVictimId);
  const doorIndex = useGameStore((s) => s.doorIndex);
  const setDoorIndex = useGameStore((s) => s.setDoorIndex);

  const handleDrawCard = useGameStore((s) => s.handleDrawCard);
  const handlePlayCard = useGameStore((s) => s.handlePlayCard);
  const handleDiscardCard = useGameStore((s) => s.handleDiscardCard);
  const handleOfferTrade = useGameStore((s) => s.handleOfferTrade);
  const handleAcceptTrade = useGameStore((s) => s.handleAcceptTrade);
  const handleCancelTradeNoThanks = useGameStore((s) => s.handleCancelTradeNoThanks);
  const handleCancelTradeFear = useGameStore((s) => s.handleCancelTradeFear);
  const handleRedirectTradeMiss = useGameStore((s) => s.handleRedirectTradeMiss);

  if (!gameState) return null;

  const activePlayerId = controlledPlayerId || myPlayerId;
  const activePlayerIndex = gameState.players.findIndex((p) => p.id === activePlayerId);
  const activePlayer = activePlayerIndex !== -1 ? gameState.players[activePlayerIndex] : undefined;
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const isControlledTurn = currentTurnPlayer?.id === activePlayerId;

  const selectedCard = activePlayer?.hand.find((c) => c.id === selectedCardId);

  const TARGET_REQUIRED_CARDS = [
    'FLAMETHROWER',
    'ANALYSIS',
    'SUSPICION',
    'QUARANTINE',
    'TEMPTATION',
    'CHANGE_SEATS',
    'YOU_BETTER_RUN',
    'AXE',
  ];

  const isTargetRequired = selectedCard && TARGET_REQUIRED_CARDS.includes(selectedCard.cardId);
  const isDoorRequired = selectedCard && selectedCard.cardId === 'BARRED_DOOR';
  const isPlayDisabled = (isTargetRequired && !targetVictimId) || (isDoorRequired && doorIndex === null);

  const hasNoThanks = activePlayer?.hand.some((c) => c.cardId === 'NO_THANKS');
  const hasFear = activePlayer?.hand.some((c) => c.cardId === 'FEAR');
  const hasMiss = activePlayer?.hand.some((c) => c.cardId === 'MISS');

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Выбор цели */}
      {gameState.phase === 'PLAY_OR_DISCARD' && isControlledTurn && selectedCard && (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-center gap-4">
          {TARGET_REQUIRED_CARDS.includes(selectedCard.cardId) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold">Выберите цель:</span>
              <select
                value={targetVictimId || ''}
                onChange={(e) => setTargetVictimId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                <option value="">-- Выберите игрока --</option>
                {gameState.players
                  .filter((p, index) => {
                    if (p.id === activePlayerId || !p.isAlive) return false;
                    if (['TEMPTATION', 'YOU_BETTER_RUN'].includes(selectedCard.cardId)) {
                      return true;
                    }
                    const N = gameState.players.length;
                    const isNeighbor =
                      index === (activePlayerIndex + 1) % N || index === (activePlayerIndex - 1 + N) % N;
                    return isNeighbor;
                  })
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedCard.cardId === 'BARRED_DOOR' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold">Заколотить проход:</span>
              <select
                value={doorIndex !== null ? doorIndex : ''}
                onChange={(e) => setDoorIndex(e.target.value !== '' ? Number(e.target.value) : null)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                <option value="">-- Выберите проход --</option>
                {(() => {
                  const N = gameState.players.length;
                  const myIndex = activePlayerIndex;
                  if (myIndex === -1) return null;

                  const leftNeighbor = gameState.players[(myIndex + 1) % N];
                  const rightNeighbor = gameState.players[(myIndex - 1 + N) % N];
                  const leftDoor = myIndex;
                  const rightDoor = (myIndex - 1 + N) % N;

                  return (
                    <>
                      <option value={leftDoor}>Слева (между мной и {leftNeighbor.name})</option>
                      <option value={rightDoor}>Справа (между мной и {rightNeighbor.name})</option>
                    </>
                  );
                })()}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Подсказка для карты Соблазн */}
      {gameState.phase === 'TRADE' && gameState.pendingTrade?.isSeduction && (
        <div className="bg-amber-950/80 border border-amber-500/50 p-3 rounded-xl text-center text-amber-200 text-sm font-semibold shadow-lg w-full">
          🍷 Вы сыграли "Соблазн"! Выберите карту из вашей руки и нажмите "Предложить эту карту на обмен".
        </div>
      )}

      {/* Кнопки фаз */}
      {isControlledTurn && (
        <div className="flex flex-col md:flex-row gap-3 w-full">
          {gameState.phase === 'DRAW' && (
            <button
              onClick={handleDrawCard}
              className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold px-6 py-2 rounded-lg transition shadow-lg"
            >
              Взять карту из колоды ({activePlayer?.name})
            </button>
          )}

          {gameState.phase === 'PLAY_OR_DISCARD' && selectedCardId && (
            <div className="flex flex-col md:flex-row gap-2 w-full">
              <button
                onClick={handlePlayCard}
                disabled={isPlayDisabled}
                className="w-full bg-red-600 hover:bg-red-500 font-bold px-5 py-2 rounded-lg transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🔥 Сыграть действие карты
              </button>
              <button
                onClick={handleDiscardCard}
                className="w-full bg-amber-600 hover:bg-amber-500 font-bold px-5 py-2 rounded-lg transition shadow-lg"
              >
                🗑️ Просто сбросить карту
              </button>
            </div>
          )}

          {gameState.phase === 'TRADE' && selectedCardId && (
            <button
              onClick={handleOfferTrade}
              className="w-full bg-blue-600 hover:bg-blue-500 font-bold px-6 py-2 rounded-lg transition shadow-lg"
            >
              Предложить эту карту на обмен
            </button>
          )}
        </div>
      )}

      {/* Ответ на обмен */}
      {gameState.phase === 'TRADE_ACCEPT' && gameState.pendingTrade?.toPlayerId === activePlayerId && (
        <div className="flex flex-col items-center space-y-2 w-full">
          <span className="text-xs font-bold text-amber-400 animate-bounce">
            Вам предложили обмен! Выберите карту из руки ({activePlayer?.name}) и подтвердите или сыграйте карту защиты:
          </span>
          <div className="flex flex-col md:flex-row flex-wrap gap-2 w-full justify-center">
            {selectedCardId && (
              <button
                onClick={handleAcceptTrade}
                className="w-full md:w-auto flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold px-6 py-2 rounded-lg transition shadow-lg"
              >
                Подтвердить обмен карты
              </button>
            )}
            {hasNoThanks && (
              <button
                onClick={handleCancelTradeNoThanks}
                className="w-full md:w-auto bg-amber-600 hover:bg-amber-500 font-bold px-5 py-2 rounded-lg transition shadow-lg flex items-center justify-center gap-1 text-slate-950"
              >
                <Shield className="w-4 h-4" /> Сыграть "Нет уж, спасибо!"
              </button>
            )}
            {hasFear && (
              <button
                onClick={() => handleCancelTradeFear()}
                className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 font-bold px-5 py-2 rounded-lg transition shadow-lg flex items-center justify-center gap-1 text-white"
              >
                <Shield className="w-4 h-4" /> Сыграть "Страх"
              </button>
            )}
            {hasMiss && (
              <button
                onClick={() => handleRedirectTradeMiss()}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 font-bold px-5 py-2 rounded-lg transition shadow-lg flex items-center justify-center gap-1 text-white"
              >
                <Shield className="w-4 h-4" /> Сыграть "Мимо!"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
