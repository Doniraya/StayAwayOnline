# Game UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the new 2.5D PixiJS board + React Skieuomorphic Horror HUD with SIGame-like custom avatar cropper and mobile responsiveness for Stay Away Online.

**Architecture:** Hybrid React 19 + Pixi.js v8 architecture. Pixi.js handles 2.5D board rendering, player tokens, 2.5D decks, doors/quarantine obstacles, and particle effects. React 19 + Framer Motion 12 handles HUD overlays, 3D card hand fan, chat/radio drawers, and lobby avatar cropper.

**Tech Stack:** React 19, Pixi.js v8 (`pixi.js`), Framer Motion 12, Tailwind CSS 4, Zustand 5, Socket.io-client 4.

## Global Constraints

- React version: `^19.2.7`
- Tailwind CSS version: `^4.3.3`
- Language rule: UI copy in Russian, comments in Russian, git commits in Russian.
- Exact spec reference: `docs/superpowers/specs/2026-07-30-game-ui-redesign-design.md`

---

### Task 1: Install Pixi.js & Setup `<PixiGameBoard />` Container Component

**Files:**
- Create: `stay-away-frontend/src/components/game/pixi/PixiGameBoard.tsx`
- Create: `stay-away-frontend/src/components/game/pixi/usePixiApp.ts`
- Modify: `stay-away-frontend/package.json`

**Interfaces:**
- Consumes: Zustand `useGameStore` for current players and game phase.
- Produces: `PixiGameBoard` React component mounting a canvas element with auto-resize.

- [ ] **Step 1: Install pixi.js dependency**

```bash
cd stay-away-frontend && npm install pixi.js@^8.0.0
```

- [ ] **Step 2: Create Pixi App lifecycle hook `usePixiApp.ts`**

```typescript
import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new Application();
    
    let isMounted = true;
    app.init({
      resizeTo: containerRef.current,
      backgroundColor: 0x0c0a09,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    }).then(() => {
      if (isMounted && containerRef.current) {
        containerRef.current.appendChild(app.canvas);
        appRef.current = app;
      }
    });

    return () => {
      isMounted = false;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [containerRef]);

  return appRef;
}
```

- [ ] **Step 3: Create `<PixiGameBoard />` wrapper component**

```tsx
import React, { useRef } from 'react';
import { usePixiApp } from './usePixiApp';

export const PixiGameBoard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  usePixiApp(containerRef);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl border border-stone-800 shadow-2xl bg-stone-950"
    />
  );
};
```

- [ ] **Step 4: Verify build passes**

```bash
cd stay-away-frontend && npm run build
```

- [ ] **Step 5: Commit Task 1**

```bash
git add stay-away-frontend/package.json stay-away-frontend/package-lock.json stay-away-frontend/src/components/game/pixi/
git commit -m "feat(ui): установка Pixi.js v8 и создание компонента PixiGameBoard"
```

---

### Task 2: Implement PixiJS Table Background & Dynamic Lighting (`BackgroundLayer`)

**Files:**
- Create: `stay-away-frontend/src/components/game/pixi/layers/BackgroundLayer.ts`
- Modify: `stay-away-frontend/src/components/game/pixi/usePixiApp.ts`

**Interfaces:**
- Consumes: Pixi `Application` instance.
- Produces: `BackgroundLayer` class rendering dark wooden oval table texture with flickering lantern light & lightning flash shader.

- [ ] **Step 1: Implement `BackgroundLayer.ts`**

```typescript
import { Container, Graphics, Sprite, Texture } from 'pixi.js';

export class BackgroundLayer extends Container {
  private tableGraphic: Graphics;
  private lanternLight: Graphics;

  constructor(width: number, height: number) {
    super();
    this.tableGraphic = new Graphics();
    this.lanternLight = new Graphics();
    
    this.addChild(this.tableGraphic);
    this.addChild(this.lanternLight);
    this.drawTable(width, height);
  }

  public drawTable(w: number, h: number) {
    this.tableGraphic.clear();
    const centerX = w / 2;
    const centerY = h / 2;
    const radiusX = Math.min(w, h) * 0.42;
    const radiusY = Math.min(w, h) * 0.32;

    // Тёмный деревянный стол с градиентной текстурой
    this.tableGraphic
      .ellipse(centerX, centerY, radiusX, radiusY)
      .fill({ color: 0x1c1917 })
      .stroke({ width: 8, color: 0x44403c });

    // Освещение от лампады
    this.lanternLight.clear();
    this.lanternLight
      .circle(centerX, centerY, Math.min(w, h) * 0.25)
      .fill({ color: 0xf59e0b, alpha: 0.08 });
  }

  public updateOnTicker(delta: number) {
    // Пульсация света лампады
    this.lanternLight.alpha = 0.06 + Math.sin(Date.now() / 300) * 0.03;
  }
}
```

