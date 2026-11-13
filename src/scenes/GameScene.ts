
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
} from '../gameplay/NeutralAttackController';

import {
  getDefaultStage,
  getStageById
} from '../stages/registry';

import {
  StageController
} from '../stages/StageController';

import type {
  StageDefinition
} from '../stages/types';

import {
  gengarNeutralAttacks
} from '../gameplay/attacks/gengar/gengarNeutralAttacks';

interface PlayerSetup {
  playerIndex: number;
  characterId: string;
  input?: 'keyboard' | 'gamepad';
  gamepadIndex?: number;
}

interface GameSceneData {
  mode?: 1 | 2;
  characterId?: string;
  players?: PlayerSetup[];
  stageId?: string;
}

export class GameScene extends Phaser.Scene {
  private readonly screenWidth = 1280;
  private readonly screenHeight = 720;

  private playerOne?: CharacterController;
  private playerTwo?: CharacterController;

  private playerOneInput?: InputManager;
  private playerTwoInput?: InputManager;

  private playerOneNeutral?: NeutralAttackController;
  private playerTwoNeutral?: NeutralAttackController;

  private playerOneTarget: {
    x: number;
    fighter?: Phaser.Physics.Matter.Sprite;
    takeDamage?: (amount: number) => void;
  } = { x: 960 };

  private playerTwoTarget: {
    x: number;
    fighter?: Phaser.Physics.Matter.Sprite;
    takeDamage?: (amount: number) => void;
  } = { x: 320 };

  private mode: 1 | 2 = 1;

  private playerOneCharacter!: CharacterDefinition;
  private playerTwoCharacter!: CharacterDefinition;

  private playerTwoGamepadIndex?: number;

  private stage!: StageDefinition;
  private stageController?: StageController;

  private playerOneHealthFill?: Phaser.GameObjects.Graphics;
  private playerTwoHealthFill?: Phaser.GameObjects.Graphics;

