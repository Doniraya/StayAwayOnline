import { create } from 'zustand';
import { socket } from '../socket';
import type { GameState, RevealEventData, ChatMessage } from '../types/game';
import { SOCKET_EVENTS } from '../types/events';
import { soundManager } from '../utils/SoundManager';

interface GameStoreState {
  // Игровое состояние
  gameState: GameState | null;
  myPlayerId: string | null;
  controlledPlayerId: string | null;
  playerName: string;
  avatarUrl: string;
  roomCodeInput: string;
  selectedCardId: string | null;
  targetVictimId: string | null;
  doorIndex: number | null;
  showLog: boolean;
  revealData: RevealEventData | null;
  chatMessages: ChatMessage[];

  // Состояние тостов
  toastMessage: string | null;
  toastType: 'error' | 'info' | 'success' | null;
  showToast: (message: string, type?: 'error' | 'info' | 'success') => void;
  hideToast: () => void;

  // Сеттеры локального состояния
  setPlayerName: (name: string) => void;
  setAvatar: (url: string) => void;
  setRoomCodeInput: (code: string) => void;
  setSelectedCardId: (id: string | null) => void;
  setTargetVictimId: (id: string | null) => void;
  setDoorIndex: (index: number | null) => void;
  setShowLog: (show: boolean | ((prev: boolean) => boolean)) => void;
  setRevealData: (data: RevealEventData | null) => void;
  handleSelectSeat: (id: string) => void;

  // Инициализация подписок на события сокета
  initSocketListeners: () => () => void;

