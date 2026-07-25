import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { gameEngine } from './game/GameEngine';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

function broadcastGameState(roomId: string) {
  const room = gameEngine.getRoom(roomId);
  if (!room) return;

  room.players.forEach(player => {
    if (!player.isBot) {
      const sanitizedState = gameEngine.getSanitizedState(roomId, player.id);
      io.to(player.id).emit('game_state_updated', sanitizedState);
    }
  });

  // 🤖 Автоматически запускаем ИИ Бота, если сейчас его черед действовать!
  gameEngine.checkAndExecuteBotTurn(roomId, () => broadcastGameState(roomId));
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ playerName }, callback) => {
    const { roomId, hostId } = gameEngine.createRoom(playerName);
    socket.join(roomId);
    socket.join(hostId);
    callback({ success: true, roomId, playerId: hostId });
    broadcastGameState(roomId);
  });

  socket.on('join_room', ({ roomId, playerName }, callback) => {
    const player = gameEngine.joinRoom(roomId, playerName);
    if (!player) return callback({ success: false, message: 'Не удалось войти' });
    socket.join(roomId);
    socket.join(player.id);
    callback({ success: true, playerId: player.id });
    broadcastGameState(roomId);
  });

  socket.on('reconnect_user', ({ roomId, playerId }, callback) => {
    const room = gameEngine.getRoom(roomId);
    if (room && room.players.some(p => p.id === playerId)) {
      socket.join(roomId);
      socket.join(playerId);
      callback({ success: true });
      broadcastGameState(roomId);
    } else {
      callback({ success: false });
    }
  });

  socket.on('add_bot', ({ roomId }) => {
    gameEngine.addBot(roomId);
    broadcastGameState(roomId);
  });

  socket.on('start_game', ({ roomId }) => {
    if (gameEngine.startGame(roomId)) {
      broadcastGameState(roomId);
    }
  });

  socket.on('restart_game', ({ roomId, requesterId }) => {
    if (gameEngine.restartGame(roomId, requesterId)) {
      broadcastGameState(roomId);
    }
  });

  socket.on('draw_card', ({ roomId, requesterId, targetPlayerId }) => {
    const res = gameEngine.drawCard(roomId, requesterId, targetPlayerId);
    if (!res.success) {
      socket.emit('game_error', { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on('play_card', ({ roomId, requesterId, targetPlayerId, cardId, victimPlayerId, doorIndex }) => {
    const res = gameEngine.playCard(roomId, requesterId, targetPlayerId, cardId, victimPlayerId, doorIndex);
    if (!res.success) {
      socket.emit('game_error', { message: res.error });
    } else {
      if (res.revealData) {
        if (res.revealData.type === 'ANALYSIS') {
          io.to(requesterId).emit('reveal_event', res.revealData);
        } else {
          io.to(roomId).emit('reveal_event', res.revealData);
        }
      }
      broadcastGameState(roomId);
    }
  });

  socket.on('discard_card', ({ roomId, requesterId, targetPlayerId, cardId }) => {
    const res = gameEngine.discardCard(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit('game_error', { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on('offer_trade', ({ roomId, requesterId, targetPlayerId, cardId }) => {
    const res = gameEngine.offerTrade(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit('game_error', { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on('accept_trade', ({ roomId, requesterId, targetPlayerId, cardId }) => {
    const res = gameEngine.acceptTrade(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit('game_error', { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on('defend_attack', ({ roomId, requesterId, victimId, defenseCardId }) => {
    const res = gameEngine.respondToAttack(roomId, requesterId, victimId, defenseCardId);
    if (!res.success) {
      socket.emit('game_error', { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });

  socket.on('cancel_trade_no_thanks', ({ roomId, requesterId, targetPlayerId, cardId }) => {
    const res = gameEngine.cancelTradeWithNoThanks(roomId, requesterId, targetPlayerId, cardId);
    if (!res.success) {
      socket.emit('game_error', { message: res.error });
    } else {
      broadcastGameState(roomId);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер "Нечто" запущен на порту ${PORT}`);
});