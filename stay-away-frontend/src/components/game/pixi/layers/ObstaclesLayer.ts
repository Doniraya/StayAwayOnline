import { Container, Graphics, Text } from 'pixi.js';
import type { Player } from '../../../../types/game';

interface SplinterParticle {
  graphic: Graphics;
  vx: number;
  vy: number;
  vRot: number;
  life: number;
  maxLife: number;
}

/**
 * Узел заколоченной деревянной двери (баррикады).
 * Отрисовывает скрещенные деревянные брусья с металлической фурнитурой, гвоздями и бейджем.
 */
export class BarredDoorNode extends Container {
  private shadowGraphic: Graphics;
  private woodPlanksGraphic: Graphics;
  private nailsGraphic: Graphics;
  private badgeGraphic: Graphics;
  private doorText: Text;

  constructor() {
    super();

    this.shadowGraphic = new Graphics();
    this.woodPlanksGraphic = new Graphics();
    this.nailsGraphic = new Graphics();
    this.badgeGraphic = new Graphics();

    this.doorText = new Text({
      text: 'ДВЕРЬ',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 9,
        fill: 0xfef08a,
        fontWeight: '800',
      },
    });
    this.doorText.anchor.set(0.5, 0.5);

    this.addChild(this.shadowGraphic);
    this.addChild(this.woodPlanksGraphic);
    this.addChild(this.nailsGraphic);
    this.addChild(this.badgeGraphic);
    this.addChild(this.doorText);

    this.drawDoor();
  }

  private drawDoor(): void {
    this.shadowGraphic.clear();
    this.woodPlanksGraphic.clear();
    this.nailsGraphic.clear();
    this.badgeGraphic.clear();

    const w = 54;
    const h = 14;

    // 1. Тень двери
    this.shadowGraphic
      .roundRect(-w / 2 - 2, -h / 2 + 2, w + 4, h + 4, 4)
      .fill({ color: 0x000000, alpha: 0.5 });

    // 2. Скрещенные деревянные брусья («Заколоченная дверь»)
    // Основная прямоугольная доска
    this.woodPlanksGraphic
      .roundRect(-w / 2, -h / 2, w, h, 4)
      .fill({ color: 0x78350f })
      .stroke({ width: 2, color: 0x451a03 });

    // Диагональная скрещенная доска 1
    this.woodPlanksGraphic
      .poly([
        -w / 2 + 6, -h / 2 - 4,
        w / 2 - 6, h / 2 + 4,
        w / 2 - 2, h / 2 + 4,
        -w / 2 + 10, -h / 2 - 4,
      ])
      .fill({ color: 0x92400e })
      .stroke({ width: 1.5, color: 0x451a03 });

    // Диагональная скрещенная доска 2
    this.woodPlanksGraphic
      .poly([
        -w / 2 + 6, h / 2 + 4,
        w / 2 - 6, -h / 2 - 4,
        w / 2 - 2, -h / 2 - 4,
        -w / 2 + 10, h / 2 + 4,
      ])
      .fill({ color: 0x78350f })
      .stroke({ width: 1.5, color: 0x451a03 });

    // 3. Металлические гвозди
    const nailPositions: [number, number][] = [
      [-w / 2 + 4, -h / 2 + 4],
      [w / 2 - 4, -h / 2 + 4],
      [-w / 2 + 4, h / 2 - 4],
      [w / 2 - 4, h / 2 - 4],
      [0, 0],
    ];

    nailPositions.forEach(([nx, ny]) => {
      this.nailsGraphic
        .circle(nx, ny, 2)
        .fill({ color: 0xd4d4d8 })
        .stroke({ width: 0.5, color: 0x27272a });
    });

    // 4. Плашка "ДВЕРЬ" по центру
    const badgeW = 38;
    const badgeH = 14;
    this.badgeGraphic
      .roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 4)
      .fill({ color: 0x451a03, alpha: 0.9 })
      .stroke({ width: 1.5, color: 0xf59e0b });

    this.doorText.position.set(0, 0);
  }
}

/**
 * Узел решётчатого металлического купола/сетки Карантина.
 * Отрисовывается поверх жетона игрока, находящегося в карантине.
 */
