import { useEffect, useRef } from 'react';
import { Application, Ticker } from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { PlayerTokensLayer } from './layers/PlayerTokensLayer';
import { ObstaclesLayer } from './layers/ObstaclesLayer';
import { useGameStore } from '../../../store/useGameStore';

/**
 * Хук жизненного цикла приложения Pixi.js (v8).
 * Инициализирует Application, создает слои (BackgroundLayer, PlayerTokensLayer, ObstaclesLayer) и монтирует canvas в DOM.
 * Настраивает подписку на Zustand store, Pixi Ticker и обработчики адаптивного ресайза.
 */
export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);
  const backgroundLayerRef = useRef<BackgroundLayer | null>(null);
  const playerTokensLayerRef = useRef<PlayerTokensLayer | null>(null);
  const obstaclesLayerRef = useRef<ObstaclesLayer | null>(null);

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

        // 3. Инициализация и монтирование ObstaclesLayer (выше PlayerTokensLayer)
        const initialDoors = initialGameState?.barredDoors || [];
        const initialQuarantinedIds = initialPlayers.filter((p) => p.isInQuarantine).map((p) => p.id);

        const obstaclesLayer = new ObstaclesLayer(
          app.screen.width,
          app.screen.height,
          initialPlayers
        );
        obstaclesLayer.updateObstacles(initialDoors, initialQuarantinedIds, initialPlayers);
        obstaclesLayerRef.current = obstaclesLayer;
        app.stage.addChild(obstaclesLayer);

        // Подписка на обновление состояния игроков, дверей и карантина из Zustand store
        unsubscribeStore = useGameStore.subscribe((state) => {
          if (state.gameState) {
            const activeId = state.gameState.players[state.gameState.currentTurnIndex]?.id || '';
            
            if (playerTokensLayerRef.current) {
              playerTokensLayerRef.current.updatePlayers(
                state.gameState.players,
                activeId
              );
            }

            if (obstaclesLayerRef.current) {
              const doors = state.gameState.barredDoors || [];
              const quarantinedIds = state.gameState.players
                .filter((p) => p.isInQuarantine)
                .map((p) => p.id);
              obstaclesLayerRef.current.updateObstacles(
                doors,
                quarantinedIds,
                state.gameState.players
              );
            }
          }
        });

        // 4. Обновление слоёв на каждом кадре Pixi Ticker
        const tickerCallback = (ticker: Ticker) => {
          backgroundLayer.updateOnTicker(ticker.deltaTime);
          playerTokensLayer.updateOnTicker(ticker.deltaTime);
          obstaclesLayer.updateOnTicker(ticker.deltaTime);
        };
        app.ticker.add(tickerCallback);

        // 5. Обработка адаптивного пересчёта орбит, стола и преград при изменении размеров
        const handleResize = () => {
          if (appRef.current) {
            const { width, height } = appRef.current.screen;
            backgroundLayerRef.current?.resize(width, height);
            playerTokensLayerRef.current?.resize(width, height);
            obstaclesLayerRef.current?.resize(width, height);
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
        obstaclesLayerRef.current = null;
      }
    };
  }, [containerRef]);

  return appRef;
}

