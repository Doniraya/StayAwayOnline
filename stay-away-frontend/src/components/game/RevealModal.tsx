import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import BaseModal from './BaseModal';

export default function RevealModal() {
  const revealData = useGameStore((s) => s.revealData);
  const setRevealData = useGameStore((s) => s.setRevealData);

  const isOpen = Boolean(revealData);
  if (!isOpen || !revealData) return null;

  const isPanicDrawn = revealData.type === 'PANIC_DRAWN';

  const modalTitle = (
    <h3 className={`text-xl font-bold flex items-center gap-2 ${isPanicDrawn ? 'text-red-500' : 'text-amber-400'}`}>
      {isPanicDrawn ? (
        <>
          <motion.span
            animate={{ scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="inline-block"
          >
            🚨
          </motion.span>
          <span>КАРТА ПАНИКИ! ({revealData.playerName} вытащил Панику)</span>
        </>
      ) : (
        <>
          {revealData.type === 'ANALYSIS' && `🔍 Результат Анализа (Рука игрока ${revealData.targetName})`}
          {revealData.type === 'SUSPICION' && `👀 Результат Подозрения (Случайная карта игрока ${revealData.targetName})`}
          {revealData.type === 'WHISKEY' && `🥃 Виски (${revealData.playerName} показывает карты)`}
          {revealData.type === 'PANIC_BETWEEN_US' && `🤫 Только между нами... Игрок ${revealData.targetName} показывает карты`}
          {revealData.type === 'CONFESSION' && `Время признаний!`}
          {revealData.type === 'FEAR' && `😱 Карта "Страх" (Раскрыта карта предложения: ${revealData.card?.name || ''})`}
        </>
      )}
    </h3>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => setRevealData(null)}
      title={modalTitle}
      maxWidthClass="max-w-lg"
      containerClass={`max-h-[90vh] flex flex-col space-y-4 ${
        isPanicDrawn ? 'border-red-600/80 shadow-[0_0_30px_rgba(220,38,38,0.3)]' : 'border-slate-700 shadow-2xl'
      }`}
    >
      <div className="overflow-y-auto pr-2 flex-1 flex flex-col justify-center">
        {isPanicDrawn ? (
          <div className="flex flex-col items-center space-y-4 py-2">
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-44 h-64 rounded-xl overflow-hidden border-2 border-red-500/50 shadow-2xl relative bg-slate-950 shrink-0"
            >
              <img
                src={revealData.card?.imageUrl || '/cards/back_panic.png'}
                alt={revealData.card?.name || 'Карта Паники'}
                className="w-full h-full object-cover"
              />
            </motion.div>

            <div className="text-center space-y-2 bg-slate-950/80 p-4 rounded-xl border border-red-900/50 w-full">
              <h4 className="text-lg font-bold text-red-400">{revealData.card?.name}</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{revealData.card?.description}</p>
            </div>
          </div>
        ) : revealData.type === 'CONFESSION' && revealData.cardsMap ? (
          <div className="space-y-4">
            {Object.entries(revealData.cardsMap).map(([playerName, cards]) => (
              <div key={playerName} className="space-y-2">
                <h4 className="text-sm font-bold text-slate-300">{playerName}:</h4>
                <div className="flex gap-3 overflow-x-auto px-12 pt-40 pb-6">
                  {cards.map((c, i) => (
                    <motion.div
                      key={i}
                      animate={{ zIndex: 0 }}
                      whileHover={{ scale: 1.8, y: -40, zIndex: 50, transition: { delay: 0.4 } }}
                      className="w-24 h-36 rounded-lg overflow-hidden border border-slate-700 shrink-0 shadow-lg relative bg-slate-950"
                    >
                      <img src={c.imageUrl || '/cards/back.png'} alt={c.name} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : revealData.card ? (
          <div className="flex justify-center px-12 pt-40 pb-6">
            <motion.div
              animate={{ zIndex: 0 }}
              whileHover={{ scale: 1.8, y: -40, zIndex: 50, transition: { delay: 0.4 } }}
              className="w-28 h-40 rounded-lg overflow-hidden border border-slate-700 shrink-0 shadow-lg relative bg-slate-950"
            >
              <img src={revealData.card.imageUrl || '/cards/back.png'} alt={revealData.card.name} className="w-full h-full object-cover" />
            </motion.div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-12 pt-40 pb-6">
            {revealData.cards?.map((c, i) => (
              <motion.div
                key={i}
                animate={{ zIndex: 0 }}
                whileHover={{ scale: 1.8, y: -40, zIndex: 50, transition: { delay: 0.4 } }}
                className="w-28 h-40 rounded-lg overflow-hidden border border-slate-700 shrink-0 shadow-lg relative bg-slate-950"
              >
                <img src={c.imageUrl || '/cards/back.png'} alt={c.name} className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setRevealData(null)}
        className={`w-full font-bold py-2.5 rounded-lg transition mt-4 shrink-0 ${
          isPanicDrawn
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
        }`}
      >
        Понятно, закрыть
      </button>
    </BaseModal>
  );
}