  private playerOneHealthText?: Phaser.GameObjects.Text;
  private playerTwoHealthText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData = {}) {
    this.mode = data.mode === 2 ? 2 : 1;

    this.stage =
      getStageById(data.stageId ?? '') ??
      getDefaultStage();

    const all = getCharacters();

    const available = all.filter(
      (character) =>
        character.availability === 'available'
    );

    const fallback = available[0] ?? all[0];

    const playerOneId =
      data.players?.[0]?.characterId ??
      data.characterId;

    this.playerOneCharacter =
      getCharacterById(playerOneId ?? '') ??
      fallback;

    const playerTwoChosen =
      this.mode === 2
        ? getCharacterById(
            data.players?.[1]?.characterId ?? ''
          )
        : undefined;

    this.playerTwoCharacter =
      playerTwoChosen ??
      this.pickOpponent(available);

    this.playerTwoGamepadIndex =
      this.mode === 2
        ? data.players?.[1]?.gamepadIndex
        : undefined;
  }

  private pickOpponent(
    available: CharacterDefinition[]
  ) {
    const others = available.filter(
      (character) =>
        character.id !== this.playerOneCharacter.id
    );

    const pool =
      others.length > 0 ? others : available;

    return (
      (Phaser.Utils.Array.GetRandom(pool) as
        | CharacterDefinition
        | undefined) ?? this.playerOneCharacter
    );
  }

  preload() {
    StageController.preload(this, this.stage);

    const unique = new Map<
      string,
      CharacterDefinition
    >();

    [
      this.playerOneCharacter,
      this.playerTwoCharacter
    ].forEach((character) => {
      unique.set(character.id, character);
    });

    unique.forEach((character) => {
      const iconKey = `icon-${character.id}`;

      if (
        character.assets.icon &&
        !this.textures.exists(iconKey)
      ) {
        this.load.image(
          iconKey,
          character.assets.icon
        );
      }

      Object.values(
        character.assets.spriteSheets
      ).forEach((asset) => {
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
      });
    });
  }

  create() {
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.cameras.main.setBackgroundColor('#17243b');

    this.stageController = new StageController(
      this,
      this.stage
    );

    this.stageController.create();

    // --------------------------------------------------
    // ESCENARIO Y COLISIONES
    // --------------------------------------------------

    const groundY = this.stage.groundY ?? 700;

    // Suelo visible.
    this.add
      .rectangle(
        this.screenWidth / 2,
        groundY + 10,
        this.screenWidth,
        20,
        0x00ff00,
        0.2
      )
      .setStrokeStyle(2, 0x00ff00, 1);

    // Suelo físico de Matter.
    this.matter.add.rectangle(
      this.screenWidth / 2,
      groundY + 10,
      this.screenWidth,
      20,
      {
        isStatic: true,
        friction: 0,
        label: 'stage-ground'
      }
    );

    // Límite izquierdo.
    this.matter.add.rectangle(
      -10,
      this.screenHeight / 2,
      20,
      this.screenHeight,
      {
        isStatic: true,
        label: 'left-wall'
      }
    );

    // Límite derecho.
    this.matter.add.rectangle(
      this.screenWidth + 10,
      this.screenHeight / 2,
      20,
      this.screenHeight,
      {
        isStatic: true,
        label: 'right-wall'
      }
    );

    // --------------------------------------------------
    // CONTROLES
    // --------------------------------------------------

    this.playerOneInput = new InputManager();

    this.playerTwoInput = new InputManager({
      keyboardEnabled: false,
      gamepadIndex: this.playerTwoGamepadIndex
    });

    // --------------------------------------------------
    // HABILIDADES
    // --------------------------------------------------

    const playerOneAbilities =
      this.createAbilities(
        this.playerOneCharacter
      );

    const playerTwoAbilities =
      this.createAbilities(
        this.playerTwoCharacter
      );

    // --------------------------------------------------
    // CREACIÓN DE LUCHADORES
    // --------------------------------------------------

    this.playerOne = new CharacterController(
      this,
      this.playerOneCharacter,
      this.playerOneTarget,
      this.playerOneInput,
      playerOneAbilities,
      320,
      'player-one',
      groundY
    );

    this.playerTwo = new CharacterController(
      this,
      this.playerTwoCharacter,
      this.playerTwoTarget,
      this.playerTwoInput,
      playerTwoAbilities,
      960,
      'player-two',
      groundY
    );

    this.playerOne.setup();
    this.playerTwo.setup();

    if (
      this.playerOneCharacter.id ===
      this.playerTwoCharacter.id
    ) {
      this.playerTwo.visual.setTint(0x9ec5ff);
    }

    // --------------------------------------------------
    // REFERENCIAS ENTRE LUCHADORES
    // --------------------------------------------------

    this.playerOneTarget.fighter =
      this.playerTwo.fighter;

    this.playerOneTarget.takeDamage = (
      amount: number
    ) => {
      this.playerTwo?.takeDamage(amount);
    };

    this.playerTwoTarget.fighter =
      this.playerOne.fighter;

    this.playerTwoTarget.takeDamage = (
      amount: number
    ) => {
      this.playerOne?.takeDamage(amount);
    };

    // --------------------------------------------------
    // ATAQUES NEUTRALES
    // --------------------------------------------------

    // Jugador uno: Gengar.
    if (
      this.playerOneCharacter.id === 'gengar'
    ) {
      this.playerOneNeutral = new NeutralAttackController(
        this,
        this.playerOne.visual,
        this.playerTwo.fighter,
        (damage: number) => {
          this.playerTwo?.takeDamage(damage);
        },
        gengarNeutralAttacks,
        (attacking: boolean) => {
          this.playerOne?.setNeutralAttacking(attacking);
        }
      );
    }

    // Jugador dos: Gengar.
    if (
      this.playerTwoCharacter.id === 'gengar'
    ) {
      this.playerTwoNeutral = new NeutralAttackController(
        this,
        this.playerTwo.visual,
        this.playerOne.fighter,
        (damage: number) => {
          this.playerOne?.takeDamage(damage);
        },
        gengarNeutralAttacks,
        (attacking: boolean) => {
          this.playerTwo?.setNeutralAttacking(attacking);
        }
      );
    }

    this.createHealthBars();
  }

  update(_time: number, delta: number) {
    this.playerOneInput?.update();
    this.playerTwoInput?.update();

    if (this.playerOne && this.playerTwo) {
      this.playerOneTarget.x =
        this.playerTwo.fighter.x;

      this.playerTwoTarget.x =
        this.playerOne.fighter.x;
    }

    // Actualización de los luchadores.
    this.playerOne?.update(delta);
    this.playerTwo?.update(delta);

    // --------------------------------------------------
    // ATAQUES NEUTRALES
    // --------------------------------------------------

    if (
      this.playerOneInput?.justPressed(
        'neutralAttack'
      )
    ) {
      this.playerOneNeutral?.press();
    }

    if (
      this.playerTwoInput?.justPressed(
        'neutralAttack'
      )
    ) {
      this.playerTwoNeutral?.press();
    }

    this.playerOneNeutral?.update();
    this.playerTwoNeutral?.update();

    // Evita que los luchadores se atraviesen lateralmente.
    this.resolveFighterCollision();

    this.updateHealthBars();
  }

  // --------------------------------------------------
  // COLISIÓN ENTRE LUCHADORES
  // --------------------------------------------------

  private resolveFighterCollision() {
    if (!this.playerOne || !this.playerTwo) {
      return;
    }

    const fighterOne = this.playerOne.fighter;
    const fighterTwo = this.playerTwo.fighter;

    const bodyOne =
      fighterOne.body as MatterJS.BodyType | null;

    const bodyTwo =
      fighterTwo.body as MatterJS.BodyType | null;

    if (!bodyOne || !bodyTwo) {
      return;
    }

    const boundsOne = bodyOne.bounds;
    const boundsTwo = bodyTwo.bounds;

    const verticalOverlap =
      boundsOne.min.y < boundsTwo.max.y &&
      boundsOne.max.y > boundsTwo.min.y;

    if (!verticalOverlap) {
      return;
    }

    const oneIsLeft =
      bodyOne.position.x <= bodyTwo.position.x;

    const leftFighter = oneIsLeft
      ? fighterOne
      : fighterTwo;

    const rightFighter = oneIsLeft
      ? fighterTwo
      : fighterOne;

    const leftBody = oneIsLeft
      ? bodyOne
      : bodyTwo;

    const rightBody = oneIsLeft
      ? bodyTwo
      : bodyOne;

    const leftBounds = leftBody.bounds;
    const rightBounds = rightBody.bounds;

    const gap =
      rightBounds.min.x - leftBounds.max.x;

    const leftVelocity =
      leftFighter.getVelocity().x;

    const rightVelocity =
      rightFighter.getVelocity().x;

    const leftApproach = Math.max(
      0,
      leftVelocity
    );

    const rightApproach = Math.max(
      0,
      -rightVelocity
    );

    const closingSpeed =
      leftApproach + rightApproach;

    if (closingSpeed <= 0) {
      return;
    }

    if (gap <= 0) {
      if (leftVelocity > 0) {
        leftFighter.setVelocityX(0);
      }

      if (rightVelocity < 0) {
        rightFighter.setVelocityX(0);
      }

      return;
    }

    if (gap <= closingSpeed + 0.5) {
      const availableMovement = Math.max(
        0,
        gap - 0.5
      );

      const movementRatio = Math.min(
        1,
        availableMovement / closingSpeed
      );

      if (leftVelocity > 0) {
        leftFighter.setVelocityX(
          leftVelocity * movementRatio
        );
      }

      if (rightVelocity < 0) {
        rightFighter.setVelocityX(
          rightVelocity * movementRatio
        );
      }
    }
  }

  // --------------------------------------------------
  // LIMPIEZA
  // --------------------------------------------------

  private cleanup() {
    // Destruir ataques antes que los luchadores.
    this.playerOneNeutral?.destroy();
    this.playerTwoNeutral?.destroy();

    this.playerOneNeutral = undefined;
    this.playerTwoNeutral = undefined;

    this.playerOne?.destroy();
    this.playerTwo?.destroy();

    this.playerOneInput?.destroy();
    this.playerTwoInput?.destroy();

    this.stageController?.destroy();

    this.stageController = undefined;

    this.playerOne = undefined;
    this.playerTwo = undefined;

    this.playerOneInput = undefined;
    this.playerTwoInput = undefined;

    this.playerOneTarget = { x: 960 };
    this.playerTwoTarget = { x: 320 };
  }

  // --------------------------------------------------
  // HABILIDADES
  // --------------------------------------------------

  private createAbilities(
    _character: CharacterDefinition
  ) {
    return [];
  }

  // --------------------------------------------------
  // BARRAS DE VIDA
  // --------------------------------------------------

  private createHealthBars() {
    this.createHealthBar(
      this.playerOneCharacter,
      120,
      28,
      false
    );

    this.createHealthBar(
      this.playerTwoCharacter,
      880,
      28,
      true
    );
  }

  private createHealthBar(
    character: CharacterDefinition,
    x: number,
    y: number,
    flipPortrait: boolean
  ) {
    const width = 280;
    const height = 18;

    const iconX = flipPortrait
      ? x + width + 42
      : x - 42;

    this.add
      .rectangle(
        iconX,
        y + height / 2,
        76,
        76,
        0x243450
      )
      .setStrokeStyle(2, 0xffffff, 1)
      .setDepth(5);

    if (character.assets.icon) {
      this.add
        .image(
          iconX,
          y + height / 2,
          `icon-${character.id}`
        )
        .setDisplaySize(70, 70)
        .setFlipX(flipPortrait)
        .setDepth(6);
    }

    this.add
      .graphics()
      .setDepth(5)
      .fillStyle(0x401b27, 1)
      .fillRect(x, y, width, height)
      .lineStyle(2, 0xffffff, 1)
      .strokeRect(x, y, width, height);

    const fill = this.add.graphics().setDepth(6);

    if (flipPortrait) {
      this.playerTwoHealthFill = fill;
    } else {
      this.playerOneHealthFill = fill;
    }

    const healthText = this.add
      .text(
        x + width / 2,
        y + height / 2,
        '',
        {
          color: '#ffffff',
          fontSize: '14px',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5)
      .setDepth(7);

    if (flipPortrait) {
      this.playerTwoHealthText = healthText;
    } else {
      this.playerOneHealthText = healthText;
    }
  }

  private updateHealthBars() {
    const width = 280;
    const height = 18;
    const y = 28;

    const playerOneMax =
      this.playerOneCharacter.stats.maxHealth;

    const playerTwoMax =
      this.playerTwoCharacter.stats.maxHealth;

    const playerOneHealth =
      this.playerOne?.getHealth() ??
      playerOneMax;

    const playerTwoHealth =
      this.playerTwo?.getHealth() ??
      playerTwoMax;

    const playerOneRatio =
      playerOneHealth / playerOneMax;

    const playerTwoRatio =
      playerTwoHealth / playerTwoMax;

    this.playerOneHealthFill
      ?.clear()
      .fillStyle(0x46d369, 1)
      .fillRect(
        120,
        y,
        width * playerOneRatio,
        height
      );

    this.playerTwoHealthFill
      ?.clear()
      .fillStyle(0x46d369, 1)
      .fillRect(
        880 + width * (1 - playerTwoRatio),
        y,
        width * playerTwoRatio,
        height
      );

    this.playerOneHealthText?.setText(
      `${playerOneHealth}/${playerOneMax}`
    );

    this.playerTwoHealthText?.setText(
      `${playerTwoHealth}/${playerTwoMax}`
    );
  }
}
