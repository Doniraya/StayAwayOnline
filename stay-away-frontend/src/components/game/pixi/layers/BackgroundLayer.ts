import { Container, Graphics } from 'pixi.js';

/**
 * Слой заднего плана PixiJS.
 * Отрисовывает тёмный 2.5D деревянный стол (из гнилого соснового дерева) с бортом, границей и тенью,
 * а также мерцающее янтарное свечение лампады в центре.
 */
export class BackgroundLayer extends Container {
  private shadowGraphic: Graphics;
  private tableGraphic: Graphics;
  private lanternLight: Graphics;

  constructor(width: number, height: number) {
    super();

    this.shadowGraphic = new Graphics();
    this.tableGraphic = new Graphics();
    this.lanternLight = new Graphics();

    this.addChild(this.shadowGraphic);
    this.addChild(this.tableGraphic);
    this.addChild(this.lanternLight);

    this.resize(width, height);
  }

  /**
   * Перерисовывает элементы стола и свечение при изменении размеров экрана.
   */
  public resize(w: number, h: number): void {
    const centerX = w / 2;
    const centerY = h / 2;
    const radiusX = Math.min(w, h) * 0.42;
    const radiusY = Math.min(w, h) * 0.32;

    // 1. Тень под столом
    this.shadowGraphic.clear();
    this.shadowGraphic
      .ellipse(centerX, centerY + 14, radiusX * 1.03, radiusY * 1.03)
      .fill({ color: 0x000000, alpha: 0.5 });

    // 2. Деревянный стол (бортик, внешняя граница и поверхность из гнилой сосны)
    this.tableGraphic.clear();

    // Внешний борт (тёмное гнилое дерево)
    this.tableGraphic
      .ellipse(centerX, centerY, radiusX * 1.02, radiusY * 1.02)
      .fill({ color: 0x140e0b })
      .stroke({ width: 6, color: 0x0b0806, alpha: 0.8 });

    // Основное столешница
    this.tableGraphic
      .ellipse(centerX, centerY, radiusX, radiusY)
      .fill({ color: 0x1c1410 })
      .stroke({ width: 5, color: 0x443022 });

    // Внутренняя фаска/канавка стола
    this.tableGraphic
      .ellipse(centerX, centerY, radiusX * 0.95, radiusY * 0.95)
      .stroke({ width: 2, color: 0x2b1e17, alpha: 0.6 });

    // 3. Освещение от лампады в центре стола (со слоями разной интенсивности)
    this.lanternLight.clear();

    // Внешний ореол лампады
    this.lanternLight
      .circle(centerX, centerY, Math.min(w, h) * 0.28)
      .fill({ color: 0xd97706, alpha: 0.05 });

    // Основное янтарно-оранжевое свечение
    this.lanternLight
      .circle(centerX, centerY, Math.min(w, h) * 0.18)
      .fill({ color: 0xf59e0b, alpha: 0.08 });

    // Яркое ядро света в центре
    this.lanternLight
      .circle(centerX, centerY, Math.min(w, h) * 0.08)
      .fill({ color: 0xfef08a, alpha: 0.12 });
  }

  /**
   * Вызывается на каждом тике PixiJS Ticker для анимации мерцания лампады.
   */
  public updateOnTicker(_delta: number): void {
    // Плавно изменяем альфу свечения лампады для эффекта мерцания огня в тёмном бараке
    this.lanternLight.alpha = 0.06 + Math.sin(Date.now() / 300) * 0.03;
  }
}
