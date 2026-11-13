
import Phaser from 'phaser';
import { getStages } from '../stages/registry';
import type { StageDefinition } from '../stages/types';
import {
  drawHeader,
  drawSpaceBackground,
  fitImage
} from '../ui/Menuui';

type Action = 'left' | 'right' | 'up' | 'down' | 'confirm' | 'cancel';

interface StageItem {
  stage?: StageDefinition;
  name: string;
  available: boolean;
}

interface CardView {
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Rectangle;
}

export class StageSelectScene extends Phaser.Scene {
  private readonly stages = getStages();
  private items: StageItem[] = [];
  private cards: CardView[] = [];

  private matchData: Record<string, unknown> = {};
  private mode: 1 | 2 = 1;

  private selected = 0;
  private scrollRow = 0;

  private previewImage?: Phaser.GameObjects.Image;
  private previewPlaceholder?: Phaser.GameObjects.Text;
  private nameText?: Phaser.GameObjects.Text;
  private descriptionText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private scrollUp?: Phaser.GameObjects.Text;
  private scrollDown?: Phaser.GameObjects.Text;

  private padPrevious: Record<Action, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    confirm: false,
    cancel: false
  };

  // Layout para 1280 x 720.
  private readonly columns = 3;
  private readonly visibleRows = 3;
  private readonly cardWidth = 190;
  private readonly cardHeight = 150;
  private readonly gap = 16;
  private readonly gridLeft = 55;
  private readonly gridTop = 145;

  private readonly previewCenterX = 990;

  constructor() {
    super('StageSelectScene');
  }

  init(data: Record<string, unknown> = {}) {
    this.matchData = data;
    this.mode = data.mode === 2 ? 2 : 1;
    this.selected = 0;
    this.scrollRow = 0;
    this.cards = [];

    (Object.keys(this.padPrevious) as Action[]).forEach((action) => {
      this.padPrevious[action] = false;
    });

    this.items = [
      ...this.stages.map((stage) => ({
        stage,
        name: stage.name.toUpperCase(),
        available: stage.availability === 'available'
      })),
      { name: 'ALEATORIO', available: true }
    ];
  }

  preload() {
    this.stages.forEach((stage) => {
      const key = this.previewKey(stage);

      if (stage.assets.preview && !this.textures.exists(key)) {
        this.load.image(key, stage.assets.preview);
      }
    });
  }

  create() {
    drawSpaceBackground(this);
    drawHeader(this, 'ELIGE EL ESCENARIO');

    // Paneles.
    this.add.rectangle(375, 390, 650, 500, 0x18263b)
      .setStrokeStyle(2, 0x526581);

    this.add.rectangle(990, 390, 530, 500, 0x18263b)
      .setStrokeStyle(2, 0x526581);

    this.items.forEach((item, index) => this.createCard(item, index));

    this.scrollUp = this.add.text(375, 128, '▲', {
      color: '#75c9c8',
      fontSize: '18px'
    }).setOrigin(0.5);

    this.scrollDown = this.add.text(375, 655, '▼', {
      color: '#75c9c8',
      fontSize: '18px'
    }).setOrigin(0.5);

    this.createPreviewPanel();

    this.add.text(
      640,
      695,
      '← → ↑ ↓  MOVER     ENTER / F / A  CONFIRMAR     ESC / G / B  VOLVER',
      {
        color: '#75c9c8',
        fontSize: '16px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.bindKeyboard();

    this.layoutCards();
    this.refresh();
  }

  // ---------------------------------------------------------------------
  // Tarjetas
  // ---------------------------------------------------------------------

  private previewKey(stage: StageDefinition) {
    return `stage-preview-${stage.id}`;
  }

  private createCard(item: StageItem, index: number) {
    const w = this.cardWidth;
    const h = this.cardHeight;
    const barHeight = 28;

    const container = this.add.container(0, 0);

    const background = this.add.rectangle(0, 0, w, h, 0x243450)
      .setStrokeStyle(1, 0x000000);

    container.add(background);

    // Imagen o marcador.
    const key = item.stage ? this.previewKey(item.stage) : '';
    const areaCenterY = -barHeight / 2;

    if (key && this.textures.exists(key)) {
      const image = this.add.image(0, areaCenterY, key);
      fitImage(image, w - 8, h - barHeight - 6);
      container.add(image);
    } else {
      container.add(
        this.add.text(0, areaCenterY, item.stage ? '🖼️' : '🎲', {
          fontSize: '46px'
        }).setOrigin(0.5)
      );
    }

    // Barra del nombre.
    const barY = h / 2 - barHeight / 2;

    container.add(
      this.add.rectangle(0, barY, w, barHeight, 0x05080f)
    );

    const label = this.add.text(0, barY, item.name, {
      color: '#ffffff',
      fontSize: '15px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (label.width > w - 8) {
      label.setScale((w - 8) / label.width);
    }

    container.add(label);

    // Bloqueado.
    if (!item.available) {
      container.add(this.add.rectangle(0, 0, w, h, 0x000000, 0.55));
      container.add(
        this.add.text(0, areaCenterY, '🔒', { fontSize: '38px' }).setOrigin(0.5)
      );
    }

    // Marco de selección.
    const frame = this.add.rectangle(0, 0, w, h);
    frame.setStrokeStyle(5, 0xf2c718).setVisible(false);
    container.add(frame);

    // Ratón.
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      this.selected = index;
      this.refresh();
    });

    container.on('pointerdown', () => {
      this.selected = index;
      this.refresh();
      this.confirm();
    });

    this.cards.push({ container, frame });
  }

  private layoutCards() {
    this.cards.forEach(({ container }, index) => {
      const row = Math.floor(index / this.columns);
      const col = index % this.columns;
      const visibleRow = row - this.scrollRow;
      const visible = visibleRow >= 0 && visibleRow < this.visibleRows;

      container
        .setPosition(
          this.gridLeft + this.cardWidth / 2 + col * (this.cardWidth + this.gap),
          this.gridTop + this.cardHeight / 2 +
            visibleRow * (this.cardHeight + this.gap)
        )
        .setVisible(visible);

      if (container.input) {
        container.input.enabled = visible;
      }
    });

    const totalRows = Math.ceil(this.items.length / this.columns);

    this.scrollUp?.setVisible(this.scrollRow > 0);
    this.scrollDown?.setVisible(this.scrollRow + this.visibleRows < totalRows);
  }

  // ---------------------------------------------------------------------
  // Panel derecho
  // ---------------------------------------------------------------------

  private createPreviewPanel() {
    const x = this.previewCenterX;

    this.add.rectangle(x, 300, 460, 270, 0x0b1220)
      .setStrokeStyle(2, 0x000000);

    this.previewPlaceholder = this.add.text(x, 300, '🖼️', {
      fontSize: '80px'
    }).setOrigin(0.5);

    this.nameText = this.add.text(x, 465, '', {
      color: '#ffffff',
      fontSize: '32px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.statusText = this.add.text(x, 510, '', {
      color: '#8be28b',
      fontSize: '17px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.descriptionText = this.add.text(x, 545, '', {
      color: '#b9c6d8',
      fontSize: '17px',
      align: 'center',
      lineSpacing: 7,
      wordWrap: { width: 450 }
    }).setOrigin(0.5, 0);
  }

  private refresh() {
    const item = this.items[this.selected];

    if (!item) return;

    this.cards.forEach(({ frame }, index) => {
      frame.setVisible(index === this.selected);
    });

    const row = Math.floor(this.selected / this.columns);

    if (row < this.scrollRow) {
      this.scrollRow = row;
    } else if (row > this.scrollRow + this.visibleRows - 1) {
      this.scrollRow = row - this.visibleRows + 1;
    }

    this.layoutCards();

    this.nameText?.setText(item.name);

    this.descriptionText?.setText(
      item.stage ? item.stage.description : 'Elige un escenario al azar.'
    );

    this.statusText
      ?.setText(item.available ? 'DISPONIBLE' : 'BLOQUEADO')
      .setColor(item.available ? '#8be28b' : '#f29b9b');

    const key = item.stage ? this.previewKey(item.stage) : '';

    if (key && this.textures.exists(key)) {
      this.previewPlaceholder?.setVisible(false);

      if (this.previewImage) {
        this.previewImage.setTexture(key).setVisible(true);
      } else {
        this.previewImage = this.add.image(this.previewCenterX, 300, key);
      }

      fitImage(this.previewImage, 452, 262);
    } else {
      this.previewImage?.setVisible(false);
      this.previewPlaceholder
        ?.setText(item.stage ? '🖼️' : '🎲')
        .setVisible(true);
    }
  }

  // ---------------------------------------------------------------------
  // Controles
  // ---------------------------------------------------------------------

  private bindKeyboard() {
    const map: Record<string, Action> = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      Enter: 'confirm',
      NumpadEnter: 'confirm',
      KeyF: 'confirm',
      Space: 'confirm',
      Escape: 'cancel',
      Backspace: 'cancel',
      KeyG: 'cancel'
    };

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = map[event.code];

      if (action) this.dispatch(action);
    });
  }

  update() {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = Array.from(pads).find((p) => p && p.connected);

    if (!pad) return;

    const pressed = (button: number) => pad.buttons[button]?.pressed ?? false;
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;

    const state: Record<Action, boolean> = {
      left: pressed(14) || x < -0.5,
      right: pressed(15) || x > 0.5,
      up: pressed(12) || y < -0.5,
      down: pressed(13) || y > 0.5,
      confirm: pressed(0),
      cancel: pressed(1)
    };

    (Object.keys(state) as Action[]).forEach((action) => {
      if (state[action] && !this.padPrevious[action]) {
        this.dispatch(action);
      }

      this.padPrevious[action] = state[action];
    });
  }

  private dispatch(action: Action) {
    switch (action) {
      case 'left':
        return this.move(-1, 0);
      case 'right':
        return this.move(1, 0);
      case 'up':
        return this.move(0, -1);
      case 'down':
        return this.move(0, 1);
      case 'confirm':
        return this.confirm();
      case 'cancel':
        return this.goBack();
    }
  }

  private move(dx: number, dy: number) {
    const count = this.items.length;
    let next = this.selected;

    if (dx !== 0) {
      next = (this.selected + dx + count) % count;
    }

    if (dy < 0 && this.selected - this.columns >= 0) {
      next = this.selected - this.columns;
    }

    if (dy > 0) {
      if (this.selected + this.columns < count) {
        next = this.selected + this.columns;
      } else if (
        Math.floor(this.selected / this.columns) <
        Math.floor((count - 1) / this.columns)
      ) {
        next = count - 1;
      }
    }

    this.selected = next;
    this.refresh();
  }

  private confirm() {
    const item = this.items[this.selected];

    if (!item || !item.available) {
      this.cameras.main.shake(120, 0.004);
      return;
    }

    let stage = item.stage;

    if (!stage) {
      const available = this.stages.filter(
        (candidate) => candidate.availability === 'available'
      );

      stage = Phaser.Utils.Array.GetRandom(available) as
        | StageDefinition
        | undefined;
    }

    if (!stage) return;

    this.scene.start('GameScene', {
      ...this.matchData,
      stageId: stage.id
    });
  }

  private goBack() {
    this.scene.start('CharacterSelectScene', { players: this.mode });
  }
}
