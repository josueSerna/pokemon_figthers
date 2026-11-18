
import Phaser from 'phaser';

import {
  getCharacterById,
  getCharacters
} from '../characters/registry';

import type { CharacterDefinition } from '../characters/types';

interface PlayerSetup {
  playerIndex: number;
  characterId: string;
  input?: 'keyboard' | 'gamepad';
  gamepadIndex?: number;
}

interface VersusSceneData {
  mode?: 1 | 2;
  characterId?: string;
  players?: PlayerSetup[];
  stageId?: string;
}

export class VersusScene extends Phaser.Scene {
  private matchData: VersusSceneData = {};

  private mode: 1 | 2 = 1;

  private playerOne!: CharacterDefinition;
  private playerTwo!: CharacterDefinition;

  private readonly width = 1280;
  private readonly height = 720;

  constructor() {
    super({ key: 'VersusScene' });
  }

  init(data: VersusSceneData): void {
    this.matchData = data;
    this.mode = data.mode === 2 ? 2 : 1;

    const characters = getCharacters();

    const available = characters.filter(
      character => character.availability === 'available'
    );

    const pool = available.length > 0
      ? available
      : characters;

    const fallback = pool[0]!;

    const playerOneId =
      data.players?.[0]?.characterId ??
      data.characterId;

    this.playerOne =
      getCharacterById(playerOneId ?? '') ??
      fallback;

    if (this.mode === 2) {
      this.playerTwo =
        getCharacterById(data.players?.[1]?.characterId ?? '') ??
        this.pickOpponent(pool);
    } else {
      this.playerTwo = this.pickOpponent(pool);
    }
  }

  preload(): void {
    this.loadCharacterPortrait(this.playerOne);
    this.loadCharacterPortrait(this.playerTwo);
  }

  create(): void {
    this.createBackground();
    this.createCharacters();
    this.createVersusText();

    this.cameras.main.fadeIn(300);

    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(350);

      this.cameras.main.once(
        'camerafadeoutcomplete',
        () => {
          this.scene.start('GameScene', {
            ...this.matchData,
            stageId: this.matchData.stageId,
            opponentCharacterId: this.playerTwo.id
          });
        }
      );
    });
  }

  private pickOpponent(
    characters: readonly CharacterDefinition[]
  ): CharacterDefinition {
    const opponents = characters.filter(
      character => character.id !== this.playerOne.id
    );

    const pool = opponents.length > 0
      ? opponents
      : characters;

    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  private loadCharacterPortrait(
    character: CharacterDefinition
  ): void {
    const portrait =
      character.assets.portrait ??
      character.assets.icon;

    if (!portrait) return;

    const key = this.getPortraitKey(character);

    if (!this.textures.exists(key)) {
      this.load.image(key, portrait);
    }
  }

  private getPortraitKey(
    character: CharacterDefinition
  ): string {
    return `versus-portrait-${character.id}`;
  }

  private createBackground(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x10121d, 1);
    graphics.fillRect(0, 0, this.width, this.height);

    // Zona del jugador 1.
    graphics.fillStyle(0x087eaa, 1);

    graphics.fillTriangle(
      0, 0,
      650, 0,
      470, 720
    );

    graphics.fillTriangle(
      0, 0,
      470, 720,
      0, 720
    );

    // Zona del jugador 2.
    graphics.fillStyle(0x9c2444, 1);

    graphics.fillTriangle(
      650, 0,
      1280, 0,
      470, 720
    );

    graphics.fillTriangle(
      1280, 0,
      1280, 720,
      470, 720
    );

    // Franja central.
    graphics.fillStyle(0x10121d, 0.9);

    graphics.fillTriangle(
      600, 0,
      680, 0,
      500, 720
    );

    graphics.fillTriangle(
      600, 0,
      500, 720,
      420, 720
    );

    // Líneas decorativas.
    this.add.rectangle(
      this.width / 2,
      90,
      this.width,
      5,
      0xffffff,
      0.15
    );

    this.add.rectangle(
      this.width / 2,
      630,
      this.width,
      5,
      0xffffff,
      0.15
    );
  }

  private createCharacters(): void {
    this.createCharacter(
      this.playerOne,
      310,
      350,
      'PLAYER 1'
    );

    this.createCharacter(
      this.playerTwo,
      970,
      350,
      'PLAYER 2'
    );
  }

  private createCharacter(
    character: CharacterDefinition,
    x: number,
    y: number,
    playerLabel: string
  ): void {
    const portraitKey = this.getPortraitKey(character);

    this.add.text(x, 105, playerLabel, {
      fontFamily: 'Arial',
      fontSize: '25px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    if (this.textures.exists(portraitKey)) {
      const portrait = this.add.image(
        x,
        y,
        portraitKey
      );

      const maxWidth = 440;
      const maxHeight = 430;

      const scale = Math.min(
        maxWidth / portrait.width,
        maxHeight / portrait.height
      );

      portrait.setScale(scale);
    } else {
      this.add.circle(
        x,
        y,
        150,
        0xffffff,
        0.12
      );

      this.add.text(x, y, '?', {
        fontFamily: 'Arial',
        fontSize: '100px',
        color: '#ffffff'
      }).setOrigin(0.5);
    }

    this.add.text(
      x,
      600,
      character.name.toUpperCase(),
      {
        fontFamily: 'Arial',
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#111111',
        strokeThickness: 5
      }
    ).setOrigin(0.5);
  }

  private createVersusText(): void {
    this.add.text(
      this.width / 2,
      this.height / 2,
      'VS',
      {
        fontFamily: 'Arial',
        fontSize: '100px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#111111',
        strokeThickness: 10
      }
    ).setOrigin(0.5);
  }
}
