import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Users, Play } from 'lucide-react';
import { GITHUB_REPO_URL, GithubIcon } from '../Github';
import type { GameState } from '../../types/game';

interface LobbyScreenProps {
  gameState: GameState;
  myPlayerId: string | null;
  handleAddBot: () => void;
  handleStartGame: () => void;
  isHost: boolean;
}

export default function LobbyScreen({
  gameState,
  myPlayerId,
  handleAddBot,
  handleStartGame,
  isHost,
}: LobbyScreenProps) {
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
