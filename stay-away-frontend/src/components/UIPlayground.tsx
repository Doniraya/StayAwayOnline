import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { socket } from '../socket';

/**
 * UIPlayground — Чистый холст для экспериментов с UI/UX.
 * Связь с бэкендом (Socket.io + useGameStore) полностью сохранена!
 */
export default function UIPlayground() {
  const gameState = useGameStore((s) => s.gameState);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const roomCodeInput = useGameStore((s) => s.roomCodeInput);
  const setRoomCodeInput = useGameStore((s) => s.setRoomCodeInput);
  const handleCreateRoom = useGameStore((s) => s.handleCreateRoom);
  const handleJoinRoom = useGameStore((s) => s.handleJoinRoom);
  const handleLeaveRoom = useGameStore((s) => s.handleLeaveRoom);
  const handleStartGame = useGameStore((s) => s.handleStartGame);
  const handleAddBot = useGameStore((s) => s.handleAddBot);

  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-6">
      {/* Шапка экспериментов */}
      <header className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-amber-500 flex items-center gap-2">
            🎨 StayAwayOnline — UI/UX Lab
          </h1>
          <p className="text-xs text-slate-400">Экспериментальная ветка (feature/ui-experiments)</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`px-2.5 py-1 rounded-full font-semibold ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
            {isConnected ? '🟢 Бэкенд подключен' : '🔴 Нет связи с бэкендом'}
          </span>
        </div>
      </header>

      {/* Основной контейнер экспериментов */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая панель: Создание / Вход в комнату */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">1. Подключение и Лобби</h2>
          
          {!gameState ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Имя игрока:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Ваше имя..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full bg-amber-600 hover:bg-amber-500 font-bold py-2.5 rounded-lg text-sm transition"
              >
                ➕ Создать комнату
              </button>

              <div className="flex gap-2 pt-2 border-t border-slate-800 mt-2">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="КОД КОМНАТЫ"
                  className="w-2/3 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs uppercase text-center"
                />
                <button
                  onClick={handleJoinRoom}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 font-semibold py-2 rounded-lg text-xs"
                >
                  Войти
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <div>Код комнаты: <strong className="text-amber-400">{gameState.roomId}</strong></div>
                <div>Фаза: <strong className="text-emerald-400">{gameState.phase}</strong></div>
                <div>Игроков: <strong>{gameState.players.length}</strong></div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleAddBot} className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-xs font-bold py-2 rounded-lg">
                  + Добавить бота
                </button>
                <button onClick={handleStartGame} className="flex-1 bg-red-700 hover:bg-red-600 text-xs font-bold py-2 rounded-lg">
                  🚀 Старт
                </button>
              </div>

              <button onClick={handleLeaveRoom} className="w-full bg-slate-800 hover:bg-slate-700 text-xs text-rose-400 font-semibold py-2 rounded-lg mt-2">
                🚪 Выйти из комнаты
              </button>
            </div>
          )}
        </div>

        {/* Центральная и правая панель: Зона ваших новых UI экспериментов */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="max-w-md space-y-3">
            <div className="text-4xl">🛠️</div>
            <h3 className="text-xl font-bold text-slate-200">Лаборатория нового UI/UX</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Здесь вы можете набрасывать любые новые концепты интерфейса. Картинки карт доступны в папке <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400">/cards/card_id.png</code>.
            </p>
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs text-slate-300 space-y-2 font-mono">
              <div>// Доступные картинки карт:</div>
              <div className="text-amber-400/90">&lt;img src="/cards/flamethrower.png" alt="Огнемёт" className="w-20" /&gt;</div>
              <div className="text-emerald-400/90">&lt;img src="/cards/infected.png" alt="Заражение" className="w-20" /&gt;</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
