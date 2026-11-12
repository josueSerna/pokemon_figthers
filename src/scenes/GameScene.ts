import Phaser from 'phaser';
import { getCharacterById, getCharacters } from '../characters/registry';
import type { CharacterDefinition } from '../characters/types';
import { CharacterController } from '../gameplay/CharacterController';
import { InputManager } from '../gameplay/input/InputManager';
import { getDefaultStage, getStageById } from '../stages/registry';
import { StageController } from '../stages/StageController';
import type { StageDefinition } from '../stages/types';

interface PlayerSetup {
  playerIndex: number;
  characterId: string;
  input?: 'keyboard' | 'gamepad';
  gamepadIndex?: number;
}

interface GameSceneData {
  mode?: 1 | 2;
  /** Personaje de P1 (compatibilidad con la versión anterior). */
  characterId?: string;
  players?: PlayerSetup[];
  stageId?: string;
}

export class GameScene extends Phaser.Scene {
  private playerOne?: CharacterController;
  private playerTwo?: CharacterController;
  private playerOneInput?: InputManager;
  private playerTwoInput?: InputManager;
  private playerOneTarget: {
    x: number;
    fighter?: Phaser.Physics.Arcade.Sprite;
    takeDamage?: (amount: number) => void;
  } = { x: 700 };
  private playerTwoTarget: {
    x: number;
    fighter?: Phaser.Physics.Arcade.Sprite;
    takeDamage?: (amount: number) => void;
  } = { x: 250 };

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
    this.stage = getStageById(data.stageId ?? '') ?? getDefaultStage();

    const all = getCharacters();
    const available = all.filter(
      (character) => character.availability === 'available'
    );
    const fallback = available[0] ?? all[0];

    // Jugador 1.
    const playerOneId = data.players?.[0]?.characterId ?? data.characterId;

    this.playerOneCharacter =
      getCharacterById(playerOneId ?? '') ?? fallback;

    // Jugador 2: en 2 jugadores se respeta SIEMPRE lo que eligió
    // (puede ser el mismo Pokémon que P1).
    const playerTwoChosen =
      this.mode === 2
        ? getCharacterById(data.players?.[1]?.characterId ?? '')
        : undefined;

    this.playerTwoCharacter =
      playerTwoChosen ?? this.pickOpponent(available);

