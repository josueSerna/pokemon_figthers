
import Phaser from 'phaser';

import type { FighterAbility } from './abilities/types';
import type { CharacterDefinition } from '../characters/types';
import { InputManager } from './input/InputManager';
import {
  SpriteBoundsAnalyzer,
  type SpriteBounds
} from './physics/SpriteBoundsAnalyzer';

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
  private readonly analyzer: SpriteBoundsAnalyzer;

  readonly fighter: Phaser.Physics.Matter.Sprite;
  readonly visual: Phaser.GameObjects.Sprite;

  private readonly debugHitbox: Phaser.GameObjects.Graphics;
  private readonly abilities: readonly FighterAbility[];

  private readonly groundY: number;

  private currentFrameKey?: string;

  private bodyOffsetX = 0;
  private bodyOffsetY = 0;

  private lastBodyX = 0;
  private lastBodyY = 0;

  private health: number;
  private jumpsRemaining: number;

  private takingDamage = false;
  private landing = false;
  private wasAirborne = false;
  private neutralAttacking = false;

  private landingTimer?: Phaser.Time.TimerEvent;

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

    this.animationPrefix = `${playerId}-${definition.id}`;

    this.health = definition.stats.maxHealth;
    this.jumpsRemaining = definition.stats.maxJumps;

    this.analyzer = new SpriteBoundsAnalyzer(scene);

    const idleAsset = definition.assets.spriteSheets.idle;

    this.visual = scene.add
      .sprite(spawnX, 348, idleAsset.key, 0)
      .setScale(definition.visualScale);

    this.fighter = this.createFighter(spawnX);

    this.lastBodyX = this.fighter.x;
    this.lastBodyY = this.fighter.y;

    this.debugHitbox = scene.add.graphics().setDepth(10);

    scene.events.on('postupdate', this.updateDebugHitbox);

    this.updateHitboxTransform();
  }

  setup() {
    this.definition.animations.forEach((animation) => {
      const asset =
        this.definition.assets.spriteSheets[animation.assetKey];

      const frames = this.scene.anims.generateFrameNumbers(asset.key, {
        start: animation.startFrame,
        end: animation.endFrame
      });

      if (frames.length === 0) {
        console.error(
          `No se pudieron generar frames para: ${animation.key}`
        );
        return;
      }

      const animationKey = this.animationKey(animation.key);

      if (this.scene.anims.exists(animationKey)) {
        return;
      }

      this.scene.anims.create({
        key: animationKey,
        frames,
        frameRate: animation.frameRate,
        repeat: animation.repeat
      });
    });

    this.visual.on(
      `animationcomplete-${this.animationKey('jump')}`,
      this.handleJumpComplete
    );

    this.visual.on(
      `animationcomplete-${this.animationKey('airJump')}`,
      this.handleAirJumpComplete
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
    this.updateHitboxTransform();
  }

  update(delta = 16.6667) {
    this.syncVisualPosition();

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

    const grounded = this.isGrounded();

    if (grounded) {
      this.jumpsRemaining = this.definition.stats.maxJumps;

      if (this.wasAirborne) {
        this.wasAirborne = false;
        this.startLanding();
      }
    } else {
      this.applyGravity(delta);
    }

    const abilityBlocksMovement = this.abilities.some(
      (ability) => ability.blocksMovement?.() ?? false
    );

    if (this.neutralAttacking || abilityBlocksMovement) {
      this.fighter.setVelocityX(0);
    } else {
      this.applyMovement(left, right, crouching);
    }

    if (
      !this.neutralAttacking &&
      !abilityBlocksMovement &&
      !this.landing &&
      this.input.justPressed('jump') &&
      this.jumpsRemaining > 0
    ) {
      const isSecondJump =
        this.jumpsRemaining < this.definition.stats.maxJumps;

      this.fighter.setVelocityY(
        -this.definition.stats.jumpForce / 60
      );

      this.jumpsRemaining--;
      this.wasAirborne = true;

      if (isSecondJump && this.hasAnimation('airJump')) {
        this.playAnimation('airJump');
      } else {
        this.playAnimation('jump');
      }
    }

    const opponentX = this.opponent.fighter?.x ?? this.opponent.x;
    const opponentIsLeft = opponentX < this.fighter.x;
    const defaultFlipX = this.definition.defaultFlipX ?? false;

    this.visual.setFlipX(
      defaultFlipX ? !opponentIsLeft : opponentIsLeft
    );

    this.updateAnimation(left, right, crouching);
    this.updateHitboxTransform();
  }

  destroy() {
    this.abilities.forEach((ability) => ability.destroy());

    this.landingTimer?.remove(false);

    this.visual.off(
      `animationcomplete-${this.animationKey('jump')}`,
      this.handleJumpComplete
    );

    this.visual.off(
      `animationcomplete-${this.animationKey('airJump')}`,
      this.handleAirJumpComplete
    );

    this.scene.events.off('postupdate', this.updateDebugHitbox);

    this.debugHitbox.destroy();
    this.visual.destroy();
    this.fighter.destroy();
    this.analyzer.destroy();
  }

  getHealth() {
    return this.health;
  }

  setNeutralAttacking(attacking: boolean) {
    this.neutralAttacking = attacking;

    if (attacking) {
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

    this.visual.anims.play(animationKey, true);

    this.visual.once(
      `animationcomplete-${animationKey}`,
      () => {
        this.takingDamage = false;
      }
    );
  }

  // --------------------------------------------------
  // CREACIÓN DEL CUERPO
  // --------------------------------------------------

  private createFighter(spawnX: number) {
    const spawnY = 348;

    const idleAsset = this.definition.assets.spriteSheets.idle;

    const sprite = this.scene.matter.add.sprite(
      spawnX,
      spawnY,
      idleAsset.key,
      0
    );

    sprite.setVisible(false);

    const bounds = this.getCurrentSpriteBounds();
    const frame = this.visual.frame;
    const scale = this.definition.visualScale;

    this.bodyOffsetX =
      (bounds.centerX - frame.cutWidth / 2) * scale;

    this.bodyOffsetY =
      (bounds.centerY - frame.cutHeight / 2) * scale;

    const capsule = this.createCapsuleBody({
      width: bounds.width * scale,
      height: bounds.height * scale
    });

    this.scene.matter.body.setPosition(capsule, {
      x: spawnX + this.bodyOffsetX,
      y: spawnY + this.bodyOffsetY
    });

    sprite.setExistingBody(capsule);

    const fighterBody = sprite.body as MatterJS.BodyType;

    const fighterCategory = 0x0002;
    const worldCategory = 0x0001;

    fighterBody.collisionFilter.category = fighterCategory;
    fighterBody.collisionFilter.mask = worldCategory;
    fighterBody.collisionFilter.group = 0;

    fighterBody.parts.forEach((part) => {
      part.collisionFilter.category = fighterCategory;
      part.collisionFilter.mask = worldCategory;
      part.collisionFilter.group = 0;
    });

    sprite.setIgnoreGravity(true);
    sprite.setFixedRotation();
    sprite.setFriction(0, 0, 0);
    sprite.setBounce(0);

    return sprite;
  }

  /**
   * Los luchadores solo colisionan con el escenario.
   * La interacción entre ambos se resuelve desde GameScene.
   */
  private configureCollisionFilter() {
    const body = this.fighter.body as MatterJS.BodyType | null;

    if (!body) return;

    const fighterCategory = 0x0002;
    const worldCategory = 0x0001;

    body.collisionFilter.category = fighterCategory;
    body.collisionFilter.mask = worldCategory;
    body.collisionFilter.group = 0;

    body.parts.forEach((part) => {
      part.collisionFilter.category = fighterCategory;
      part.collisionFilter.mask = worldCategory;
      part.collisionFilter.group = 0;
    });
  }

  // --------------------------------------------------
  // ANÁLISIS DEL SPRITE
  // --------------------------------------------------

  private getCurrentSpriteBounds(): SpriteBounds {
    const textureKey = this.visual.texture.key;
    const frame = this.visual.frame;

    const bounds = this.analyzer.analyze(
      textureKey,
      frame.name
    );

    if (bounds) {
      return bounds;
    }

    return {
      x: 0,
      y: 0,
      width: frame.cutWidth,
      height: frame.cutHeight,
      centerX: frame.cutWidth / 2,
      centerY: frame.cutHeight / 2
    };
  }

  private updateHitboxTransform() {
    const frame = this.visual.frame;

    const frameKey = `${this.visual.texture.key}:${frame.name}`;

    if (this.currentFrameKey === frameKey) {
      return;
    }

    const bounds = this.getCurrentSpriteBounds();

    const frameCenterX = frame.cutWidth / 2;
    const frameCenterY = frame.cutHeight / 2;

    const scaleX = this.visual.scaleX;
    const scaleY = this.visual.scaleY;

    const flipDirection = this.visual.flipX ? -1 : 1;

    const velocity = this.fighter.getVelocity();

    const oldBody = this.fighter.body as MatterJS.BodyType | null;

    const wasGrounded =
      oldBody !== null &&
      oldBody.bounds.max.y >= this.groundY - 8 &&
      velocity.y >= -0.5;

    if (wasGrounded) {
      const visibleBottomOffset =
        (bounds.y + bounds.height - frameCenterY) * scaleY;

      this.visual.y = this.groundY - visibleBottomOffset;
    }

    this.bodyOffsetX =
      (bounds.centerX - frameCenterX) *
      scaleX *
      flipDirection;

    this.bodyOffsetY =
      (bounds.centerY - frameCenterY) * scaleY;

    const capsule = this.createCapsuleBody({
      width: bounds.width * scaleX,
      height: bounds.height * scaleY
    });

    const capsuleX = this.visual.x + this.bodyOffsetX;
    const capsuleY = this.visual.y + this.bodyOffsetY;

    this.scene.matter.body.setPosition(capsule, {
      x: capsuleX,
      y: capsuleY
    });

    this.fighter.setExistingBody(capsule);

    this.configureCollisionFilter();

    this.fighter.setVelocity(velocity.x, velocity.y);

    this.fighter.setIgnoreGravity(true);
    this.fighter.setFixedRotation();
    this.fighter.setFriction(0, 0, 0);
    this.fighter.setBounce(0);

    this.lastBodyX = this.fighter.x;
    this.lastBodyY = this.fighter.y;

    this.currentFrameKey = frameKey;
  }

  private syncVisualPosition() {
    const deltaX = this.fighter.x - this.lastBodyX;
    const deltaY = this.fighter.y - this.lastBodyY;

    this.visual.x += deltaX;
    this.visual.y += deltaY;

    this.lastBodyX = this.fighter.x;
    this.lastBodyY = this.fighter.y;
  }

  // --------------------------------------------------
  // CÁPSULA DE MATTER
  // --------------------------------------------------

  private createCapsuleBody(size: {
    width: number;
    height: number;
  }): MatterJS.BodyType {
    const width = Math.max(2, size.width);
    const height = Math.max(2, size.height);

    const radius = Math.min(width, height) / 2;

    const parts: MatterJS.BodyType[] = [];

    const bodies = this.scene.matter.bodies;

    if (height >= width) {
      const middleHeight = height - radius * 2;

      if (middleHeight > 0) {
        parts.push(
          bodies.rectangle(0, 0, width, middleHeight)
        );
      }

      parts.push(
        bodies.circle(0, -middleHeight / 2, radius)
      );

      parts.push(
        bodies.circle(0, middleHeight / 2, radius)
      );
    } else {
      const middleWidth = width - radius * 2;

      if (middleWidth > 0) {
        parts.push(
          bodies.rectangle(0, 0, middleWidth, height)
        );
      }

      parts.push(
        bodies.circle(-middleWidth / 2, 0, radius)
      );

      parts.push(
        bodies.circle(middleWidth / 2, 0, radius)
      );
    }

    return this.scene.matter.body.create({
      parts,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0,
      label: 'fighter-hitbox'
    });
  }

  // --------------------------------------------------
  // MOVIMIENTO Y GRAVEDAD
  // --------------------------------------------------

  private applyGravity(delta: number) {
    const currentVelocity = this.fighter.getVelocity().y;
    const gravity = this.definition.stats.fallSpeed;

    const gravityStep = gravity * (delta / 1000) / 60;
    const nextVelocity = currentVelocity + gravityStep;

    this.fighter.setVelocityY(
      Math.min(nextVelocity, 1200 / 60)
    );
  }

  private applyMovement(
    left: boolean,
    right: boolean,
    crouching: boolean
  ) {
    const speed = this.definition.stats.movementSpeed / 60;

    if (crouching) {
      this.fighter.setVelocityX(0);
    } else if (left) {
      this.fighter.setVelocityX(-speed);
    } else if (right) {
      this.fighter.setVelocityX(speed);
    } else {
      this.fighter.setVelocityX(0);
    }
  }

  private isGrounded(): boolean {
    const body = this.fighter.body as MatterJS.BodyType | null;

    if (!body) {
      return false;
    }

    return (
      body.bounds.max.y >= this.groundY - 3 &&
      body.velocity.y >= -0.5
    );
  }

  // --------------------------------------------------
  // ANIMACIONES DE SALTO Y ATERRIZAJE
  // --------------------------------------------------

  private readonly handleJumpComplete = () => {
    if (this.isGrounded()) return;

    this.playAnimation('jump-fall');
  };

  private readonly handleAirJumpComplete = () => {
    if (this.isGrounded()) return;

    this.playAnimation('airJump-fall');
  };

  private startLanding() {
    this.landing = true;

    this.visual.anims.stop();

    const fallAnimation =
      this.definition.animations.find(
        (animation) => animation.key === 'airJump-fall'
      ) ??
      this.definition.animations.find(
        (animation) => animation.key === 'jump-fall'
      );

    if (fallAnimation) {
      const asset =
        this.definition.assets.spriteSheets[fallAnimation.assetKey];

      const landingFrame = fallAnimation.endFrame + 1;

      const texture = this.scene.textures.get(asset.key);

      if (texture.has(String(landingFrame))) {
        this.visual.setTexture(asset.key, landingFrame);
        this.currentFrameKey = undefined;
      }
    }

    this.landingTimer?.remove(false);

    this.landingTimer = this.scene.time.delayedCall(120, () => {
      this.landing = false;
      this.landingTimer = undefined;
    });
  }

  // --------------------------------------------------
  // ACTUALIZACIÓN DE ANIMACIONES
  // --------------------------------------------------

  private updateAnimation(
    left: boolean,
    right: boolean,
    crouching: boolean
  ) {
    if (
      this.neutralAttacking ||
      this.takingDamage ||
      this.landing
    ) {
      return;
    }

    if (
      this.abilities.some(
        (ability) => ability.blocksMovement?.() ?? false
      )
    ) {
      return;
    }

    if (!this.isGrounded()) {
      const currentAnimation = this.visual.anims.currentAnim?.key;

      const airborneAnimations = [
        'jump',
        'jump-fall',
        'airJump',
        'airJump-fall'
      ];

      const isPlayingAirborneAnimation = airborneAnimations.some(
        (key) => currentAnimation === this.animationKey(key)
      );

      if (!isPlayingAirborneAnimation) {
        this.playAnimation('jump');
      }

      return;
    }

    if (crouching && this.hasAnimation('crouch')) {
      this.playAnimation('crouch');
    } else if (left || right) {
      const movingBackward = this.visual.flipX
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

  // --------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------

  private hasAnimation(key: string) {
    return this.definition.animations.some(
      (animation) => animation.key === key
    );
  }

  private readonly updateDebugHitbox = () => {
    const body = this.fighter.body as MatterJS.BodyType | null;

    if (!body) return;

    const bounds = body.bounds;

    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;

    const radius = Math.min(width, height) / 2;

    this.debugHitbox
      .clear()
      .lineStyle(2, 0xff0000, 1)
      .fillStyle(0xff0000, 0.15)
      .fillRoundedRect(
        bounds.min.x,
        bounds.min.y,
        width,
        height,
        radius
      )
      .strokeRoundedRect(
        bounds.min.x,
        bounds.min.y,
        width,
        height,
        radius
      );
  };

  private playAnimation(key: string) {
    if (!this.hasAnimation(key)) {
      return;
    }

    const animationKey = this.animationKey(key);

    if (!this.scene.anims.exists(animationKey)) {
      return;
    }

    if (this.visual.anims.currentAnim?.key !== animationKey) {
      this.visual.anims.play(animationKey);
    }
  }

  private animationKey(key: string) {
    return `${this.animationPrefix}-${key}`;
  }
}
