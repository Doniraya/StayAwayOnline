import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { ActionBanner } from './components/ActionBanner';
import { OvalTable } from './components/OvalTable';
import { CardHand } from './components/CardHand';
import { LobbyScreen } from './components/LobbyScreen';

/**
 * Главная точка входа приложения AAA Game UI.
 * Объединяет шапку с логотипом Нечто и кодом комнаты, баннер BGA,
 * Лобби, арену овального стола и интерактивную панель карт.
 */
export default function App() {
  const initSocketListeners = useGameStore((s) => s.initSocketListeners);
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    const cleanup = initSocketListeners();
    return cleanup;
  }, [initSocketListeners]);

  const isInGame = gameState && gameState.phase !== 'LOBBY';

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* Атмосферный фон арктической станции */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* Верхняя шапка с логотипом Нечто и кодом комнаты */}
      <header className="relative z-10 p-3 sm:p-4 w-full flex flex-col items-center gap-2 border-b border-slate-800/40 bg-slate-950/60 backdrop-blur-md">
        <div className="w-full max-w-5xl flex items-center justify-between px-2">
          {/* Логотип Нечто */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">☣️</span>
            <h1 className="text-lg sm:text-2xl font-black tracking-wider text-amber-500 uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">
              НЕЧТО <span className="text-slate-500 text-xs font-normal tracking-normal lowercase border border-slate-700/60 px-1.5 py-0.5 rounded bg-slate-900/80">stay away! online</span>
            </h1>
          </div>

          {/* Код комнаты */}
          {gameState?.roomId && (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-3 py-1 rounded-xl text-xs sm:text-sm font-mono shadow-inner">
              <span className="text-slate-400 font-sans">Комната:</span>
              <span className="text-amber-400 font-bold tracking-widest">{gameState.roomId}</span>
            </div>
          )}
        </div>

        {/* Баннер инструкций BGA во время игры */}
        {isInGame && <ActionBanner />}
      </header>

      {/* Главный контент: Лобби или Игровой стол */}
      <main className="relative z-10 flex-1 flex items-center justify-center w-full px-2 sm:px-4 py-4 overflow-y-auto">
        {!isInGame ? <LobbyScreen /> : <OvalTable />}
      </main>

      {/* Нижняя панель карт (только во время игры) */}
      {isInGame && (
        <footer className="relative z-10 p-3 sm:p-4 w-full flex justify-center border-t border-slate-800/40 bg-slate-950/80 backdrop-blur-md">
          <CardHand />
        </footer>
      )}
    </div>
  );
}