    this.playerTwoGamepadIndex =
      this.mode === 2 ? data.players?.[1]?.gamepadIndex : undefined;
  }

  /** Rival para el modo 1 jugador: uno al azar distinto a P1 si es posible. */
  private pickOpponent(available: CharacterDefinition[]) {
    const others = available.filter(
      (character) => character.id !== this.playerOneCharacter.id
    );
    const pool = others.length > 0 ? others : available;

    return (
      (Phaser.Utils.Array.GetRandom(pool) as CharacterDefinition | undefined) ??
      this.playerOneCharacter
    );
  }

  preload() {
    StageController.preload(this, this.stage);

    // Si P1 y P2 usan el mismo Pokémon solo se carga una vez.
    const unique = new Map<string, CharacterDefinition>();
    [this.playerOneCharacter, this.playerTwoCharacter].forEach((character) => {
      unique.set(character.id, character);
    });

    unique.forEach((character) => {
      const iconKey = `icon-${character.id}`;

      if (character.assets.icon && !this.textures.exists(iconKey)) {
        this.load.image(iconKey, character.assets.icon);
      }

      Object.values(character.assets.spriteSheets).forEach((asset) => {
        if (this.textures.exists(asset.key)) return;

        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight
        });
      });
    });
  }

  create() {
    // Phaser no llama a un método "shutdown" por sí solo: hay que escuchar el evento.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.cameras.main.setBackgroundColor('#17243b');
    // Video, música y efectos del escenario elegido.
    this.stageController = new StageController(this, this.stage);
    this.stageController.create();

    const groundY = this.stage.groundY ?? 520;
    const ground = this.add
      .rectangle(480, groundY + 10, 960, 20, 0x00ff00, 0.2)
      .setStrokeStyle(2, 0x00ff00, 1);
    this.physics.add.existing(ground, true);
    (ground.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    // P1: teclado. P2: control (en modo 1 jugador el rival no tiene entrada).
    this.playerOneInput = new InputManager();
    this.playerTwoInput = new InputManager({
      keyboardEnabled: false,
      gamepadIndex: this.playerTwoGamepadIndex
    });

    // Cada jugador crea SUS habilidades, aunque sea el mismo Pokémon.
    const playerOneAbilities = this.createAbilities(this.playerOneCharacter);
    const playerTwoAbilities = this.createAbilities(this.playerTwoCharacter);

    this.playerOne = new CharacterController(
      this,
      this.playerOneCharacter,
      this.playerOneTarget,
      this.playerOneInput,
      playerOneAbilities,
      250,
      'player-one',
      groundY
    );
    this.playerTwo = new CharacterController(
      this,
      this.playerTwoCharacter,
      this.playerTwoTarget,
      this.playerTwoInput,
      playerTwoAbilities,
      700,
      'player-two',
      groundY
    );
    this.playerOne.setup();
    this.playerTwo.setup();

    // Mismo Pokémon: tiñe al segundo para distinguirlos.
    if (this.playerOneCharacter.id === this.playerTwoCharacter.id) {
      this.playerTwo.fighter.setTint(0x9ec5ff);
    }

    this.physics.add.collider(this.playerOne.fighter, ground);
    this.physics.add.collider(this.playerTwo.fighter, ground);
    this.playerOneTarget.fighter = this.playerTwo.fighter;
    this.playerOneTarget.takeDamage = (amount) => this.playerTwo?.takeDamage(amount);
    this.playerTwoTarget.fighter = this.playerOne.fighter;
    this.playerTwoTarget.takeDamage = (amount) => this.playerOne?.takeDamage(amount);
    this.createHealthBars();
  }

  update() {
    this.playerOneInput?.update();
    this.playerTwoInput?.update();
    if (this.playerOne && this.playerTwo) {
      this.playerOneTarget.x = this.playerTwo.fighter.x;
      this.playerTwoTarget.x = this.playerOne.fighter.x;
    }
    this.playerOne?.update();
    this.playerTwo?.update();
    this.updateHealthBars();
  }

  private cleanup() {
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
    this.playerOneTarget = { x: 700 };
    this.playerTwoTarget = { x: 250 };
  }

  private createAbilities(character: CharacterDefinition) {
    return character.abilityFactories?.map((createAbility) => createAbility()) ?? [];
  }

  private createHealthBars() {
    this.createHealthBar(this.playerOneCharacter, 92, 28, false);
    this.createHealthBar(this.playerTwoCharacter, 588, 28, true);
  }

  private createHealthBar(
    character: CharacterDefinition,
    x: number,
    y: number,
    flipPortrait: boolean
  ) {
    const width = 280;
    const height = 18;
    const iconX = flipPortrait ? x + width + 42 : x - 42;
    this.add.rectangle(iconX, y + height / 2, 76, 76, 0x243450)
      .setStrokeStyle(2, 0xffffff, 1)
      .setDepth(5);
    if (character.assets.icon) {
      this.add.image(
        iconX,
        y + height / 2,
        `icon-${character.id}`
      ).setDisplaySize(70, 70).setFlipX(flipPortrait).setDepth(6);
    }

    this.add.graphics()
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
    const healthText = this.add.text(x + width / 2, y + height / 2, '', {
      color: '#ffffff',
      fontSize: '14px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(7);
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
    const playerOneMax = this.playerOneCharacter.stats.maxHealth;
    const playerTwoMax = this.playerTwoCharacter.stats.maxHealth;
    const playerOneHealth = this.playerOne?.getHealth() ?? playerOneMax;
    const playerTwoHealth = this.playerTwo?.getHealth() ?? playerTwoMax;
    const playerOneRatio = playerOneHealth / playerOneMax;
    const playerTwoRatio = playerTwoHealth / playerTwoMax;

    this.playerOneHealthFill
      ?.clear()
      .fillStyle(0x46d369, 1)
      .fillRect(92, y, width * playerOneRatio, height);
    this.playerTwoHealthFill
      ?.clear()
      .fillStyle(0x46d369, 1)
      .fillRect(588 + width * (1 - playerTwoRatio), y, width * playerTwoRatio, height);
    this.playerOneHealthText?.setText(`${playerOneHealth}/${playerOneMax}`);
    this.playerTwoHealthText?.setText(`${playerTwoHealth}/${playerTwoMax}`);
  }
}