export class QuarantineDomeNode extends Container {
  private shadowGraphic: Graphics;
  private cageGraphic: Graphics;
  private gridGraphic: Graphics;
  private badgeGraphic: Graphics;
  private badgeText: Text;
  private pulseTime: number = 0;

  constructor() {
    super();

    this.shadowGraphic = new Graphics();
    this.cageGraphic = new Graphics();
    this.gridGraphic = new Graphics();
    this.badgeGraphic = new Graphics();

    this.badgeText = new Text({
      text: 'КАРАНТИН',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 8,
        fill: 0x0c0a09,
        fontWeight: '900',
      },
    });
    this.badgeText.anchor.set(0.5, 0.5);

    this.addChild(this.shadowGraphic);
    this.addChild(this.gridGraphic);
    this.addChild(this.cageGraphic);
    this.addChild(this.badgeGraphic);
    this.addChild(this.badgeText);

    this.drawQuarantine();
  }

  private drawQuarantine(): void {
    this.shadowGraphic.clear();
    this.cageGraphic.clear();
    this.gridGraphic.clear();
    this.badgeGraphic.clear();

    const r = 40;

    // 1. Тёмная тень купола
    this.shadowGraphic
      .circle(0, 0, r + 2)
      .fill({ color: 0x000000, alpha: 0.4 });

    // 2. Металлическая сетка карантина
    const barStep = 12;
    for (let x = -r + 8; x <= r - 8; x += barStep) {
      const halfH = Math.sqrt(r * r - x * x);
      this.gridGraphic
        .moveTo(x, -halfH)
        .lineTo(x, halfH)
        .stroke({ width: 2.5, color: 0x52525b, alpha: 0.85 });
    }
    for (let y = -r + 8; y <= r - 8; y += barStep) {
      const halfW = Math.sqrt(r * r - y * y);
      this.gridGraphic
        .moveTo(-halfW, y)
        .lineTo(halfW, y)
        .stroke({ width: 2.5, color: 0x52525b, alpha: 0.85 });
    }

    // 3. Внешний решётчатый металлический обод и сигнальное кольцо
    this.cageGraphic
      .circle(0, 0, r)
      .stroke({ width: 4, color: 0x3f3f46 })
      .circle(0, 0, r - 2)
      .stroke({ width: 2, color: 0xf59e0b, alpha: 0.9 });

    // Заклёпки на перекрёстках обода
    const rivets = 8;
    for (let i = 0; i < rivets; i++) {
      const ang = (i / rivets) * Math.PI * 2;
      const rx = (r - 1) * Math.cos(ang);
      const ry = (r - 1) * Math.sin(ang);
      this.cageGraphic
        .circle(rx, ry, 2)
        .fill({ color: 0xd4d4d8 });
    }

    // 4. Плашка предупреждения
    const bW = 52;
    const bH = 14;
    const badgeY = -r + 2;

    this.badgeGraphic
      .roundRect(-bW / 2, badgeY - bH / 2, bW, bH, 4)
      .fill({ color: 0xf59e0b })
      .stroke({ width: 1.5, color: 0xfef08a });

    this.badgeText.position.set(0, badgeY);
  }

  public updateOnTicker(delta: number): void {
    this.pulseTime += delta * 0.08;
    const pulse = Math.sin(this.pulseTime);
    this.badgeGraphic.alpha = 0.85 + pulse * 0.15;
  }
}

/**
 * Слой преград PixiJS (ObstaclesLayer).
 * Отрисовывает заколоченные двери между соседними игроками и решётки карантина над фишками.
 * Управляет анимацией разрушения дверей с вылетающими деревянными щепками.
 */
export class ObstaclesLayer extends Container {
  private screenWidth: number;
  private screenHeight: number;
  private players: Player[] = [];
  private doorsState: boolean[] = [];
  private quarantinedPlayerIds: string[] = [];

  private doorNodesMap: Map<number, BarredDoorNode> = new Map();
  private quarantineNodesMap: Map<string, QuarantineDomeNode> = new Map();
  private splintersContainer: Container;
  private activeSplinters: SplinterParticle[] = [];

  constructor(width: number, height: number, players: Player[] = []) {
    super();
    this.screenWidth = width;
    this.screenHeight = height;
    this.players = players;

    this.splintersContainer = new Container();
    this.addChild(this.splintersContainer);
  }

