import { useGameStore } from '../../store/useGameStore';
import type { Role } from '../../types/game';

export default function InfectionGauge() {
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);

  const activePlayerId = controlledPlayerId || myPlayerId;
  const activePlayer = gameState?.players.find((p) => p.id === activePlayerId);
  const role: Role = activePlayer?.role || 'HUMAN';

  // Угол поворота стрелки манометра в градусах (-70..+70)
  const getNeedleRotation = (r: Role) => {
    switch (r) {
      case 'HUMAN':
        return -60; // Зелёная зона "ЧИСТ"
      case 'INFECTED':
        return 15; // Жёлто-оранжевая зона "ЗАРАЖЁН"
      case 'THING':
        return 65; // Красная зона "НЕЧТО"
      default:
        return -60;
    }
  };

  // Конфигурация в зависимости от роли
  const getRoleConfig = (r: Role) => {
    switch (r) {
      case 'HUMAN':
        return {
          title: 'ЧЕЛОВЕК',
          subtitle: 'ЧИСТ',
          colorClass: 'text-emerald-400',
          bgGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
          lightColor: '#10b981',
          lightAnimation: '',
          needleColor: '#10b981',
        };
      case 'INFECTED':
        return {
          title: 'ЗАРАЖЁН',
          subtitle: 'УГРОЗА',
          colorClass: 'text-amber-400',
          bgGlow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
          lightColor: '#f59e0b',
          lightAnimation: 'animate-pulse',
          needleColor: '#f59e0b',
        };
      case 'THING':
        return {
          title: 'НЕЧТО',
          subtitle: 'ИСТОЧНИК',
          colorClass: 'text-red-500 font-black',
          bgGlow: 'shadow-[0_0_35px_rgba(239,68,68,0.6)]',
          lightColor: '#ef4444',
          lightAnimation: 'animate-ping',
          needleColor: '#ef4444',
        };
    }
  };

  const needleAngle = getNeedleRotation(role);
  const config = getRoleConfig(role);

  return (
    <div className="relative z-40 flex flex-col items-center select-none pointer-events-auto shrink-0">
      {/* Корпус манометра с эффектом литого металла, мха и лоз */}
      <div
        className={`relative w-44 h-44 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-2 border-2 border-slate-700/80 ${config.bgGlow} transition-all duration-700`}
        style={{
          boxShadow:
            '0 12px 35px rgba(0, 0, 0, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -4px 8px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Внешнее металлическое кольцо с заклёпками */}
        <div className="absolute inset-1 rounded-full border border-slate-600/50 bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 pointer-events-none" />

        {/* Заклёпки на металлическом ободе */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => {
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 44 * Math.cos(rad);
          const y = 50 + 44 * Math.sin(rad);
          return (
            <div
              key={idx}
              className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-slate-400 to-slate-800 border border-slate-950 shadow-inner"
              style={{
                top: `${y}%`,
                left: `${x}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}

        {/* Декоративный мох и лозы (SVG-оверлей поверх рамки) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
          viewBox="0 0 100 100"
        >
          {/* Пучки мха на металлическом ободе */}
          {/* Левый верхний мох */}
          <path
            d="M 12 28 Q 8 20 18 15 Q 26 12 32 20 Q 24 24 12 28 Z"
            fill="#2d5a27"
            opacity="0.85"
          />
          <path
            d="M 10 24 Q 14 17 20 18 Q 24 22 18 26 Z"
            fill="#3e7e36"
            opacity="0.9"
          />
          {/* Правый нижний мох */}
          <path
            d="M 85 70 Q 92 78 82 86 Q 74 90 70 82 Q 78 78 85 70 Z"
            fill="#254d20"
            opacity="0.85"
          />
          <path
            d="M 82 74 Q 88 80 80 84 Q 75 82 82 74 Z"
            fill="#376e30"
            opacity="0.9"
          />

          {/* Вьющаяся лоза с листьями */}
          <path
            d="M 15 80 C 10 60 5 40 20 22 C 30 10 50 5 65 12"
            fill="none"
            stroke="#1e3e1a"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 15 80 C 10 60 5 40 20 22 C 30 10 50 5 65 12"
            fill="none"
            stroke="#2e5d28"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Листья лозы */}
          <path d="M 10 55 Q 4 50 8 44 Q 14 48 10 55 Z" fill="#3e7e36" />
          <path d="M 16 35 Q 8 30 15 24 Q 20 30 16 35 Z" fill="#4e9e44" />
          <path d="M 28 16 Q 26 8 34 10 Q 34 18 28 16 Z" fill="#3e7e36" />
          <path d="M 48 8 Q 52 2 58 6 Q 54 12 48 8 Z" fill="#4e9e44" />
          <path d="M 75 78 Q 83 76 80 84 Q 72 82 75 78 Z" fill="#2e5d28" />
        </svg>

        {/* Циферблат манометра */}
        <div className="relative w-full h-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
          {/* Градиентные дуги шкалы (Зелёная -> Жёлтая -> Красная) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            {/* Фновая темная шкала */}
            <path
              d="M 20 70 A 38 38 0 1 1 80 70"
              fill="none"
              stroke="#1e293b"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* Зелёная дуга (Human: -70deg до -20deg) */}
            <path
              d="M 20 70 A 38 38 0 0 1 35 30"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Жёлтая дуга (Infected: -20deg до +25deg) */}
            <path
              d="M 35 30 A 38 38 0 0 1 65 30"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="5"
              opacity="0.8"
            />
            {/* Красная дуга (Thing: +25deg до +70deg) */}
            <path
              d="M 65 30 A 38 38 0 0 1 80 70"
              fill="none"
              stroke="#ef4444"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Метки шкалы ( засечки ) */}
            {[
              { a: -60, l: 'ЗДОРОВ' },
              { a: 0, l: 'РИСК' },
              { a: 60, l: 'НЕЧТО' },
            ].map((mark, i) => {
              const rad = ((mark.a - 90) * Math.PI) / 180;
              const x1 = 50 + 33 * Math.cos(rad);
              const y1 = 50 + 33 * Math.sin(rad);
              const x2 = 50 + 38 * Math.cos(rad);
              const y2 = 50 + 38 * Math.sin(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          {/* Стрелка манометра с плавной анимацией поворота */}
          <div
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-transform duration-1000 ease-out"
            style={{ transform: `rotate(${needleAngle}deg)` }}
          >
            {/* Сама стрелка */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                className="absolute bottom-1/2 w-1.5 h-16 rounded-t-full shadow-lg"
                style={{
                  background: `linear-gradient(to top, #475569, ${config.needleColor})`,
                  transformOrigin: 'bottom center',
                  boxShadow: `0 0 10px ${config.lightColor}`,
                }}
              />
            </div>
          </div>

          {/* Центральный латунный колпачок со световым индикатором */}
          <div className="absolute z-20 w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 via-amber-800 to-slate-900 border border-amber-400/60 shadow-md flex items-center justify-center">
            <div
              className={`w-2.5 h-2.5 rounded-full ${config.lightAnimation}`}
              style={{ backgroundColor: config.lightColor, boxShadow: `0 0 8px ${config.lightColor}` }}
            />
          </div>

          {/* Стекло циферблата с отблеском */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-25"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 60%)',
            }}
          />

          {/* Текстовая плашка статуса в нижней части манометра */}
          <div className="absolute bottom-2 z-20 text-center flex flex-col items-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 font-special-elite">
              ЗАРАЖЕНИЕ
            </span>
            <span
              className={`text-xs font-black tracking-wider uppercase ${config.colorClass}`}
              style={{ textShadow: `0 0 8px ${config.lightColor}` }}
            >
              {config.title}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
