
import Phaser from 'phaser';
import type { FighterAbility } from './abilities/types';
import type { CharacterDefinition } from '../characters/types';
import { InputManager } from './input/InputManager';

export class CharacterController {
  private readonly scene: Phaser.Scene;
  private readonly definition: CharacterDefinition;
  private readonly opponent: {
    x: number;
    fighter?: Phaser.Physics.Arcade.Sprite;
    takeDamage?: (amount: number) => void;
  };
  private readonly input: InputManager;
  private readonly animationPrefix: string;
  readonly fighter: Phaser.Physics.Arcade.Sprite;
  private readonly debugHitbox: Phaser.GameObjects.Graphics;
  private readonly abilities: readonly FighterAbility[];

  private lastHitboxFlipX?: boolean;
  private health: number;
  private jumpsRemaining: number;
  private takingDamage = false;

  constructor(
    scene: Phaser.Scene,
    definition: CharacterDefinition,
    opponent: { x: number },
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
    this.animationPrefix = `${playerId}-${definition.id}`;
    this.health = definition.stats.maxHealth;
    this.jumpsRemaining = definition.stats.maxJumps;
    this.fighter = this.createFighter(spawnX, groundY);
    this.debugHitbox = scene.add.graphics().setDepth(10);

    scene.events.on('postupdate', this.updateDebugHitbox);
  }

  setup() {
    this.definition.animations.forEach((animation) => {
      const asset = this.definition.assets.spriteSheets[animation.assetKey];

      this.scene.anims.create({
        key: this.animationKey(animation.key),
        frames: this.scene.anims.generateFrameNumbers(asset.key, {
          start: animation.startFrame,
          end: animation.endFrame
        }),
        frameRate: animation.frameRate,
        repeat: animation.repeat
      });
    });

    // Detecta automáticamente el penúltimo frame del salto.
    this.fighter.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      this.handleJumpAnimationUpdate,
      this
    );

    this.abilities.forEach((ability) => {
      ability.setup({
        scene: this.scene,
        fighter: this.fighter,
        opponent: this.opponent,
        animationKey: (key) => this.animationKey(key)
      });
    });