  /**
   * Рассчитывает координаты жетонов игроков на орбите 2.5D стола
   */
  private getPlayerPosition(index: number, total: number): { x: number; y: number } {
    if (total === 0) return { x: this.screenWidth / 2, y: this.screenHeight / 2 };

    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;
    const radiusX = Math.min(this.screenWidth, this.screenHeight) * 0.40;
    const radiusY = Math.min(this.screenWidth, this.screenHeight) * 0.30;

    const angle = (index / total) * Math.PI * 2 + Math.PI / 2;
    return {
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle),
    };
  }

  /**
   * Рассчитывает позицию и угол поворота двери между игроком p1Index и (p1Index + 1) % total
   */
  private getDoorTransform(doorIndex: number, total: number): { x: number; y: number; angle: number } {
    const p1Pos = this.getPlayerPosition(doorIndex, total);
    const p2Pos = this.getPlayerPosition((doorIndex + 1) % total, total);

    const midX = (p1Pos.x + p2Pos.x) / 2;
    const midY = (p1Pos.y + p2Pos.y) / 2;

    const dx = p2Pos.x - p1Pos.x;
    const dy = p2Pos.y - p1Pos.y;
    const angle = Math.atan2(dy, dx);

    return { x: midX, y: midY, angle };
  }

  /**
   * Анимация разрушения двери: спавнит 15-20 летящих и вращающихся деревянных щепок на Pixi Ticker.
   */
  public triggerBreakDoor(p1Index: number, p2Index?: number): void {
    const total = this.players.length || 4;
    const secondIndex = p2Index !== undefined ? p2Index : (p1Index + 1) % total;

    const p1Pos = this.getPlayerPosition(p1Index, total);
    const p2Pos = this.getPlayerPosition(secondIndex, total);

    const doorX = (p1Pos.x + p2Pos.x) / 2;
    const doorY = (p1Pos.y + p2Pos.y) / 2;

    const numSplinters = Math.floor(Math.random() * 6) + 15; // 15-20 щепок
    const colors = [0x78350f, 0x92400e, 0xd97706, 0x451a03, 0xb45309];

    for (let i = 0; i < numSplinters; i++) {
      const g = new Graphics();
      const splinterWidth = Math.random() * 8 + 4; // 4-12px
      const splinterHeight = Math.random() * 4 + 2; // 2-6px
      const color = colors[Math.floor(Math.random() * colors.length)];

      g.poly([
        -splinterWidth / 2, -splinterHeight / 2,
        splinterWidth / 2, -splinterHeight / 2 + (Math.random() * 2 - 1),
        splinterWidth / 2 - Math.random() * 2, splinterHeight / 2,
        -splinterWidth / 2, splinterHeight / 2,
      ])
        .fill({ color })
        .stroke({ width: 0.8, color: 0x27272a });

      g.position.set(doorX, doorY);
      g.rotation = Math.random() * Math.PI * 2;

      this.splintersContainer.addChild(g);

      const speed = Math.random() * 6 + 2; // 2-8 px/frame
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const vRot = (Math.random() - 0.5) * 0.4;
      const maxLife = Math.floor(Math.random() * 20) + 30; // 30-50 кадров

      this.activeSplinters.push({
        graphic: g,
        vx,
        vy,
        vRot,
        life: 0,
        maxLife,
      });
    }
  }

  /**
   * Обновление состояния дверей и карантина.
   */
  public updateObstacles(
    doorsOrPlayers: boolean[] | Player[],
    quarantinedIdsOrDoors?: string[] | boolean[],
    optionalPlayers?: Player[]
  ): void {
    let doors: boolean[] = [];
    let quarantinedPlayerIds: string[] = [];
    let players: Player[] = this.players;

    if (Array.isArray(doorsOrPlayers) && typeof doorsOrPlayers[0] === 'object' && doorsOrPlayers[0] !== null) {
      // Передан список игроков первым аргументом
      players = doorsOrPlayers as Player[];
      this.players = players;
      if (Array.isArray(quarantinedIdsOrDoors)) {
        doors = quarantinedIdsOrDoors as boolean[];
      }
    } else {
      // Стандартная сигнатура: (doors, quarantinedPlayerIds, players)
      doors = (doorsOrPlayers as boolean[]) || [];
      if (Array.isArray(quarantinedIdsOrDoors)) {
        quarantinedPlayerIds = quarantinedIdsOrDoors as string[];
      }
      if (optionalPlayers) {
        players = optionalPlayers;
        this.players = players;
      }
    }

    // Автоматическое извлечение карантина из списка игроков, если quarantinedPlayerIds не передан явно
    if (quarantinedPlayerIds.length === 0 && players.length > 0) {
      quarantinedPlayerIds = players.filter((p) => p.isInQuarantine).map((p) => p.id);
    }

    const total = players.length;

    // 1. Проверка разрушенных дверей для вызова анимации triggerBreakDoor
    doors.forEach((isDoor, index) => {
      const prevDoor = this.doorsState[index];
      if (prevDoor && !isDoor) {
        this.triggerBreakDoor(index, (index + 1) % total);
      }
    });

    this.doorsState = [...doors];
    this.quarantinedPlayerIds = quarantinedPlayerIds;

    // 2. Обновление узлов дверей
    const currentDoorIndices = new Set<number>();
    doors.forEach((isDoor, index) => {
      if (isDoor) currentDoorIndices.add(index);
    });

    // Удаление снятых дверей
    for (const [idx, node] of this.doorNodesMap.entries()) {
      if (!currentDoorIndices.has(idx)) {
        this.removeChild(node);
        node.destroy({ children: true });
        this.doorNodesMap.delete(idx);
      }
    }

    // Создание/позиционирование активных дверей
    currentDoorIndices.forEach((idx) => {
      let node = this.doorNodesMap.get(idx);
      if (!node) {
        node = new BarredDoorNode();
        this.doorNodesMap.set(idx, node);
        this.addChild(node);
      }
      const transform = this.getDoorTransform(idx, total);
      node.position.set(transform.x, transform.y);
      node.rotation = transform.angle;
    });

    // 3. Обновление узлов карантина
    const currentQuarantinedSet = new Set(quarantinedPlayerIds);

    // Удаление снятых карантинов
    for (const [id, node] of this.quarantineNodesMap.entries()) {
      if (!currentQuarantinedSet.has(id)) {
        this.removeChild(node);
        node.destroy({ children: true });
        this.quarantineNodesMap.delete(id);
      }
    }

    // Создание/позиционирование куполов карантина
    players.forEach((player, index) => {
      if (currentQuarantinedSet.has(player.id)) {
        let node = this.quarantineNodesMap.get(player.id);
        if (!node) {
          node = new QuarantineDomeNode();
          this.quarantineNodesMap.set(player.id, node);
          this.addChild(node);
        }
        const pos = this.getPlayerPosition(index, total);
        node.position.set(pos.x, pos.y);
      }
    });

    // Оставляем контейнер щепок всегда наверху
    this.addChild(this.splintersContainer);
  }

  /**
   * Обновление слоя на тикер-цикле PixiJS (щепки и пульсация куполов карантина)
   */
  public updateOnTicker(delta: number): void {
    // 1. Пульсация плашек карантина
    for (const dome of this.quarantineNodesMap.values()) {
      dome.updateOnTicker(delta);
    }

    // 2. Анимация щепок
    for (let i = this.activeSplinters.length - 1; i >= 0; i--) {
      const s = this.activeSplinters[i];
      s.life += delta;
      s.graphic.x += s.vx * delta;
      s.graphic.y += s.vy * delta;
      s.graphic.rotation += s.vRot * delta;

      // Гравитация и плавное затухание alpha
      s.vy += 0.12 * delta;
      const alphaProgress = 1 - s.life / s.maxLife;
      s.graphic.alpha = Math.max(0, alphaProgress);

      if (s.life >= s.maxLife || s.graphic.alpha <= 0) {
        this.splintersContainer.removeChild(s.graphic);
        s.graphic.destroy();
        this.activeSplinters.splice(i, 1);
      }
    }
  }

  /**
   * Пересчёт позиций при изменении размера окна
   */
  public resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.updateObstacles(this.doorsState, this.quarantinedPlayerIds, this.players);
  }
}
