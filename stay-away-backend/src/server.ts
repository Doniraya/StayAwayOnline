import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { gameEngine } from './game/GameEngine';
import { SOCKET_EVENTS } from './types/events';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const socketMap = new Map<string, { roomId: string, playerId: string }>();

function broadcastGameState(roomId: string) {
  const room = gameEngine.getRoom(roomId);
  if (!room) return;

  room.players.forEach(player => {
    if (!player.isBot) {
      const sanitizedState = gameEngine.getSanitizedState(roomId, player.id);
      io.to(player.id).emit(SOCKET_EVENTS.GAME_STATE_UPDATED, sanitizedState);
    }
  });

  // 🤖 Автоматически запускаем ИИ Бота, если сейчас его черед действовать!
  gameEngine.checkAndExecuteBotTurn(roomId, (revealData?: any) => {
    if (revealData && !['ANALYSIS', 'SUSPICION'].includes(revealData.type)) {
      io.to(roomId).emit(SOCKET_EVENTS.REVEAL_EVENT, revealData);
    }
    broadcastGameState(roomId);
  });
}

io.on('connection', (socket) => {
  const handleCreateRoomAction = (payload: any, callback: Function) => {
    const { playerName } = payload || {};
    const safeName = (playerName || '').toString().slice(0, 30).trim() || 'Игрок';
    const { roomId, hostId } = gameEngine.createRoom(safeName);
    socket.join(roomId);
    socket.join(hostId);
    socketMap.set(socket.id, { roomId, playerId: hostId });
    if (typeof callback === 'function') {
      callback({ success: true, roomId, playerId: hostId });
    }
    broadcastGameState(roomId);
  };

  const handleJoinRoomAction = (payload: any, callback: Function) => {
    const { roomId, playerName } = payload || {};
    const safeName = (playerName || '').toString().slice(0, 30).trim() || 'Игрок';
    const cleanRoomId = (roomId || '').toString().replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
    const player = gameEngine.joinRoom(cleanRoomId, safeName);
    if (!player) {
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Не удалось войти' });
      }
      return;
    }
    socket.join(cleanRoomId);
    socket.join(player.id);
    socketMap.set(socket.id, { roomId: cleanRoomId, playerId: player.id });
    if (typeof callback === 'function') {
      callback({ success: true, playerId: player.id });
    }
    broadcastGameState(cleanRoomId);
  };

  socket.on(SOCKET_EVENTS.CREATE_ROOM, handleCreateRoomAction);
  socket.on(SOCKET_EVENTS.ROOM_CREATE, handleCreateRoomAction);
  socket.on(SOCKET_EVENTS.JOIN_ROOM, handleJoinRoomAction);
  socket.on(SOCKET_EVENTS.ROOM_JOIN, handleJoinRoomAction);

  const handleToggleReadyAction = () => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const { roomId, playerId } = info;
    const res = gameEngine.toggleReady(roomId, playerId);
    if (res.success) {
      broadcastGameState(roomId);
    } else if (res.error) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    }
  };

  socket.on(SOCKET_EVENTS.TOGGLE_READY, handleToggleReadyAction);
  socket.on(SOCKET_EVENTS.ROOM_TOGGLE_READY, handleToggleReadyAction);

  const handleReconnectAction = (payload: any, callback?: (res: { success: boolean; error?: string }) => void) => {
    const { roomId, playerId } = payload || {};
    const cleanRoomId = roomId ? String(roomId).trim().toUpperCase() : '';
    const cleanPlayerId = playerId ? String(playerId).trim() : '';

    const room = gameEngine.getRoom(cleanRoomId);
    if (room) {
      const player = room.players.find(p => p.id === cleanPlayerId);
      if (player) {
        player.isOnline = true;
        player.isBot = false;
        socket.join(cleanRoomId);
        socket.join(cleanPlayerId);
        socketMap.set(socket.id, { roomId: cleanRoomId, playerId: cleanPlayerId });
        if (typeof callback === 'function') {
          callback({ success: true });
        }
        broadcastGameState(cleanRoomId);
        return;
      }
    }
    if (typeof callback === 'function') {
      callback({ success: false, error: 'Комната или игрок не найдены' });
    }
  };

  socket.on(SOCKET_EVENTS.RECONNECT_USER, handleReconnectAction);
  socket.on(SOCKET_EVENTS.ROOM_RECONNECT, handleReconnectAction);
  socket.on('room:reconnect', handleReconnectAction);

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, ({ roomId, playerId }) => {
    const info = socketMap.get(socket.id);
    if (info && info.roomId === roomId && info.playerId === playerId) {
      socketMap.delete(socket.id);
      socket.leave(roomId);
      socket.leave(playerId);
      if (gameEngine.leaveRoom(roomId, playerId)) {
        broadcastGameState(roomId);
      }
    }
  });

  socket.on(SOCKET_EVENTS.KICK_PLAYER, ({ roomId, targetPlayerId }) => {
    // BUG-001 fix: requesterId берём из серверного маппинга
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.kickPlayer(roomId, requesterId, targetPlayerId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      io.to(targetPlayerId).emit(SOCKET_EVENTS.KICKED);
      broadcastGameState(roomId);
    }
  });

  socket.on('disconnect', () => {
    const info = socketMap.get(socket.id);
    if (info) {
      socketMap.delete(socket.id);
      if (gameEngine.handlePlayerDisconnect(info.roomId, info.playerId)) {
        broadcastGameState(info.roomId);
      }
    }
  });

  socket.on(SOCKET_EVENTS.REPLACE_WITH_BOT, ({ roomId, targetPlayerId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.replaceWithBot(roomId, requesterId, targetPlayerId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
      gameEngine.checkAndExecuteBotTurn(roomId, (revealData?: any) => {
        if (revealData && !['ANALYSIS', 'SUSPICION'].includes(revealData.type)) {
          io.to(roomId).emit(SOCKET_EVENTS.REVEAL_EVENT, revealData);
        }
        broadcastGameState(roomId);
      });
    }
  });

  socket.on(SOCKET_EVENTS.ADD_BOT, ({ roomId }) => {
    gameEngine.addBot(roomId);
    broadcastGameState(roomId);
  });

  socket.on(SOCKET_EVENTS.SET_BOT_DELAY, ({ roomId, delayMs }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    if (gameEngine.setBotDelay(roomId, requesterId, delayMs)) {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.START_GAME, ({ roomId }) => {
    if (gameEngine.startGame(roomId)) {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.RESTART_GAME, ({ roomId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    if (gameEngine.restartGame(roomId, requesterId)) {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.DRAW_CARD, ({ roomId, targetPlayerId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.drawCard(roomId, requesterId, targetPlayerId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      if (res.revealData) {
        io.to(roomId).emit(SOCKET_EVENTS.REVEAL_EVENT, res.revealData);
      }
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.PLAY_CARD, ({ roomId, targetPlayerId, cardId, victimPlayerId, doorIndex }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.playCard(roomId, requesterId, targetPlayerId, cardId, victimPlayerId, doorIndex);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      if (res.revealData) {
        if (['ANALYSIS', 'SUSPICION'].includes(res.revealData.type)) {
          io.to(requesterId).emit(SOCKET_EVENTS.REVEAL_EVENT, res.revealData);
        } else {
          io.to(roomId).emit(SOCKET_EVENTS.REVEAL_EVENT, res.revealData);
        }
      }
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.DISCARD_CARD, ({ roomId, targetPlayerId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.discardCard(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.OFFER_TRADE, ({ roomId, targetPlayerId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.offerTrade(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.ACCEPT_TRADE, ({ roomId, targetPlayerId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.acceptTrade(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.DEFEND_ATTACK, ({ roomId, victimId, defenseCardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.respondToAttack(roomId, requesterId, victimId, defenseCardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.CANCEL_TRADE_NO_THANKS, ({ roomId, targetPlayerId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.cancelTradeWithNoThanks(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.CANCEL_TRADE_FEAR, ({ roomId, targetPlayerId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.cancelTradeWithFear(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      if (res.revealData) {
        io.to(roomId).emit(SOCKET_EVENTS.REVEAL_EVENT, res.revealData);
      }
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.REDIRECT_TRADE_MISS, ({ roomId, targetPlayerId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.redirectTradeWithMiss(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.RESOLVE_PANIC, ({ roomId, targetPlayerId, victimId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.resolveTargetedPanic(roomId, requesterId, targetPlayerId, victimId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      if (res.revealData) {
        if (res.revealData.type === 'PANIC_BETWEEN_US' && victimId) {
          io.to(victimId).emit(SOCKET_EVENTS.REVEAL_EVENT, res.revealData);
        } else {
          io.to(roomId).emit(SOCKET_EVENTS.REVEAL_EVENT, res.revealData);
        }
      }
      broadcastGameState(roomId);
    }
  });

  socket.on(SOCKET_EVENTS.RESOLVE_PERSISTENCE, ({ roomId, targetPlayerId, cardId }) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const requesterId = info.playerId;
    const res = gameEngine.resolvePersistenceCard(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit(SOCKET_EVENTS.GAME_ERROR, { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  const handleSendChatMessageAction = (payload?: any) => {
    const info = socketMap.get(socket.id);
    if (!info) return;
    const { text } = payload || {};
    if (typeof text !== 'string' || !text.trim()) return;

    const targetRoomId = info.roomId;
    const senderId = info.playerId;
    const room = gameEngine.getRoom(targetRoomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === senderId);
    const senderName = player ? player.name : 'Неизвестный';
    const safeText = text.trim().slice(0, 200);

    const chatMsg = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderId,
      senderName,
      text: safeText,
      timestamp: Date.now(),
    };

    io.to(targetRoomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, chatMsg);
  };

  socket.on(SOCKET_EVENTS.SEND_CHAT_MESSAGE, handleSendChatMessageAction);
  socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleSendChatMessageAction);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер "Нечто" запущен на порту ${PORT}`);
});