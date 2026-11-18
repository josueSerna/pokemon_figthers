
import Phaser from 'phaser';

import type {
  CharacterDefinition
} from '../characters/types';

import {
  AbilityController
} from './abilities/AbilityController';

import type {
  FighterAbility
} from './abilities/types';

import {
  InputManager
} from './input/InputManager';

import {
  MovementController
} from './movement/MovementController';

import {
  DashController
} from './movement/DashController';

import {
  HurtboxController
} from './physics/HurtBoxController';

import {
  FighterBodyFactory
} from './physics/FighterBodyFactory';

import {
  CollisionDebugger
} from './debug/CollisionDebugger';

import {
  VisualSyncController
} from './visual/VisualSyncController';

import {
  AnimationController
} from './animations/AnimationController';

import {
  JumpAnimationController
} from './animations/movement/JumpAnimationController';

import {
  DashAttackController
} from './attacks/DashAttackController';

import {
  HitStopController
} from './effects/HitStopController';

const PUSHBOX_WIDTH = 72;
const PUSHBOX_HEIGHT = 110;

const KNOCKBACK_PROTECTION_MS = 450;

export class CharacterController {
  private readonly scene: Phaser.Scene;
  private readonly definition: CharacterDefinition;

  private readonly opponent: {
    x: number;
    fighter?: Phaser.Physics.Matter.Sprite;
    takeDamage?: (amount: number) => void;
  };

  private readonly input: InputManager;
  private readonly animationPrefix: string;

  private readonly movementController: MovementController;
  private readonly dashController: DashController;
  private readonly hurtboxController: HurtboxController;
  private readonly abilityController: AbilityController;

  private readonly animationController: AnimationController;
  private readonly jumpAnimationController: JumpAnimationController;

  private readonly collisionDebugger: CollisionDebugger;
  private readonly visualSyncController: VisualSyncController;

  private dashAttackController?: DashAttackController;

  readonly fighter: Phaser.Physics.Matter.Sprite;
  readonly visual: Phaser.GameObjects.Sprite;

  private readonly abilities: readonly FighterAbility[];

  private readonly groundY: number;

  private health: number;
  private jumpsRemaining: number;

  private takingDamage = false;
  private neutralAttacking = false;

  private knockbackRemaining = 0;

  constructor(
    scene: Phaser.Scene,
    definition: CharacterDefinition,
    opponent: {
      x: number;
      fighter?: Phaser.Physics.Matter.Sprite;
      takeDamage?: (amount: number) => void;
    },
    input: InputManager,
    abilities: readonly FighterAbility[] = [],
    spawnX = 250,
    playerId = 'player',
    groundY = 520
  ) {
    this.scene = scene;
    this.definition = definition;
    this.opponent = opponent;
    this.input = input;
    this.abilities = abilities;
    this.groundY = groundY;

    this.animationPrefix =
      `${playerId}-${definition.id}`;

    this.health = definition.stats.maxHealth;

    this.jumpsRemaining =
      definition.stats.maxJumps;

    const idleAsset =
      definition.assets.spriteSheets.idle;

    this.visual = scene.add
      .sprite(spawnX, 348, idleAsset.key, 0)
      .setScale(definition.visualScale);

    this.hurtboxController = new HurtboxController(
      this.scene,
      this.visual,
      this.definition,
      this.groundY
    );

    this.fighter = FighterBodyFactory.create({
      scene: this.scene,
      definition: this.definition,
      hurtboxController: this.hurtboxController,
      spawnX
    });

    this.hurtboxController.setFighter(this.fighter);

    this.visualSyncController = new VisualSyncController(
      this.fighter,
      this.visual
    );

    this.abilityController = new AbilityController(
      this.abilities,
      {
        scene: this.scene,
        fighter: this.fighter,
        opponent: this.opponent,
        animationKey: (key) =>
          this.animationKey(key)
      },
      this.input
    );

    this.movementController = new MovementController(
      this.fighter,
      this.definition.stats
    );

    this.animationController = new AnimationController({
      scene: this.scene,
      visual: this.visual,
      definition: this.definition,
      animationPrefix: this.animationPrefix
    });

    this.dashController = new DashController(
      this.fighter,
      this.visual,
      this.definition,
      this.input,
      this.animationController
    );

    this.jumpAnimationController =
      new JumpAnimationController(
        this.animationController
      );

    this.collisionDebugger = new CollisionDebugger(
      this.scene,
      this.fighter,
      () => this.getPushboxBounds()
    );
  }

