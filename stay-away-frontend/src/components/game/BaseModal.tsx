import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface BaseModalProps {
  /** Управляет отображением модального окна */
  isOpen: boolean;
  /** Функция обратного вызова при закрытии модального окна */
  onClose?: () => void;
  /** Заголовок модального окна (строка или JSX) */
  title?: React.ReactNode;
  /** Содержимое модального окна */
  children: React.ReactNode;
  /** Tailwind-класс для ограничения максимальной ширины (по умолчанию max-w-lg) */
  maxWidthClass?: string;
  /** Дополнительные/альтернативные стили оверлея */
  overlayClass?: string;
  /** Дополнительные стили основного контейнера */
  containerClass?: string;
  /** Явное управление отображением кнопки закрытия (крестика) */
  showCloseButton?: boolean;
}

/**
 * Базовый компонент модального окна.
 * Обеспечивает единообразный оверлей, анимацию появления через Framer Motion и кнопку закрытия.
 */
export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-lg',
  overlayClass,
  containerClass = '',
  showCloseButton,
}: BaseModalProps) {
  if (!isOpen) return null;

  const shouldShowClose = showCloseButton ?? Boolean(onClose);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        overlayClass || 'bg-black/80 backdrop-blur-sm'
      }`}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className={`bg-slate-900 border-2 border-slate-700 p-6 rounded-2xl w-full relative shadow-2xl ${maxWidthClass} ${containerClass}`}
      >
        {shouldShowClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition z-10"
            aria-label="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {title && (
          <div className="mb-4 pr-6">
            {typeof title === 'string' ? (
              <h3 className="text-xl font-bold text-slate-100">{title}</h3>
            ) : (
              title
            )}
          </div>
        )}

        {children}
      </motion.div>
    </div>
  );
}
