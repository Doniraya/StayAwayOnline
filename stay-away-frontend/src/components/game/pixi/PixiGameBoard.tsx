import React, { useRef } from 'react';
import { usePixiApp } from './usePixiApp';

/**
 * React-компонент игрового поля PixiJS.
 * Обертка для контейнера canvas с поддержкой адаптивного изменения размера и стиля хоррора.
 */
export const PixiGameBoard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  usePixiApp(containerRef);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl border border-stone-800 shadow-2xl bg-stone-950"
    />
  );
};

export default PixiGameBoard;
