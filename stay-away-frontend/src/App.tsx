import { useState, useEffect, useMemo } from 'react';
import { socket } from './socket';
import type { GameState, Card, RevealEventData } from './types/game';
import LoginScreen from './components/screens/LoginScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import GameTable from './components/screens/GameTable';

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [controlledPlayerId, setControlledPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [targetVictimId, setTargetVictimId] = useState<string | null>(null);
  const [doorIndex, setDoorIndex] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

  const [revealData, setRevealData] = useState<RevealEventData | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('stayAwaySession');
    if (savedSession) {
      try {
        const { roomId, playerId, playerName } = JSON.parse(savedSession);
        socket.emit('reconnect_user', { roomId, playerId }, (res: { success: boolean }) => {
          if (res.success) {
            setMyPlayerId(playerId);
            setControlledPlayerId(playerId);
            setPlayerName(playerName);
          } else {
            localStorage.removeItem('stayAwaySession');
          }
        });
      } catch {
        localStorage.removeItem('stayAwaySession');
      }
    }

    socket.on('game_state_updated', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game_error', ({ message }: { message: string }) => {
      alert(`⚠️ Правила игры: ${message}`);
    });

    socket.on('reveal_event', (data: RevealEventData) => {
      setRevealData(data);
    });

    socket.on('kicked', () => {
      alert('Вас исключили из комнаты.');
      localStorage.removeItem('stayAwaySession');
      setGameState(null);
      setMyPlayerId(null);
      setControlledPlayerId(null);
      setRoomCodeInput('');
    });

    return () => {
      socket.off('game_state_updated');
      socket.off('game_error');
      socket.off('reveal_event');
      socket.off('kicked');
    };
  }, []);

  const me = gameState?.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  
  const activePlayerId = controlledPlayerId || myPlayerId;

  const activePlayerIndex = useMemo(() => {
    return gameState?.players.findIndex((p) => p.id === activePlayerId) ?? -1;
  }, [gameState?.players, activePlayerId]);

  const activePlayer = activePlayerIndex !== -1 && gameState ? gameState.players[activePlayerIndex] : undefined;
  const currentTurnPlayer = gameState ? gameState.players[gameState.currentTurnIndex] : null;

  const isControlledTurn = currentTurnPlayer?.id === activePlayerId;

  const handleSelectSeat = (id: string) => {
    setControlledPlayerId(id);
    setSelectedCardId(null);
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) return alert('Введите ваше имя!');
    socket.emit('create_room', { playerName }, (res: { success: boolean; playerId: string }) => {
      if (res.success) {
        setMyPlayerId(res.playerId);
        setControlledPlayerId(res.playerId);
        localStorage.setItem('stayAwaySession', JSON.stringify({ roomId: res.roomId, playerId: res.playerId, playerName }));
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCodeInput.trim()) return alert('Заполните данные!');
    socket.emit('join_room', { roomId: roomCodeInput.toUpperCase(), playerName }, (res: { success: boolean; playerId: string }) => {
      if (res.success) {
        setMyPlayerId(res.playerId);
        setControlledPlayerId(res.playerId);
        localStorage.setItem('stayAwaySession', JSON.stringify({ roomId: roomCodeInput.toUpperCase(), playerId: res.playerId, playerName }));
      } else {
        alert(res.message || 'Ошибка входа');
      }
    });
  };

  const handleAddBot = () => {
    if (gameState) socket.emit('add_bot', { roomId: gameState.roomId });
  };

  const handleStartGame = () => {
    if (gameState) socket.emit('start_game', { roomId: gameState.roomId });
  };

  const handleRestartGame = () => {
    if (gameState && myPlayerId) {
      socket.emit('restart_game', { roomId: gameState.roomId, requesterId: myPlayerId });
      // Clean local storage since going to lobby might require clearing the current session, or keep it?
      // User said "или при экране 'GAME_OVER' + кнопка "В лобби" очищай localStorage, если нужно"
      // Actually we probably want to stay in the room. I will create a separate "Leave" function.
    }
  };

  const handleLeaveRoom = () => {
    if (gameState && myPlayerId) {
      socket.emit('leave_room', { roomId: gameState.roomId, playerId: myPlayerId });
    }
    localStorage.removeItem('stayAwaySession');
    setGameState(null);
    setMyPlayerId(null);
    setControlledPlayerId(null);
    setRoomCodeInput('');
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    if (gameState && myPlayerId && isHost) {
      socket.emit('kick_player', { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId });
    }
  };

  const handleDrawCard = () => {
    if (gameState && myPlayerId && activePlayerId) {
      socket.emit('draw_card', { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId });
    }
  };

  const handlePlayCard = () => {
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      socket.emit('play_card', {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        cardId: selectedCardId,
        victimPlayerId: targetVictimId || undefined,
        doorIndex: doorIndex !== null ? doorIndex : undefined
      });
      setSelectedCardId(null);
      setTargetVictimId(null);
      setDoorIndex(null);
    }
  };

  const handleDiscardCard = () => {
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      socket.emit('discard_card', { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId, cardId: selectedCardId });
      setSelectedCardId(null);
    }
  };

  const handleOfferTrade = () => {
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      socket.emit('offer_trade', { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId, cardId: selectedCardId });
      setSelectedCardId(null);
    }
  };

  const handleAcceptTrade = () => {
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      socket.emit('accept_trade', { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId, cardId: selectedCardId });
      setSelectedCardId(null);
    }
  };

  const handleCancelTradeNoThanks = () => {
    if (!gameState || !myPlayerId || !activePlayer) return;
    const noThanksCard = activePlayer.hand.find(c => c.cardId === 'NO_THANKS');
    if (noThanksCard) {
      socket.emit('cancel_trade_no_thanks', {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        cardId: noThanksCard.id
      });
    }
  };

  const handleDefendAttack = (defenseCardId?: string) => {
    if (!gameState || !myPlayerId || !activePlayerId) return;
    socket.emit('defend_attack', {
      roomId: gameState.roomId,
      requesterId: myPlayerId,
      victimId: activePlayerId,
      defenseCardId
    });
  };

  const handleResolvePanic = () => {
    if (gameState && myPlayerId && activePlayerId && gameState.pendingPanic) {
      socket.emit('resolve_panic', {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        victimId: targetVictimId || undefined,
        cardId: selectedCardId || undefined
      });
      setSelectedCardId(null);
      setTargetVictimId(null);
    }
  };

  const selectedCard = activePlayer?.hand.find(c => c.id === selectedCardId);

  const isIllegalTradeCard = (card: Card) => {
    if (!gameState) return false;
    const isTradePhase = gameState.phase === 'TRADE' || gameState.phase === 'TRADE_ACCEPT';
    if (!isTradePhase) return false;

    if (card.cardId === 'THING') return true;
    if (activePlayer?.role === 'HUMAN' && card.cardId === 'INFECTED') return true;

    return false;
  };

  const isTargetRequired = selectedCard && ['FLAMETHROWER', 'ANALYSIS', 'QUARANTINE'].includes(selectedCard.cardId);
  const isDoorRequired = selectedCard && selectedCard.cardId === 'BARRED_DOOR';
  const isPlayDisabled = (isTargetRequired && !targetVictimId) || (isDoorRequired && doorIndex === null);

  const hasNoThanks = activePlayer?.hand.some(c => c.cardId === 'NO_THANKS');
  const defenseCardsInHand = activePlayer?.hand.filter(c => c.cardId === 'MISS' || c.cardId === 'NO_BARBECUE') || [];

  if (!gameState) {
    return (
      <LoginScreen
        playerName={playerName}
        setPlayerName={setPlayerName}
        roomCodeInput={roomCodeInput}
        setRoomCodeInput={setRoomCodeInput}
        handleCreateRoom={handleCreateRoom}
        handleJoinRoom={handleJoinRoom}
      />
    );
  }

  if (gameState.phase === 'LOBBY') {
    return (
      <LobbyScreen
        gameState={gameState}
        myPlayerId={myPlayerId}
        handleAddBot={handleAddBot}
        handleStartGame={handleStartGame}
        handleLeaveRoom={handleLeaveRoom}
        handleKickPlayer={handleKickPlayer}
        isHost={isHost}
      />
    );
  }

  return (
    <GameTable
      gameState={gameState}
      activePlayerId={activePlayerId}
      isHost={isHost}
      revealData={revealData}
      setRevealData={setRevealData}
      showLog={showLog}
      setShowLog={setShowLog}
      handleSelectSeat={handleSelectSeat}
      handleRestartGame={handleRestartGame}
      handleLeaveRoom={handleLeaveRoom}
      defenseCardsInHand={defenseCardsInHand}
      handleDefendAttack={handleDefendAttack}
      currentTurnPlayer={currentTurnPlayer}
      activePlayer={activePlayer}
      activePlayerIndex={activePlayerIndex}
      isControlledTurn={isControlledTurn}
      targetVictimId={targetVictimId}
      setTargetVictimId={setTargetVictimId}
      selectedCardId={selectedCardId}
      setSelectedCardId={setSelectedCardId}
      setDoorIndex={setDoorIndex}
      handleResolvePanic={handleResolvePanic}
      selectedCard={selectedCard}
      isPlayDisabled={isPlayDisabled}
      handleDrawCard={handleDrawCard}
      handlePlayCard={handlePlayCard}
      handleDiscardCard={handleDiscardCard}
      handleOfferTrade={handleOfferTrade}
      handleAcceptTrade={handleAcceptTrade}
      hasNoThanks={hasNoThanks}
      handleCancelTradeNoThanks={handleCancelTradeNoThanks}
      isIllegalTradeCard={isIllegalTradeCard}
    />
  );
}
