
import Phaser from 'phaser';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  drawSpaceBackground,
  fitImage
} from '../ui/Menuui';

interface MenuOption {
  id: string;
  title: string;
  enabled: boolean;
  color: number;
  /** Escena a la que va al elegir la opción (solo si está habilitada). */
  nextScene?: string;
  /**
   * Ruta de la imagen de la tarjeta.
   * Si está vacía se muestra un marcador.
   */
  image?: string;
  /** Icono del marcador mientras no haya imagen. */
  icon: string;
}

// ---------------------------------------------------------------------
// Aquí cambias textos, estados e imágenes del menú.
// ---------------------------------------------------------------------
const MENU_OPTIONS: MenuOption[] = [
  {
    id: 'battle-1v1',
    title: 'COMBATE 1 VS 1',
    enabled: true,
    color: 0xd62839,
    nextScene: 'ModeSelectScene',
    image: '',
    icon: '⚔️'
  },
  {
    id: 'battle-2v2',
    title: 'COMBATE 2 VS 2',
    enabled: false,
    color: 0x2f6fe4,
    image: '',
    icon: '🤝'
  },
  {
    id: 'story',
    title: 'MODO HISTORIA',
    enabled: false,
    color: 0x2e9e4f,
    image: '',
    icon: '📖'
  },
  {
    id: 'online',
    title: 'ONLINE',
    enabled: false,
    color: 0xf08c1a,
    image: '',
    icon: '🌐'
  }
];

// Inclinación de los bordes de las tarjetas.
const SKEW = 24;

// Distribución de las tarjetas en 1280 x 720.
const PANEL_RECTS = [
  { x: 40, y: 100, w: 570, h: 250 },
  { x: 670, y: 100, w: 570, h: 250 },
  { x: 40, y: 380, w: 570, h: 250 },
  { x: 670, y: 380, w: 570, h: 250 }
];

type Point = Phaser.Math.Vector2;

export class PlaySelectScene extends Phaser.Scene {
  private selected = 0;

  private polygons: Point[][] = [];
  private selector?: Phaser.GameObjects.Graphics;
  private toast?: Phaser.GameObjects.Text;

  constructor() {
    super('PlaySelectScene');
  }

  preload() {
    MENU_OPTIONS.forEach((option) => {
      const key = `menu-${option.id}`;

      if (option.image && !this.textures.exists(key)) {
        this.load.image(key, option.image);
      }
    });
  }

