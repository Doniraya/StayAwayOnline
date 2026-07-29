import { Container, Graphics } from 'pixi.js';

interface FrostParticle {
  graphics: Graphics;
  x: number;
  y: number;
  baseX: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  baseAlpha: number;
  sinOffset: number;
  sinSpeed: number;
  sinAmplitude: number;
}

interface DynamicParticle {
  graphics: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  friction: number;
  scale: number;
  scaleGrowth: number;
  rotation: number;
  rotationSpeed: number;
  baseAlpha: number;
  life: number;
  maxLife: number;
  type: 'fire' | 'spark' | 'slime';
}

/**
 * Слой партикловых эффектов PixiJS.
 * Включает в себя:
 * 1. Постоянный фоновый иней/снежинки над столом (20-30 легких полупрозрачных парящих частиц).
 * 2. Метод spawnFlamethrower: векторный сноп огня и искр от источника к цели (40-60 ярких оранжево-красных частиц).
 * 3. Метод spawnInfectionSlime: брызги ядовито-зеленой био-слизи из центра фишки игрока (25-35 капель).
 */
export class ParticlesLayer extends Container {
  private frostParticles: FrostParticle[] = [];
  private dynamicParticles: DynamicParticle[] = [];
  private screenWidth: number;
  private screenHeight: number;

  private static FROST_COUNT = 25;

  constructor(width: number, height: number) {
    super();
    this.screenWidth = width;
    this.screenHeight = height;

    this.initFrostParticles();
  }

  /**
   * Инициализация 25 постоянных фоновых снежинок/частиц инея
   */
  private initFrostParticles(): void {
    const frostColors = [0xe0f2fe, 0xf0f9ff, 0xbae6fd, 0xdbeafe, 0xffffff];

    for (let i = 0; i < ParticlesLayer.FROST_COUNT; i++) {
      const g = new Graphics();
      const radius = 1.2 + Math.random() * 2.2;
      const color = frostColors[Math.floor(Math.random() * frostColors.length)];
      const baseAlpha = 0.2 + Math.random() * 0.45;

      // Рисуем мягкую круглую частицу инея
      g.circle(0, 0, radius).fill({ color, alpha: baseAlpha });

      const posX = Math.random() * (this.screenWidth || 800);
      const posY = Math.random() * (this.screenHeight || 600);

      g.position.set(posX, posY);
      this.addChild(g);

      this.frostParticles.push({
        graphics: g,
        x: posX,
        y: posY,
        baseX: posX,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.2 - Math.random() * 0.4, // Плавное движение вверх
        scale: 0.7 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        baseAlpha,
        sinOffset: Math.random() * Math.PI * 2,
        sinSpeed: 0.01 + Math.random() * 0.02,
        sinAmplitude: 15 + Math.random() * 25,
      });
    }
  }

  /**
   * Векторный сноп огня от источника к цели (Огнемет)
   * Спавнит 40-60 ярких оранжево-красных частиц пламени и искорок.
   */
  public spawnFlamethrower(sourceX: number, sourceY: number, targetX: number, targetY: number): void {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dist = Math.hypot(dx, dy) || 1;
    const baseAngle = Math.atan2(dy, dx);

    const particleCount = 50; // В интервале 40-60
    const fireColors = [
      0xfffbeb, // Бело-желтое ядро
      0xfef08a, // Ярко-желтый
      0xf97316, // Огненно-оранжевый
      0xef4444, // Алый красный
      0xd97706, // Янтарный
      0xb91c1c, // Темно-красный уголек
    ];

    for (let i = 0; i < particleCount; i++) {
      const isSpark = i % 3 === 0;
      const g = new Graphics();

      const spread = isSpark ? 0.65 : 0.38; // Угол рассеивания
      const angle = baseAngle + (Math.random() - 0.5) * spread;

      const baseSpeed = (dist / 32) * (0.6 + Math.random() * 0.8);
      const speed = isSpark ? baseSpeed * (1.3 + Math.random() * 0.5) : baseSpeed;

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const radius = isSpark ? 1.5 + Math.random() * 1.5 : 4.5 + Math.random() * 7.5;
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      const baseAlpha = isSpark ? 0.95 : 0.85;

      g.circle(0, 0, radius).fill({ color, alpha: baseAlpha });

      // Небольшое случайное смещение спавна около источника
      const offsetX = (Math.random() - 0.5) * 12;
      const offsetY = (Math.random() - 0.5) * 12;
      const posX = sourceX + offsetX;
      const posY = sourceY + offsetY;

      g.position.set(posX, posY);
      this.addChild(g);

      this.dynamicParticles.push({
        graphics: g,
        x: posX,
        y: posY,
        vx,
        vy,
        ax: 0,
        ay: -0.05, // Огонь немного тянется вверх
        friction: isSpark ? 0.94 : 0.97,
        scale: 0.6 + Math.random() * 0.5,
        scaleGrowth: isSpark ? -0.02 : 0.015, // Пламя расширяется, искры сжимаются
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        baseAlpha,
        life: 0,
        maxLife: isSpark ? 18 + Math.random() * 14 : 28 + Math.random() * 20,
        type: isSpark ? 'spark' : 'fire',
      });
    }
  }

