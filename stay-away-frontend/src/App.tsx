import { useState, useEffect, useMemo } from 'react';
import { socket } from './socket';
import type { GameState, Card, RevealEventData } from './types/game';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Bot, Play, ShieldAlert, Flame, Eye, FileText, Ban, Lock, Biohazard, X, Trophy, Skull, RotateCcw, Sparkles, Shield } from 'lucide-react';

const GITHUB_REPO_URL = 'https://github.com/Doniraya/StayAwayOnline';

// Векторная иконка GitHub
const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const DECK_STATS: Record<number, { infected: number; panic: number; flamethrower: number; other: number }> = {
  4: { infected: 8, panic: 4, flamethrower: 2, other: 16 },
  5: { infected: 8, panic: 7, flamethrower: 2, other: 16 },
  6: { infected: 10, panic: 8, flamethrower: 3, other: 24 },
  7: { infected: 12, panic: 10, flamethrower: 3, other: 27 },
  8: { infected: 13, panic: 11, flamethrower: 3, other: 30 },
  9: { infected: 15, panic: 19, flamethrower: 4, other: 30 },
  10: { infected: 17, panic: 20, flamethrower: 4, other: 33 },
  11: { infected: 20, panic: 20, flamethrower: 5, other: 42 },
  12: { infected: 20, panic: 20, flamethrower: 5, other: 42 }
};