  create() {
    this.selected = 0;
    this.polygons = [];

    drawSpaceBackground(this);

    this.add.text(40, 35, '¿QUÉ QUIERES JUGAR?', {
      color: '#75c9c8',
      fontSize: '26px',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this.toast = this.add.text(SCREEN_WIDTH - 40, 35, '', {
      color: '#f29b9b',
      fontSize: '17px',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setAlpha(0);

    MENU_OPTIONS.forEach((option, index) => {
      this.createPanel(option, index);
    });

    this.createSelector();

    this.add.text(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT - 30,
      '← → ↑ ↓  MOVER      ENTER  ELEGIR',
      {
        color: '#75c9c8',
        fontSize: '19px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    const keyboard = this.input.keyboard;

    keyboard?.on('keydown-LEFT', () => this.move(-1, 0));
    keyboard?.on('keydown-A', () => this.move(-1, 0));
    keyboard?.on('keydown-RIGHT', () => this.move(1, 0));
    keyboard?.on('keydown-D', () => this.move(1, 0));
    keyboard?.on('keydown-UP', () => this.move(0, -1));
    keyboard?.on('keydown-W', () => this.move(0, -1));
    keyboard?.on('keydown-DOWN', () => this.move(0, 1));
    keyboard?.on('keydown-S', () => this.move(0, 1));
    keyboard?.on('keydown-ENTER', () => this.confirm());
    keyboard?.on('keydown-SPACE', () => this.confirm());

    this.drawSelector();
  }

  // ---------------------------------------------------------------------
  // Tarjetas
  // ---------------------------------------------------------------------

  private parallelogram(
    x: number,
    y: number,
    w: number,
    h: number
  ): Point[] {
    return [
      new Phaser.Math.Vector2(x + SKEW, y),
      new Phaser.Math.Vector2(x + w + SKEW, y),
      new Phaser.Math.Vector2(x + w, y + h),
      new Phaser.Math.Vector2(x, y + h)
    ];
  }

  private createPanel(option: MenuOption, index: number) {
    const { x, y, w, h } = PANEL_RECTS[index];
    const points = this.parallelogram(x, y, w, h);

    this.polygons.push(points);

    const g = this.add.graphics();

    // Fondo de la tarjeta.
    g.fillStyle(option.enabled ? option.color : 0x4a5568, 1);
    g.fillPoints(points, true);

    // Franja decorativa.
    g.fillStyle(0xffffff, option.enabled ? 0.1 : 0.05);
    g.fillPoints(
      this.parallelogram(x + w * 0.55, y, w * 0.18, h),
      true
    );

    // Oscurecer si está deshabilitada.
    if (!option.enabled) {
      g.fillStyle(0x000000, 0.35);
      g.fillPoints(points, true);
    }

    // Imagen o marcador.
    this.createImageSlot(
      option,
      x + w * 0.74 + SKEW / 2,
      y + h * 0.43,
      index
    );

    // Título.
    this.add.text(x + 38, y + h - 72, option.title, {
      color: '#ffffff',
      fontSize: index === 0 ? '36px' : '32px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0, 0.5);

    // Estado.
    this.add.text(
      x + 38,
      y + h - 32,
      option.enabled ? 'Estado: Habilitado' : 'Estado: Deshabilitado',
      {
        color: option.enabled ? '#b9f5b9' : '#f5b9b9',
        fontSize: '16px',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0, 0.5);

    if (!option.enabled) {
      this.add.text(x + SKEW + 22, y + 24, '🔒 PRÓXIMAMENTE', {
        color: '#ffffff',
        fontSize: '15px',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0, 0.5);
    }

    // Zona clicable con la forma inclinada de la tarjeta.
    const hitArea = new Phaser.Geom.Polygon([
      SKEW, 0,
      w + SKEW, 0,
      w, h,
      0, h
    ]);

    const zone = this.add.zone(
      x + (w + SKEW) / 2,
      y + h / 2,
      w + SKEW,
      h
    );

    zone.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
    zone.input!.cursor = 'pointer';

    zone.on('pointerover', () => {
      this.selected = index;
      this.drawSelector();
    });

    zone.on('pointerdown', () => {
      this.selected = index;
      this.drawSelector();
      this.confirm();
    });
  }

  private createImageSlot(
    option: MenuOption,
    cx: number,
    cy: number,
    index: number
  ) {
    const size = Math.min(PANEL_RECTS[index].h * 0.62, 155);
    const key = `menu-${option.id}`;

    if (option.image && this.textures.exists(key)) {
      const image = this.add.image(cx, cy, key);

      fitImage(image, size, size);

      if (!option.enabled) {
        image.setTint(0x888888);
      }

      return;
    }

    // Marcador: recuadro semitransparente con icono.
    this.add
      .rectangle(cx, cy, size, size, 0xffffff, 0.14)
      .setStrokeStyle(2, 0xffffff, 0.5);

    this.add.text(cx, cy - 10, option.icon, {
      fontSize: '52px'
    }).setOrigin(0.5);

    this.add.text(cx, cy + size / 2 - 18, 'IMAGEN', {
      color: '#ffffff',
      fontSize: '14px',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.7);
  }

  // ---------------------------------------------------------------------
  // Selección
  // ---------------------------------------------------------------------

  private createSelector() {
    this.selector = this.add.graphics().setDepth(5);

    this.tweens.add({
      targets: this.selector,
      alpha: 0.55,
      duration: 480,
      yoyo: true,
      repeat: -1
    });
  }

  private drawSelector() {
    const points = this.polygons[this.selected];

    if (!this.selector || !points) return;

    this.selector.clear();

    this.selector.lineStyle(9, 0xffffff, 1);
    this.selector.strokePoints(points, true);

    this.selector.lineStyle(4, 0xf2c718, 1);
    this.selector.strokePoints(points, true);
  }

  private move(dx: number, dy: number) {
    let column = this.selected % 2;
    let row = Math.floor(this.selected / 2);

    if (dx !== 0) {
      column = column === 0 ? 1 : 0;
    }

    if (dy !== 0) {
      row = row === 0 ? 1 : 0;
    }

    this.selected = row * 2 + column;

    this.drawSelector();
  }

  private confirm() {
    const option = MENU_OPTIONS[this.selected];

    if (!option.enabled || !option.nextScene) {
      this.showToast(`${option.title} aún no está disponible`);
      this.cameras.main.shake(120, 0.004);
      return;
    }

    this.scene.start(option.nextScene);
  }

  private showToast(message: string) {
    if (!this.toast) return;

    this.tweens.killTweensOf(this.toast);

    this.toast.setText(message).setAlpha(1);

    this.tweens.add({
      targets: this.toast,
      alpha: 0,
      delay: 1200,
      duration: 400
    });
  }
}
