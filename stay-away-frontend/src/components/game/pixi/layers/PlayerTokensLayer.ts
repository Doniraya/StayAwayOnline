import { Container, Graphics, Sprite, Text, Assets, Texture } from 'pixi.js';
import type { Player } from '../../../../types/game';
import { DEFAULT_AVATAR } from '../../AvatarCropperModal';

/**
 * Вспомогательная функция для надежной загрузки текстуры аватара из URL или Data URL.
 */
async function loadAvatarTexture(url: string): Promise<Texture | null> {
  const targetUrl = url || DEFAULT_AVATAR;
  try {
    const texture = await Assets.load<Texture>(targetUrl);
    if (texture) return texture;
  } catch {
    // Резервный механизм загрузки через HTMLImageElement, если Assets.load завершился с ошибкой
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const texture = Texture.from(img);
        resolve(texture);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = targetUrl;
  });
}

/**
 * Узел жетона отдельного игрока.
 * Отрисовывает металлический обод экспедиционного жетона, аватар с круговой маской,
 * плашку с именем и пульсирующее кольцо хода.
 */
export class PlayerTokenNode extends Container {
  public playerId: string;
  public player: Player;
  private activeRing: Graphics;
  private shadowGraphic: Graphics;
  private rimGraphic: Graphics;
  private maskGraphic: Graphics;
  private fallbackGraphic: Graphics;
  private avatarSprite: Sprite | null = null;
  private namePlaque: Graphics;
  private nameText: Text;
  private currentAvatarUrl: string = '';
  private isCurrentTurn: boolean = false;
  private pulseTime: number = 0;
  private isDestroyed: boolean = false;

  private static TOKEN_RADIUS = 36;
  private static MASK_RADIUS = 32;

  constructor(player: Player, isCurrentTurn: boolean) {
    super();
    this.playerId = player.id;
    this.player = player;
    this.isCurrentTurn = isCurrentTurn;

    // 1. Тень жетона
    this.shadowGraphic = new Graphics();
    this.shadowGraphic
      .ellipse(0, 4, PlayerTokenNode.TOKEN_RADIUS + 2, PlayerTokenNode.TOKEN_RADIUS - 2)
      .fill({ color: 0x000000, alpha: 0.45 });
    this.addChild(this.shadowGraphic);

    // 2. Пульсирующий ореол активного хода
    this.activeRing = new Graphics();
    this.drawActiveRing();
    this.addChild(this.activeRing);

    // 3. Металлический обод экспедиционного жетона
    this.rimGraphic = new Graphics();
    this.drawRim();
    this.addChild(this.rimGraphic);

    // 4. Фолбэк-заглушка аватара (пока аватар загружается)
    this.fallbackGraphic = new Graphics();
    this.drawFallback();
    this.addChild(this.fallbackGraphic);

    // 5. Маска круга для аватара
    this.maskGraphic = new Graphics();
    this.maskGraphic
      .circle(0, 0, PlayerTokenNode.MASK_RADIUS)
      .fill({ color: 0xffffff });
    this.addChild(this.maskGraphic);

    // 6. Плашка с именем игрока
    this.namePlaque = new Graphics();
    this.nameText = new Text({
      text: player.name || 'Игрок',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fill: player.isAlive ? 0xf5f5f4 : 0x71717a,
        fontWeight: '700',
      },
    });
    this.nameText.anchor.set(0.5, 0.5);

    this.drawPlaque();
    this.addChild(this.namePlaque);
    this.addChild(this.nameText);

    // Применяем статус выбывшего/живого
    this.alpha = player.isAlive ? 1.0 : 0.45;

