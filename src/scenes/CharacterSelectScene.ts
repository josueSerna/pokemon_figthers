import Phaser from 'phaser';
import { getCharacters } from '../characters/registry';
import type { CharacterDefinition } from '../characters/types';
import {
  PLAYER_COLORS,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  drawHeader,
  drawSpaceBackground,
  drawToken,
  fitImage
} from '../ui/Menuui';

type PlayerCount = 1 | 2;
type Action = 'left' | 'right' | 'up' | 'down' | 'confirm' | 'cancel';

interface PanelUi {
  x: number;
  width: number;
  name: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  details: Phaser.GameObjects.Text;
  placeholder: Phaser.GameObjects.Text;
  portrait?: Phaser.GameObjects.Image;
}

interface PlayerSlot {
  index: number;
  cursorIndex: number;
  locked: boolean;
  cursor: Phaser.GameObjects.Rectangle;
  badge: Phaser.GameObjects.Rectangle;
  badgeText: Phaser.GameObjects.Text;
  panel: PanelUi;
}

export class CharacterSelectScene extends Phaser.Scene {
  private readonly characters = getCharacters();

  private playerCount: PlayerCount = 1;
  private slots: PlayerSlot[] = [];
  private cellCenters: { x: number; y: number }[] = [];
  private hint?: Phaser.GameObjects.Text;

