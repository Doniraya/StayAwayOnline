// stay-away-frontend/src/components/BarredDoorSlot.tsx
import React from 'react';

interface BarredDoorSlotProps {
  isBarred: boolean;
}

/**
 * Заколоченная дверь между соседними местами на овальном столе
 */
export const BarredDoorSlot: React.FC<BarredDoorSlotProps> = ({ isBarred }) => {
  if (!isBarred) return <div className="w-8 h-8 opacity-20" />;

  return (
    <div className="flex flex-col items-center justify-center p-1 rounded bg-amber-950/80 border border-amber-700/60 shadow-lg text-amber-400 font-bold text-xs select-none">
      <span className="text-[10px] uppercase tracking-wider text-amber-500">Дверь</span>
      <span>🪵</span>
    </div>
  );
};
