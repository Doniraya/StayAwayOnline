import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const Toast: React.FC = () => {
  const toastMessage = useGameStore((s) => s.toastMessage);
  const toastType = useGameStore((s) => s.toastType);
  const hideToast = useGameStore((s) => s.hideToast);

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[90vw] pointer-events-auto"
        >
          <div
            className={`
              relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border
              ${
                toastType === 'error'
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-100 shadow-rose-950/50 glow-rose'
                  : toastType === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                  : 'bg-sky-950/80 border-sky-500/50 text-sky-100 shadow-sky-950/50'
              }
            `}
          >
            {/* Иконка типа тоста */}
            <div className="flex-shrink-0">
              {toastType === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 animate-pulse" />}
              {toastType === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toastType === 'info' && <Info className="w-5 h-5 text-sky-400" />}
            </div>

            {/* Текст тоста */}
            <div className="flex-1 text-sm font-medium leading-snug drop-shadow">
              {toastMessage}
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={hideToast}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
