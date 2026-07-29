import { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import GameHeader from '../game/GameHeader';
import RadioJournal from '../game/RadioJournal';
import TableCircle from '../game/TableCircle';
import PlayerHand from '../game/PlayerHand';
import DefenseModal from '../game/DefenseModal';
import RevealModal from '../game/RevealModal';
import VictoryModal from '../game/VictoryModal';
import PersistenceModal from '../game/PersistenceModal';
import PanicActionBar from '../game/PanicActionBar';
import ActionControlBar from '../game/ActionControlBar';
import InGameChat from '../game/InGameChat';
import InfectionGauge from '../game/InfectionGauge';

export default function GameTable() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);

  const activePlayerId = controlledPlayerId || myPlayerId;
  const currentTurnPlayer = gameState ? gameState.players[gameState.currentTurnIndex] : null;
  const isControlledTurn = currentTurnPlayer?.id === activePlayerId;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isControlledTurn) {
      if (document.hidden) {
        let toggle = false;
        interval = setInterval(() => {
          document.title = toggle ? '🔥 ТВОЙ ХОД! 🔥' : 'Нечто';
          toggle = !toggle;
        }, 1000);
        new Audio('/sounds/turn.mp3').play().catch(() => {});
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && interval) {
        clearInterval(interval);
        interval = null;
        document.title = 'Stay Away!';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.title = 'Stay Away!';
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isControlledTurn]);

  if (!gameState) return null;

  return (
    <div className="h-screen max-h-screen w-screen max-w-full bg-slate-950 text-white flex flex-col justify-between p-3 md:p-4 overflow-hidden relative gap-3">
      {/* Модальные окна */}
      <VictoryModal />
      <DefenseModal />
      <RevealModal />
      <PersistenceModal />

      {/* 1. Верх: Шапка игры */}
      <GameHeader />

      {/* 2. Центр: 3-колоночный layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch min-h-0 overflow-hidden relative z-10">
        {/* Левая колонка: InGameChat (внизу слева) */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col justify-end gap-3 min-h-0">
          <InGameChat />
        </div>

        {/* Центральная колонка: TableCircle + панель контролов + PlayerHand */}
        <div className="flex-1 flex flex-col justify-between items-center gap-2 min-w-0 h-full min-h-0 overflow-hidden relative">
          <div className="w-full flex-1 flex items-center justify-center min-h-0 relative overflow-hidden">
            <TableCircle />
          </div>

          <div className="bg-slate-950/90 border border-slate-800/80 backdrop-blur-md p-2 md:p-3 rounded-2xl flex flex-col items-center space-y-2 z-10 w-full max-w-4xl shadow-2xl relative shrink-0">
            <PanicActionBar />
            <ActionControlBar />
            <PlayerHand />
          </div>
        </div>

        {/* Правая колонка: RadioJournal (постоянно открыт) + InfectionGauge (внизу справа) */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col justify-between items-center lg:items-end gap-3 min-h-0">
          <div className="w-full flex-1 min-h-0">
            <RadioJournal />
          </div>
          <InfectionGauge />
        </div>
      </div>
    </div>
  );
}
