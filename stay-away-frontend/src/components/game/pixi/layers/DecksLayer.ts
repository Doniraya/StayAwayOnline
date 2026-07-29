import { Container, Graphics, Sprite, Text, Assets, Texture } from 'pixi.js';

/**
 * Слой 2.5D единой общей колоды карт и стопки сброса на столе PixiJS.
 * Отрисовывает общую колоду (back.png) слева в центре и стопку сброса справа в центре.
 * Поддерживает интерактивные всплывающие тултипы при наведении мыши.
 */
export class DecksLayer extends Container {
  private mainDeckContainer: Container;
  private discardDeckContainer: Container;

  private tooltipContainer: Container;
  private tooltipBg: Graphics;
  private tooltipText: Text;

  private screenWidth: number;
  private screenHeight: number;

  private deckCount: number = 0;
  private discardCount: number = 0;
  private activeTooltipType: 'main' | 'discard' | null = null;

  constructor(width: number, height: number) {
    super();
    this.screenWidth = width;
    this.screenHeight = height;

    this.mainDeckContainer = new Container();
    this.discardDeckContainer = new Container();

    // Создаем контейнер тултипа
    this.tooltipContainer = new Container();
    this.tooltipBg = new Graphics();
    this.tooltipText = new Text({
      text: '',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fill: 0xfef08a,
        fontWeight: '700',
      },
    });
    this.tooltipText.anchor.set(0.5, 0.5);

    this.tooltipContainer.addChild(this.tooltipBg);
    this.tooltipContainer.addChild(this.tooltipText);
    this.tooltipContainer.visible = false;

    // Включаем интерактивность контейнеров
    this.mainDeckContainer.eventMode = 'static';
    this.mainDeckContainer.cursor = 'pointer';

    this.discardDeckContainer.eventMode = 'static';
    this.discardDeckContainer.cursor = 'pointer';

    // Настраиваем обработчики событий мыши
    this.setupInteractivity();

    this.addChild(this.mainDeckContainer);
    this.addChild(this.discardDeckContainer);
    this.addChild(this.tooltipContainer);

    this.loadDeckTextures();
    this.reposition(width, height);
  }

  private setupInteractivity(): void {
    // Наведение на общую колоду
    this.mainDeckContainer.on('pointerover', () => {
      this.activeTooltipType = 'main';
      this.mainDeckContainer.scale.set(1.06);
      this.updateTooltipPosition();
    });

    this.mainDeckContainer.on('pointerout', () => {
      if (this.activeTooltipType === 'main') {
        this.activeTooltipType = null;
        this.tooltipContainer.visible = false;
      }
      this.mainDeckContainer.scale.set(1.0);
    });

    // Наведение на сброс
    this.discardDeckContainer.on('pointerover', () => {
      this.activeTooltipType = 'discard';
      this.discardDeckContainer.scale.set(1.06);
      this.updateTooltipPosition();
    });

    this.discardDeckContainer.on('pointerout', () => {
      if (this.activeTooltipType === 'discard') {
        this.activeTooltipType = null;
        this.tooltipContainer.visible = false;
      }
      this.discardDeckContainer.scale.set(1.0);
    });
  }

  private updateTooltipPosition(): void {
    if (!this.activeTooltipType) return;

    if (this.activeTooltipType === 'main') {
      this.tooltipText.text = `Общая колода карт: ${this.deckCount} карт`;
      this.positionTooltip(this.mainDeckContainer.x, this.mainDeckContainer.y - 56);
    } else if (this.activeTooltipType === 'discard') {
      this.tooltipText.text = `Сброс: ${this.discardCount} карт`;
      this.positionTooltip(this.discardDeckContainer.x, this.discardDeckContainer.y - 56);
    }
  }

  private positionTooltip(targetX: number, targetY: number): void {
    const paddingX = 14;
    const paddingY = 8;
    const w = this.tooltipText.width + paddingX * 2;
    const h = this.tooltipText.height + paddingY * 2;

    this.tooltipBg.clear();
    this.tooltipBg
      .roundRect(-w / 2, -h / 2, w, h, 6)
      .fill({ color: 0x0c0a09, alpha: 0.94 })
      .stroke({ width: 1.5, color: 0xd97706 });

    this.tooltipText.position.set(0, 0);
    this.tooltipContainer.position.set(targetX, targetY);
    this.tooltipContainer.visible = true;
  }

  private async loadDeckTextures(): Promise<void> {
    try {
      const cardBackTex = await Assets.load<Texture>('/cards/back.png').catch(() => Texture.WHITE);

      // 1. Общая колода (лежит слева)
      this.mainDeckContainer.removeChildren();
      const mainShadow = new Graphics().ellipse(0, 18, 32, 20).fill({ color: 0x000000, alpha: 0.5 });
      this.mainDeckContainer.addChild(mainShadow);

      // Стек из 3 карт для объема
      for (let i = 2; i >= 0; i--) {
        const spr = new Sprite(cardBackTex);
        spr.anchor.set(0.5, 0.5);
        spr.width = 54;
        spr.height = 78;
        spr.position.set(-i * 1.5, -i * 1.5);
        this.mainDeckContainer.addChild(spr);
      }

      // 2. Стопка сброса (лежит справа)
      this.discardDeckContainer.removeChildren();
      const discardShadow = new Graphics().ellipse(0, 18, 32, 20).fill({ color: 0x000000, alpha: 0.5 });
      this.discardDeckContainer.addChild(discardShadow);

      const discSpr = new Sprite(cardBackTex);
      discSpr.anchor.set(0.5, 0.5);
      discSpr.width = 54;
      discSpr.height = 78;
      discSpr.alpha = 0.75;
      this.discardDeckContainer.addChild(discSpr);

      this.reposition(this.screenWidth, this.screenHeight);
    } catch (e) {
      console.error('Ошибка загрузки текстур колоды:', e);
    }
  }

  public updateDecks(deckCount: number, arg2?: number, arg3?: number, _arg4?: number): void {
    this.deckCount = deckCount;
    this.discardCount = arg3 !== undefined ? arg3 : (arg2 ?? 0);

    if (this.discardDeckContainer) {
      this.discardDeckContainer.alpha = this.discardCount > 0 ? 1.0 : 0.4;
    }

    if (this.activeTooltipType) {
      this.updateTooltipPosition();
    }
  }

  public reposition(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;

    const centerX = w / 2;
    const centerY = h / 2;

    // Располагаем общую колоду слева в центре стола, а сброс — справа
    this.mainDeckContainer.position.set(centerX - 48, centerY);
    this.discardDeckContainer.position.set(centerX + 48, centerY);

    if (this.activeTooltipType) {
      this.updateTooltipPosition();
    }
  }

  public resize(w: number, h: number): void {
    this.reposition(w, h);
  }
}

