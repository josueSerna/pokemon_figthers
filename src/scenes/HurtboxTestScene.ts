
import Phaser from 'phaser';

import {
  getCharacterById,
  getCharacters
} from '../characters/registry';

import type {
  CharacterDefinition
} from '../characters/types';

import {
  CharacterController
} from '../gameplay/CharacterController';

import {
  InputManager
} from '../gameplay/input/InputManager';

import {
  NeutralAttackController
} from '../gameplay/attacks/NeutralAttackController';

import type {
  NeutralVisualEffectPlayer
} from '../gameplay/attacks/NeutralAttackController';

import {
  ShadowClawEffect
} from '../gameplay/effects/movements/ShadowClaw/ShadowClawEffect';

import {
  AstonishEffect
} from '../gameplay/effects/movements/Astonish/AstonishEffect';

import {
  LickEffect
} from '../gameplay/effects/movements/Lick/LickEffect';

import {
  NeutralVisualEffectGroup
} from '../gameplay/effects/NeutralVisualEffectGroup';

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
  private opponentCharacter!: CharacterDefinition;

  private characterController?: CharacterController;
  private opponentController?: CharacterController;

  private inputManager?: InputManager;
  private opponentInputManager?: InputManager;

  private neutralAttackController?: NeutralAttackController;

  private debugGraphics?: Phaser.GameObjects.Graphics;

  private oneKey?: Phaser.Input.Keyboard.Key;
  private twoKey?: Phaser.Input.Keyboard.Key;
  private threeKey?: Phaser.Input.Keyboard.Key;

  private characterTarget: {
    x: number;
    fighter?: Phaser.Physics.Matter.Sprite;
    takeDamage?: (amount: number) => void;
  } = {
    x: 960
  };

  private opponentTarget: {
    x: number;
    fighter?: Phaser.Physics.Matter.Sprite;
    takeDamage?: (amount: number) => void;
  } = {
    x: 320
  };

  private readonly characterIds = [
    'lucario',
    'gengar',
    'charizard'
  ];

  constructor() {
    super('HurtboxTestScene');
  }

  // INICIALIZACIÓN

  init(data: HurtboxTestSceneData = {}): void {
    const available = getCharacters().filter(
      character =>
        character.availability === 'available' &&
        this.characterIds.includes(character.id)
    );

    const fallback =
      available[0] ??
      getCharacterById(this.characterIds[0]);

    this.character =
      getCharacterById(data.characterId ?? '') ??
      fallback!;

    if (!this.character) {
      throw new Error(
        'No hay personajes disponibles para probar.'
      );
    }

    const opponentPool = available.filter(
      character => character.id !== this.character.id
    );

    this.opponentCharacter =
      Phaser.Utils.Array.GetRandom(opponentPool) ??
      getCharacterById(
        this.characterIds.find(
          id => id !== this.character.id
        ) ?? ''
      )!;

    if (!this.opponentCharacter) {
      throw new Error(
        'No se encontró otro Pokémon para utilizar como objetivo.'
      );
    }

    this.characterTarget = {
      x: 960
    };

    this.opponentTarget = {
      x: 320
    };
  }

  // CARGA DE RECURSOS

  preload(): void {
    const unique = new Map<string, CharacterDefinition>();

    [
      this.character,
      this.opponentCharacter
    ].forEach(character => {
      unique.set(character.id, character);
    });

    unique.forEach(character => {
      Object.values(character.assets.spriteSheets).forEach(
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
    });

    const shadowClawKey = 'shadow-claw';

    if (!this.textures.exists(shadowClawKey)) {
      this.load.spritesheet(
        shadowClawKey,
        '/assets/movements/shadow_claw.png',
        {
          frameWidth: 256,
          frameHeight: 256
        }
      );
    }
  }

  // CREACIÓN DE ESCENA

  create(): void {
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.cameras.main.setBackgroundColor('#17243b');

    this.createGround();
    this.createInputs();
    this.createFighters();
    this.createNeutralAttackController();

    this.createDebugGraphics();
    this.createInstructions();
    this.createKeyboardControls();
  }

  // ACTUALIZACIÓN

  update(_time: number, delta: number): void {
    this.inputManager?.update();
    this.opponentInputManager?.update();

    this.characterController?.update(delta);
    this.opponentController?.update(delta);

    if (
      this.inputManager?.justPressed('neutralAttack')
    ) {
      this.neutralAttackController?.press(
        this.characterController?.isCrouching() ?? false,
        this.characterController?.isAirborne() ?? false
      );
    }

    this.neutralAttackController?.update();

    this.drawHurtboxes();

    this.checkCharacterSelection();
  }

  // ESCENARIO

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

  // CONTROLES

  private createInputs(): void {
    this.inputManager = new InputManager();

    this.opponentInputManager = new InputManager({
      keyboardEnabled: false
    });
  }

  // CREACIÓN DE LUCHADORES

  private createFighters(): void {
    this.characterController = new CharacterController(
      this,
      this.character,
      this.characterTarget,
      this.inputManager!,
      [],
      320,
      'hurtbox-test-player',
      this.groundY
    );

    this.opponentController = new CharacterController(
      this,
      this.opponentCharacter,
      this.opponentTarget,
      this.opponentInputManager!,
      [],
      960,
      'hurtbox-test-opponent',
      this.groundY
    );

    this.characterController.setup();
    this.opponentController.setup();

    this.characterTarget.fighter =
      this.opponentController.fighter;

    this.characterTarget.takeDamage = (
      _amount: number
    ) => {};

    this.opponentTarget.fighter =
      this.characterController.fighter;

    this.opponentTarget.takeDamage = (
      _amount: number
    ) => {};

    this.characterController.setupDashAttackController();
  }

  // ATAQUES NEUTRALES

  private createNeutralAttackController(): void {
    const neutral = this.character.attacks?.neutral;

    if (
      !neutral ||
      !this.characterController ||
      !this.opponentController
    ) {
      return;
    }

    const standing = neutral.standing ?? [];
    const crouching = neutral.crouching ?? [];
    const air = neutral.air;

    const allAttacks = [
      ...standing,
      ...crouching,
      air
    ];

    if (!allAttacks.some(Boolean)) {
      return;
    }

    const effectPlayers: NeutralVisualEffectPlayer[] = [];

    const hasShadowClaw = allAttacks.some(
      attack =>
        attack?.visualEffect?.key === 'shadow-claw'
    );

    const hasAstonish = allAttacks.some(
      attack =>
        attack?.visualEffect?.key === 'astonish'
    );

    const hasLick = allAttacks.some(
      attack =>
        attack?.visualEffect?.key === 'lick' ||
        attack?.hitVisualEffect?.key === 'lick'
    );

    if (hasShadowClaw) {
      effectPlayers.push(
        new ShadowClawEffect(this)
      );
    }

    if (hasAstonish) {
      effectPlayers.push(
        new AstonishEffect(this)
      );
    }

    if (hasLick) {
      effectPlayers.push(
        new LickEffect(this)
      );
    }

    const visualEffectPlayer =
      effectPlayers.length > 0
        ? new NeutralVisualEffectGroup(effectPlayers)
        : undefined;

    this.neutralAttackController = new NeutralAttackController(
      this,
      this.characterController.visual,
      this.opponentController.fighter,
      (_damage: number) => {},
      [...standing],
      (
        attacking: boolean,
        crouchingAttack: boolean
      ) => {
        this.characterController?.setNeutralAttacking(
          attacking,
          crouchingAttack
        );
      },
      [...crouching],
      air,
      visualEffectPlayer,
      (active: boolean) => {
        this.characterController?.setHexActive(active);
      }
    );
  }

  // HURTBOXES

  private createDebugGraphics(): void {
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(100);
  }

  private drawHurtboxes(): void {
    const graphics = this.debugGraphics;

    const playerOne = this.characterController?.fighter;
    const playerTwo = this.opponentController?.fighter;

    if (!graphics || !playerOne || !playerTwo) {
      return;
    }

    graphics.clear();

    this.drawFighterHurtboxes(
      graphics,
      playerOne
    );

    this.drawFighterHurtboxes(
      graphics,
      playerTwo
    );
  }

  private drawFighterHurtboxes(
    graphics: Phaser.GameObjects.Graphics,
    fighter: Phaser.Physics.Matter.Sprite
  ): void {
    const body = fighter.body as MatterJS.BodyType;

    if (!body) {
      return;
    }

    const parts = body.parts.length > 1
      ? body.parts.slice(1)
      : [body];

    const colors = [
      0xff5555,
      0x55aaff,
      0x55dd88
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

  // INSTRUCCIONES

  private createInstructions(): void {
    this.add.text(
      20,
      20,
      `HURTBOX TEST - ${this.character.name.toUpperCase()} VS ${this.opponentCharacter.name.toUpperCase()}`,
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
      'J: Ataque neutral | 1: Lucario | 2: Gengar | 3: Charizard',
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

  // SELECCIÓN DE PERSONAJES

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

  // LIMPIEZA

  private cleanup(): void {
    this.neutralAttackController?.destroy();

    this.characterController?.destroy();
    this.opponentController?.destroy();

    this.inputManager?.destroy();
    this.opponentInputManager?.destroy();

    this.neutralAttackController = undefined;

    this.characterController = undefined;
    this.opponentController = undefined;

    this.inputManager = undefined;
    this.opponentInputManager = undefined;

    this.debugGraphics = undefined;

    this.characterTarget = {
      x: 960
    };

    this.opponentTarget = {
      x: 320
    };
  }
}