  // Сокет-действия
  handleCreateRoom: () => void;
  handleJoinRoom: () => void;
  handleToggleReady: () => void;
  handleAddBot: () => void;
  handleSetBotDelay: (delayMs: number) => void;
  handleStartGame: () => void;
  handleRestartGame: () => void;
  handleLeaveRoom: () => void;
  handleKickPlayer: (targetPlayerId: string) => void;
  handleDrawCard: () => void;
  handlePlayCard: () => void;
  handleDiscardCard: () => void;
  handleOfferTrade: () => void;
  handleAcceptTrade: () => void;
  handleCancelTradeNoThanks: () => void;
  handleCancelTradeFear: (cardId?: string) => void;
  handleRedirectTradeMiss: (cardId?: string) => void;
  handleDefendAttack: (defenseCardId?: string) => void;
  handleResolvePanic: () => void;
  handleResolvePersistence: (cardId: string) => void;
  handleSendChatMessage: (text: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  myPlayerId: null,
  controlledPlayerId: null,
  playerName: '',
  avatarUrl: (() => {
    try {
      return localStorage.getItem('stayAwayAvatar') || '';
    } catch {
      return '';
    }
  })(),
  roomCodeInput: '',
  selectedCardId: null,
  targetVictimId: null,
  doorIndex: null,
  showLog: false,
  revealData: null,
  chatMessages: [],

  toastMessage: null,
  toastType: null,

  showToast: (message, type = 'error') => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: message, toastType: type });
    toastTimer = setTimeout(() => {
      set({ toastMessage: null, toastType: null });
      toastTimer = null;
    }, 4000);
  },

  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set({ toastMessage: null, toastType: null });
  },

  setPlayerName: (name) => set({ playerName: name }),
  setAvatar: (url) => {
    set({ avatarUrl: url });
    try {
      localStorage.setItem('stayAwayAvatar', url);
    } catch {}

    const { gameState, myPlayerId } = get();
    if (socket.connected && myPlayerId) {
      socket.emit('player:avatar_update', {
        roomId: gameState?.roomId,
        playerId: myPlayerId,
        avatarUrl: url,
      });
    }
  },
  setRoomCodeInput: (code) => set({ roomCodeInput: code }),
  setSelectedCardId: (id) => set({ selectedCardId: id }),
  setTargetVictimId: (id) => set({ targetVictimId: id }),
  setDoorIndex: (index) => set({ doorIndex: index }),
  setShowLog: (show) => set((state) => ({ showLog: typeof show === 'function' ? show(state.showLog) : show })),
  setRevealData: (data) => set({ revealData: data }),

  handleSelectSeat: (id) => {
    set({ controlledPlayerId: id, selectedCardId: null });
  },

  initSocketListeners: () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        const cleanRoom = roomParam.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
        if (cleanRoom) {
          set({ roomCodeInput: cleanRoom });
        }
      }
    } catch {}

    const tryReconnect = () => {
      const savedSession = sessionStorage.getItem('stayAwaySession') || localStorage.getItem('stayAwaySession');
      if (savedSession) {
        try {
          const { roomId, playerId, playerName } = JSON.parse(savedSession);
          socket.emit(SOCKET_EVENTS.ROOM_RECONNECT, { roomId, playerId }, (res: { success: boolean; error?: string }) => {
            if (res.success) {
              set({ myPlayerId: playerId, controlledPlayerId: playerId, playerName: playerName || get().playerName });
            } else {
              sessionStorage.removeItem('stayAwaySession');
              localStorage.removeItem('stayAwaySession');
              if (res.error) get().showToast(res.error, 'error');
            }
          });
        } catch {
          sessionStorage.removeItem('stayAwaySession');
          localStorage.removeItem('stayAwaySession');
        }
      }
    };

    tryReconnect();

    const onGameStateUpdated = (state: GameState) => {
      const prevState = get().gameState;
      set({ gameState: state });

      if (!prevState) return;

      if (state.phase === 'GAME_OVER' && prevState.phase !== 'GAME_OVER') {
        const myId = get().myPlayerId;
        const me = state.players.find(p => p.id === myId);
        const isHumansWin = state.winnerRole === 'HUMANS';
        const isMyTeamWinner = me?.isAlive && ((isHumansWin && me.role === 'HUMAN') || (!isHumansWin && (me.role === 'THING' || me.role === 'INFECTED')));
        soundManager.play(isMyTeamWinner ? 'victory' : 'defeat');
      } else if (state.phase === 'RESPOND' && prevState.phase !== 'RESPOND') {
        soundManager.play('flamethrower');
      } else if (state.phase === 'RESOLVE_PANIC' && prevState.phase !== 'RESOLVE_PANIC') {
        soundManager.play('panic');
      } else if (state.log.length > prevState.log.length && state.phase !== 'LOBBY') {
        soundManager.play('card_play');
      }
    };

    const onGameError = ({ message }: { message: string }) => {
      get().showToast(message, 'error');
    };

    const onRevealEvent = (data: RevealEventData) => {
      set({ revealData: data });
      if (data.type === 'PANIC_DRAWN') {
        soundManager.play('panic');
      } else {
        soundManager.play('card_play');
      }
    };

    const onKicked = () => {
      get().showToast('Вас исключили из комнаты.', 'info');
      sessionStorage.removeItem('stayAwaySession');
      localStorage.removeItem('stayAwaySession');
      set({
        gameState: null,
        myPlayerId: null,
        controlledPlayerId: null,
        roomCodeInput: '',
        chatMessages: [],
      });
    };

    const onChatMessage = (msg: ChatMessage) => {
      set((state) => ({
        chatMessages: [...state.chatMessages.slice(-99), msg],
      }));
    };

    const onAvatarUpdate = ({ playerId, avatarUrl }: { playerId: string; avatarUrl: string }) => {
      set((state) => {
        if (!state.gameState) return {};
        const updatedPlayers = state.gameState.players.map((p) =>
          p.id === playerId ? { ...p, avatarUrl } : p
        );
        return { gameState: { ...state.gameState, players: updatedPlayers } };
      });
    };

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATED, onGameStateUpdated);
    socket.on(SOCKET_EVENTS.GAME_ERROR, onGameError);
    socket.on(SOCKET_EVENTS.REVEAL_EVENT, onRevealEvent);
    socket.on(SOCKET_EVENTS.KICKED, onKicked);
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, onChatMessage);
    socket.on('player:avatar_update', onAvatarUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATED, onGameStateUpdated);
      socket.off(SOCKET_EVENTS.GAME_ERROR, onGameError);
      socket.off(SOCKET_EVENTS.REVEAL_EVENT, onRevealEvent);
      socket.off(SOCKET_EVENTS.KICKED, onKicked);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, onChatMessage);
      socket.off('player:avatar_update', onAvatarUpdate);
    };
  },

  handleCreateRoom: () => {
    const { playerName, avatarUrl, showToast } = get();
    if (!playerName.trim()) return showToast('Введите ваше имя!', 'error');
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName, avatarUrl }, (res: { success: boolean; roomId: string; playerId: string }) => {
      if (res && res.success) {
        set({ myPlayerId: res.playerId, controlledPlayerId: res.playerId });
        const sessionData = JSON.stringify({ roomId: res.roomId, playerId: res.playerId, playerName });
        sessionStorage.setItem('stayAwaySession', sessionData);
        localStorage.setItem('stayAwaySession', sessionData);
      } else {
        showToast('Не удалось создать комнату. Проверьте соединение!', 'error');
      }
    });
  },

  handleJoinRoom: () => {
    const { playerName, avatarUrl, roomCodeInput, showToast } = get();
    if (!playerName.trim() || !roomCodeInput.trim()) return showToast('Заполните данные для входа!', 'error');
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: roomCodeInput.toUpperCase(), playerName, avatarUrl }, (res: { success: boolean; playerId?: string; message?: string }) => {
      if (res && res.success && res.playerId) {
        set({ myPlayerId: res.playerId, controlledPlayerId: res.playerId });
        const sessionData = JSON.stringify({ roomId: roomCodeInput.toUpperCase(), playerId: res.playerId, playerName });
        sessionStorage.setItem('stayAwaySession', sessionData);
        localStorage.setItem('stayAwaySession', sessionData);
      } else {
        showToast(res?.message || 'Ошибка входа в комнату', 'error');
      }
    });
  },

  handleToggleReady: () => {
    const { gameState, myPlayerId } = get();
    if (gameState && myPlayerId) {
      socket.emit(SOCKET_EVENTS.TOGGLE_READY, { roomId: gameState.roomId, playerId: myPlayerId });
    }
  },

  handleAddBot: () => {
    const { gameState } = get();
    if (gameState) socket.emit(SOCKET_EVENTS.ADD_BOT, { roomId: gameState.roomId });
  },

  handleSetBotDelay: (delayMs: number) => {
    const { gameState, myPlayerId } = get();
    if (gameState && myPlayerId) {
      socket.emit(SOCKET_EVENTS.SET_BOT_DELAY, { roomId: gameState.roomId, requesterId: myPlayerId, delayMs });
    }
  },

  handleStartGame: () => {
    const { gameState } = get();
    if (gameState) socket.emit(SOCKET_EVENTS.START_GAME, { roomId: gameState.roomId });
  },

  handleRestartGame: () => {
    const { gameState, myPlayerId } = get();
    if (gameState && myPlayerId) {
      socket.emit(SOCKET_EVENTS.RESTART_GAME, { roomId: gameState.roomId, requesterId: myPlayerId });
    }
  },

  handleLeaveRoom: () => {
    const { gameState, myPlayerId } = get();
    if (gameState && myPlayerId) {
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId: gameState.roomId, playerId: myPlayerId });
    }
    sessionStorage.removeItem('stayAwaySession');
    localStorage.removeItem('stayAwaySession');
    set({
      gameState: null,
      myPlayerId: null,
      controlledPlayerId: null,
      roomCodeInput: '',
      chatMessages: [],
    });
  },

  handleKickPlayer: (targetPlayerId: string) => {
    const { gameState, myPlayerId } = get();
    const me = gameState?.players.find((p) => p.id === myPlayerId);
    const isHost = me?.isHost ?? false;
    if (gameState && myPlayerId && isHost) {
      socket.emit(SOCKET_EVENTS.KICK_PLAYER, { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId });
    }
  },

  handleDrawCard: () => {
    const { gameState, myPlayerId, controlledPlayerId } = get();
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (gameState && myPlayerId && activePlayerId) {
      socket.emit(SOCKET_EVENTS.DRAW_CARD, { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId });
    }
  },

  handlePlayCard: () => {
    const { gameState, myPlayerId, controlledPlayerId, selectedCardId, targetVictimId, doorIndex } = get();
    if (!gameState || gameState.phase !== 'PLAY_OR_DISCARD') return;
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      const cardToPlay = selectedCardId;
      set({ selectedCardId: null, targetVictimId: null, doorIndex: null });
      socket.emit(SOCKET_EVENTS.PLAY_CARD, {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        cardId: cardToPlay,
        victimPlayerId: targetVictimId || undefined,
        doorIndex: doorIndex !== null ? doorIndex : undefined,
      });
    }
  },

  handleDiscardCard: () => {
    const { gameState, myPlayerId, controlledPlayerId, selectedCardId } = get();
    if (!gameState || gameState.phase !== 'PLAY_OR_DISCARD') return;
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      const cardToDiscard = selectedCardId;
      set({ selectedCardId: null });
      socket.emit(SOCKET_EVENTS.DISCARD_CARD, { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId, cardId: cardToDiscard });
    }
  },

  handleOfferTrade: () => {
    const { gameState, myPlayerId, controlledPlayerId, selectedCardId } = get();
    if (!gameState || gameState.phase !== 'TRADE') return;
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      const cardToOffer = selectedCardId;
      set({ selectedCardId: null });
      socket.emit(SOCKET_EVENTS.OFFER_TRADE, { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId, cardId: cardToOffer });
    }
  },

  handleAcceptTrade: () => {
    const { gameState, myPlayerId, controlledPlayerId, selectedCardId } = get();
    if (!gameState || gameState.phase !== 'TRADE_ACCEPT') return;
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (gameState && myPlayerId && activePlayerId && selectedCardId) {
      const cardToAccept = selectedCardId;
      set({ selectedCardId: null });
      socket.emit(SOCKET_EVENTS.ACCEPT_TRADE, { roomId: gameState.roomId, requesterId: myPlayerId, targetPlayerId: activePlayerId, cardId: cardToAccept });
    }
  },

  handleCancelTradeNoThanks: () => {
    const { gameState, myPlayerId, controlledPlayerId } = get();
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (!gameState || !myPlayerId || !activePlayerId) return;
    const activePlayer = gameState.players.find((p) => p.id === activePlayerId);
    const noThanksCard = activePlayer?.hand.find((c) => c.cardId === 'NO_THANKS');
    if (noThanksCard) {
      socket.emit(SOCKET_EVENTS.CANCEL_TRADE_NO_THANKS, {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        cardId: noThanksCard.id,
      });
    }
  },

  handleCancelTradeFear: (cardId?: string) => {
    const { gameState, myPlayerId, controlledPlayerId } = get();
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (!gameState || !myPlayerId || !activePlayerId) return;
    const activePlayer = gameState.players.find((p) => p.id === activePlayerId);
    const fearCard = cardId ? activePlayer?.hand.find((c) => c.id === cardId) : activePlayer?.hand.find((c) => c.cardId === 'FEAR');
    if (fearCard) {
      socket.emit(SOCKET_EVENTS.CANCEL_TRADE_FEAR, {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        cardId: fearCard.id,
      });
      set({ selectedCardId: null });
    }
  },

  handleRedirectTradeMiss: (cardId?: string) => {
    const { gameState, myPlayerId, controlledPlayerId } = get();
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (!gameState || !myPlayerId || !activePlayerId) return;
    const activePlayer = gameState.players.find((p) => p.id === activePlayerId);
    const missCard = cardId ? activePlayer?.hand.find((c) => c.id === cardId) : activePlayer?.hand.find((c) => c.cardId === 'MISS');
    if (missCard) {
      socket.emit(SOCKET_EVENTS.REDIRECT_TRADE_MISS, {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        cardId: missCard.id,
      });
      set({ selectedCardId: null });
    }
  },

  handleDefendAttack: (defenseCardId?: string) => {
    const { gameState, myPlayerId, controlledPlayerId } = get();
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (!gameState || !myPlayerId || !activePlayerId) return;
    socket.emit(SOCKET_EVENTS.DEFEND_ATTACK, {
      roomId: gameState.roomId,
      requesterId: myPlayerId,
      victimId: activePlayerId,
      defenseCardId,
    });
  },

  handleResolvePanic: () => {
    const { gameState, myPlayerId, controlledPlayerId, selectedCardId, targetVictimId } = get();
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (gameState && myPlayerId && activePlayerId && gameState.pendingPanic) {
      socket.emit(SOCKET_EVENTS.RESOLVE_PANIC, {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        victimId: targetVictimId || undefined,
        cardId: selectedCardId || undefined,
      });
      set({ selectedCardId: null, targetVictimId: null });
    }
  },

  handleResolvePersistence: (cardId: string) => {
    const { gameState, myPlayerId, controlledPlayerId } = get();
    const activePlayerId = controlledPlayerId || myPlayerId;
    if (gameState && myPlayerId && activePlayerId) {
      socket.emit(SOCKET_EVENTS.RESOLVE_PERSISTENCE, {
        roomId: gameState.roomId,
        requesterId: myPlayerId,
        targetPlayerId: activePlayerId,
        cardId,
      });
    }
  },

  handleSendChatMessage: (text: string) => {
    const { gameState, myPlayerId, controlledPlayerId, playerName } = get();
    if (!text.trim()) return;
    const senderId = controlledPlayerId || myPlayerId || 'guest';
    const activePlayer = gameState?.players.find((p) => p.id === senderId);
    const senderName = activePlayer?.name || playerName || 'Игрок';

    const newMsg: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      senderId,
      senderName,
      text: text.trim(),
      timestamp: Date.now(),
    };

    if (gameState?.roomId) {
      socket.emit(SOCKET_EVENTS.SEND_CHAT_MESSAGE, {
        roomId: gameState.roomId,
        senderId,
        text: text.trim(),
      });
    } else {
      set((state) => ({ chatMessages: [...state.chatMessages, newMsg] }));
    }
  },
}));
