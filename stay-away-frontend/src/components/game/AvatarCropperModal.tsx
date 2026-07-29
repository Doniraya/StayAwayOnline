import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Check, Link, RefreshCw, UserCheck } from 'lucide-react';

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="64" fill="#0f172a"/>
  <circle cx="64" cy="64" r="60" fill="#1e293b" stroke="#d97706" stroke-width="4"/>
  <!-- Штормовка полярника -->
  <path d="M 24 120 C 24 80, 104 80, 104 120 Z" fill="#334155"/>
  <path d="M 32 116 C 32 86, 96 86, 96 116 Z" fill="#475569"/>
  <!-- Лицо в капюшоне -->
  <circle cx="64" cy="52" r="24" fill="#f87171"/>
  <!-- Защитные очки экспедиции -->
  <rect x="44" y="44" width="40" height="16" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="3"/>
  <circle cx="54" cy="52" r="4" fill="#38bdf8"/>
  <circle cx="74" cy="52" r="4" fill="#38bdf8"/>
  <!-- Меховая опушка капюшона -->
  <path d="M 38 48 C 34 32, 94 32, 90 48 C 85 40, 43 40, 38 48 Z" fill="#e2e8f0"/>
</svg>
`)}`;

// Вспомогательные пресеты экспедиции
const EXPEDITION_PRESETS = [
  { name: 'Полярник', color: '#0f172a', accent: '#f59e0b', goggle: '#38bdf8' },
  { name: 'Капитан', color: '#1e1b4b', accent: '#eab308', goggle: '#fbbf24' },
  { name: 'Врач', color: '#064e3b', accent: '#34d399', goggle: '#a7f3d0' },
  { name: 'Инженер', color: '#451a03', accent: '#f97316', goggle: '#fdba74' },
];

function generatePresetAvatar(accent: string, goggle: string, color: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="64" fill="${color}"/>
  <circle cx="64" cy="64" r="60" fill="#1e293b" stroke="${accent}" stroke-width="4"/>
  <path d="M 24 120 C 24 80, 104 80, 104 120 Z" fill="#334155"/>
  <path d="M 32 116 C 32 86, 96 86, 96 116 Z" fill="#475569"/>
  <circle cx="64" cy="52" r="24" fill="#f87171"/>
  <rect x="44" y="44" width="40" height="16" rx="8" fill="#0f172a" stroke="${accent}" stroke-width="3"/>
  <circle cx="54" cy="52" r="4" fill="${goggle}"/>
  <circle cx="74" cy="52" r="4" fill="${goggle}"/>
  <path d="M 38 48 C 34 32, 94 32, 90 48 C 85 40, 43 40, 38 48 Z" fill="#e2e8f0"/>
</svg>
`)}`;
}

interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAvatar: (avatarDataUrl: string) => void;
  currentAvatarUrl?: string;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  isOpen,
  onClose,
  onSaveAvatar,
  currentAvatarUrl,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(currentAvatarUrl || DEFAULT_AVATAR);
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Отрисовка на canvas с круговой маской экспедиционного жетона
  const drawAvatarToCanvas = useCallback((src: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, 128, 128);

      ctx.save();
      // Круговой клиппинг
      ctx.beginPath();
      ctx.arc(64, 64, 64, 0, Math.PI * 2);
      ctx.clip();

      // Центрирование и масштабирование с сохранением пропорций (Cover fit)
      const imgAspect = img.width / img.height;
      let renderW = 128;
      let renderH = 128;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > 1) {
        renderW = 128 * imgAspect;
        offsetX = (128 - renderW) / 2;
      } else {
        renderH = 128 / imgAspect;
        offsetY = (128 - renderH) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
      ctx.restore();

      // Отрисовка металического обода экспедиционного жетона
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(64, 64, 61, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(64, 64, 63, 0, Math.PI * 2);
      ctx.stroke();
    };
    img.onerror = () => {
      setUrlError('Не удалось загрузить изображение');
    };
    img.src = src;
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initial = currentAvatarUrl || DEFAULT_AVATAR;
      setImageSrc(initial);
      drawAvatarToCanvas(initial);
    }
  }, [isOpen, currentAvatarUrl, drawAvatarToCanvas]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUrlError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageSrc(result);
      drawAvatarToCanvas(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUrlError(null);
    setIsLoadingUrl(true);

    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    testImg.onload = () => {
      setIsLoadingUrl(false);
      setImageSrc(urlInput.trim());
      drawAvatarToCanvas(urlInput.trim());
      setUrlInput('');
    };
    testImg.onerror = () => {
      setIsLoadingUrl(false);
      setUrlError('Невалидный URL или ошибка доступа к изображению');
    };
    testImg.src = urlInput.trim();
  };

  const handleApplyPreset = (accent: string, goggle: string, color: string) => {
    setUrlError(null);
    const presetSrc = generatePresetAvatar(accent, goggle, color);
    setImageSrc(presetSrc);
    drawAvatarToCanvas(presetSrc);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const avatarDataUrl = canvas.toDataURL('image/png');
    onSaveAvatar(avatarDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-stone-900 border border-amber-900/50 rounded-2xl p-6 w-full max-w-md shadow-2xl text-stone-200 relative">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-stone-800">
          <h3 className="text-xl font-bold text-amber-500 tracking-wide flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-500" /> Аватар Экспедиции
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-5">
          {/* Превью аватара на Canvas */}
          <div className="relative group">
            <canvas
              ref={canvasRef}
              width={128}
              height={128}
              className="w-32 h-32 rounded-full border-4 border-amber-600/80 bg-stone-950 shadow-[0_0_25px_rgba(217,119,6,0.3)]"
            />
            <div className="absolute -bottom-1 -right-1 bg-amber-600 text-stone-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full border border-amber-400 shadow">
              128x128
            </div>
          </div>

          {/* Загрузка файла */}
          <div className="w-full">
            <input type="file" accept="image/*" onChange={handleFileChange} id="avatar-file-input" className="hidden" />
            <label
              htmlFor="avatar-file-input"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:bg-stone-800 border border-stone-700 hover:border-amber-600/50 rounded-xl cursor-pointer transition text-sm font-semibold text-stone-200"
            >
              <Upload className="w-4 h-4 text-amber-400" /> Выбрать фото с диска
            </label>
          </div>

          {/* Ввод URL */}
          <form onSubmit={handleUrlSubmit} className="w-full space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Или вставьте URL картинки..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="submit"
                disabled={!urlInput.trim() || isLoadingUrl}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-amber-400 rounded-xl text-sm font-semibold border border-stone-700 transition flex items-center gap-1"
              >
                {isLoadingUrl ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              </button>
            </div>
            {urlError && <p className="text-xs text-red-400 font-medium">{urlError}</p>}
          </form>

          {/* Готовые пресеты экспедиции */}
          <div className="w-full">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">
              Готовые роли:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {EXPEDITION_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p.accent, p.goggle, p.color)}
                  className="p-2 bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 rounded-xl text-center transition flex flex-col items-center gap-1"
                >
                  <div
                    className="w-6 h-6 rounded-full border border-stone-600"
                    style={{ backgroundColor: p.accent }}
                  />
                  <span className="text-[10px] font-semibold text-stone-300 truncate w-full">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Кнопка применения */}
          <button
            type="button"
            onClick={handleApply}
            disabled={!imageSrc}
            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 text-stone-950 font-extrabold text-base rounded-xl transition shadow-[0_0_15px_rgba(217,119,6,0.4)] cursor-pointer"
          >
            <Check className="w-5 h-5" /> Применить аватар
          </button>
        </div>
      </div>
    </div>
  );
};