  /**
   * Всплеск ядовито-зеленой био-слизи при заражении игрока
   * Спавнит 25-35 капель слизи, разлетающихся из центра фишки игрока.
   */
  public spawnInfectionSlime(targetX: number, targetY: number): void {
    const particleCount = 30; // В интервале 25-35
    const slimeColors = [
      0x22c55e, // Сочный ядовито-зеленый
      0x4ade80, // Неоновый салатовый
      0x16a34a, // Темно-зеленая слизь
      0x86efac, // Светло-кислотный
      0x15803d, // Глубокая инфекция
    ];

    for (let i = 0; i < particleCount; i++) {
      const g = new Graphics();
      const angle = Math.random() * Math.PI * 2; // Разлет во все 360 градусов
      const speed = 2.2 + Math.random() * 5.5;

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 1.2; // Небольшой импульс вверх

      const radiusX = 3 + Math.random() * 5;
      const radiusY = 2 + Math.random() * 3;
      const color = slimeColors[Math.floor(Math.random() * slimeColors.length)];
      const baseAlpha = 0.9;

      // Эллиптические капли био-слизи
      g.ellipse(0, 0, radiusX, radiusY).fill({ color, alpha: baseAlpha });

      // Небольшое смещение из центра
      const posX = targetX + (Math.random() - 0.5) * 10;
      const posY = targetY + (Math.random() - 0.5) * 10;

      g.position.set(posX, posY);
      g.rotation = angle;
      this.addChild(g);

      this.dynamicParticles.push({
        graphics: g,
        x: posX,
        y: posY,
        vx,
        vy,
        ax: 0,
        ay: 0.16, // Тяжелая капля оседает под гравитацией
        friction: 0.95, // Сопротивление жидкой среды
        scale: 1.0,
        scaleGrowth: -0.015,
        rotation: angle,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        baseAlpha,
        life: 0,
        maxLife: 32 + Math.random() * 22,
        type: 'slime',
      });
    }
  }

  /**
   * Обновление физики и анимации всех частиц на тикер-цикле PixiJS.
   */
  public updateOnTicker(delta: number): void {
    // 1. Анимация фонового инея/снежинок
    const w = this.screenWidth || 800;
    const h = this.screenHeight || 600;

    for (const p of this.frostParticles) {
      p.sinOffset += p.sinSpeed * delta;
      p.x = p.baseX + Math.sin(p.sinOffset) * p.sinAmplitude;
      p.y += p.vy * delta;
      p.rotation += p.rotationSpeed * delta;

      // Возврат частиц, вышедших за границы экрана
      if (p.y < -20) {
        p.y = h + 20;
        p.baseX = Math.random() * w;
        p.x = p.baseX;
      } else if (p.y > h + 20) {
        p.y = -20;
        p.baseX = Math.random() * w;
        p.x = p.baseX;
      }

      p.graphics.position.set(p.x, p.y);
      p.graphics.rotation = p.rotation;
      p.graphics.alpha = p.baseAlpha + Math.sin(p.sinOffset * 2) * 0.15;
    }

    // 2. Анимация и физика динамических частиц (огня, искр и слизи)
    for (let i = this.dynamicParticles.length - 1; i >= 0; i--) {
      const p = this.dynamicParticles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        // Удаляем истекшую частицу
        this.removeChild(p.graphics);
        p.graphics.destroy();
        this.dynamicParticles.splice(i, 1);
        continue;
      }

      // Физика: приращение скорости, трение и позиция
      p.vx += p.ax * delta;
      p.vy += p.ay * delta;
      p.vx *= Math.pow(p.friction, delta);
      p.vy *= Math.pow(p.friction, delta);

      p.x += p.vx * delta;
      p.y += p.vy * delta;

      p.rotation += p.rotationSpeed * delta;
      p.scale = Math.max(0.05, p.scale + p.scaleGrowth * delta);

      // Коэффициент угасания (0.0 -> 1.0)
      const lifeRatio = p.life / p.maxLife;
      const alpha = p.baseAlpha * (1 - lifeRatio);

      p.graphics.position.set(p.x, p.y);
      p.graphics.rotation = p.rotation;
      p.graphics.scale.set(p.scale);
      p.graphics.alpha = Math.max(0, alpha);
    }
  }

  /**
   * Адаптивное изменение размеров экрана для перераспределения фоновых частиц.
   */
  public resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;

    for (const p of this.frostParticles) {
      if (p.baseX > width) {
        p.baseX = Math.random() * width;
        p.x = p.baseX;
      }
    }
  }

  /**
   * Очистка всех динамических и фоновых ресурсов при уничтожении слоя
   */
  public destroy(options?: Parameters<Container['destroy']>[0]): void {
    for (const p of this.dynamicParticles) {
      p.graphics.destroy();
    }
    this.dynamicParticles = [];
    this.frostParticles = [];
    super.destroy(options);
  }
}