    this.playAnimation('idle');
  }

  update() {
    this.abilities.forEach((ability) => {
      if (this.input.justPressed('specialAttack')) {
        ability.handleAction?.('specialAttack', true);
      }

      if (this.input.justReleased('specialAttack')) {
        ability.handleAction?.('specialAttack', false);
      }
    });

    this.abilities.forEach((ability) => ability.update());

    const left = this.input.isDown('moveLeft');
    const right = this.input.isDown('moveRight');
    const crouching = this.input.isDown('crouch');

    if (this.fighter.body!.blocked.down) {
      this.jumpsRemaining = this.definition.stats.maxJumps;
    }

    const abilityBlocksMovement = this.abilities.some(
      (ability) => ability.blocksMovement?.() ?? false
    );

    if (abilityBlocksMovement) {
      this.fighter.setVelocityX(0);
    } else {
      this.applyMovement(left, right, crouching);
    }

    if (
      !abilityBlocksMovement &&
      this.input.justPressed('jump') &&
      this.jumpsRemaining > 0
    ) {
      this.fighter.setVelocityY(-this.definition.stats.jumpForce);
      this.jumpsRemaining -= 1;

      if (this.jumpsRemaining < this.definition.stats.maxJumps) {
        const isSecondJump =
          this.jumpsRemaining < this.definition.stats.maxJumps - 1;

        this.playAnimation(
          isSecondJump && this.hasAnimation('airJump')
            ? 'airJump'
            : 'jump'
        );
      }
    }

    this.fighter.setFlipX(this.opponent.x < this.fighter.x);

    this.updateHitboxTransform();
    this.updateAnimation(left, right, crouching);
  }

  destroy() {
    this.abilities.forEach((ability) => ability.destroy());

    this.fighter.off(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      this.handleJumpAnimationUpdate,
      this
    );

    this.scene.events.off('postupdate', this.updateDebugHitbox);

    this.debugHitbox.destroy();
    this.fighter.destroy();
  }

  getHealth() {
    return this.health;
  }

  takeDamage(amount: number) {
    const damage = Math.max(0, amount);

    this.health = Phaser.Math.Clamp(
      this.health - damage,
      0,
      this.definition.stats.maxHealth
    );

    // Solo los golpes leves producen esta reacción.
    if (
      damage > 10 ||
      this.health <= 0 ||
      this.takingDamage ||
      !this.hasAnimation('takeDamage')
    ) {
      return;
    }

    this.takingDamage = true;

    const animationKey = this.animationKey('takeDamage');

    this.fighter.anims.play(animationKey, true);

    this.fighter.once(
      `animationcomplete-${animationKey}`,
      () => {
        this.takingDamage = false;
      }
    );
  }

  private createFighter(spawnX: number, groundY: number) {
    const spawnY = 348;

    const sprite = this.scene.physics.add.sprite(
      spawnX,
      spawnY,
      this.definition.assets.spriteSheets.idle.key,
      0
    );

    sprite.setScale(this.definition.visualScale);

    const body = sprite.body!;

    body.setSize(
      this.definition.hitbox.width,
      this.definition.hitbox.height
    );

    body.setOffset(
      this.definition.hitbox.offsetX,
      this.definition.hitbox.offsetY
    );

    sprite.setCollideWorldBounds(true);
    sprite.setGravityY(this.definition.stats.fallSpeed);

    body.reset(spawnX, spawnY);

    if (body.bottom >= groundY) {
      body.reset(
        spawnX,
        spawnY - (body.bottom - groundY) - 1
      );
    }

    return sprite;
  }

  private handleJumpAnimationUpdate(
    animation: Phaser.Animations.Animation,
    frame: Phaser.Animations.AnimationFrame
  ) {
    const isJumpAnimation =
      animation.key === this.animationKey('jump') ||
      animation.key === this.animationKey('airJump');

    if (!isJumpAnimation) {
      return;
    }

    // Obtiene la posición del penúltimo frame.
    const penultimateFrame = animation.frames.length - 2;

    if (frame.index === penultimateFrame) {
      this.fighter.anims.pause();
    }
  }

  private updateHitboxTransform() {
    const body = this.fighter.body as Phaser.Physics.Arcade.Body;

    if (this.lastHitboxFlipX === this.fighter.flipX) {
      return;
    }

    const idleAsset = this.definition.assets.spriteSheets.idle;

    const offsetX = this.fighter.flipX
      ? idleAsset.frameWidth -
        this.definition.hitbox.width -
        this.definition.hitbox.offsetX
      : this.definition.hitbox.offsetX;

    body.setOffset(offsetX, this.definition.hitbox.offsetY);

    this.lastHitboxFlipX = this.fighter.flipX;
  }

  private applyMovement(
    left: boolean,
    right: boolean,
    crouching: boolean
  ) {
    if (crouching) {
      this.fighter.setVelocityX(0);
    } else if (left) {
      this.fighter.setVelocityX(-this.definition.stats.movementSpeed);
    } else if (right) {
      this.fighter.setVelocityX(this.definition.stats.movementSpeed);
    } else {
      this.fighter.setVelocityX(0);
    }
  }

  private updateAnimation(
    left: boolean,
    right: boolean,
    crouching: boolean
  ) {
    if (this.takingDamage) {
      return;
    }

    if (
      this.abilities.some(
        (ability) => ability.blocksMovement?.() ?? false
      )
    ) {
      return;
    }

    if (!this.fighter.body!.blocked.down) {
      if (
        this.fighter.anims.currentAnim?.key !==
        this.animationKey('airJump')
      ) {
        this.playAnimation('jump');
      }
    } else if (crouching) {
      this.playAnimation('crouch');
    } else if (left || right) {
      const movingBackward = this.fighter.flipX
        ? right
        : left;

      this.playAnimation(
        movingBackward && this.hasAnimation('walk-back')
          ? 'walk-back'
          : 'walk'
      );
    } else {
      this.playAnimation('idle');
    }
  }

  private hasAnimation(key: string) {
    return this.definition.animations.some(
      (animation) => animation.key === key
    );
  }

  private readonly updateDebugHitbox = () => {
    const body = this.fighter.body as Phaser.Physics.Arcade.Body;

    this.debugHitbox
      .clear()
      .lineStyle(2, 0xff0000, 1)
      .fillStyle(0xff0000, 0.15)
      .fillRect(body.x, body.y, body.width, body.height)
      .strokeRect(body.x, body.y, body.width, body.height);
  };

  private playAnimation(key: string) {
    if (!this.hasAnimation(key)) {
      return;
    }

    const animationKey = this.animationKey(key);

    if (this.fighter.anims.currentAnim?.key !== animationKey) {
      this.fighter.anims.play(animationKey);
    }
  }

  private animationKey(key: string) {
    return `${this.animationPrefix}-${key}`;
  }
}
