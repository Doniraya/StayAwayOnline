import { useEffect, useRef } from 'react';
import { Application, Container, Sprite, Text, TextStyle, Graphics } from 'pixi.js';
import { useGameStore } from '../store/useGameStore';

/**
 * PixiCanvasEngine — Высокопроизводительный 2D GPU движок на Pixi.js (v8).
 * Отвечает за рендеринг стола, анимированных карт, частиц и эффектов в стиле Steam AAA.
 */
export default function PixiCanvasEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameState = useGameStore((s) => s.gameState);
  const handleCreateRoom = useGameStore((s) => s.handleCreateRoom);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);

  useEffect(() => {
    if (!containerRef.current) return;

    let app: Application | null = null;
    let isMounted = true;

    const initPixi = async () => {
      app = new Application();
      await app.init({
        resizeTo: window,
        backgroundColor: 0x070a0f,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!isMounted || !containerRef.current) {
        app.destroy(true);
        return;
      }

      containerRef.current.appendChild(app.canvas);

      // 1. Фновый слой атмосфера шторма
      const bgGraphics = new Graphics();
      bgGraphics.ellipse(app.screen.width / 2, app.screen.height / 2, app.screen.width * 0.45, app.screen.height * 0.35);
      bgGraphics.fill({ color: 0x1b1613, alpha: 0.8 });
      bgGraphics.stroke({ width: 6, color: 0x231b15 });
      app.stage.addChild(bgGraphics);

      // 2. Текст заголовка
      const titleStyle = new TextStyle({
        fontFamily: 'Segoe UI',
        fontSize: 28,
        fontWeight: 'bold',
        fill: 0xd35400,
        dropShadow: { color: 0x000000, blur: 8, distance: 4 },
      });
      const titleText = new Text({ text: '🔥 STAY AWAY ONLINE — 2D GPU ENGINE', style: titleStyle });
      titleText.anchor.set(0.5);
      titleText.x = app.screen.width / 2;
      titleText.y = 50;
      app.stage.addChild(titleText);

      // 3. Анимационный цикл (Ticker 60-120 FPS)
      let tick = 0;
      app.ticker.add(() => {
        tick += 0.02;
        // Пульсация тусклой лампы барака
        bgGraphics.alpha = 0.75 + Math.sin(tick * 2) * 0.08;
      });
    };

    initPixi();

    return () => {
      isMounted = false;
      if (app) {
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 2D Canvas контейнер Pixi.js */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Минимальный HTML/UI оверлей для подключения */}
      {!gameState && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col gap-3 w-80 backdrop-blur-md">
          <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider text-center">Создать Игру</h2>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ваше имя..."
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handleCreateRoom}
            className="bg-amber-600 hover:bg-amber-500 font-bold py-2 rounded-lg text-xs text-white transition cursor-pointer"
          >
            🚀 Запустить Стол
          </button>
        </div>
      )}
    </div>
  );
}
