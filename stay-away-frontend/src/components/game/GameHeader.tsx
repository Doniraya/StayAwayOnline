import { Flame, Eye, Bot, Users, ShieldCheck, Biohazard } from 'lucide-react';
import { GITHUB_REPO_URL, GithubIcon } from '../Github';
import { useGameStore } from '../../store/useGameStore';



/**
 * Компонент GameHeader — Верхняя хоррор-шапка игры.
 * 1. Слева: крупный логотип THE THING: STAY AWAY! шрифтом font-cinzel в хоррор-стиле.
 * 2. По центру: крупная надпись текущей Фазы на русском языке и металлическая плашка ХОД ИГРОКА.
 * 3. Справа: заклепанная металлическая пластина РОЛЬ с аватаркой игрока.
 */
export default function GameHeader() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);
  const handleSelectSeat = useGameStore((s) => s.handleSelectSeat);
  const handleSetBotDelay = useGameStore((s) => s.handleSetBotDelay);

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;

  const activePlayerId = controlledPlayerId || myPlayerId;
  const activePlayer = gameState.players.find((p) => p.id === activePlayerId);
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];

  // Генерация аватара игрока
  const getAvatarContent = (name?: string, isBot?: boolean) => {
    if (isBot) {
      return <Bot className="w-5 h-5 text-amber-400" />;
    }
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return <span className="font-bold text-sm text-slate-100">{initial}</span>;
  };

  // Вычисление подсказки шага хода
  const getStepPrompt = () => {
    switch (gameState.phase) {
      case 'DRAW':
        return { step: '1 из 3', title: 'Добор карты', text: 'Возьмите 1 карту из общей колоды' };
      case 'PLAY_OR_DISCARD':
        return { step: '2 из 3', title: 'Ход или Сброс', text: 'Сыграйте 1 карту события с руки или сбросьте 1 карту' };
      case 'RESPOND':
        return { step: '2 из 3', title: 'Защита от атаки', text: 'Выберите карту защиты от атаки или примите эффект' };
      case 'RESOLVE_PANIC':
        return { step: '2 из 3', title: 'Карта Паники', text: 'Выполните обязательное действие карты Паники' };
      case 'RESOLVE_PERSISTENCE':
        return { step: '2 из 3', title: 'Упорство', text: 'Выберите 1 из 3 взятых карт события' };
      case 'TRADE':
        return { step: '3 из 3', title: 'Обмен картами', text: 'Выберите 1 карту с руки и предложите её соседу' };
      case 'TRADE_ACCEPT':
        return { step: '3 из 3', title: 'Ответный обмен', text: 'Выберите 1 карту с руки в ответ на предложение обмена' };
      case 'GAME_OVER':
        return { step: 'ИТОГ', title: 'Игра завершена', text: 'Все роли и карты раскрыты' };
      default:
        return { step: '—', title: 'Ожидание', text: 'Ожидайте действий игроков' };
    }
  };

  const stepPrompt = getStepPrompt();
  const activeCount = gameState.players.filter(p => p.isOnline !== false).length;
  const totalCount = gameState.players.length;

  return (
    <div className="w-full flex flex-col gap-2 relative z-50 mb-1 select-none shrink-0">
      {/* Главная панель шапки */}
      <div className="w-full flex flex-wrap lg:flex-nowrap justify-between items-center bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-3 md:p-4 rounded-2xl shadow-2xl gap-4 relative overflow-hidden">
        {/* Градиентный свет на заднем фоне шапки */}
        <div className="absolute inset-0 bg-radial from-red-950/20 via-transparent to-transparent pointer-events-none" />

        {/* 1. СЛЕВА: Крупный логотип THE THING: STAY AWAY! (font-cinzel) */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse">
              <Flame className="w-6 h-6 text-red-500" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          </div>

          <div className="flex flex-col">
            <h1 className="font-cinzel text-xl md:text-2xl lg:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-500 drop-shadow-[0_2px_10px_rgba(225,29,72,0.6)]">
              THE THING: STAY AWAY!
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
                КОМНАТА: <strong className="text-amber-400 font-mono text-xs">{gameState.roomId}</strong>
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" /> {activeCount}/{totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* 2. ПО ЦЕНТРУ: Пошаговая плашка подсказок [Шаг X из 3] и плашка ХОД ИГРОКА */}
        <div className="flex-1 min-w-[280px] max-w-md mx-auto flex flex-col items-center justify-center gap-1.5">
          {/* Пошаговая плашка подсказок в ржаво-янтарном стиле */}
          <div className="w-full px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/90 border border-amber-600/60 shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-950 bg-amber-500 px-2 py-0.5 rounded-md shrink-0 shadow-md">
              [Шаг {stepPrompt.step}]
            </span>
            <span className="text-xs font-semibold text-amber-200 truncate text-center">
              {stepPrompt.text}
            </span>
          </div>

          {/* Металлическая плашка ХОД ИГРОКА */}
          <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-xl px-3 py-1 shadow-2xl relative overflow-hidden border-metal flex items-center justify-center">
            {/* Заклёпки по углам плашки */}
            <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />
            <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />
            <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />

            <div className="flex items-center gap-2 overflow-hidden z-10">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0">
                ХОД:
              </span>
              <span className="text-xs font-extrabold text-amber-400 truncate tracking-wide glow-lamp-text">
                {currentTurnPlayer?.name || 'ИГРОК'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. СПРАВА: Заклепанная металлическая пластина РОЛЬ + аватарка */}
        <div className="flex items-center gap-3">
          {/* Пластина роли */}
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 border border-slate-700/80 px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-3 border-metal">
            {/* Заклёпки */}
            <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />
            <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />
            <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shadow-inner border border-slate-600 opacity-70" />

            {/* Аватарка текущего активного игрока */}
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-amber-500/60 flex items-center justify-center shadow-md overflow-hidden">
                {getAvatarContent(activePlayer?.name, activePlayer?.isBot)}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                  activePlayer?.isAlive !== false ? 'bg-emerald-500' : 'bg-red-600'
                }`}
              />
            </div>

            {/* Текст Роли */}
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                {activePlayer?.name || 'ЗРИТЕЛЬ'}
              </span>

              {!activePlayer ? (
                <span className="text-xs font-bold text-slate-500 uppercase">ЗРИТЕЛЬ</span>
              ) : activePlayer.role === 'THING' ? (
                <div className="flex items-center gap-1 text-xs font-black text-red-500 glow-lamp-text tracking-wider uppercase">
                  <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>РОЛЬ: НЕЧТО</span>
                </div>
              ) : activePlayer.role === 'INFECTED' ? (
                <div className="flex items-center gap-1 text-xs font-black text-emerald-400 tracking-wider uppercase">
                  <Biohazard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>РОЛЬ: ЗАРАЖЁН</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-black text-cyan-400 tracking-wider uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>РОЛЬ: ЧЕЛОВЕК (СЕКРЕТНО)</span>
                </div>
              )}
            </div>
          </div>

          {/* Ссылка на GitHub */}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition border border-slate-700 flex items-center justify-center"
            title="Открыть репозиторий GitHub"
          >
            <GithubIcon className="w-4 h-4 text-white" />
          </a>
        </div>
      </div>

      {/* Панель хоста (быстрая смена кресла и задержка ботов) */}
      {isHost && (
        <div className="w-full flex flex-wrap items-center justify-between bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> Пересесть (Хост):
            </span>
            <div className="flex flex-wrap gap-1">
              {gameState.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectSeat(p.id)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition flex items-center gap-1 text-[11px] ${
                    activePlayerId === p.id
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.isBot ? <Bot className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Bot className="w-3.5 h-3.5 text-emerald-400" /> Скорость ботов:
            </span>
            <div className="flex gap-1">
              {[
                { label: '4.5с', value: 4500 },
                { label: '3.0с', value: 3000 },
                { label: '1.5с', value: 1500 },
              ].map((opt) => {
                const currentDelay = gameState.botDelayMs ?? 3000;
                const isSelected = currentDelay === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSetBotDelay(opt.value)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

