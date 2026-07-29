import { useState, useEffect, useRef } from 'react';
import { Radio, ScrollText, Volume2, ShieldAlert, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

/**
 * Компонент RadioJournal — Пергаментный журнал радиосвязи.
 * - На десктопах (≥1024px): Отображается как фиксированная боковая панель (.bg-parchment).
 * - На мобильных (<1024px): Превращается в выезжающую снизу шторку (Bottom Sheet)
 *   с полупрозрачным оверлеем-затемнением (backdrop-blur) и плавающей кнопкой-триггером с бейджем.
 */
const renderFormattedText = (text: string) => {
  const parts = text.split(/(«[^»]+»|"[^"]+")/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if ((part.startsWith('«') && part.endsWith('»')) || (part.startsWith('"') && part.endsWith('"'))) {
      return (
        <span key={i} className="text-amber-800 font-extrabold bg-amber-900/20 px-1 rounded inline">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export default function RadioJournal() {
  const gameState = useGameStore((s) => s.gameState);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadLogs, setUnreadLogs] = useState(0);
  const prevLogsCountRef = useRef(gameState?.log?.length || 0);

  const logs = gameState?.log || [];

  // Отслеживание непрочитанных записей лога на мобильных
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isMobileOpen && logs.length > prevLogsCountRef.current) {
      setUnreadLogs((prev) => prev + (logs.length - prevLogsCountRef.current));
    }
    prevLogsCountRef.current = logs.length;
  }, [logs, isMobileOpen]);

  const openMobileJournal = () => {
    setIsMobileOpen(true);
    setUnreadLogs(0);
  };

  if (!gameState) return null;

  const renderJournalBody = () => (
    <div className="w-full h-full flex flex-col rounded-xl bg-parchment shadow-2xl relative border border-amber-900/40 overflow-hidden select-none">
      {/* Декоративная канцелярская кнопка / зажим сверху пергамента */}
      <div className="absolute top-2 right-10 z-30 hidden lg:flex items-center justify-center pointer-events-none">
        <div className="w-4 h-4 rounded-full bg-amber-900 border border-amber-950 shadow-md flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-600 shadow-inner" />
        </div>
      </div>

      {/* Заголовок пергамента радиосвязи */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-900/30">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-amber-900 animate-pulse" />
          <h3 className="font-special-elite text-base font-bold tracking-wider text-amber-950 uppercase drop-shadow-sm">
            ЖУРНАЛ РАДИОСВЯЗИ
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-special-elite bg-amber-950/15 text-amber-900 px-2 py-0.5 rounded border border-amber-900/30">
            {logs.length} ЗАП.
          </span>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-amber-900 hover:text-amber-700 p-1 rounded transition"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Содержимое журнала */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 font-special-elite text-xs text-amber-950 leading-relaxed scrollbar-thin scrollbar-thumb-amber-900/40 min-h-0">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-amber-900/60 italic text-center space-y-2 p-4">
            <ScrollText className="w-8 h-8 opacity-40" />
            <p className="text-xs font-special-elite">
              В радиоэфире тишина...
              <br />
              Записи экспедиции отсутствуют.
            </p>
          </div>
        ) : (
          logs.map((entry, idx) => {
            const recordNum = String(idx + 1).padStart(3, '0');
            const isImportant =
              entry.includes('сожжен') ||
              entry.includes('Нечто') ||
              entry.includes('Огнемёт') ||
              entry.includes('погиб');

            return (
              <div
                key={idx}
                className={`p-2 rounded border border-amber-900/20 bg-amber-900/5 hover:bg-amber-900/10 transition relative ${
                  isImportant ? 'border-l-4 border-l-red-800 bg-red-950/5' : ''
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-amber-900/70 mb-1 border-b border-amber-900/15 pb-0.5">
                  <span className="font-bold flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-amber-800 inline" />
                    РАДИОГРАММА #{recordNum}
                  </span>
                  {isImportant && (
                    <span className="text-red-800 font-bold flex items-center gap-0.5">
                      <ShieldAlert className="w-3 h-3" /> ТРЕВОГА
                    </span>
                  )}
                </div>
                <div className="text-amber-950 font-special-elite whitespace-pre-wrap break-words tracking-tight">
                  {renderFormattedText(entry)}
                </div>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>

      {/* Нижняя плашка пергамента */}
      <div className="px-3 py-1.5 bg-amber-950/10 border-t border-amber-900/30 flex items-center justify-between text-[10px] font-special-elite text-amber-900/80 shrink-0">
        <span>СТАНЦИЯ: «ПОАР-3»</span>
        <span>ЧАСТОТА: 142.0 МГц</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Плавающая кнопка-триггер для мобильных устройств (< 1024px) */}
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <button
          type="button"
          onClick={openMobileJournal}
          className="relative p-3 rounded-full bg-amber-950/90 border border-amber-600/60 text-amber-300 shadow-2xl backdrop-blur-md active:scale-95 transition flex items-center justify-center"
          title="Открыть журнал радиосвязи"
        >
          <ScrollText className="w-6 h-6 text-amber-400" />
          {unreadLogs > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full border border-red-400 shadow animate-bounce">
              {unreadLogs > 99 ? '99+' : unreadLogs}
            </span>
          )}
        </button>
      </div>

      {/* 2. Мобильная выезжающая шторка (Bottom Sheet Drawer) с оверлеем-затемнением */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end p-2 lg:hidden transition-all duration-300"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-full h-[80vh] max-h-[550px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-amber-900/50 rounded-full mx-auto mb-2 opacity-60" />
            {renderJournalBody()}
          </div>
        </div>
      )}

      {/* 3. Фиксированная боковая панель для десктопа (≥ 1024px) */}
      <div className="hidden lg:flex w-80 shrink-0 h-full max-h-full flex-col">
        {renderJournalBody()}
      </div>
    </>
  );
}