- [ ] **Step 2: Connect `BackgroundLayer` into `usePixiApp` ticker loop**

- [ ] **Step 3: Run build to verify**

```bash
cd stay-away-frontend && npm run build
```

- [ ] **Step 4: Commit Task 2**

```bash
git add stay-away-frontend/src/components/game/pixi/layers/BackgroundLayer.ts
git commit -m "feat(ui): реализация BackgroundLayer на PixiJS с лампадой и 2.5D столом"
```

---

### Task 3: Avatar Manager (`AvatarCropperModal`) & SIGame-like Avatar Sync

**Files:**
- Create: `stay-away-frontend/src/components/game/AvatarCropperModal.tsx`
- Modify: `stay-away-frontend/src/store/useGameStore.ts`
- Modify: `stay-away-frontend/src/components/screens/LobbyScreen.tsx`

**Interfaces:**
- Consumes: User selected File or Image URL.
- Produces: Base64 cropped avatar data URL synced via Zustand & Socket.io `setAvatar`.

- [ ] **Step 1: Create `AvatarCropperModal.tsx`**

```tsx
import React, { useState, useRef } from 'react';
import { Upload, X, Check } from 'lucide-react';

interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAvatar: (avatarDataUrl: string) => void;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({ isOpen, onClose, onSaveAvatar }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (!imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.beginPath();
      ctx.arc(64, 64, 64, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, 128, 128);
      onSaveAvatar(canvas.toDataURL('image/png'));
      onClose();
    };
    img.src = imageSrc;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-stone-900 border border-amber-900/40 rounded-2xl p-6 w-full max-w-md shadow-2xl text-stone-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-amber-500">Кастомизация аватара</h3>
          <button onClick={onClose} className="p-1 hover:text-stone-400"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <input type="file" accept="image/*" onChange={handleFileChange} id="avatar-input" className="hidden" />
          <label 
            htmlFor="avatar-input" 
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg cursor-pointer transition text-sm font-semibold"
          >
            <Upload className="w-4 h-4 text-amber-400" /> Выбрать изображение
          </label>

          <canvas ref={canvasRef} width={128} height={128} className="w-32 h-32 rounded-full border-2 border-amber-600 bg-stone-950 shadow-inner" />
          
          <button 
            onClick={handleApply}
            disabled={!imageSrc}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold rounded-lg transition"
          >
            <Check className="w-5 h-5" /> Применить аватар
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add avatar state to Zustand store and sync via Socket.io**
- [ ] **Step 3: Verify build passes**
- [ ] **Step 4: Commit Task 3**

```bash
git add stay-away-frontend/src/components/game/AvatarCropperModal.tsx stay-away-frontend/src/store/useGameStore.ts
git commit -m "feat(ui): система кастомизации аватарок с Canvas Cropper в стиле SIGame"
```

---

### Task 4: Implement PixiJS Player Token Nodes (`PlayerTokensLayer`) with Custom Avatar Masking

**Files:**
- Create: `stay-away-frontend/src/components/game/pixi/layers/PlayerTokensLayer.ts`
- Modify: `stay-away-frontend/src/components/game/pixi/usePixiApp.ts`

**Interfaces:**
- Consumes: Player array with `id`, `name`, `avatarUrl`, `isCurrentTurn`, `isQuarantined`.
- Produces: `PlayerTokensLayer` rendering round tokens with masked custom avatars on 2.5D orbit.

- [x] **Step 1: Implement `PlayerTokensLayer.ts`**
- [x] **Step 2: Add dynamic avatar loading via `Assets.load()` and circular mask**
- [x] **Step 3: Run build to verify**
- [x] **Step 4: Commit Task 4**

```bash
git add stay-away-frontend/src/components/game/pixi/layers/PlayerTokensLayer.ts
git commit -m "feat(ui): реализация PlayerTokensLayer на PixiJS с круговой маской аватаров"
```

---

### Task 5: Implement PixiJS Board Obstacles (`ObstaclesLayer` - Barred Door & Quarantine)

**Files:**
- Create: `stay-away-frontend/src/components/game/pixi/layers/ObstaclesLayer.ts`
- Modify: `stay-away-frontend/src/components/game/pixi/usePixiApp.ts`

**Interfaces:**
- Consumes: Door array and Quarantine status per player.
- Produces: `ObstaclesLayer` rendering 2.5D wooden barricades between players and metal quarantine grid over affected player token.

- [ ] **Step 1: Implement `ObstaclesLayer.ts`**
- [ ] **Step 2: Add splinter animation when Barred Door is destroyed**
- [ ] **Step 3: Verify build passes**
- [ ] **Step 4: Commit Task 5**

```bash
git add stay-away-frontend/src/components/game/pixi/layers/ObstaclesLayer.ts
git commit -m "feat(ui): добавление слоя ObstaclesLayer для дверей и карантина на PixiJS"
```

---

### Task 6: Implement PixiJS Particles System (`ParticlesLayer` - Fire, Slime, Dust)

**Files:**
- Create: `stay-away-frontend/src/components/game/pixi/layers/ParticlesLayer.ts`
- Modify: `stay-away-frontend/src/components/game/pixi/usePixiApp.ts`

**Interfaces:**
- Consumes: Trigger methods `spawnFlamethrower(x, y)`, `spawnInfectionSlime(x, y)`.
- Produces: Real-time particle emitter effects on Pixi Ticker.

- [x] **Step 1: Implement `ParticlesLayer.ts`**
- [x] **Step 2: Connect to action triggers**
- [x] **Step 3: Verify build passes**
- [x] **Step 4: Commit Task 6**

```bash
git add stay-away-frontend/src/components/game/pixi/layers/ParticlesLayer.ts
git commit -m "feat(ui): реализация партикловой системы ParticlesLayer (огонь, слизь, иней)"
```

---

### Task 7: Implement React 3D Hand Fan (`PlayerHand`) with Framer Motion Arc & Card Auras

**Files:**
- Modify: `stay-away-frontend/src/components/game/PlayerHand.tsx`

**Interfaces:**
- Consumes: Player cards array (`Card[]`).
- Produces: 3D arc hand fan layout with type-based glowing aura and touch/hover gestures.

- [x] **Step 1: Refactor `PlayerHand.tsx` using Framer Motion 3D arc transforms**
- [x] **Step 2: Add glow aura styles (Red attack, Blue event, Green panic/infection)**
- [x] **Step 3: Verify build passes**
- [x] **Step 4: Commit Task 7**

```bash
git add stay-away-frontend/src/components/game/PlayerHand.tsx
git commit -m "feat(ui): 3D-веер карт на руке с анимированной подсветкой и Framer Motion"
```

---

### Task 8: Implement React GameHeader with Rotating Compass & Phase Step Progress Bar

**Files:**
- Modify: `stay-away-frontend/src/components/game/GameHeader.tsx`

**Interfaces:**
- Consumes: `direction` ('cw' | 'ccw') and `turnPhase`.
- Produces: Expedition metal frame header with animated turn direction compass and step progress bar.

- [ ] **Step 1: Add rotating compass widget with sound & spring transition**
- [ ] **Step 2: Update step progress bar design**
- [ ] **Step 3: Verify build passes**
- [ ] **Step 4: Commit Task 8**

```bash
git add stay-away-frontend/src/components/game/GameHeader.tsx
git commit -m "feat(ui): реализация GameHeader с компасом направления и фазами хода"
```

---

### Task 9: Implement Responsive Mobile Bottom Drawers for InGameChat & RadioJournal

**Files:**
- Modify: `stay-away-frontend/src/components/game/InGameChat.tsx`
- Modify: `stay-away-frontend/src/components/game/RadioJournal.tsx`
- Modify: `stay-away-frontend/src/components/screens/GameScreen.tsx`

**Interfaces:**
- Consumes: Screen width breakpoint `< 1024px`.
- Produces: Fixed sidebars on Desktop, slide-up Bottom Sheet Drawers with unread badges on Mobile.

- [ ] **Step 1: Add mobile drawer toggle state and responsive CSS classes**
- [ ] **Step 2: Verify responsive design in DevTools**
- [ ] **Step 3: Commit Task 9**

```bash
git add stay-away-frontend/src/components/game/InGameChat.tsx stay-away-frontend/src/components/game/RadioJournal.tsx stay-away-frontend/src/components/screens/GameScreen.tsx
git commit -m "feat(ui): адаптивные выезжающие шторки (Bottom Sheets) для чата и логов на мобильных"
```

---

### Task 10: End-to-End Verification & Production Build Test

**Files:**
- Test all components together in `GameScreen.tsx`.

- [ ] **Step 1: Run frontend build**

```bash
cd stay-away-frontend && npm run build
```

- [ ] **Step 2: Verify no linter errors**

```bash
cd stay-away-frontend && npm run lint
```

- [ ] **Step 3: Commit final plan completion**

```bash
git add .
git commit -m "chore: успешная верификация и сборка нового Game UI"
```