  // CONFIGURACIÓN

  setup() {
    this.animationController.setup();

    this.jumpAnimationController.setup();

    this.abilityController.setup();

    this.animationController.play('idle');
  }

  setupDashAttackController() {
    if (
      !this.definition.dashAttack ||
      !this.opponent.fighter ||
      !this.opponent.takeDamage
    ) {
      return;
    }

    this.dashAttackController?.destroy();

    this.dashAttackController =
      new DashAttackController(
        this.scene,
        this.visual,
        this.opponent.fighter,
        this.definition,
        this.input,
        this.animationController,
        this.dashController,
        this.opponent.takeDamage
      );
  }

  // ACTUALIZACIÓN

  update(delta = 16.6667) {
    // No actualizar durante el hitstop.
    if (HitStopController.isActive(this.scene)) {
      return;
    }

    this.visualSyncController.update();

    // Reducir el tiempo de protección del knockback.
    if (this.knockbackRemaining > 0) {
      this.knockbackRemaining = Math.max(
        0,
        this.knockbackRemaining - delta
      );
    }

    const knockbackActive =
      this.knockbackRemaining > 0;

    // HABILIDADES

    this.abilityController.update();

    // INPUTS

    const left = this.input.isDown('moveLeft');
    const right = this.input.isDown('moveRight');
    const crouching = this.input.isDown('crouch');

    const grounded = this.isGrounded();

    if (grounded) {
      this.jumpsRemaining =
        this.definition.stats.maxJumps;
    } else {
      this.movementController.applyGravity(delta);
    }

    const abilityBlocksMovement =
      this.abilityController.blocksMovement();

    // DASH

    this.dashController.updateInput(
      delta,
      grounded,
      this.neutralAttacking,
      this.takingDamage || knockbackActive,
      abilityBlocksMovement
    );

    // ATAQUE DEL DASH

    this.dashAttackController?.update();

    // Detener la actualización si comienza el hitstop.
    if (HitStopController.isActive(this.scene)) {
      return;
    }

    // MOVIMIENTO HORIZONTAL

    if (this.dashController.isDashing) {
      this.dashController.updateMovement();
    } else if (
      this.takingDamage ||
      knockbackActive
    ) {
      // Conservar la velocidad del knockback.
    } else if (
      this.neutralAttacking ||
      abilityBlocksMovement
    ) {
      this.fighter.setVelocityX(0);
    } else {
      this.movementController.applyMovement(
        left,
        right,
        crouching
      );
    }

    // SALTO

    if (
      !this.dashController.isDashing &&
      !this.takingDamage &&
      !knockbackActive &&
      !this.neutralAttacking &&
      !abilityBlocksMovement &&
      this.input.justPressed('jump') &&
      this.jumpsRemaining > 0
    ) {
      const isSecondJump =
        this.jumpsRemaining <
        this.definition.stats.maxJumps;

      this.fighter.setVelocityY(
        -this.definition.stats.jumpForce / 60
      );

      this.jumpsRemaining--;

      this.jumpAnimationController.startJump(
        isSecondJump
      );
    }

    // ACTUALIZACIÓN DE LA FÍSICA DEL SALTO

    const body =
      this.fighter.body as MatterJS.BodyType | null;

    this.jumpAnimationController.setPhysics({
      velocityY: this.fighter.getVelocity().y,

      distanceToGround: body
        ? Math.max(
            0,
            this.groundY - body.bounds.max.y
          )
        : Infinity,

      grounded: this.isGrounded()
    });

    this.jumpAnimationController.update(delta);

    // ORIENTACIÓN

    const opponentX =
      this.opponent.fighter?.x ??
      this.opponent.x;

    const opponentIsLeft =
      opponentX < this.fighter.x;

    const defaultFlipX =
      this.definition.defaultFlipX ?? false;

    this.visual.setFlipX(
      defaultFlipX
        ? !opponentIsLeft
        : opponentIsLeft
    );

    // ANIMACIONES

    this.updateAnimation(
      left,
      right,
      crouching
    );

    // HURTBOXES

    const groundedNow = this.isGrounded();

    const hurtboxState = !groundedNow
      ? 'jump'
      : crouching
        ? 'crouch'
        : 'idle';

    if (
      this.hurtboxController.updateHitboxTransform(
        hurtboxState
      )
    ) {
      this.visualSyncController.syncAfterBodyRebuild();
    }
  }

