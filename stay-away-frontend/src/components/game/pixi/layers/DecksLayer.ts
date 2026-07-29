import { Container, Graphics, Sprite, Text, Assets, Texture } from 'pixi.js';

/**
 * Слой 2.5D колод карт и стопки сброса на столе PixiJS.
 * Отрисовывает физическую колоду событий (back.png), колоду паники (back_panic.png),
 * стопку сброса и плашки со счётчиками количества и состава карт в игре.
 */
export class DecksLayer extends Container {
  private eventDeckContainer: Container;
  private panicDeckContainer: Container;
  private discardDeckContainer: Container;

  private eventCountText: Text;
  private panicCountText: Text;
  private discardCountText: Text;
  private totalDeckInfoText: Text;

  private eventBadgePlaque: Graphics;
  private panicBadgePlaque: Graphics;
  private discardBadgePlaque: Graphics;
  private totalBadgePlaque: Graphics;

  private screenWidth: number;
  private screenHeight: number;

  constructor(width: number, height: number) {
    super();
    this.screenWidth = width;
    this.screenHeight = height;

    this.eventDeckContainer = new Container();
    this.panicDeckContainer = new Container();
    this.discardDeckContainer = new Container();

    this.eventBadgePlaque = new Graphics();
    this.panicBadgePlaque = new Graphics();
    this.discardBadgePlaque = new Graphics();
    this.totalBadgePlaque = new Graphics();

    this.eventCountText = new Text({
      text: 'Колода: 0',
      style: { fontFamily: 'Inter, sans-serif', fontSize: 11, fill: 0xf5f5f4, fontWeight: '700' },
    });
    this.eventCountText.anchor.set(0.5, 0.5);

    this.panicCountText = new Text({
      text: 'Паника: 0',
      style: { fontFamily: 'Inter, sans-serif', fontSize: 11, fill: 0xfef08a, fontWeight: '700' },
    });
    this.panicCountText.anchor.set(0.5, 0.5);

    this.discardCountText = new Text({
      text: 'Сброс: 0',
      style: { fontFamily: 'Inter, sans-serif', fontSize: 11, fill: 0xd4d4d8, fontWeight: '700' },
    });
    this.discardCountText.anchor.set(0.5, 0.5);

    this.totalDeckInfoText = new Text({
      text: 'Карт в игре: 0',
      style: { fontFamily: 'Inter, sans-serif', fontSize: 10, fill: 0xf59e0b, fontWeight: '700' },
    });
    this.totalDeckInfoText.anchor.set(0.5, 0.5);

    this.addChild(this.eventDeckContainer);
    this.addChild(this.panicDeckContainer);
    this.addChild(this.discardDeckContainer);
    this.addChild(this.totalBadgePlaque);
    this.addChild(this.totalDeckInfoText);

    this.loadDeckTextures();
    this.reposition(width, height);
  }