    // Загрузка аватара
    this.updateAvatar(player.avatarUrl || DEFAULT_AVATAR);
  }

  /**
   * Отрисовка пульсирующего ореола активного хода
   */
  private drawActiveRing(): void {
    this.activeRing.clear();
    if (!this.isCurrentTurn) return;

    this.activeRing
      .circle(0, 0, PlayerTokenNode.TOKEN_RADIUS + 5)
      .stroke({ width: 4, color: 0xf59e0b, alpha: 0.9 })
      .circle(0, 0, PlayerTokenNode.TOKEN_RADIUS + 9)
      .stroke({ width: 2, color: 0xfef08a, alpha: 0.4 });
  }

  /**
   * Отрисовка металлического обода жетона
   */
  private drawRim(): void {
    this.rimGraphic.clear();

    // Внешнее металлическое кольцо (бронза/сталь)
    this.rimGraphic
      .circle(0, 0, PlayerTokenNode.TOKEN_RADIUS)
      .fill({ color: 0x27272a })
      .stroke({ width: 3, color: 0x92400e });

    // Внутренняя фаска жетона
    this.rimGraphic
      .circle(0, 0, PlayerTokenNode.TOKEN_RADIUS - 2)
      .stroke({ width: 1.5, color: 0xd97706, alpha: 0.8 });

    // Фон аватара
    this.rimGraphic
      .circle(0, 0, PlayerTokenNode.MASK_RADIUS)
      .fill({ color: 0x09090b });
  }

  /**
   * Отрисовка заглушки аватара (буква имени или иконка)
   */
  private drawFallback(): void {
    this.fallbackGraphic.clear();
    this.fallbackGraphic
      .circle(0, 0, PlayerTokenNode.MASK_RADIUS)
      .fill({ color: 0x1c1917 });
  }

  /**
   * Отрисовка тёмной плашки под именем игрока
   */
  private drawPlaque(): void {
    this.namePlaque.clear();
    const plaqueY = PlayerTokenNode.TOKEN_RADIUS + 14;
    const textWidth = Math.max(76, this.nameText.width + 16);
    const textHeight = 20;

    const strokeColor = this.isCurrentTurn ? 0xd97706 : (this.player.isAlive ? 0x44403c : 0x27272a);

    this.namePlaque
      .roundRect(-textWidth / 2, plaqueY - textHeight / 2, textWidth, textHeight, 6)
      .fill({ color: 0x0c0a09, alpha: 0.88 })
      .stroke({ width: 1.5, color: strokeColor });

    this.nameText.position.set(0, plaqueY);
  }

  /**
   * Загрузка и обновление текстуры аватара
   */
  public async updateAvatar(avatarUrl: string): Promise<void> {
    const url = avatarUrl || DEFAULT_AVATAR;
    if (this.currentAvatarUrl === url && this.avatarSprite) return;
    this.currentAvatarUrl = url;

    const texture = await loadAvatarTexture(url);
    if (this.isDestroyed) return;

    if (texture) {
      if (this.avatarSprite) {
        this.removeChild(this.avatarSprite);
        this.avatarSprite.destroy();
      }

      this.avatarSprite = new Sprite(texture);
      this.avatarSprite.anchor.set(0.5, 0.5);

      // Масштабирование аватара под размеры круговой маски (Cover fit)
      const maxDim = PlayerTokenNode.MASK_RADIUS * 2;
      const scale = Math.max(maxDim / texture.width, maxDim / texture.height);
      this.avatarSprite.scale.set(scale);

      this.avatarSprite.mask = this.maskGraphic;

      // Добавляем спрайт аватара выше фолбэка, но ниже плашки имени
      const plaqueIndex = this.getChildIndex(this.namePlaque);
      this.addChildAt(this.avatarSprite, plaqueIndex);
      this.fallbackGraphic.visible = false;
    }
  }

  /**
   * Обновление состояния игрока (имя, ход, статус жизни)
   */
  public updateState(player: Player, isCurrentTurn: boolean): void {
    this.player = player;

    if (this.nameText.text !== player.name) {
      this.nameText.text = player.name || 'Игрок';
    }

    if (this.isCurrentTurn !== isCurrentTurn) {
      this.isCurrentTurn = isCurrentTurn;
      this.drawActiveRing();
    }

    this.alpha = player.isAlive ? 1.0 : 0.45;
    this.nameText.style.fill = player.isAlive ? 0xf5f5f4 : 0x71717a;

    this.drawPlaque();

    if (player.avatarUrl && player.avatarUrl !== this.currentAvatarUrl) {
      this.updateAvatar(player.avatarUrl);
    }
  }

  /**
   * Анимация пульсации кольца активного хода на Pixi Ticker
   */
  public updateOnTicker(delta: number): void {
    if (!this.isCurrentTurn) return;

    this.pulseTime += delta * 0.08;
    const pulseFactor = Math.sin(this.pulseTime);
    this.activeRing.alpha = 0.6 + pulseFactor * 0.35;
    const scale = 1 + pulseFactor * 0.04;
    this.activeRing.scale.set(scale);
  }

  public destroy(options?: Parameters<Container['destroy']>[0]): void {
    this.isDestroyed = true;
    super.destroy(options);
  }
}

