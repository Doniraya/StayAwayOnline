import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import LoginScreen from './components/screens/LoginScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import GameTable from './components/screens/GameTable';
import { Toast } from './components/game/Toast';

export default function App() {
  const gameState = useGameStore((s) => s.gameState);
  const initSocketListeners = useGameStore((s) => s.initSocketListeners);

  useEffect(() => {
    const cleanup = initSocketListeners();
    return cleanup;
  }, [initSocketListeners]);

  return (
    <>
      <Toast />
      {!gameState ? (
        <LoginScreen />
      ) : gameState.phase === 'LOBBY' ? (
        <LobbyScreen />
      ) : (
        <GameTable />
      )}
    </>
  );
}

