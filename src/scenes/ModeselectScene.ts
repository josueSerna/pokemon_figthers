import Phaser from 'phaser';
import {
  SCREEN_WIDTH,
  drawHeader,
  drawSpaceBackground,
  drawToken
} from '../ui/Menuui';

type PlayerCount = 1 | 2;

interface ModeCard {
  count: PlayerCount;
  box: Phaser.GameObjects.Rectangle;
}

export class ModeSelectScene extends Phaser.Scene {
  private selected: PlayerCount = 1;
  private cards: ModeCard[] = [];

  constructor() {
    super('ModeSelectScene');
  }

  create() {
    this.cards = [];
    this.selected = 1;

    drawSpaceBackground(this);
    drawHeader(this, 'COMBATE 1 VS 1');

    this.createCard(1, 300, '1 JUGADOR', 'Un solo luchador', 'WASD  /  FLECHAS');
    this.createCard(2, 660, '2 JUGADORES', 'Dos luchadores, mismo teclado', 'P1: WASD   ·   P2: FLECHAS');

    this.add.text(
      SCREEN_WIDTH / 2,
      495,
      '← →  ELEGIR      ENTER  CONFIRMAR',
      {
        color: '#75c9c8',
        fontSize: '16px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    const keyboard = this.input.keyboard;

    keyboard?.on('keydown-LEFT', () => this.select(1));
    keyboard?.on('keydown-A', () => this.select(1));
    keyboard?.on('keydown-RIGHT', () => this.select(2));
    keyboard?.on('keydown-D', () => this.select(2));
    keyboard?.on('keydown-ONE', () => this.select(1));
    keyboard?.on('keydown-TWO', () => this.select(2));
    keyboard?.on('keydown-ENTER', () => this.confirm());
    keyboard?.on('keydown-SPACE', () => this.confirm());
    keyboard?.on('keydown-ESC', () => {
      this.scene.start('PlaySelectScene');
    });

    this.refresh();
  }

  private createCard(
    count: PlayerCount,
    x: number,
    title: string,
    subtitle: string,
    controls: string
  ) {
    const y = 285;

    const box = this.add.rectangle(x, y, 320, 330, 0x18263b);
    box.setStrokeStyle(3, 0x526581);
    box.setInteractive({ useHandCursor: true });

    // Fichas de jugador.
    if (count === 1) {
      drawToken(this, x, y - 85, 42, 0);
    } else {
      drawToken(this, x - 48, y - 85, 38, 0);
      drawToken(this, x + 48, y - 85, 38, 1);
    }

    this.add.text(x, y + 10, title, {
      color: '#ffffff',
      fontSize: '28px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(x, y + 50, subtitle, {
      color: '#b9c6d8',
      fontSize: '14px',
      align: 'center',
      wordWrap: { width: 280 }
    }).setOrigin(0.5);

    this.add.text(x, y + 120, controls, {
      color: '#75c9c8',
      fontSize: '13px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    box.on('pointerover', () => this.select(count));
    box.on('pointerdown', () => {
      this.select(count);
      this.confirm();
    });

    this.cards.push({ count, box });
  }

  private select(count: PlayerCount) {
    this.selected = count;
    this.refresh();
  }

  private refresh() {
    this.cards.forEach(({ count, box }) => {
      const active = count === this.selected;

      box
        .setFillStyle(active ? 0x285b70 : 0x18263b)
        .setStrokeStyle(active ? 5 : 3, active ? 0xf2c718 : 0x526581)
        .setScale(active ? 1.04 : 1);
    });
  }

  private confirm() {
    this.scene.start('CharacterSelectScene', {
      players: this.selected
    });
  }
}