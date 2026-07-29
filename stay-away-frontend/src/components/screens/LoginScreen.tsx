import { motion } from 'framer-motion';
import { Flame, Users } from 'lucide-react';
import { GITHUB_REPO_URL, GithubIcon } from '../Github';
import { useGameStore } from '../../store/useGameStore';

export default function LoginScreen() {
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const roomCodeInput = useGameStore((s) => s.roomCodeInput);
  const setRoomCodeInput = useGameStore((s) => s.setRoomCodeInput);
  const handleCreateRoom = useGameStore((s) => s.handleCreateRoom);
  const handleJoinRoom = useGameStore((s) => s.handleJoinRoom);

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

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (roomCodeInput.trim()) {
              handleJoinRoom();
            } else {
              handleCreateRoom();
            }
          }}
        >
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Ваше Имя
            </label>
            <input
              type="text"
              placeholder="Например: Алекс"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition text-base"
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleCreateRoom();
            }}
            className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 font-bold py-3.5 rounded-lg transition shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 touch-manipulation cursor-pointer select-none text-base"
          >
            <Users className="w-5 h-5" /> Создать Комнату
          </button>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="text"
              placeholder="КОД КОМНАТЫ"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              className="w-full sm:w-2/3 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-slate-500 uppercase tracking-widest text-center text-base"
            />
            <button
              type="submit"
              onClick={(e) => {
                if (roomCodeInput.trim()) {
                  e.preventDefault();
                  handleJoinRoom();
                }
              }}
              className="w-full sm:w-1/3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 font-semibold py-3.5 rounded-lg transition touch-manipulation cursor-pointer select-none text-base"
            >
              Войти
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
