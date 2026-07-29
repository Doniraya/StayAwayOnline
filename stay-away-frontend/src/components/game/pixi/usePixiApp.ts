import { useEffect, useRef } from 'react';
import { Application, Ticker } from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { PlayerTokensLayer } from './layers/PlayerTokensLayer';
import { useGameStore } from '../../../store/useGameStore';

/**
 * Хук жизненного цикла приложения Pixi.js (v8).
 * Инициализирует Application, создает слои (BackgroundLayer, PlayerTokensLayer) и монтирует canvas в DOM.
 * Настраивает подписку на Zustand store, Pixi Ticker и обработчики адаптивного ресайза.
 */
export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);
  const backgroundLayerRef = useRef<BackgroundLayer | null>(null);
  const playerTokensLayerRef = useRef<PlayerTokensLayer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new Application();
    let unsubscribeStore: (() => void) | null = null;
    let isMounted = true;

    app.init({
      resizeTo: containerRef.current,
      backgroundColor: 0x0c0a09,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    }).then(() => {
      if (isMounted && containerRef.current) {
        containerRef.current.appendChild(app.canvas);
        appRef.current = app;

        // 1. Инициализация и монтирование BackgroundLayer
        const backgroundLayer = new BackgroundLayer(app.screen.width, app.screen.height);
        backgroundLayerRef.current = backgroundLayer;
        app.stage.addChild(backgroundLayer);

        // 2. Инициализация и монтирование PlayerTokensLayer
        const initialGameState = useGameStore.getState().gameState;
        const initialPlayers = initialGameState?.players || [];
        const initialTurnId = initialGameState ? (initialGameState.players[initialGameState.currentTurnIndex]?.id || '') : '';

        const playerTokensLayer = new PlayerTokensLayer(
          initialPlayers,
          app.screen.width,
          app.screen.height,
          initialTurnId
        );
        playerTokensLayerRef.current = playerTokensLayer;
        app.stage.addChild(playerTokensLayer);

        // Подписка на обновление состояния игроков из Zustand store
        unsubscribeStore = useGameStore.subscribe((state) => {
          if (playerTokensLayerRef.current && state.gameState) {
            const activeId = state.gameState.players[state.gameState.currentTurnIndex]?.id || '';
            playerTokensLayerRef.current.updatePlayers(
              state.gameState.players,
              activeId
            );
          }
        });

        // 3. Обновление слоёв на каждом кадре Pixi Ticker
        const tickerCallback = (ticker: Ticker) => {
          backgroundLayer.updateOnTicker(ticker.deltaTime);
          playerTokensLayer.updateOnTicker(ticker.deltaTime);
        };
        app.ticker.add(tickerCallback);

        // 4. Обработка адаптивного пересчёта орбит и стола при изменении размеров
        const handleResize = () => {
          if (appRef.current) {
            const { width, height } = appRef.current.screen;
            backgroundLayerRef.current?.resize(width, height);
            playerTokensLayerRef.current?.resize(width, height);
          }
        };

        app.renderer.on('resize', handleResize);
      } else {
        // Если компонент размонтирован до завершения init
        app.destroy(true);
      }
    }).catch((err) => {
      console.error('Ошибка инициализации PixiJS приложения:', err);
    });

    return () => {
      isMounted = false;
      if (unsubscribeStore) {
        unsubscribeStore();
      }
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
        backgroundLayerRef.current = null;
        playerTokensLayerRef.current = null;
      }
    };
  }, [containerRef]);

  return appRef;
}