  // LIMPIEZA

  destroy() {
    this.dashAttackController?.destroy();

    this.dashAttackController = undefined;

    this.dashController.destroy();

    this.abilityController.destroy();

    this.jumpAnimationController.destroy();

    this.collisionDebugger.destroy(this.scene);

    this.visual.destroy();

    this.fighter.destroy();
  }

  // VIDA

  getHealth() {
    return this.health;
  }

  // ESTADOS

  isCrouching(): boolean {
    return (
      this.input.isDown('crouch') &&
      this.isGrounded()
    );
  }

  isAirborne(): boolean {
    return !this.isGrounded();
  }

  // PUSHBOX

  getPushboxBounds() {
    const centerX = this.fighter.x;
    const centerY = this.fighter.y;

    return {
      left: centerX - PUSHBOX_WIDTH / 2,
      right: centerX + PUSHBOX_WIDTH / 2,
      top: centerY - PUSHBOX_HEIGHT / 2,
      bottom: centerY + PUSHBOX_HEIGHT / 2,
      centerX,
      centerY,
      width: PUSHBOX_WIDTH,
      height: PUSHBOX_HEIGHT
    };
  }

  moveByPushboxX(amount: number) {
    if (amount === 0) {
      return;
    }

    const body =
      this.fighter.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    this.scene.matter.body.setPosition(body, {
      x: body.position.x + amount,
      y: body.position.y
    });

    this.visualSyncController.moveVisualX(amount);
  }

  // ATAQUES Y DAÑO

  setNeutralAttacking(attacking: boolean) {
    this.neutralAttacking = attacking;

    if (attacking) {
      this.dashController.cancel();

      this.fighter.setVelocityX(0);
    }
  }

  takeDamage(amount: number) {
    const damage = Math.max(0, amount);

    this.health = Phaser.Math.Clamp(
      this.health - damage,
      0,
      this.definition.stats.maxHealth
    );

    if (damage > 0) {
      this.dashController.cancel();
    }

    if (
      this.health <= 0 ||
      this.takingDamage ||
      !this.hasAnimation('takeDamage')
    ) {
      return;
    }

    this.takingDamage = true;

    // Proteger el empuje después del golpe.
    this.knockbackRemaining =
      KNOCKBACK_PROTECTION_MS;

    const animationKey =
      this.animationKey('takeDamage');

    this.visual.anims.play(animationKey, true);

    this.visual.once(
      `animationcomplete-${animationKey}`,
      () => {
        this.takingDamage = false;
      }
    );
  }

  // DETECCIÓN DEL SUELO

  private isGrounded(): boolean {
    const body =
      this.fighter.body as MatterJS.BodyType | null;

    if (!body) {
      return false;
    }

    return (
      body.bounds.max.y >= this.groundY - 3 &&
      body.velocity.y >= -0.5
    );
  }

  // ACTUALIZACIÓN DE ANIMACIONES

  private updateAnimation(
    left: boolean,
    right: boolean,
    crouching: boolean
  ) {
    if (
      this.dashController.isDashing ||
      this.neutralAttacking ||
      this.takingDamage ||
      this.knockbackRemaining > 0 ||
      this.jumpAnimationController.isActive
    ) {
      return;
    }

    if (this.abilityController.blocksMovement()) {
      return;
    }

    if (!this.isGrounded()) {
      return;
    }

    if (crouching) {
      if (this.hasAnimation('idleCrouch')) {
        this.playAnimation('idleCrouch');
      } else if (this.hasAnimation('crouch')) {
        this.playAnimation('crouch');
      }

      return;
    }

    if (left || right) {
      const movingBackward = this.visual.flipX
        ? right
        : left;

      this.playAnimation(
        movingBackward &&
        this.hasAnimation('walk-back')
          ? 'walk-back'
          : 'walk'
      );
    } else {
      this.playAnimation('idle');
    }
  }

  // UTILIDADES

  private hasAnimation(key: string) {
    return this.animationController.has(key);
  }

  private playAnimation(key: string) {
    this.animationController.play(key);
  }

  private animationKey(key: string) {
    return this.animationController.getKey(key);
  }
}
