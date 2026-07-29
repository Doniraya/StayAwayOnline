import { useState } from 'react';
import { Flame, Shield, ArrowRightLeft } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import BaseModal from './BaseModal';

export default function DefenseModal() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const handleDefendAttack = useGameStore((s) => s.handleDefendAttack);
  const handleCancelTradeNoThanks = useGameStore((s) => s.handleCancelTradeNoThanks);
  const handleCancelTradeFear = useGameStore((s) => s.handleCancelTradeFear);
  const handleRedirectTradeMiss = useGameStore((s) => s.handleRedirectTradeMiss);

  const [dismissedTradeKey, setDismissedTradeKey] = useState<string | null>(null);

  if (!gameState) return null;

  const activePlayerId = controlledPlayerId || myPlayerId;
  const activePlayer = gameState.players.find((p) => p.id === activePlayerId);

  const isRespondPhase = gameState.phase === 'RESPOND';
  const isTradeAcceptPhase = gameState.phase === 'TRADE_ACCEPT' && gameState.pendingTrade?.toPlayerId === activePlayerId;

  const currentTradeKey = gameState.pendingTrade
    ? `${gameState.pendingTrade.fromPlayerId}_${gameState.pendingTrade.toPlayerId}`
    : null;

  const isDismissed = currentTradeKey !== null && dismissedTradeKey === currentTradeKey;

  const fearCards = activePlayer?.hand.filter((c) => c.cardId === 'FEAR') || [];
  const missCards = activePlayer?.hand.filter((c) => c.cardId === 'MISS') || [];
  const noThanksCards = activePlayer?.hand.filter((c) => c.cardId === 'NO_THANKS') || [];

  const hasTradeDefenseCards = fearCards.length > 0 || missCards.length > 0 || noThanksCards.length > 0;

  if (isRespondPhase) {
    const defenseCardsInHand = activePlayer?.hand.filter((c) => c.cardId === 'MISS' || c.cardId === 'NO_BARBECUE') || [];

    return (
      <BaseModal
        isOpen={true}
        overlayClass="bg-red-950/80 backdrop-blur-md"
        maxWidthClass="max-w-md"
        containerClass="border-4 border-red-600 p-6 rounded-3xl space-y-4 text-center shadow-2xl"
      >
        <Flame className="w-14 h-14 text-red-500 animate-pulse mx-auto" />
        <h3 className="text-2xl font-black text-red-500 uppercase tracking-wider">⚠️ Вас атакуют Огнемётом!</h3>
        <p className="text-slate-300 text-xs">Игрок пытается сжечь вас. Желаете разыграть карту Защиты?</p>

        <div className="space-y-2 pt-2">
          {defenseCardsInHand.length > 0 ? (
            defenseCardsInHand.map((defCard) => (
              <button
                key={defCard.id}
                onClick={() => handleDefendAttack(defCard.id)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Shield className="w-5 h-5" /> Сыграть "{defCard.name}" (Защититься)
              </button>
            ))
          ) : (
            <p className="text-amber-400 text-xs font-bold">У вас нет карт защиты на руке...</p>
          )}

          <button
            onClick={() => handleDefendAttack(undefined)}
            className="w-full bg-slate-800 hover:bg-red-950 text-red-400 font-semibold py-2.5 rounded-xl border border-red-900/50 transition"
          >
            💀 Принять урон (Не защищаться)
          </button>
        </div>
      </BaseModal>
    );
  }

  if (isTradeAcceptPhase && hasTradeDefenseCards && !isDismissed) {
    const fromPlayer = gameState.players.find((p) => p.id === gameState.pendingTrade?.fromPlayerId);

    return (
      <BaseModal
        isOpen={true}
        overlayClass="bg-slate-950/80 backdrop-blur-md"
        maxWidthClass="max-w-md"
        containerClass="border-4 border-amber-600 p-6 rounded-3xl space-y-4 text-center shadow-2xl"
      >
        <ArrowRightLeft className="w-14 h-14 text-amber-500 animate-pulse mx-auto" />
        <h3 className="text-2xl font-black text-amber-500 uppercase tracking-wider">
          🤝 Игрок {fromPlayer?.name || ''} предлагает вам обмен!
        </h3>
        <p className="text-slate-300 text-xs">Вы можете разыграть карту защиты от обмена:</p>

        <div className="space-y-2 pt-2">
          {noThanksCards.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCancelTradeNoThanks()}
              className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            >
              <Shield className="w-5 h-5" /> Сыграть "{c.name}" (Отменить обмен)
            </button>
          ))}

          {fearCards.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCancelTradeFear(c.id)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            >
              <Shield className="w-5 h-5" /> Сыграть "{c.name}" (Страх — отменить обмен и посмотреть карту)
            </button>
          ))}

          {missCards.map((c) => (
            <button
              key={c.id}
              onClick={() => handleRedirectTradeMiss(c.id)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            >
              <Shield className="w-5 h-5" /> Сыграть "{c.name}" (Мимо! — перенаправить обмен)
            </button>
          ))}

          <button
            onClick={() => setDismissedTradeKey(currentTradeKey)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold py-2.5 rounded-xl border border-amber-900/50 transition flex items-center justify-center gap-2"
          >
            🤝 Не защищаться (Принять предложение обмена)
          </button>
        </div>
      </BaseModal>
    );
  }

  return null;
}


