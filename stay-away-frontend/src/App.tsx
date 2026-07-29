import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import UIPlayground from './components/UIPlayground';

export default function App() {
  const initSocketListeners = useGameStore((s) => s.initSocketListeners);

  useEffect(() => {
    const cleanup = initSocketListeners();
    return cleanup;
  }, [initSocketListeners]);

  return <UIPlayground />;
}
