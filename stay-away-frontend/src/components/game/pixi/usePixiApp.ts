import { useEffect, useRef } from 'react';
import { Application, Ticker } from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { PlayerTokensLayer } from './layers/PlayerTokensLayer';
import { ObstaclesLayer } from './layers/ObstaclesLayer';
import { ParticlesLayer } from './layers/ParticlesLayer';
import { useGameStore } from '../../../store/useGameStore';
import type { Player } from '../../../types/game';

/**
 * Хук жизненного цикла приложения Pixi.js (v8).
 * Инициализирует Application, создает слои (BackgroundLayer, PlayerTokensLayer, ObstaclesLayer, ParticlesLayer)
 * и монтирует canvas в DOM.
 * Настраивает подписку на Zustand store, Pixi Ticker, обработчики адаптивного ресайза и экспортирует триггеры частиц.
 */
export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);
  const backgroundLayerRef = useRef<BackgroundLayer | null>(null);
  const playerTokensLayerRef = useRef<PlayerTokensLayer | null>(null);
  const obstaclesLayerRef = useRef<ObstaclesLayer | null>(null);
  const particlesLayerRef = useRef<ParticlesLayer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new Application();
    let unsubscribeStore: (() => void) | null = null;
    let isMounted = true;
    let prevPlayersMap: Map<string, Player> = new Map();

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

        // 4. Инициализация и монтирование ParticlesLayer на самый верхний слой
        const particlesLayer = new ParticlesLayer(app.screen.width, app.screen.height);
        particlesLayerRef.current = particlesLayer;
        app.stage.addChild(particlesLayer);

        // Сохраняем начальное состояние игроков для отслеживания изменений (выбывание, заражение)
        initialPlayers.forEach((p) => prevPlayersMap.set(p.id, { ...p }));

        // Подписка на обновление состояния игроков, дверей, карантина и триггеров событий из Zustand store
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

            // Проверка событий выбывания игрока или заражения для запуска анимаций ParticlesLayer
            state.gameState.players.forEach((currPlayer) => {
              const prevPlayer = prevPlayersMap.get(currPlayer.id);
              if (prevPlayer) {
                // Если игрок выбыл (был огнемётом), спавним эффект огнемёта от активного игрока к жертве
                if (prevPlayer.isAlive && !currPlayer.isAlive) {
                  const srcPos = playerTokensLayerRef.current?.getPlayerPosition(activeId) || { x: app.screen.width / 2, y: app.screen.height / 2 };
                  const tgtPos = playerTokensLayerRef.current?.getPlayerPosition(currPlayer.id) || { x: app.screen.width / 2, y: app.screen.height / 2 };
                  particlesLayerRef.current?.spawnFlamethrower(srcPos.x, srcPos.y, tgtPos.x, tgtPos.y);
                }

                // Если у игрока появился статус заражения / сменилась роль на INFECTED
                if (prevPlayer.role !== 'INFECTED' && currPlayer.role === 'INFECTED') {
                  const tgtPos = playerTokensLayerRef.current?.getPlayerPosition(currPlayer.id);
                  if (tgtPos) {
                    particlesLayerRef.current?.spawnInfectionSlime(tgtPos.x, tgtPos.y);
                  }
                }
              }
              prevPlayersMap.set(currPlayer.id, { ...currPlayer });
            });
          }
        });

        // 5. Обновление слоёв на каждом кадре Pixi Ticker
        const tickerCallback = (ticker: Ticker) => {
          backgroundLayer.updateOnTicker(ticker.deltaTime);
          playerTokensLayer.updateOnTicker(ticker.deltaTime);
          obstaclesLayer.updateOnTicker(ticker.deltaTime);
          particlesLayer.updateOnTicker(ticker.deltaTime);
        };
        app.ticker.add(tickerCallback);

        // 6. Обработка адаптивного пересчёта орбит, стола, преград и частиц при изменении размеров
        const handleResize = () => {
          if (appRef.current) {
            const { width, height } = appRef.current.screen;
            backgroundLayerRef.current?.resize(width, height);
            playerTokensLayerRef.current?.resize(width, height);
            obstaclesLayerRef.current?.resize(width, height);
            particlesLayerRef.current?.resize(width, height);
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
        particlesLayerRef.current = null;
      }
    };
  }, [containerRef]);

  /**
   * Экспортируемые методы триггеров для явного вызова эффектов ParticlesLayer
   */
  const spawnFlamethrower = (sourceX: number, sourceY: number, targetX: number, targetY: number) => {
    particlesLayerRef.current?.spawnFlamethrower(sourceX, sourceY, targetX, targetY);
  };

  const spawnInfectionSlime = (targetX: number, targetY: number) => {
    particlesLayerRef.current?.spawnInfectionSlime(targetX, targetY);
  };

  const spawnFlamethrowerBetweenPlayers = (sourcePlayerId: string, targetPlayerId: string) => {
    const tokensLayer = playerTokensLayerRef.current;
    if (!tokensLayer) return;
    const src = tokensLayer.getPlayerPosition(sourcePlayerId);
    const tgt = tokensLayer.getPlayerPosition(targetPlayerId);
    if (src && tgt) {
      particlesLayerRef.current?.spawnFlamethrower(src.x, src.y, tgt.x, tgt.y);
    }
  };

  const spawnInfectionSlimeForPlayer = (playerId: string) => {
    const tokensLayer = playerTokensLayerRef.current;
    if (!tokensLayer) return;
    const tgt = tokensLayer.getPlayerPosition(playerId);
    if (tgt) {
      particlesLayerRef.current?.spawnInfectionSlime(tgt.x, tgt.y);
    }
  };

  return {
    appRef,
    particlesLayerRef,
    spawnFlamethrower,
    spawnInfectionSlime,
    spawnFlamethrowerBetweenPlayers,
    spawnInfectionSlimeForPlayer,
  };
}