  private async loadDeckTextures(): Promise<void> {
    try {
      const [eventTex, panicTex] = await Promise.all([
        Assets.load<Texture>('/cards/back.png').catch(() => Texture.WHITE),
        Assets.load<Texture>('/cards/back_panic.png').catch(() => Texture.WHITE),
      ]);

      // 1. Колода событий
      this.eventDeckContainer.removeChildren();
      const eventShadow = new Graphics().ellipse(0, 15, 30, 20).fill({ color: 0x000000, alpha: 0.5 });
      this.eventDeckContainer.addChild(eventShadow);

      // Стек из 3 слоев карт для 3D объёма
      for (let i = 2; i >= 0; i--) {
        const spr = new Sprite(eventTex);
        spr.anchor.set(0.5, 0.5);
        spr.width = 50;
        spr.height = 72;
        spr.position.set(-i * 1.5, -i * 1.5);
        this.eventDeckContainer.addChild(spr);
      }

      this.eventBadgePlaque.clear();
      this.eventBadgePlaque.roundRect(-42, 42, 84, 18, 5).fill({ color: 0x0c0a09, alpha: 0.9 }).stroke({ width: 1.5, color: 0x3b82f6 });
      this.eventDeckContainer.addChild(this.eventBadgePlaque);
      this.eventCountText.position.set(0, 51);
      this.eventDeckContainer.addChild(this.eventCountText);

      // 2. Колода паники
      this.panicDeckContainer.removeChildren();
      const panicShadow = new Graphics().ellipse(0, 15, 30, 20).fill({ color: 0x000000, alpha: 0.5 });
      this.panicDeckContainer.addChild(panicShadow);

      for (let i = 2; i >= 0; i--) {
        const spr = new Sprite(panicTex);
        spr.anchor.set(0.5, 0.5);
        spr.width = 50;
        spr.height = 72;
        spr.position.set(-i * 1.5, -i * 1.5);
        this.panicDeckContainer.addChild(spr);
      }

      this.panicBadgePlaque.clear();
      this.panicBadgePlaque.roundRect(-42, 42, 84, 18, 5).fill({ color: 0x0c0a09, alpha: 0.9 }).stroke({ width: 1.5, color: 0xeab308 });
      this.panicDeckContainer.addChild(this.panicBadgePlaque);
      this.panicCountText.position.set(0, 51);
      this.panicDeckContainer.addChild(this.panicCountText);

      // 3. Сброс
      this.discardDeckContainer.removeChildren();
      const discardShadow = new Graphics().ellipse(0, 15, 30, 20).fill({ color: 0x000000, alpha: 0.5 });
      this.discardDeckContainer.addChild(discardShadow);

      const discSpr = new Sprite(eventTex);
      discSpr.anchor.set(0.5, 0.5);
      discSpr.width = 50;
      discSpr.height = 72;
      discSpr.alpha = 0.75;
      this.discardDeckContainer.addChild(discSpr);

      this.discardBadgePlaque.clear();
      this.discardBadgePlaque.roundRect(-42, 42, 84, 18, 5).fill({ color: 0x0c0a09, alpha: 0.9 }).stroke({ width: 1.5, color: 0x71717a });
      this.discardDeckContainer.addChild(this.discardBadgePlaque);
      this.discardCountText.position.set(0, 51);
      this.discardDeckContainer.addChild(this.discardCountText);

      this.reposition(this.screenWidth, this.screenHeight);
    } catch (e) {
      console.error('Ошибка загрузки текстур колоды:', e);
    }
  }

  public updateDecks(deckCount: number, panicCount: number, discardCount: number, totalPlayersCount: number): void {
    this.eventCountText.text = `Колода: ${deckCount}`;
    this.panicCountText.text = `Паника: ${panicCount}`;
    this.discardCountText.text = `Сброс: ${discardCount}`;

    const totalCardsInGame = deckCount + panicCount + discardCount;
    this.totalDeckInfoText.text = `В игре: ${totalCardsInGame} карт (${totalPlayersCount} игр.)`;

    if (this.discardDeckContainer) {
      this.discardDeckContainer.alpha = discardCount > 0 ? 1 : 0.4;
    }
  }

  public reposition(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;

    const centerX = w / 2;
    const centerY = h / 2;

    // Располагаем колоду событий, паники и сброса ближе к центру 2.5D стола
    this.eventDeckContainer.position.set(centerX - 65, centerY - 15);
    this.panicDeckContainer.position.set(centerX + 65, centerY - 15);
    this.discardDeckContainer.position.set(centerX, centerY - 15);

    this.totalBadgePlaque.clear();
    this.totalBadgePlaque
      .roundRect(centerX - 90, centerY + 36, 180, 20, 6)
      .fill({ color: 0x0c0a09, alpha: 0.92 })
      .stroke({ width: 1.5, color: 0xd97706 });
    this.totalDeckInfoText.position.set(centerX, centerY + 46);
  }

  public resize(w: number, h: number): void {
    this.reposition(w, h);
  }
}
