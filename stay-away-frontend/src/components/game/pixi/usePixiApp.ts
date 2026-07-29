import { useEffect, useRef } from 'react';
import { Application, Ticker } from 'pixi.js';
import { BackgroundLayer } from './layers/BackgroundLayer';

/**
 * Хук жизненного цикла приложения Pixi.js (v8).
 * Инициализирует Application, создает слои (включая BackgroundLayer) и монтирует canvas в DOM.
 * Настраивает подписку на Pixi Ticker и обработчики адаптивного ресайза.
 */
export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);
  const backgroundLayerRef = useRef<BackgroundLayer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new Application();

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

        // Инициализация и монтирование BackgroundLayer
        const backgroundLayer = new BackgroundLayer(app.screen.width, app.screen.height);
        backgroundLayerRef.current = backgroundLayer;
        app.stage.addChild(backgroundLayer);

        // Обновление слоя фона на каждом кадре (анимация лампады)
        const tickerCallback = (ticker: Ticker) => {
          backgroundLayer.updateOnTicker(ticker.deltaTime);
        };
        app.ticker.add(tickerCallback);

        // Обработка адаптивного пересчёта стола при изменении размеров контейнера/окна
        const handleResize = () => {
          if (appRef.current && backgroundLayerRef.current) {
            backgroundLayerRef.current.resize(appRef.current.screen.width, appRef.current.screen.height);
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
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
        backgroundLayerRef.current = null;
      }
    };
  }, [containerRef]);

  return appRef;
}
