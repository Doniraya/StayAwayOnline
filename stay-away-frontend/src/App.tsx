import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';

/**
 * Стерильная точка входа App.tsx
 * Подключена 100% логика и связь с бэкендом по Socket.io.
 * Вся UI-верстка удалена — идеальный чистый холст для вашего нового UI/UX!
 */
export default function App() {
  const initSocketListeners = useGameStore((s) => s.initSocketListeners);
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    const cleanup = initSocketListeners();
    return cleanup;
  }, [initSocketListeners]);

  return (
    <div style={{ padding: 20 }}>
      {/* Чистый холст — здесь будет ваш новый UI */}
      <h1>StayAwayOnline — Sterile Canvas</h1>
      <p style={{ opacity: 0.7 }}>
        Связь с бэкендом активна. Состояние игры:{' '}
        <strong>{gameState ? gameState.phase : 'Не в комнате'}</strong>
      </p>
    </div>
  );
}
