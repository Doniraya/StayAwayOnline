import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Eye, Bot, Users, ShieldCheck, Biohazard, RotateCw, RotateCcw, Check } from 'lucide-react';
import { GITHUB_REPO_URL, GithubIcon } from '../Github';
import { useGameStore } from '../../store/useGameStore';

/**
 * Анимированный винтажный компас направления хода.
 */
const DirectionCompass: React.FC<{ direction: 1 | -1 | 'cw' | 'ccw' }> = ({ direction }) => {
  const isCw = direction === 1 || direction === 'cw';

  return (
    <div className="flex items-center gap-2.5 bg-stone-950/90 border border-amber-900/50 rounded-xl px-3 py-1.5 shadow-[0_0_15px_rgba(0,0,0,0.6)] relative overflow-hidden shrink-0">
      {/* Винтажный круглый компас */}
      <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border-2 border-amber-600/70 shadow-[inset_0_0_8px_rgba(0,0,0,0.8),0_0_10px_rgba(245,158,11,0.25)] flex items-center justify-center shrink-0">
        {/* Метки сторон света */}
        <span className="absolute top-0.5 text-[7px] font-mono font-bold text-amber-500/70">N</span>
        <span className="absolute bottom-0.5 text-[7px] font-mono font-bold text-amber-500/50">S</span>
        <span className="absolute right-0.5 text-[7px] font-mono font-bold text-amber-500/50">E</span>
        <span className="absolute left-0.5 text-[7px] font-mono font-bold text-amber-500/50">W</span>

        {/* Шкала циферблата */}
        <svg className="absolute inset-0 w-full h-full p-1 opacity-40 pointer-events-none" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1 3" />
        </svg>

        {/* Анимированная стрелка компаса */}
        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          animate={{ rotate: isCw ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        >
          {/* Стрелка компаса */}
          <svg className="w-7 h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 14.5,12 12,10.5 9.5,12" fill="#ef4444" stroke="#991b1b" strokeWidth="0.5" />
            <polygon points="12,22 14.5,12 12,13.5 9.5,12" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
            <circle cx="12" cy="12" r="2" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
          </svg>
        </motion.div>
      </div>

      {/* Текст направления */}
      <div className="flex flex-col">
        <span className="text-[9px] uppercase font-mono tracking-widest text-stone-400 font-bold">
          НАПРАВЛЕНИЕ
        </span>
        <div className="flex items-center gap-1">
          {isCw ? (
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="text-xs font-black tracking-wider text-amber-400 uppercase drop-shadow">
            {isCw ? 'ПО ЧАСОВОЙ' : 'ПРОТИВ ЧАСОВОЙ'}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Пошаговая плашка подсказок фазы хода.
 */
const PhaseStepsBar: React.FC<{ phase: string; promptText: string }> = ({ phase, promptText }) => {
  const getActiveStep = (p: string): number => {
    switch (p) {
      case 'DRAW':
        return 1;
      case 'PLAY_OR_DISCARD':
      case 'RESPOND':
      case 'RESOLVE_PANIC':
      case 'RESOLVE_PERSISTENCE':
        return 2;
      case 'TRADE':
      case 'TRADE_ACCEPT':
        return 3;
      default:
        return 0;
    }
  };

  const activeStep = getActiveStep(phase);

  const steps = [
    { num: 1, title: 'Шаг 1: Добор', desc: 'Взять карту' },
    { num: 2, title: 'Шаг 2: Действие / Сброс', desc: 'Сыграть или сбросить' },
    { num: 3, title: 'Шаг 3: Обмен', desc: 'Передать соседу' },
  ];

  return (
    <div className="flex flex-col w-full max-w-lg gap-1.5 mx-auto">
      {/* 3 шага фаз */}
      <div className="grid grid-cols-3 gap-1.5 w-full">
        {steps.map((s) => {
          const isActive = activeStep === s.num;
          const isCompleted = activeStep > s.num && activeStep !== 0;

          return (
            <div
              key={s.num}
              className={`relative flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-b from-amber-950/90 via-stone-900 to-amber-950/90 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-[1.02]'
                  : isCompleted
                  ? 'bg-stone-950/80 border-stone-800 text-stone-400 opacity-80'
                  : 'bg-stone-950/50 border-stone-800/80 text-stone-500'
              }`}
            >
              {/* Бэджик активности */}
              <div className="flex items-center gap-1 mb-0.5">
                {isCompleted ? (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-900/80 border border-emerald-500/60 flex items-center justify-center text-[9px] text-emerald-400 font-bold">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 shadow-md'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {s.num}
                  </span>
                )}
                <span
                  className={`text-[11px] font-bold truncate ${
                    isActive ? 'text-amber-300' : 'text-stone-300'
                  }`}
                >
                  {s.title.split(': ')[1] || s.title}
                </span>
              </div>

              <span className="text-[10px] text-stone-400 truncate hidden sm:block">
                {s.desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Текстовая подсказка текущей фазы */}
      <div className="w-full text-center px-3 py-1 rounded-lg bg-stone-950/80 border border-stone-800 flex items-center justify-center gap-2 shadow-inner">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
        <span className="text-xs font-semibold text-amber-200 truncate">
          {promptText}
        </span>
      </div>
    </div>
  );
};

/**
 * Компонент GameHeader — Верхняя экспедиционная метало-шапка игры.
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
  const getStepPromptText = () => {
    switch (gameState.phase) {
      case 'DRAW':
        return 'Возьмите 1 карту из общей колоды';
      case 'PLAY_OR_DISCARD':
        return 'Сыграйте 1 карту события с руки или сбросьте 1 карту';
      case 'RESPOND':
        return 'Выберите карту защиты от атаки или примите эффект';
      case 'RESOLVE_PANIC':
        return 'Выполните обязательное действие карты Паники';
      case 'RESOLVE_PERSISTENCE':
        return 'Выберите 1 из 3 взятых карт события';
      case 'TRADE':
        return 'Выберите 1 карту с руки и предложите её соседу';
      case 'TRADE_ACCEPT':
        return 'Выберите 1 карту с руки в ответ на предложение обмена';
      case 'GAME_OVER':
        return 'Все роли и карты раскрыты';
      default:
        return 'Ожидайте действий игроков';
    }
  };

  const activeCount = gameState.players.filter((p) => p.isOnline !== false).length;
  const totalCount = gameState.players.length;

  return (
    <div className="w-full flex flex-col gap-2 relative z-50 mb-1 select-none shrink-0">
      {/* Главная метало-панель шапки с экспедиционной текстурой и заклепками */}
      <div className="w-full flex flex-wrap xl:flex-nowrap justify-between items-center bg-gradient-to-b from-stone-900 via-slate-950 to-stone-950 border-2 border-stone-700/80 p-3 md:p-4 rounded-2xl shadow-[0_6px_25px_rgba(0,0,0,0.85)] gap-4 relative overflow-hidden">
        {/* Экспедиционные заклепки по углам панели */}
        <span className="absolute top-2 left-2.5 w-2 h-2 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.8)] border border-stone-700 opacity-90" />
        <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.8)] border border-stone-700 opacity-90" />
        <span className="absolute bottom-2 left-2.5 w-2 h-2 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.8)] border border-stone-700 opacity-90" />
        <span className="absolute bottom-2 right-2.5 w-2 h-2 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.8)] border border-stone-700 opacity-90" />

        {/* Градиентный хоррор-свет на фоне */}
        <div className="absolute inset-0 bg-radial from-red-950/20 via-transparent to-transparent pointer-events-none" />

        {/* 1. СЛЕВА: Логотип + Компас направления */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Логотип */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse">
                <Flame className="w-6 h-6 text-red-500" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            </div>

            <div className="flex flex-col">
              <h1 className="font-cinzel text-lg md:text-xl lg:text-2xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-500 drop-shadow-[0_2px_10px_rgba(225,29,72,0.6)]">
                THE THING: STAY AWAY!
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400 bg-stone-900/90 px-2 py-0.5 rounded border border-stone-800 flex items-center gap-1.5">
                  КОМНАТА: <strong className="text-amber-400 font-mono text-xs">{gameState.roomId}</strong>
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-stone-900/90 px-2 py-0.5 rounded border border-stone-800 flex items-center gap-1">
                  <Users className="w-3 h-3 text-cyan-400" /> {activeCount}/{totalCount}
                </span>
              </div>
            </div>
          </div>

          {/* Компас направления */}
          <DirectionCompass direction={gameState.direction ?? 1} />
        </div>

        {/* 2. ПО ЦЕНТРУ: Пошаговая плашка подсказок фазы */}
        <div className="flex-1 min-w-[280px] my-1">
          <PhaseStepsBar phase={gameState.phase} promptText={getStepPromptText()} />
        </div>

        {/* 3. СПРАВА: Ход игрока & Металлическая пластина роли */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-end">
          {/* Индикатор текущего хода */}
          <div className="bg-stone-950/90 border border-stone-700/80 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 border-metal">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">
                ХОД:
              </span>
              <span className="text-xs font-extrabold text-amber-400 truncate max-w-[100px] sm:max-w-[130px]">
                {currentTurnPlayer?.name || 'ИГРОК'}
              </span>
            </div>
          </div>

          {/* Пластина роли */}
          <div className="relative bg-gradient-to-r from-stone-900 via-slate-900 to-stone-950 border border-stone-700/80 px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-3 border-metal">
            {/* Заклёпки */}
            <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-stone-400 shadow-inner border border-stone-600 opacity-70" />
            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-stone-400 shadow-inner border border-stone-600 opacity-70" />
            <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-stone-400 shadow-inner border border-stone-600 opacity-70" />
            <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-stone-400 shadow-inner border border-stone-600 opacity-70" />

            {/* Аватарка текущего активного игрока */}
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-stone-800 border-2 border-amber-500/60 flex items-center justify-center shadow-md overflow-hidden">
                {getAvatarContent(activePlayer?.name, activePlayer?.isBot)}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-stone-950 ${
                  activePlayer?.isAlive !== false ? 'bg-emerald-500' : 'bg-red-600'
                }`}
              />
            </div>

            {/* Текст Роли */}
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">
                {activePlayer?.name || 'ЗРИТЕЛЬ'}
              </span>

              {!activePlayer ? (
                <span className="text-xs font-bold text-stone-500 uppercase">ЗРИТЕЛЬ</span>
              ) : activePlayer.role === 'THING' ? (
                <div className="flex items-center gap-1 text-xs font-black text-red-500 tracking-wider uppercase">
                  <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span>НЕЧТО</span>
                </div>
              ) : activePlayer.role === 'INFECTED' ? (
                <div className="flex items-center gap-1 text-xs font-black text-emerald-400 tracking-wider uppercase">
                  <Biohazard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ЗАРАЖЁН</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs font-black text-cyan-400 tracking-wider uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ЧЕЛОВЕК (СЕКРЕТНО)</span>
                </div>
              )}
            </div>
          </div>

          {/* Ссылка на GitHub */}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 transition border border-stone-700 flex items-center justify-center"
            title="Открыть репозиторий GitHub"
          >
            <GithubIcon className="w-4 h-4 text-white" />
          </a>
        </div>
      </div>

      {/* Панель хоста (быстрая смена кресла и задержка ботов) */}
      {isHost && (
        <div className="w-full flex flex-wrap items-center justify-between bg-stone-950/80 border border-stone-800/80 px-3 py-1.5 rounded-xl text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="text-stone-400 flex items-center gap-1 font-semibold">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> Пересесть (Хост):
            </span>
            <div className="flex flex-wrap gap-1">
              {gameState.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectSeat(p.id)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition flex items-center gap-1 text-[11px] ${
                    activePlayerId === p.id
                      ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {p.isBot ? <Bot className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-400 flex items-center gap-1 font-semibold">
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
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
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


