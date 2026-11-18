
import Phaser from 'phaser';

import {
  getCharacterById,
  getCharacters
} from '../characters/registry';

import type { CharacterDefinition } from '../characters/types';

import { CharacterController } from '../gameplay/CharacterController';
import { InputManager } from '../gameplay/input/InputManager';

interface HurtboxTestSceneData {
  characterId?: string;
}

interface MatterVertex {
  x: number;
  y: number;
}

interface MatterBodyWithVertices extends MatterJS.BodyType {
  vertices: MatterVertex[];
}

export class HurtboxTestScene extends Phaser.Scene {
  private readonly screenWidth = 1280;
  private readonly screenHeight = 720;
  private readonly groundY = 650;

  private character!: CharacterDefinition;

  private characterController?: CharacterController;
  private inputManager?: InputManager;

  private debugGraphics?: Phaser.GameObjects.Graphics;

  private oneKey?: Phaser.Input.Keyboard.Key;
  private twoKey?: Phaser.Input.Keyboard.Key;
  private threeKey?: Phaser.Input.Keyboard.Key;

  private readonly characterIds = [
    'lucario',
    'gengar',
    'charizard'
  ];

  constructor() {
    super('HurtboxTestScene');
  }

  init(data: HurtboxTestSceneData = {}): void {
    const available = getCharacters().filter(
      character => character.availability === 'available'
    );

    const fallback = available[0] ?? getCharacters()[0];

    this.character =
      getCharacterById(data.characterId ?? '') ??
      fallback;

    if (!this.character) {
      throw new Error('No hay personajes disponibles para probar.');
    }
  }

  preload(): void {
    Object.values(this.character.assets.spriteSheets).forEach(
      asset => {
        if (this.textures.exists(asset.key)) {
          return;
        }

        this.load.spritesheet(
          asset.key,
          asset.path,
          {
            frameWidth: asset.frameWidth,
            frameHeight: asset.frameHeight
          }
        );
      }
    );
  }

  create(): void {
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.cameras.main.setBackgroundColor('#17243b');

    this.createGround();
    this.createCharacter();
    this.createDebugGraphics();
    this.createInstructions();
    this.createKeyboardControls();
  }

  update(_time: number, delta: number): void {
    this.inputManager?.update();

    this.characterController?.update(delta);

    this.drawHurtboxes();

    this.checkCharacterSelection();
  }

  private createGround(): void {
    this.add.rectangle(
      this.screenWidth / 2,
      this.groundY + 10,
      this.screenWidth,
      20,
      0x263d52
    ).setStrokeStyle(2, 0xffffff, 0.5);

    this.matter.add.rectangle(
      this.screenWidth / 2,
      this.groundY + 10,
      this.screenWidth,
      20,
      {
        isStatic: true,
        friction: 0,
        label: 'test-ground'
      }
    );

    this.matter.add.rectangle(
      -10,
      this.screenHeight / 2,
      20,
      this.screenHeight,
      {
        isStatic: true,
        label: 'test-left-wall'
      }
    );

    this.matter.add.rectangle(
      this.screenWidth + 10,
      this.screenHeight / 2,
      20,
      this.screenHeight,
      {
        isStatic: true,
        label: 'test-right-wall'
      }
    );
  }

  private createCharacter(): void {
    this.inputManager = new InputManager();

    const target = {
      x: this.screenWidth - 100
    };

    this.characterController = new CharacterController(
      this,
      this.character,
      target,
      this.inputManager,
      [],
      this.screenWidth / 2,
      'hurtbox-test',
      this.groundY
    );

    this.characterController.setup();
  }

  private createDebugGraphics(): void {
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(100);
  }

  private drawHurtboxes(): void {
    const graphics = this.debugGraphics;
    const fighter = this.characterController?.fighter;

    if (!graphics || !fighter) {
      return;
    }

    graphics.clear();

    const body = fighter.body as MatterJS.BodyType;

    // El primer elemento representa el cuerpo compuesto.
    // Los siguientes son las tres cajas individuales.
    const parts = body.parts.length > 1
      ? body.parts.slice(1)
      : [body];

    const colors = [
      0xff5555, // Head
      0x55aaff, // Torso
      0x55dd88  // Legs
    ];

    parts.forEach((part, index) => {
      const color = colors[index] ?? 0xffffff;

      const vertices = (
        part as MatterBodyWithVertices
      ).vertices;

      if (!vertices || vertices.length === 0) {
        return;
      }

      graphics.fillStyle(color, 0.25);
      graphics.lineStyle(3, color, 1);

      graphics.beginPath();

      graphics.moveTo(
        vertices[0].x,
        vertices[0].y
      );

      for (let i = 1; i < vertices.length; i++) {
        graphics.lineTo(
          vertices[i].x,
          vertices[i].y
        );
      }

      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
    });
  }

  private createInstructions(): void {
    this.add.text(
      20,
      20,
      `HURTBOX TEST - ${this.character.name.toUpperCase()}`,
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff'
      }
    ).setDepth(200);

    this.add.text(
      20,
      60,
      'A / D: Mover | SPACE: Saltar | S / ↓: Agacharse',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setDepth(200);

    this.add.text(
      20,
      90,
      '1: Lucario | 2: Gengar | 3: Charizard',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setDepth(200);

    this.add.text(
      20,
      125,
      'ROJO: HEAD     AZUL: TORSO     VERDE: LEGS',
      {
        fontFamily: 'Arial',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff'
      }
    ).setDepth(200);
  }

  private createKeyboardControls(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    this.oneKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ONE
    );

    this.twoKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TWO
    );

    this.threeKey = keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.THREE
    );
  }

  private checkCharacterSelection(): void {
    if (
      this.oneKey &&
      Phaser.Input.Keyboard.JustDown(this.oneKey)
    ) {
      this.selectCharacter(this.characterIds[0]);
    }

    if (
      this.twoKey &&
      Phaser.Input.Keyboard.JustDown(this.twoKey)
    ) {
      this.selectCharacter(this.characterIds[1]);
    }

    if (
      this.threeKey &&
      Phaser.Input.Keyboard.JustDown(this.threeKey)
    ) {
      this.selectCharacter(this.characterIds[2]);
    }
  }

  private selectCharacter(characterId: string): void {
    if (characterId === this.character.id) {
      return;
    }

    const character = getCharacterById(characterId);

    if (!character) {
      return;
    }

    this.scene.restart({ characterId });
  }

  private cleanup(): void {
    this.characterController?.destroy();
    this.inputManager?.destroy();

    this.characterController = undefined;
    this.inputManager = undefined;
    this.debugGraphics = undefined;
  }
}
