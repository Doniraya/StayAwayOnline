import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import PixiCanvasEngine from './components/PixiCanvasEngine';

export default function App() {
  const initSocketListeners = useGameStore((s) => s.initSocketListeners);

  useEffect(() => {
    const cleanup = initSocketListeners();
    return cleanup;
  }, [initSocketListeners]);

  return <PixiCanvasEngine />;
}
