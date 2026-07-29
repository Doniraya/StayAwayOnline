import { useGameStore } from '../../store/useGameStore';

export default function PanicActionBar() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const selectedCardId = useGameStore((s) => s.selectedCardId);
  const targetVictimId = useGameStore((s) => s.targetVictimId);
  const setTargetVictimId = useGameStore((s) => s.setTargetVictimId);
  const handleResolvePanic = useGameStore((s) => s.handleResolvePanic);

  if (!gameState || gameState.phase !== 'RESOLVE_PANIC' || !gameState.pendingPanic) return null;

  const activePlayerId = controlledPlayerId || myPlayerId;
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const isControlledTurn = currentTurnPlayer?.id === activePlayerId;

  if (!isControlledTurn) return null;

  const isVictimRequired = ['PANIC_GET_OUT', 'PANIC_FRIENDS', 'PANIC_ONE_TWO', 'PANIC_BETWEEN_US'].includes(
    gameState.pendingPanic.cardId
  );
  const isBlindDate = gameState.pendingPanic.cardId === 'PANIC_BLIND_DATE';

  const isDisabled = (isBlindDate && !selectedCardId) || (isVictimRequired && !targetVictimId);

  return (
    <div className="bg-slate-950 border border-red-800 p-4 rounded-xl flex flex-col items-center justify-center gap-4 shadow-lg shadow-red-900/20 w-full max-w-2xl">
      <h3 className="text-xl font-black text-red-500 animate-pulse text-center">
        🚨 ПАНИКА: Разыграйте карту "{gameState.pendingPanic.name}"
      </h3>

      <div className="flex flex-wrap items-center justify-center gap-4 w-full">
        {isBlindDate && (
          <div className="text-sm text-amber-400 font-bold">Выберите карту из руки для сброса</div>
        )}

        {isVictimRequired && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-400 font-bold">Выберите жертву:</span>
            <select
              value={targetVictimId || ''}
              onChange={(e) => setTargetVictimId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">-- Выберите игрока --</option>
              {gameState.players
                .filter((p) => p.id !== activePlayerId && p.isAlive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <button
          onClick={handleResolvePanic}
          disabled={isDisabled}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-lg transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Применить эффект Паники
        </button>
      </div>
    </div>
  );
}