  // Control (gamepad) del jugador 2.
  private gamepadIndex?: number;
  private padPrevious: Record<Action, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    confirm: false,
    cancel: false
  };

  // Layout de la cuadrícula.
  private readonly maxColumns = 10;
  private readonly cellWidth = 88;
  private columns = 1;
  private rows = 1;
  private cellHeight = 80;
  private gridTop = 80;

  private readonly panelTop = 402;
  private readonly panelHeight = 128;

  constructor() {
    super('CharacterSelectScene');
  }

  init(data?: { players?: PlayerCount }) {
    this.playerCount = data?.players === 2 ? 2 : 1;
  }

  preload() {
    this.characters.forEach((character) => {
      const key = `icon-${character.id}`;

      if (character.assets.icon && !this.textures.exists(key)) {
        this.load.image(key, character.assets.icon);
      }
    });
  }

  create() {
    this.slots = [];
    this.cellCenters = [];
    this.gamepadIndex = undefined;

    (Object.keys(this.padPrevious) as Action[]).forEach((action) => {
      this.padPrevious[action] = false;
    });

    drawSpaceBackground(this);
    drawHeader(
      this,
      this.playerCount === 1 ? '1 JUGADOR' : '2 JUGADORES'
    );

    this.computeLayout();
    this.createGrid();
    this.createSlots();
    this.createHint();
    this.bindInput();

    this.slots.forEach((slot) => this.refreshSlot(slot));
    this.updateHint();
  }

  // ---------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------

  private computeLayout() {
    const total = this.characters.length;

    this.columns = Math.max(1, Math.min(this.maxColumns, total));
    this.rows = Math.max(1, Math.ceil(total / this.columns));
    this.cellHeight = Math.min(84, Math.floor(300 / this.rows));

    // Centramos la cuadrícula en el espacio entre el header y los paneles.
    const available = this.panelTop - 12 - 78;
    this.gridTop = 78 + (available - this.rows * this.cellHeight) / 2;
  }

  private rowLength(row: number) {
    return Math.min(
      this.columns,
      this.characters.length - row * this.columns
    );
  }

  private createGrid() {
    const gridWidth = this.columns * this.cellWidth;
    const startX = (SCREEN_WIDTH - gridWidth) / 2;

    // Marco negro detrás de toda la cuadrícula.
    this.add.rectangle(
      SCREEN_WIDTH / 2,
      this.gridTop + (this.rows * this.cellHeight) / 2,
      gridWidth + 8,
      this.rows * this.cellHeight + 8,
      0x000000
    ).setStrokeStyle(2, 0x526581);

    this.characters.forEach((character, index) => {
      const row = Math.floor(index / this.columns);
      const col = index % this.columns;

      // La última fila queda centrada, como en Smash.
      const rowOffset =
        ((this.columns - this.rowLength(row)) * this.cellWidth) / 2;

      const x = startX + rowOffset + col * this.cellWidth + this.cellWidth / 2;
      const y = this.gridTop + row * this.cellHeight + this.cellHeight / 2;

      this.cellCenters.push({ x, y });
      this.createCell(character, index, x, y);
    });
  }

  private createCell(
    character: CharacterDefinition,
    index: number,
    x: number,
    y: number
  ) {
    const w = this.cellWidth - 2;
    const h = this.cellHeight - 2;
    const nameBar = 16;

    const background = this.add.rectangle(x, y, w, h, 0x3b78c4);
    background.setStrokeStyle(1, 0x000000);
    background.setInteractive({ useHandCursor: true });

    // Retrato.
    const iconKey = `icon-${character.id}`;
    const iconAreaCenterY = y + nameBar / 2;

    if (this.textures.exists(iconKey)) {
      const icon = this.add.image(x, iconAreaCenterY, iconKey);
      fitImage(icon, w - 8, h - nameBar - 4);
    } else {
      this.add.text(x, iconAreaCenterY, '?', {
        color: '#ffffff',
        fontSize: '36px',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // Barra del nombre (arriba).
    this.add.rectangle(x, y - h / 2 + nameBar / 2, w, nameBar, 0x05080f);

    const name = this.add.text(
      x,
      y - h / 2 + nameBar / 2,
      character.name.toUpperCase(),
      {
        color: '#ffffff',
        fontSize: '11px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    if (name.width > w - 6) {
      name.setScale((w - 6) / name.width);
    }

    // Personaje bloqueado.
    if (character.availability !== 'available') {
      this.add.rectangle(x, y, w, h, 0x000000, 0.55);

      this.add.text(x, iconAreaCenterY, '🔒', {
        fontSize: '22px'
      }).setOrigin(0.5);
    }

    // Ratón: pasar por encima mueve el cursor de P1, clic confirma.
    background.on('pointerover', () => {
      const slot = this.slots[0];

      if (slot && !slot.locked) {
        slot.cursorIndex = index;
        this.updateCursor(slot);
        this.refreshSlot(slot);
      }
    });

    background.on('pointerdown', () => {
      const slot = this.slots[0];

      if (slot) {
        slot.cursorIndex = index;
        this.confirm(slot);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Jugadores (cursores + paneles)
  // ---------------------------------------------------------------------

  private createSlots() {
    const panelWidth = this.playerCount === 1 ? 940 : 465;

    for (let i = 0; i < this.playerCount; i++) {
      const panelX = this.playerCount === 1 ? 10 : 10 + i * 475;
      const player = PLAYER_COLORS[i];

      // Cursor sobre la cuadrícula.
      const cursor = this.add.rectangle(0, 0, this.cellWidth, this.cellHeight);
      cursor.setStrokeStyle(4, player.color);
      cursor.setFillStyle(player.color, 0.18);
      cursor.setDepth(10);

      this.tweens.add({
        targets: cursor,
        alpha: 0.65,
        duration: 450,
        yoyo: true,
        repeat: -1
      });

      const badge = this.add.rectangle(0, 0, 28, 15, player.color);
      badge.setStrokeStyle(1, 0xffffff).setDepth(11);

      const badgeText = this.add.text(0, 0, player.label, {
        color: '#ffffff',
        fontSize: '11px',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(12);

      const panel = this.createPanel(i, panelX, panelWidth);

      const slot: PlayerSlot = {
        index: i,
        cursorIndex: Math.min(i, this.characters.length - 1),
        locked: false,
        cursor,
        badge,
        badgeText,
        panel
      };

      this.slots.push(slot);
      this.updateCursor(slot);
    }
  }

  private createPanel(
    playerIndex: number,
    x: number,
    width: number
  ): PanelUi {
    const top = this.panelTop;
    const height = this.panelHeight;
    const player = PLAYER_COLORS[playerIndex];

    this.add.rectangle(
      x + width / 2,
      top + height / 2,
      width,
      height,
      player.color,
      0.28
    ).setStrokeStyle(3, player.color);

    // Franjas diagonales decorativas (estilo Smash).
    const stripes = this.add.graphics();
    stripes.fillStyle(player.color, 0.25);
    for (let s = 0; s < 3; s++) {
      const sx = x + 6 + s * 26;
      stripes.fillPoints(
        [
          { x: sx + 14, y: top + 3 },
          { x: sx + 26, y: top + 3 },
          { x: sx + 4, y: top + height - 3 },
          { x: sx - 8, y: top + height - 3 }
        ],
        true
      );
    }

    // Etiqueta del jugador.
    drawToken(this, x + 22, top + 16, 11, playerIndex);

    this.add.text(x + 40, top + 16, `JUGADOR ${playerIndex + 1}`, {
      color: '#ffffff',
      fontSize: '13px',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Caja del retrato.
    const portraitCenterX = x + 76;
    const portraitCenterY = top + 76;

    this.add.rectangle(
      portraitCenterX,
      portraitCenterY,
      104,
      94,
      0x3b78c4
    ).setStrokeStyle(2, 0x000000);

    const placeholder = this.add.text(
      portraitCenterX,
      portraitCenterY,
      '?',
      {
        color: '#ffffff',
        fontSize: '56px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    const textX = x + 146;

    const name = this.add.text(textX, top + 36, '', {
      color: '#ffffff',
      fontSize: '20px',
      fontStyle: 'bold'
    });

    const status = this.add.text(x + width - 14, top + 16, '', {
      color: '#ffffff',
      fontSize: '13px',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    const details = this.add.text(textX, top + 64, '', {
      color: '#ffffff',
      fontSize: '12px',
      lineSpacing: 5,
      wordWrap: { width: width - 160 }
    });

    return { x, width, name, status, details, placeholder };
  }

  private updateCursor(slot: PlayerSlot) {
    const center = this.cellCenters[slot.cursorIndex];

    if (!center) return;

    // P2 va un poco más pequeño para verse aunque coincida con P1.
    const inset = slot.index * 6;

    slot.cursor
      .setPosition(center.x, center.y)
      .setSize(this.cellWidth - inset, this.cellHeight - inset);

    // setSize no actualiza el área de dibujo en todas las versiones.
    slot.cursor.setDisplaySize(
      this.cellWidth - 2 - inset,
      this.cellHeight - 2 - inset
    );

    const badgeX =
      slot.index === 0
        ? center.x - this.cellWidth / 2 + 18
        : center.x + this.cellWidth / 2 - 18;

    const badgeY = center.y + this.cellHeight / 2 - 10;

    slot.badge.setPosition(badgeX, badgeY);
    slot.badgeText.setPosition(badgeX, badgeY);
  }

  private refreshSlot(slot: PlayerSlot) {
    const character = this.characters[slot.cursorIndex];

    if (!character) return;

    const { panel } = slot;
    const available = character.availability === 'available';

    panel.name.setText(character.name.toUpperCase());

    panel.details.setText(this.getCharacterDetails(character));

    if (slot.locked) {
      panel.status.setText('✔ LISTO').setColor('#8be28b');
    } else if (available) {
      panel.status.setText('ELIGIENDO...').setColor('#ffffff');
    } else {
      panel.status.setText('BLOQUEADO').setColor('#f29b9b');
    }

    slot.cursor.setFillStyle(
      PLAYER_COLORS[slot.index].color,
      slot.locked ? 0.5 : 0.18
    );

    slot.badgeText.setText(
      slot.locked ? `${PLAYER_COLORS[slot.index].label}✔` : PLAYER_COLORS[slot.index].label
    );

    // Retrato.
    const iconKey = `icon-${character.id}`;
    const portraitCenterX = panel.x + 76;
    const portraitCenterY = this.panelTop + 76;

    if (this.textures.exists(iconKey)) {
      panel.placeholder.setVisible(false);

      if (panel.portrait) {
        panel.portrait.setTexture(iconKey).setVisible(true);
      } else {
        panel.portrait = this.add.image(
          portraitCenterX,
          portraitCenterY,
          iconKey
        );
      }

      fitImage(panel.portrait, 96, 86);
    } else {
      panel.portrait?.setVisible(false);
      panel.placeholder.setVisible(true);
    }
  }

  private getCharacterDetails(character: CharacterDefinition) {
    const { maxHealth, movementSpeed, jumpForce, defense } =
      character.stats;

    return [
      character.description,
      `VIDA ${maxHealth}   VEL ${movementSpeed}   SALTO ${jumpForce}   DEF ${defense}`
    ].join('\n');
  }

  // ---------------------------------------------------------------------
  // Controles
  // ---------------------------------------------------------------------

  private createHint() {
    this.hint = this.add.text(SCREEN_WIDTH - 24, 32, '', {
      color: '#75c9c8',
      fontSize: '11px',
      fontStyle: 'bold',
      align: 'right',
      lineSpacing: 3,
      wordWrap: { width: 350 }
    }).setOrigin(1, 0.5);
  }

  private updateHint() {
    if (!this.hint) return;

    if (this.slots.every((slot) => slot.locked)) {
      this.hint
        .setText('¡LISTO!  Pulsa CONFIRMAR otra vez para comenzar\nCANCELAR para cambiar de personaje')
        .setColor('#f2c718');
      return;
    }

    this.hint.setColor('#75c9c8');

    if (this.playerCount === 1) {
      this.hint.setText(
        'WASD / FLECHAS  MOVER\nENTER / F  CONFIRMAR    BACKSPACE / G  CANCELAR'
      );
    } else {
      const hasPad = this.gamepadIndex !== undefined;

      this.hint.setText(
        'P1: WASD + F (confirmar) + G (cancelar)\n' +
          (hasPad
            ? 'P2: CONTROL  D-PAD / STICK + A (confirmar) + B (cancelar)'
            : 'P2: conecta un control y pulsa un botón')
      );

      this.hint.setColor(hasPad ? '#75c9c8' : '#f2b66b');
    }
  }

  private bindInput() {
    const bindings: Record<string, { slot: number; action: Action }> = {};

    const bind = (
      slot: number,
      codes: Partial<Record<Action, string[]>>
    ) => {
      (Object.keys(codes) as Action[]).forEach((action) => {
        codes[action]?.forEach((code) => {
          bindings[code] = { slot, action };
        });
      });
    };

    if (this.playerCount === 1) {
      // Un jugador: acepta WASD y flechas.
      bind(0, {
        left: ['KeyA', 'ArrowLeft'],
        right: ['KeyD', 'ArrowRight'],
        up: ['KeyW', 'ArrowUp'],
        down: ['KeyS', 'ArrowDown'],
        confirm: ['KeyF', 'Enter', 'NumpadEnter'],
        cancel: ['KeyG', 'Backspace']
      });
    } else {
      bind(0, {
        left: ['KeyA'],
        right: ['KeyD'],
        up: ['KeyW'],
        down: ['KeyS'],
        confirm: ['KeyF'],
        cancel: ['KeyG']
      });

      // El jugador 2 se controla con el gamepad (ver pollGamepad).
    }

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        this.scene.start('ModeSelectScene');
        return;
      }

      const binding = bindings[event.code];
      const slot = binding ? this.slots[binding.slot] : undefined;

      if (!binding || !slot) return;

      this.dispatch(slot, binding.action);
    });
  }

  private dispatch(slot: PlayerSlot, action: Action) {
    switch (action) {
      case 'left':
        return this.moveCursor(slot, -1, 0);
      case 'right':
        return this.moveCursor(slot, 1, 0);
      case 'up':
        return this.moveCursor(slot, 0, -1);
      case 'down':
        return this.moveCursor(slot, 0, 1);
      case 'confirm':
        return this.confirm(slot);
      case 'cancel':
        return this.cancel(slot);
    }
  }

  // ---------------------------------------------------------------------
  // Gamepad del jugador 2
  // ---------------------------------------------------------------------

  update() {
    if (this.playerCount === 2) {
      this.pollGamepad();
    }
  }

  private findGamepad(): Gamepad | undefined {
    const pads = navigator.getGamepads?.() ?? [];

    for (const pad of pads) {
      if (pad && pad.connected) return pad;
    }

    return undefined;
  }

  private pollGamepad() {
    const slot = this.slots[1];

    if (!slot) return;

    const pad = this.findGamepad();

    // El navegador solo detecta el control después de pulsar un botón.
    if (pad?.index !== this.gamepadIndex) {
      this.gamepadIndex = pad?.index;
      this.updateHint();
    }

    if (!pad) return;

    const pressed = (button: number) => pad.buttons[button]?.pressed ?? false;
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;

    // Mapeo estándar: D-pad 12-15, A = 0, B = 1.
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
        this.dispatch(slot, action);
      }

      this.padPrevious[action] = state[action];
    });
  }

  private moveCursor(slot: PlayerSlot, dx: number, dy: number) {
    if (slot.locked) return;

    const row = Math.floor(slot.cursorIndex / this.columns);
    const col = slot.cursorIndex % this.columns;

    let nextRow = row;
    let nextCol = col;

    if (dx !== 0) {
      const length = this.rowLength(row);
      nextCol = (col + dx + length) % length;
    }

    if (dy !== 0) {
      nextRow = (row + dy + this.rows) % this.rows;

      // Mantener la columna visual aunque la fila esté centrada.
      const shift =
        (this.rowLength(nextRow) - this.rowLength(row)) / 2;

      nextCol = Phaser.Math.Clamp(
        Math.round(col + shift),
        0,
        this.rowLength(nextRow) - 1
      );
    }

    slot.cursorIndex = nextRow * this.columns + nextCol;

    this.updateCursor(slot);
    this.refreshSlot(slot);
  }

  private confirm(slot: PlayerSlot) {
    // Con todos listos, cualquier confirmar inicia la partida.
    if (this.slots.every((s) => s.locked)) {
      this.startGame();
      return;
    }

    if (slot.locked) return;

    const character = this.characters[slot.cursorIndex];

    if (!character || character.availability !== 'available') {
      this.cameras.main.shake(120, 0.004);
      return;
    }

    slot.locked = true;

    this.refreshSlot(slot);
    this.updateHint();
  }

  private cancel(slot: PlayerSlot) {
    if (!slot.locked) return;

    slot.locked = false;

    this.refreshSlot(slot);
    this.updateHint();
  }

  private startGame() {
    const players = this.slots.map((slot) => ({
      playerIndex: slot.index,
      characterId: this.characters[slot.cursorIndex].id,
      // P1 = teclado, P2 = control.
      input: slot.index === 1 ? ('gamepad' as const) : ('keyboard' as const),
      gamepadIndex: slot.index === 1 ? this.gamepadIndex : undefined
    }));

    this.scene.start('StageSelectScene', {
      mode: this.playerCount,
      players,
      // Compatibilidad con tu GameScene actual (solo P1).
      characterId: players[0].characterId
    });
  }
}