const getDeckComposition = (playerCount: number) => {
  const stats = DECK_STATS[playerCount] || DECK_STATS[4];
  return [
    { label: 'Нечто', count: 1, color: 'text-red-500', icon: '💀' },
    { label: 'Заражение', count: stats.infected, color: 'text-emerald-400', icon: '🦠' },
    { label: 'Огнемёт', count: stats.flamethrower, color: 'text-amber-500', icon: '🔥' },
    { label: 'Карты Паники', count: stats.panic, color: 'text-purple-400', icon: '😱' },
    { label: 'Защита и Действия', count: stats.other, color: 'text-blue-400', icon: '🛡️' },
  ];
};

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
    socket.on('game_state_updated', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game_error', ({ message }: { message: string }) => {
      alert(`⚠️ Правила игры: ${message}`);
    });

    socket.on('reveal_event', (data: RevealEventData) => {
      setRevealData(data);
    });

    return () => {
      socket.off('game_state_updated');
      socket.off('game_error');
      socket.off('reveal_event');
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
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCodeInput.trim()) return alert('Заполните данные!');
    socket.emit('join_room', { roomId: roomCodeInput.toUpperCase(), playerName }, (res: { success: boolean; playerId: string }) => {
      if (res.success) {
        setMyPlayerId(res.playerId);
        setControlledPlayerId(res.playerId);
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

  // 1. ВХОД
  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl shadow-lg"
          title="Репозиторий проекта на GitHub"
        >
          <GithubIcon className="w-4 h-4 text-white" />
          <span className="font-semibold">GitHub</span>
        </a>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-extrabold tracking-wider text-red-500 flex items-center justify-center gap-2">
              <Flame className="w-8 h-8 animate-pulse" /> НЕЧТО
            </h1>
            <p className="text-slate-400 text-sm">Stay Away! — Настольная карточная онлайн игра</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Ваше Имя</label>
              <input type="text" placeholder="Например: Алекс" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition" />
            </div>

            <button onClick={handleCreateRoom} className="w-full bg-red-600 hover:bg-red-500 font-bold py-3 rounded-lg transition shadow-lg shadow-red-900/40 flex items-center justify-center gap-2">
              <Users className="w-5 h-5" /> Создать Комнату
            </button>

            <div className="flex gap-2 pt-2">
              <input type="text" placeholder="КОД КОМНАТЫ" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)} className="w-2/3 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-slate-500 uppercase tracking-widest text-center" />
              <button onClick={handleJoinRoom} className="w-1/3 bg-slate-800 hover:bg-slate-700 font-semibold py-3 rounded-lg transition">Войти</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. ЛОББИ
  if (gameState.phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-6 right-6 text-slate-400 hover:text-white transition flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl shadow-lg"
          title="Репозиторий проекта на GitHub"
        >
          <GithubIcon className="w-4 h-4 text-white" />
          <span className="font-semibold">GitHub</span>
        </a>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-lg w-full space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-red-500">Комната {gameState.roomId}</h2>
              <p className="text-xs text-slate-400">Игроков: {gameState.players.length} / 12</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(gameState.roomId)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-slate-300">
              Скопировать Код
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto p-1">
            <AnimatePresence>
              {gameState.players.map((p, index) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex justify-between items-center p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    p.isHost
                      ? 'bg-slate-900 border-amber-500/30 shadow-amber-500/10'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="font-medium flex items-center gap-2">
                    {p.isBot ? (
                      <Bot className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Users className="w-4 h-4 text-blue-400" />
                    )}
                    {p.name} {p.id === myPlayerId && <span className="text-xs text-slate-500">(Вы)</span>}
                  </span>
                  {p.isHost && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-sm">
                      Хост
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {isHost && (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAddBot}
                className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-lg py-3 rounded-xl border-2 border-slate-700/50 hover:border-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
              >
                <Bot className="w-5 h-5" /> Добавить Бота
              </button>
              <button
                onClick={handleStartGame}
                disabled={gameState.players.length < 4}
                className={`w-full font-black text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                  gameState.players.length >= 4
                    ? 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-red-400/20'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <Play className="w-6 h-6" /> НАЧАТЬ ИГРУ
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. 2D СТОЛ
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 overflow-hidden relative">
      
      {/* 🏆 ЭКРАН ПОБЕДЫ */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`border-4 p-8 rounded-3xl max-w-2xl w-full shadow-2xl space-y-6 text-center relative overflow-hidden ${gameState.winnerRole === 'HUMANS' ? 'bg-slate-900 border-emerald-500 shadow-emerald-950' : 'bg-slate-900 border-red-600 shadow-red-950'}`}>
            <div className="space-y-2">
              <div className="flex justify-center">
                {gameState.winnerRole === 'HUMANS' ? <Trophy className="w-16 h-16 text-emerald-400 animate-bounce" /> : <Skull className="w-16 h-16 text-red-500 animate-pulse" />}
              </div>
              <h2 className={`text-3xl font-black uppercase tracking-widest ${gameState.winnerRole === 'HUMANS' ? 'text-emerald-400' : 'text-red-500'}`}>
                {gameState.winnerRole === 'HUMANS' ? '🎉 ПОБЕДА ЛЮДЕЙ!' : '👾 НЕЧТО И ЗАРАЖЁННЫЕ ПОБЕДИЛИ!'}
              </h2>
              <p className="text-slate-400 text-xs">
                {gameState.winnerRole === 'HUMANS' ? 'Нечто было успешно распознано и сожжено!' : 'Человечество пало. Монстр захватил всю станцию!'}
              </p>
            </div>

            <div className="space-y-2 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Раскрытие Тайных Ролей
              </h4>
              {gameState.players.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    {p.isBot ? <Bot className="w-4 h-4 text-emerald-400" /> : <Users className="w-4 h-4 text-blue-400" />}
                    <span>{p.name}</span>
                    {!p.isAlive && <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900">Сгорел</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {p.role === 'THING' && <span className="bg-red-950 text-red-400 font-black px-2.5 py-1 rounded-lg border border-red-700 flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> НЕЧТО</span>}
                    {p.role === 'INFECTED' && <span className="bg-emerald-950 text-emerald-400 font-bold px-2.5 py-1 rounded-lg border border-emerald-800 flex items-center gap-1"><Biohazard className="w-3.5 h-3.5" /> ЗАРАЖЁН</span>}
                    {p.role === 'HUMAN' && <span className="bg-slate-800 text-slate-300 font-semibold px-2.5 py-1 rounded-lg border border-slate-700">🧑 ЧЕЛОВЕК</span>}
                  </div>
                </div>
              ))}
            </div>

            {isHost && (
              <button onClick={handleRestartGame} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2">
                <RotateCcw className="w-5 h-5" /> СЫГРАТЬ ЕЩЁ РАЗ
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* 🛡️ МОДАЛКА РЕАКЦИИ */}
      {gameState.phase === 'RESPOND' && (
        <div className="fixed inset-0 z-50 bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border-4 border-red-600 p-6 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-4">
            <Flame className="w-14 h-14 text-red-500 animate-pulse mx-auto" />
            <h3 className="text-2xl font-black text-red-500 uppercase tracking-wider">⚠️ Вас атакуют Огнемётом!</h3>
            <p className="text-slate-300 text-xs">Игрок пытается сжечь вас. Желаете разыграть карту Защиты?</p>

            <div className="space-y-2 pt-2">
              {defenseCardsInHand.length > 0 ? (
                defenseCardsInHand.map((defCard) => (
                  <button key={defCard.id} onClick={() => handleDefendAttack(defCard.id)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition">
                    <Shield className="w-5 h-5" /> Сыграть "{defCard.name}" (Защититься)
                  </button>
                ))
              ) : (
                <p className="text-amber-400 text-xs font-bold">У вас нет карт защиты на руке...</p>
              )}

              <button onClick={() => handleDefendAttack(undefined)} className="w-full bg-slate-800 hover:bg-red-950 text-red-400 font-semibold py-2.5 rounded-xl border border-red-900/50 transition">
                💀 Принять урон (Не защищаться)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Всплывашка результатов (Анализ / Виски / Паника) */}
      {revealData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border-2 border-slate-700 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col">
            <button onClick={() => setRevealData(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              {revealData.type === 'ANALYSIS' && `🔍 Результат Анализа (Рука игрока ${revealData.targetName})`}
              {revealData.type === 'WHISKEY' && `🥃 Виски (${revealData.playerName} показывает карты)`}
              {revealData.type === 'PANIC_BETWEEN_US' && `🤫 Только между нами... Игрок ${revealData.targetName} показывает карты`}
              {revealData.type === 'CONFESSION' && `Время признаний!`}
            </h3>

            <div className="overflow-y-auto pr-2">
              {revealData.type === 'CONFESSION' && revealData.cardsMap ? (
                <div className="space-y-4">
                  {Object.entries(revealData.cardsMap).map(([playerName, cards]) => (
                    <div key={playerName} className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-300">{playerName}:</h4>
                      <div className="flex gap-3 overflow-x-auto px-12 pt-40 pb-6">
                        {cards.map((c, i) => (
                          <motion.div
                            key={i}
                            animate={{ zIndex: 0 }}
                            whileHover={{ scale: 1.8, y: -40, zIndex: 50, transition: { delay: 0.4 } }}
                            className="w-24 h-36 rounded-lg overflow-hidden border border-slate-700 shrink-0 shadow-lg relative bg-slate-950"
                          >
                            <img src={c.imageUrl || '/cards/back.png'} alt={c.name} className="w-full h-full object-cover" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto px-12 pt-40 pb-6">
                  {revealData.cards?.map((c, i) => (
                    <motion.div
                      key={i}
                      animate={{ zIndex: 0 }}
                      whileHover={{ scale: 1.8, y: -40, zIndex: 50, transition: { delay: 0.4 } }}
                      className="w-28 h-40 rounded-lg overflow-hidden border border-slate-700 shrink-0 shadow-lg relative bg-slate-950"
                    >
                      <img src={c.imageUrl || '/cards/back.png'} alt={c.name} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setRevealData(null)} className="w-full bg-amber-500 hover:bg-amber-400 font-bold py-2 rounded-lg text-slate-950 transition mt-4 shrink-0">
              Понятно, закрыть
            </button>
          </motion.div>
        </div>
      )}

      {/* Шапка 2D Стола */}
      <div className="flex flex-wrap justify-between items-center bg-slate-900/90 border border-slate-800 p-4 rounded-xl gap-4 relative z-50">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
            <Flame className="w-5 h-5" /> НЕЧТО
          </h2>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300">Комната: {gameState.roomId}</span>
          {activePlayer?.role === 'THING' && <span className="text-xs bg-red-950 text-red-400 font-bold px-3 py-1 rounded-full border border-red-800 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> ВЫ — НЕЧТО</span>}
          {activePlayer?.role === 'INFECTED' && <span className="text-xs bg-emerald-950 text-emerald-400 font-bold px-3 py-1 rounded-full border border-emerald-800">ЗАРАЖЕН</span>}
        </div>

        {isHost && (
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 flex items-center gap-1 px-2"><Eye className="w-3.5 h-3.5 text-amber-400" /> Пересесть:</span>
            {gameState.players.map((p) => (
              <button key={p.id} onClick={() => handleSelectSeat(p.id)} className={`text-xs px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${activePlayerId === p.id ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                {p.isBot ? <Bot className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-sm font-semibold">
          <span>Фаза: <strong className="text-amber-400">{gameState.phase}</strong></span>
          <span>Ходит: <strong className="text-blue-400">{currentTurnPlayer?.name}</strong></span>
          
          <button onClick={() => setShowLog(!showLog)} className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded flex items-center gap-1 text-slate-300">
            <FileText className="w-3.5 h-3.5" /> Лог
          </button>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-slate-800 hover:bg-slate-700 p-1.5 rounded text-slate-300 transition border border-slate-700 flex items-center gap-1"
            title="Открыть репозиторий GitHub"
          >
            <GithubIcon className="w-4 h-4 text-white" />
          </a>
        </div>
      </div>

      {showLog && (
        <div className="absolute top-20 right-4 z-50 bg-slate-900/95 border border-slate-800 p-4 rounded-xl w-80 max-h-80 overflow-y-auto shadow-2xl space-y-1 text-xs">
          <h4 className="font-bold border-b border-slate-800 pb-1 mb-2 text-slate-300">История Событий</h4>
          {gameState.log.slice().reverse().map((entry, idx) => (
            <div key={idx} className="text-slate-400 py-0.5 border-b border-slate-800/50">{entry}</div>
          ))}
        </div>
      )}

      {/* 2D Стол */}
      <div className="relative flex-1 flex items-center justify-center my-4">
        <div className="w-[600px] h-[350px] bg-slate-900/90 border-4 border-slate-800 rounded-full flex items-center justify-center shadow-2xl relative">
          
          <div className="flex gap-8 items-center">
            <div className="flex flex-col items-center group relative cursor-help">
              <div className="w-20 h-28 bg-slate-800 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl relative">
                <img src="/cards/back.png" alt="Рубашка" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center font-extrabold text-white text-base">
                  {gameState.deck.length}
                </div>
              </div>
              <span className="text-xs text-slate-400 mt-1.5 font-medium group-hover:text-amber-400 transition-colors">Колода</span>

              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none">
                <div className="bg-slate-950/90 backdrop-blur-md border border-amber-500/30 rounded-xl p-3 shadow-2xl shadow-black">
                  <div className="text-xs font-bold text-amber-500 mb-2 border-b border-amber-500/20 pb-1 text-center">
                    Состав игры на {gameState.players.length} чел.
                  </div>
                  <div className="space-y-1.5">
                    {getDeckComposition(gameState.players.length).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-slate-300">{item.label}</span>
                        </div>
                        <span className={`font-bold ${item.color}`}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-950/90 border-b border-r border-amber-500/30 rotate-45 backdrop-blur-md"></div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-20 h-28 bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-600 font-semibold shadow-inner">
                {gameState.discardPile.length > 0 ? `${gameState.discardPile.length} сброшено` : 'Сброс'}
              </div>
              <span className="text-xs text-slate-400 mt-1.5 font-medium">Сброс</span>
            </div>
          </div>

          <motion.div
            animate={{ rotate: (gameState.currentTurnIndex / gameState.players.length) * 360 - 90 }}
            className="absolute top-1/2 left-1/2 w-64 h-64 -mt-32 -ml-32 rounded-full border-2 border-dashed border-amber-500/20 pointer-events-none flex justify-center"
          >
            <div className="absolute top-0 -mt-4 text-amber-500 animate-bounce drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
              ▼
            </div>
          </motion.div>

          {/* Двери */}
          {gameState.players.map((_, i) => {
            if (!gameState.barredDoors[i]) return null;
            const N = gameState.players.length;
            const angle = ((i + 0.5) / N) * 2 * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * 280;
            const y = Math.sin(angle) * 180;

            return (
              <div key={`door-${i}`} style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)' }} className="absolute origin-center z-30 bg-amber-900 border-2 border-amber-500 text-amber-200 px-2 py-1 rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow-2xl animate-pulse">
                <Lock className="w-3 h-3 text-amber-400" /> ДВЕРЬ
              </div>
            );
          })}

          {/* Игроки */}
          {gameState.players.map((player, index) => {
            const angle = (index / gameState.players.length) * 2 * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * 280;
            const y = Math.sin(angle) * 180;

            const isCurrentTurn = index === gameState.currentTurnIndex;
            const isSelectedSeat = player.id === activePlayerId;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                whileHover={!isSelectedSeat && player.isAlive ? { scale: 1.05 } : {}}
                onClick={() => isHost && handleSelectSeat(player.id)}
                style={{ left: `calc(50% - 64px)`, top: `calc(50% - 38px)` }}
                className={`absolute origin-center p-3 rounded-xl border flex flex-col items-center w-32 backdrop-blur shadow-lg cursor-pointer transition-all ${
                  isSelectedSeat
                    ? 'ring-4 ring-amber-400 border-amber-500 scale-110 z-20 bg-slate-900'
                    : isCurrentTurn
                    ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/50 z-10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                } ${!player.isAlive ? 'opacity-40 grayscale line-through' : ''}`}
              >
                {player.isInQuarantine && (
                  <span className="absolute -top-3 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-300 shadow flex items-center gap-0.5">
                    <Biohazard className="w-3 h-3" /> КАРАНТИН
                  </span>
                )}

                <div className="flex items-center gap-1 font-bold text-sm truncate max-w-full mt-1">
                  {player.isBot ? <Bot className="w-4 h-4 text-emerald-400 shrink-0" /> : <Users className="w-4 h-4 text-blue-400 shrink-0" />}
                  <span className="truncate">{player.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Карт: {player.hand.length}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Панель управления */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center space-y-4">
        
        {/* Управление для фазы RESOLVE_PANIC */}
        {gameState.phase === 'RESOLVE_PANIC' && isControlledTurn && gameState.pendingPanic && (
          <div className="bg-slate-950 border border-red-800 p-4 rounded-xl flex flex-col items-center justify-center gap-4 shadow-lg shadow-red-900/20 w-full max-w-2xl">
            <h3 className="text-xl font-black text-red-500 animate-pulse text-center">
              🚨 ПАНИКА: Разыграйте карту "{gameState.pendingPanic.name}"
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-4 w-full">
              {gameState.pendingPanic.cardId === 'PANIC_BLIND_DATE' && (
                <div className="text-sm text-amber-400 font-bold">
                  Выберите карту из руки для сброса
                </div>
              )}

              {['PANIC_GET_OUT', 'PANIC_FRIENDS', 'PANIC_ONE_TWO', 'PANIC_BETWEEN_US'].includes(gameState.pendingPanic.cardId) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-400 font-bold">Выберите жертву:</span>
                  <select
                    value={targetVictimId || ''}
                    onChange={(e) => setTargetVictimId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">-- Выберите игрока --</option>
                    {gameState.players.filter(p => p.id !== activePlayerId && p.isAlive).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleResolvePanic}
                disabled={
                  (gameState.pendingPanic.cardId === 'PANIC_BLIND_DATE' && !selectedCardId) ||
                  (['PANIC_GET_OUT', 'PANIC_FRIENDS', 'PANIC_ONE_TWO', 'PANIC_BETWEEN_US'].includes(gameState.pendingPanic.cardId) && !targetVictimId)
                }
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-lg transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Применить эффект Паники
              </button>
            </div>
          </div>
        )}

        {/* Выбор цели */}
        {gameState.phase === 'PLAY_OR_DISCARD' && isControlledTurn && selectedCard && (
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-center gap-4">
            {['FLAMETHROWER', 'ANALYSIS', 'QUARANTINE'].includes(selectedCard.cardId) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-bold">Выберите цель:</span>
                <select onChange={(e) => setTargetVictimId(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                  <option value="">-- Выберите игрока --</option>
                  {gameState.players.filter(p => p.id !== activePlayerId && p.isAlive).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedCard.cardId === 'BARRED_DOOR' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-bold">Заколотить проход:</span>
                <select onChange={(e) => setDoorIndex(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                  <option value="">-- Выберите проход --</option>
                  {(() => {
                    const N = gameState.players.length;
                    const myIndex = activePlayerIndex;
                    if (myIndex === -1) return null;

                    const leftNeighbor = gameState.players[(myIndex + 1) % N];
                    const rightNeighbor = gameState.players[(myIndex - 1 + N) % N];
                    const leftDoor = myIndex;
                    const rightDoor = (myIndex - 1 + N) % N;

                    return (
                      <>
                        <option value={leftDoor}>Слева (между мной и {leftNeighbor.name})</option>
                        <option value={rightDoor}>Справа (между мной и {rightNeighbor.name})</option>
                      </>
                    );
                  })()}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Кнопки фаз */}
        {isControlledTurn && (
          <div className="flex gap-3">
            {gameState.phase === 'DRAW' && (
              <button onClick={handleDrawCard} className="bg-emerald-600 hover:bg-emerald-500 font-bold px-6 py-2 rounded-lg transition shadow-lg">
                Взять карту из колоды ({activePlayer?.name})
              </button>
            )}

            {gameState.phase === 'PLAY_OR_DISCARD' && selectedCardId && (
              <div className="flex gap-2">
                <button onClick={handlePlayCard} disabled={isPlayDisabled} className="bg-red-600 hover:bg-red-500 font-bold px-5 py-2 rounded-lg transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                  🔥 Сыграть действие карты
                </button>
                <button onClick={handleDiscardCard} className="bg-amber-600 hover:bg-amber-500 font-bold px-5 py-2 rounded-lg transition shadow-lg">
                  🗑️ Просто сбросить карту
                </button>
              </div>
            )}

            {gameState.phase === 'TRADE' && selectedCardId && (
              <button onClick={handleOfferTrade} className="bg-blue-600 hover:bg-blue-500 font-bold px-6 py-2 rounded-lg transition shadow-lg">
                Предложить эту карту на обмен
              </button>
            )}
          </div>
        )}

        {/* Ответ на обмен */}
        {gameState.phase === 'TRADE_ACCEPT' && gameState.pendingTrade?.toPlayerId === activePlayerId && (
          <div className="flex flex-col items-center space-y-2">
            <span className="text-xs font-bold text-amber-400 animate-bounce">
              Вам предложили обмен! Выберите карту из руки ({activePlayer?.name}) и подтвердите:
            </span>
            <div className="flex gap-2">
              {selectedCardId && (
                <button onClick={handleAcceptTrade} className="bg-emerald-600 hover:bg-emerald-500 font-bold px-6 py-2 rounded-lg transition shadow-lg">
                  Подтвердить обмен карты
                </button>
              )}
              {hasNoThanks && (
                <button onClick={handleCancelTradeNoThanks} className="bg-amber-600 hover:bg-amber-500 font-bold px-5 py-2 rounded-lg transition shadow-lg flex items-center gap-1 text-slate-950">
                  <Shield className="w-4 h-4" /> Сыграть "Нет уж, спасибо!" (Отменить обмен)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Рука кресла */}
        <div className="flex gap-3 overflow-x-auto max-w-full px-12 pt-40 pb-6">
          <AnimatePresence mode="popLayout">
          {activePlayer?.hand.map((card) => {
            const isSelected = card.id === selectedCardId;
            const illegal = isIllegalTradeCard(card);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0, zIndex: card.id === selectedCardId ? 10 : 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -50 }}
                whileHover={illegal ? {} : { scale: 1.8, y: -60, zIndex: 50, transition: { delay: 0.4, duration: 0.2 } }}
                onClick={() => !illegal && setSelectedCardId(card.id)}
                className={`w-32 h-48 rounded-xl overflow-hidden border-2 transition shadow-xl relative cursor-pointer bg-slate-950 ${
                  illegal ? 'opacity-40 grayscale cursor-not-allowed border-slate-800' : 'border-slate-700'
                } ${isSelected ? 'ring-4 ring-amber-400 scale-105 border-amber-400 z-10' : ''}`}
              >
                <img src={card.imageUrl || '/cards/back.png'} alt={card.name} className="w-full h-full object-cover" />

                {illegal && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-2 text-center">
                    <span className="bg-red-950 text-red-400 border border-red-800 rounded text-[9px] font-bold px-2 py-1 flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Нельзя отдать
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}