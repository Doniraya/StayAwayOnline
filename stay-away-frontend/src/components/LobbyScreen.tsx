import React from 'react';
import { useGameStore } from '../store/useGameStore';

const AVATAR_OPTIONS = [
  '/cards/thing.png',
  '/cards/flamethrower.png',
  '/cards/analysis.png',
  '/cards/whiskey.png',
  '/cards/axe.png',
  '/cards/quarantine.png',
];

/**
 * AAA Лобби и экран создания/входа в комнату для игры «Нечто» (Stay Away!)
 */
export const LobbyScreen: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const avatarUrl = useGameStore((s) => s.avatarUrl);
  const setAvatar = useGameStore((s) => s.setAvatar);
  const roomCodeInput = useGameStore((s) => s.roomCodeInput);
  const setRoomCodeInput = useGameStore((s) => s.setRoomCodeInput);

  const handleCreateRoom = useGameStore((s) => s.handleCreateRoom);
  const handleJoinRoom = useGameStore((s) => s.handleJoinRoom);
  const handleToggleReady = useGameStore((s) => s.handleToggleReady);
  const handleAddBot = useGameStore((s) => s.handleAddBot);
  const handleStartGame = useGameStore((s) => s.handleStartGame);
  const handleLeaveRoom = useGameStore((s) => s.handleLeaveRoom);
  const handleKickPlayer = useGameStore((s) => s.handleKickPlayer);

  // Режим 1: Пользователь не в комнате (создание или вход)
  if (!gameState) {
    return (
      <div className="w-full max-w-md mx-auto p-6 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col gap-6 text-slate-100 animate-fade-in">
        <div className="text-center flex flex-col gap-1">
          <div className="text-4xl mb-1">☣️</div>
          <h2 className="text-2xl font-black tracking-wider text-amber-500 uppercase">
            Вход в экспедицию
          </h2>
          <p className="text-xs text-slate-400">
            Введите ваше имя и выберите аватар исследователя
          </p>
        </div>

        {/* Имя игрока */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Имя полярника:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Введите имя..."
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all font-medium"
          />
        </div>

        {/* Выбор аватара */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Аватар:
          </label>
          <div className="grid grid-cols-6 gap-2">
            {AVATAR_OPTIONS.map((img) => (
              <div
                key={img}
                onClick={() => setAvatar(img)}
                className={`w-11 h-11 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                  avatarUrl === img
                    ? 'border-amber-400 ring-2 ring-amber-400/40 scale-110'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Создать комнату */}
        <button
          onClick={handleCreateRoom}
          disabled={!playerName.trim()}
          className="w-full py-3.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 shadow-lg shadow-amber-500/20 transition-all uppercase tracking-wider"
        >
          ➕ Создать новую комнату
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-600 uppercase tracking-widest my-1">
          <div className="flex-1 h-px bg-slate-800" />
          <span>или войти по коду</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Присоединиться по коду */}
        <div className="flex gap-2">
          <input
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="Код комнаты (напр. X7A2)"
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 uppercase tracking-widest font-mono text-center font-bold"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!playerName.trim() || !roomCodeInput.trim()}
            className="px-6 py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-all"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  // Режим 2: Пользователь в комнате в фазе LOBBY
  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost;

  return (
    <div className="w-full max-w-xl mx-auto p-6 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col gap-6 text-slate-100 animate-fade-in">
      {/* Шапка Лобби */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-amber-500 uppercase">
            Арктический барак
          </h2>
          <p className="text-xs text-slate-400">Ожидание экспедиции ({gameState.players.length}/12 игроков)</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Код комнаты:</span>
          <span className="text-lg font-mono font-bold text-amber-400 tracking-widest">{gameState.roomId}</span>
        </div>
      </div>

      {/* Список участников */}
      <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
        {gameState.players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-900">
                <img src={player.avatarUrl || '/cards/back.png'} alt={player.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">
                  {player.name} {player.id === myPlayerId && <span className="text-amber-400">(Вы)</span>}
                </span>
                <div className="flex gap-1 text-[10px]">
                  {player.isHost && <span className="text-amber-500 font-bold uppercase">👑 Организатор</span>}
                  {player.isBot && <span className="text-sky-400 font-bold uppercase">🤖 Бот</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${player.isReady ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60' : 'bg-slate-800 text-slate-400'}`}>
                {player.isReady ? '✓ Готов' : 'Ожидание'}
              </span>

              {isHost && player.id !== myPlayerId && (
                <button
                  onClick={() => handleKickPlayer(player.id)}
                  className="text-xs text-red-400 hover:text-red-300 p-1"
                  title="Исключить"
                >
                  ❌
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Кнопки управления */}
      <div className="flex flex-col gap-3 pt-2">
        {isHost && (
          <div className="flex gap-3">
            <button
              onClick={handleAddBot}
              disabled={gameState.players.length >= 12}
              className="flex-1 py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-all text-sm"
            >
              🤖 Добавить бота
            </button>
            <button
              onClick={handleStartGame}
              disabled={gameState.players.length < 4}
              className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 shadow-lg shadow-emerald-600/20 transition-all text-sm uppercase tracking-wider"
            >
              🚀 Начать игру ({gameState.players.length}/4 мин)
            </button>
          </div>
        )}

        <div className="flex gap-3">
          {!isHost && (
            <button
              onClick={handleToggleReady}
              className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wider ${
                me?.isReady
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
              }`}
            >
              {me?.isReady ? 'Отменить готовность' : 'Готов к игре!'}
            </button>
          )}

          <button
            onClick={handleLeaveRoom}
            className="px-4 py-3 rounded-xl font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition-all text-sm"
          >
            Покинуть комнату
          </button>
        </div>
      </div>
    </div>
  );
};