/**
 * Слой жетонов игроков PixiJS.
 * Автоматически рассчитывает позиции жетонов по 2.5D эллиптической орбите стола,
 * поддерживает эффективное обновление через updatePlayers() и подписку на Pixi Ticker.
 */
export class PlayerTokensLayer extends Container {
  private tokenNodesMap: Map<string, PlayerTokenNode> = new Map();
  private screenWidth: number;
  private screenHeight: number;
  private players: Player[] = [];
  private activePlayerId: string = '';

  constructor(players: Player[], width: number, height: number, activePlayerId: string = '') {
    super();
    this.screenWidth = width;
    this.screenHeight = height;
    this.activePlayerId = activePlayerId;

    this.updatePlayers(players, activePlayerId);
  }

  /**
   * Рассчитывает позиции жетонов игроков по эллиптической орбите 2.5D стола
   */
  private calculateOrbits(): void {
    const total = this.players.length;
    if (total === 0) return;

    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;
    const radiusX = Math.min(this.screenWidth, this.screenHeight) * 0.40;
    const radiusY = Math.min(this.screenWidth, this.screenHeight) * 0.30;

    this.players.forEach((player, index) => {
      const node = this.tokenNodesMap.get(player.id);
      if (!node) return;

      // Начинаем распределение от нижней части стола (угла Math.PI / 2) по часовой стрелке
      const angle = (index / total) * Math.PI * 2 + Math.PI / 2;
      const posX = centerX + radiusX * Math.cos(angle);
      const posY = centerY + radiusY * Math.sin(angle);

      node.position.set(posX, posY);
    });
  }

  /**
   * Эффективное обновление списка и состояния жетонов игроков.
   */
  public updatePlayers(players: Player[], activePlayerId?: string): void {
    this.players = players;
    if (activePlayerId !== undefined) {
      this.activePlayerId = activePlayerId;
    }

    const currentIds = new Set(players.map((p) => p.id));

    // 1. Удаляем жетоны ушедших игроков
    for (const [id, node] of this.tokenNodesMap.entries()) {
      if (!currentIds.has(id)) {
        this.removeChild(node);
        node.destroy({ children: true });
        this.tokenNodesMap.delete(id);
      }
    }

    // 2. Создаем или обновляем жетоны существующих игроков
    players.forEach((player) => {
      const isCurrentTurn = player.id === this.activePlayerId;
      let node = this.tokenNodesMap.get(player.id);

      if (!node) {
        node = new PlayerTokenNode(player, isCurrentTurn);
        this.tokenNodesMap.set(player.id, node);
        this.addChild(node);
      } else {
        node.updateState(player, isCurrentTurn);
      }
    });

    // 3. Пересчитываем орбиты
    this.calculateOrbits();
  }

  /**
   * Анимация пульсации колец активных ходов на каждом тике
   */
  public updateOnTicker(delta: number): void {
    for (const node of this.tokenNodesMap.values()) {
      node.updateOnTicker(delta);
    }
  }

  /**
   * Возвращает экранные координаты жетона игрока по его ID
   */
  public getPlayerPosition(playerId: string): { x: number; y: number } | null {
    const node = this.tokenNodesMap.get(playerId);
    if (!node) return null;
    return { x: node.position.x, y: node.position.y };
  }

  /**
   * Изменение размеров экрана и пересчёт орбит
   */
  public resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.calculateOrbits();
  }
}

