import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, Play, X, LogOut, Plus, CheckCircle2, Clock } from 'lucide-react';
import { GITHUB_REPO_URL, GithubIcon } from '../Github';
import { useGameStore } from '../../store/useGameStore';
import InGameChat from '../game/InGameChat';

export default function LobbyScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const handleAddBot = useGameStore((s) => s.handleAddBot);
  const handleStartGame = useGameStore((s) => s.handleStartGame);
  const handleLeaveRoom = useGameStore((s) => s.handleLeaveRoom);
  const handleKickPlayer = useGameStore((s) => s.handleKickPlayer);
  const handleToggleReady = useGameStore((s) => s.handleToggleReady);

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;

  const MAX_PLAYERS = 12;
  const players = gameState.players;
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => players[i] || null);

  const neededPlayers = Math.max(0, 4 - players.length);
  const unreadyCount = players.filter((p) => !p.isHost && !p.isBot && (!p.isReady || !p.isOnline)).length;
  const canStart = players.length >= 4 && unreadyCount === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 md:p-8 relative">
      <div className="absolute top-4 left-4">
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-sm font-semibold border border-slate-700 hover:border-slate-600"
        >
          <LogOut className="w-4 h-4" /> Выйти
        </button>
      </div>

      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 text-slate-400 hover:text-white transition flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl shadow-lg"
        title="Репозиторий проекта на GitHub"
      >
        <GithubIcon className="w-4 h-4 text-white" />
        <span className="font-semibold hidden sm:inline">GitHub</span>
      </a>

      <div className="max-w-5xl mx-auto w-full flex-grow flex flex-col mt-12 md:mt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-wider mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            КОМНАТА <span className="text-red-500">{gameState.roomId}</span>
          </h1>
          <p className="text-slate-400 font-medium">
            Игроков: {players.length} из {MAX_PLAYERS}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(gameState.roomId)}
            className="mt-3 text-xs md:text-sm bg-slate-800/80 hover:bg-slate-700 px-4 py-2 rounded-lg text-slate-300 transition-colors border border-slate-700"
          >
            📋 Скопировать Код Комнаты
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8 flex-grow">
          <AnimatePresence>
            {slots.map((p, index) => (
              <motion.div
                key={p ? p.id : `empty-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="relative h-full min-h-[120px]"
              >
                {p ? (
                  <div
                    className={`h-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${
                      p.id === myPlayerId
                        ? 'bg-slate-800 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        : p.isHost
                        ? 'bg-slate-900 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="relative mb-3">
                      <div className={`p-3 rounded-full ${p.isBot ? 'bg-emerald-500/20' : p.id === myPlayerId ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                        {p.isBot ? (
                          <Bot className={`w-8 h-8 ${p.id === myPlayerId ? 'text-red-400' : 'text-emerald-400'}`} />
                        ) : (
                          <Users className={`w-8 h-8 ${p.id === myPlayerId ? 'text-red-400' : 'text-blue-400'}`} />
                        )}
                      </div>
                      {/* Online Status Dot */}
                      {!p.isBot && (
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${p.isOnline ? 'bg-green-500' : 'bg-slate-500'}`} title={p.isOnline ? 'В сети' : 'Офлайн'}></div>
                      )}
                    </div>

                    <span className="font-bold text-center truncate w-full text-slate-200">
                      {p.name}
                    </span>

                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                      {p.isHost ? (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-sm">
                          Хост
                        </span>
                      ) : p.isBot || p.isReady ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Готов
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-pulse" /> Ждем...
                        </span>
                      )}
                      {p.id === myPlayerId && (
                        <span className="text-[10px] font-bold uppercase text-slate-400 px-2 py-0.5 border border-slate-700 rounded">
                          Вы
                        </span>
                      )}
                    </div>

                    {isHost && p.id !== myPlayerId && (
                      <button
                        onClick={() => handleKickPlayer(p.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-400"
                        title="Исключить игрока"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { if (isHost) handleAddBot(); }}
                    disabled={!isHost}
                    className={`h-full w-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all ${
                      isHost
                        ? 'border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/50 cursor-pointer text-slate-600 hover:text-emerald-500 group'
                        : 'border-slate-800/50 bg-slate-950/50 cursor-default opacity-50'
                    }`}
                  >
                    {isHost ? (
                      <>
                        <Plus className="w-8 h-8 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm font-semibold opacity-50 group-hover:opacity-100 transition-opacity">Добавить Бота</span>
                      </>
                    ) : (
                      <span className="text-slate-700 text-sm font-medium">Ожидание...</span>
                    )}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {isHost ? (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Готовы к игре?</h3>
              <p className="text-sm text-slate-400">
                {neededPlayers > 0
                  ? `Нужно еще минимум ${neededPlayers} ${neededPlayers === 1 ? 'игрок' : 'игрока'} для старта.`
                  : unreadyCount > 0
                  ? `Ожидание готовности еще ${unreadyCount} участник(ов).`
                  : 'Все игроки готовы! Можно начинать матч.'}
              </p>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <button
                onClick={handleAddBot}
                disabled={players.length >= MAX_PLAYERS}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 font-bold py-3 px-6 rounded-xl border border-slate-700 transition active:scale-95"
              >
                <Bot className="w-5 h-5" /> + Бот
              </button>

              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`flex-2 md:flex-none flex items-center justify-center gap-2 font-black text-lg py-3 px-8 rounded-xl transition-all active:scale-95 ${
                  canStart
                    ? 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-500/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Play className="w-6 h-6" /> НАЧАТЬ
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Статус вашей готовности</h3>
              <p className="text-sm text-slate-400">
                {me?.isReady
                  ? 'Вы готовы к игре. Хост запустит матч, как только все участники подтвердят готовность.'
                  : 'Подтвердите готовность, чтобы хост смог начать матч.'}
              </p>
            </div>

            <button
              onClick={handleToggleReady}
              className={`w-full md:w-auto flex items-center justify-center gap-2 font-bold py-3 px-8 rounded-xl transition-all border active:scale-95 ${
                me?.isReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              }`}
            >
              {me?.isReady ? (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Я ГОТОВ
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" /> НАЖМИТЕ «ГОТОВ»
                </>
              )}
            </button>
          </div>
        )}

        <div className="mt-6">
          <InGameChat />
        </div>
      </div>
    </div>
  );
}