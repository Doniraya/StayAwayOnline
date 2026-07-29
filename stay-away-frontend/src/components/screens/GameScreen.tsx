import React, { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import GameHeader from '../game/GameHeader';
import RadioJournal from '../game/RadioJournal';
import PixiGameBoard from '../game/pixi/PixiGameBoard';
import PlayerHand from '../game/PlayerHand';
import DefenseModal from '../game/DefenseModal';
import RevealModal from '../game/RevealModal';
import VictoryModal from '../game/VictoryModal';
import PersistenceModal from '../game/PersistenceModal';
import PanicActionBar from '../game/PanicActionBar';
import ActionControlBar from '../game/ActionControlBar';
import InGameChat from '../game/InGameChat';
import InfectionGauge from '../game/InfectionGauge';

/**
 * Компонент GameScreen — Главный экран игрового процесса.
 * Скомпоновано гибридное игровое пространство:
 * - Шапка GameHeader сверху.
 * - Центральный 2.5D PixiJS стол (PixiGameBoard) с динамическим освещением и частицами.
 * - Нижний 3D-веер карт PlayerHand с панелями действий (ActionControlBar / PanicActionBar).
 * - Адаптивные шторки и боковые панели для InGameChat и RadioJournal (фиксация на десктопах, Bottom Sheet шторки на мобильных).
 */
export const GameScreen: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);

  const activePlayerId = controlledPlayerId || myPlayerId;
  const currentTurnPlayer = gameState ? gameState.players[gameState.currentTurnIndex] : null;
  const isControlledTurn = currentTurnPlayer?.id === activePlayerId;

  // Оповещение при наступлении своего хода
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
    <div className="h-screen max-h-screen w-screen max-w-full bg-stone-950 text-white flex flex-col justify-between p-2 md:p-4 overflow-hidden relative gap-2 md:gap-3 select-none">
      {/* Модальные окна */}
      <VictoryModal />
      <DefenseModal />
      <RevealModal />
      <PersistenceModal />

      {/* 1. Шапка игры с компасом и фазами */}
      <GameHeader />

      {/* 2. Гибридный игровой макет */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 md:gap-4 items-stretch min-h-0 overflow-hidden relative z-10">
        {/* Левая колонка: InGameChat (боковая панель на десктопе, шторка на мобильных) */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col justify-end gap-3 min-h-0">
          <InGameChat />
        </div>

        {/* Центральная колонка: 2.5D PixiJS стол + 3D-веер карт и кнопки управления */}
        <div className="flex-1 flex flex-col justify-between items-center gap-2 min-w-0 h-full min-h-0 overflow-hidden relative">
          {/* Центральный 2.5D стол PixiJS */}
          <div className="w-full flex-1 min-h-[300px] relative overflow-hidden rounded-xl border border-stone-800/80 shadow-2xl">
            <PixiGameBoard />
          </div>

          {/* Нижняя панель действий и 3D веер карт */}
          <div className="bg-stone-950/90 border border-stone-800/80 backdrop-blur-md p-2 md:p-3 rounded-2xl flex flex-col items-center space-y-2 z-10 w-full max-w-4xl shadow-2xl relative shrink-0">
            <PanicActionBar />
            <ActionControlBar />
            <PlayerHand />
          </div>
        </div>

        {/* Правая колонка: RadioJournal и InfectionGauge */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col justify-between items-center lg:items-end gap-3 min-h-0">
          <div className="w-full flex-1 min-h-0">
            <RadioJournal />
          </div>
          <InfectionGauge />
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
