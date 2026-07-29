import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

/**
 * Хук жизненного цикла приложения Pixi.js (v8).
 * Инициализирует Application и монтирует canvas в контейнер DOM.
 * При размонтировании выполняет безопасную очистку ресурсов.
 */
export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);

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
      }
    };
  }, [containerRef]);

  return appRef;
}
