
import Phaser from 'phaser';

import type { FighterAbility } from './abilities/types';
import type { CharacterDefinition } from '../characters/types';
import { InputManager } from './input/InputManager';
import {
  SpriteBoundsAnalyzer,
  type SpriteBounds
} from './physics/SpriteBoundsAnalyzer';

import { AnimationController } from './animations/AnimationController';
import { JumpAnimationController } from './animations/movement/JumpAnimationController';

const PUSHBOX_WIDTH = 72;
const PUSHBOX_HEIGHT = 110;

// Tamaño de las hurtboxes respecto a la silueta visible.
const HURTBOX_WIDTH_FACTOR = 0.90;
const HURTBOX_HEIGHT_FACTOR = 0.96;

// Distribución vertical.
const HURTBOX_HEAD_HEIGHT = 0.24;
const HURTBOX_TORSO_HEIGHT = 0.40;

// Anchura de cada región.
const HURTBOX_HEAD_WIDTH = 0.72;
const HURTBOX_TORSO_WIDTH = 1;
const HURTBOX_LEGS_WIDTH = 0.82;

// Colores del debug.
const HEAD_COLOR = 0xf0b34a;
const TORSO_COLOR = 0x439fe0;
const LEGS_COLOR = 0x42b983;
const PUSHBOX_COLOR = 0xd65bce;

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

  private readonly animationController: AnimationController;
  private readonly jumpAnimationController: JumpAnimationController;

  readonly fighter: Phaser.Physics.Matter.Sprite;
  readonly visual: Phaser.GameObjects.Sprite;

  private readonly debugCollisions: Phaser.GameObjects.Graphics;
  private readonly abilities: readonly FighterAbility[];

  private readonly groundY: number;

  private bodyOffsetX = 0;
  private bodyOffsetY = 0;

  private lastBodyX = 0;
  private lastBodyY = 0;

  private currentFrameKey?: string;

  private health: number;
  private jumpsRemaining: number;

  private takingDamage = false;
  private neutralAttacking = false;

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

    this.animationController = new AnimationController({
      scene: this.scene,
      visual: this.visual,
      definition: this.definition,
      animationPrefix: this.animationPrefix
    });

    this.jumpAnimationController = new JumpAnimationController(
      this.animationController
    );

    this.lastBodyX = this.fighter.x;
    this.lastBodyY = this.fighter.y;

    this.debugCollisions = scene.add.graphics().setDepth(10);

    scene.events.on('postupdate', this.updateDebugCollisions);

    this.updateHitboxTransform();
  }

  setup() {
    this.animationController.setup();
    this.jumpAnimationController.setup();

    this.abilities.forEach((ability) => {
      ability.setup({
        scene: this.scene,
        fighter: this.fighter,
        opponent: this.opponent,
        animationKey: (key) => this.animationKey(key)
      });
    });

    this.animationController.play('idle');
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

    // --------------------------------------------------
    // SALTO
    // --------------------------------------------------

    if (
      !this.neutralAttacking &&
      !abilityBlocksMovement &&
      this.input.justPressed('jump') &&
      this.jumpsRemaining > 0
    ) {
      const isSecondJump =
        this.jumpsRemaining < this.definition.stats.maxJumps;

      this.fighter.setVelocityY(
        -this.definition.stats.jumpForce / 60
      );

      this.jumpsRemaining--;

      this.jumpAnimationController.startJump(isSecondJump);
    }

    // --------------------------------------------------
    // ACTUALIZACIÓN DE LA FÍSICA DEL SALTO
    // --------------------------------------------------

    const body = this.fighter.body as MatterJS.BodyType | null;

    this.jumpAnimationController.setPhysics({
      velocityY: this.fighter.getVelocity().y,

      distanceToGround: body
        ? Math.max(0, this.groundY - body.bounds.max.y)
        : Infinity,

      grounded: this.isGrounded()
    });

    this.jumpAnimationController.update(delta);

    // --------------------------------------------------
    // ORIENTACIÓN
    // --------------------------------------------------

    const opponentX = this.opponent.fighter?.x ?? this.opponent.x;
    const opponentIsLeft = opponentX < this.fighter.x;
    const defaultFlipX = this.definition.defaultFlipX ?? false;

    this.visual.setFlipX(
      defaultFlipX ? !opponentIsLeft : opponentIsLeft
    );

    this.updateAnimation(left, right, crouching);

    // Actualiza las hurtboxes solamente cuando cambia el frame.
    this.updateHitboxTransform();
  }

  destroy() {
    this.abilities.forEach((ability) => ability.destroy());

    this.jumpAnimationController.destroy();

    this.scene.events.off(
      'postupdate',
      this.updateDebugCollisions
    );

    this.debugCollisions.destroy();
    this.visual.destroy();
    this.fighter.destroy();
    this.analyzer.destroy();
  }

  getHealth() {
    return this.health;
  }

  // --------------------------------------------------
  // PUSHBOX
  // --------------------------------------------------

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
    if (amount === 0) return;

    const body = this.fighter.body as MatterJS.BodyType | null;

    if (!body) return;

    this.scene.matter.body.setPosition(body, {
      x: body.position.x + amount,
      y: body.position.y
    });

    this.visual.x += amount;
    this.lastBodyX += amount;
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

    const hurtbox = this.createHurtboxBody(bounds);

    this.bodyOffsetX = hurtbox.offsetX;
    this.bodyOffsetY = hurtbox.offsetY;

    this.scene.matter.body.setPosition(hurtbox.body, {
      x: spawnX + this.bodyOffsetX,
      y: spawnY + this.bodyOffsetY
    });

    sprite.setExistingBody(hurtbox.body);

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
  // CREACIÓN DE LAS TRES HURTBOXES
  // --------------------------------------------------

  private createHurtboxBody(
    bounds: SpriteBounds
  ): {
    body: MatterJS.BodyType;
    offsetX: number;
    offsetY: number;
  } {
    const frame = this.visual.frame;

    const scaleX = Math.abs(this.visual.scaleX);
    const scaleY = Math.abs(this.visual.scaleY);

    const width = Math.max(
      2,
      bounds.width * scaleX * HURTBOX_WIDTH_FACTOR
    );

    const height = Math.max(
      6,
      bounds.height * scaleY * HURTBOX_HEIGHT_FACTOR
    );

    const headHeight = height * HURTBOX_HEAD_HEIGHT;
    const torsoHeight = height * HURTBOX_TORSO_HEIGHT;
    const legsHeight = height - headHeight - torsoHeight;

    const headWidth = width * HURTBOX_HEAD_WIDTH;
    const torsoWidth = width * HURTBOX_TORSO_WIDTH;
    const legsWidth = width * HURTBOX_LEGS_WIDTH;

    // Posiciones verticales medidas desde la parte superior.
    const headCenterY = headHeight / 2;

    const torsoCenterY =
      headHeight + torsoHeight / 2;

    const legsCenterY =
      headHeight + torsoHeight + legsHeight / 2;

    // Centro de masa ponderado por el área de cada caja.
    const headArea = headWidth * headHeight;
    const torsoArea = torsoWidth * torsoHeight;
    const legsArea = legsWidth * legsHeight;

    const totalArea = headArea + torsoArea + legsArea;

    const centerOfMassY = (
      headCenterY * headArea +
      torsoCenterY * torsoArea +
      legsCenterY * legsArea
    ) / totalArea;

    const bodies = this.scene.matter.bodies;

    const parts: MatterJS.BodyType[] = [
      // Cabeza.
      bodies.rectangle(
        0,
        headCenterY - centerOfMassY,
        headWidth,
        headHeight
      ),

      // Torso.
      bodies.rectangle(
        0,
        torsoCenterY - centerOfMassY,
        torsoWidth,
        torsoHeight
      ),

      // Piernas.
      bodies.rectangle(
        0,
        legsCenterY - centerOfMassY,
        legsWidth,
        legsHeight
      )
    ];

    const body = this.scene.matter.body.create({
      parts,
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: 0,
      label: 'fighter-hurtboxes'
    });

    const flipDirection = this.visual.flipX ? -1 : 1;

    // Centro horizontal de la silueta visible.
    const offsetX =
      (bounds.centerX - frame.cutWidth / 2) *
      scaleX *
      flipDirection;

    // Centro de masa vertical respecto al origen del sprite.
    const offsetY =
      (bounds.y - frame.cutHeight / 2) * scaleY +
      centerOfMassY;

    return {
      body,
      offsetX,
      offsetY
    };
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

  /**
   * Reconstruye las hurtboxes cuando cambia el frame.
   * Conserva la velocidad y la posición visual del luchador.
   */
  private updateHitboxTransform() {
    const frame = this.visual.frame;

    const frameKey = `${this.visual.texture.key}:${frame.name}`;

    if (this.currentFrameKey === frameKey) {
      return;
    }

    const bounds = this.getCurrentSpriteBounds();

    const scaleY = Math.abs(this.visual.scaleY);
    const velocity = this.fighter.getVelocity();

    const oldBody = this.fighter.body as MatterJS.BodyType | null;

    const wasGrounded =
      oldBody !== null &&
      oldBody.bounds.max.y >= this.groundY - 8 &&
      velocity.y >= -0.5;

    // Cuando está en el suelo, alineamos la parte inferior
    // de las hurtboxes con el suelo.
    if (wasGrounded) {
      const hurtboxHeight =
        bounds.height *
        scaleY *
        HURTBOX_HEIGHT_FACTOR;

      const hurtboxTopOffset =
        (bounds.y - frame.cutHeight / 2) * scaleY;

      const hurtboxBottomOffset =
        hurtboxTopOffset + hurtboxHeight;

      this.visual.y = this.groundY - hurtboxBottomOffset;
    }

    const hurtbox = this.createHurtboxBody(bounds);

    this.bodyOffsetX = hurtbox.offsetX;
    this.bodyOffsetY = hurtbox.offsetY;

    const targetX = this.visual.x + this.bodyOffsetX;
    const targetY = this.visual.y + this.bodyOffsetY;

    this.scene.matter.body.setPosition(hurtbox.body, {
      x: targetX,
      y: targetY
    });

    this.fighter.setExistingBody(hurtbox.body);

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
      this.jumpAnimationController.isActive
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
        movingBackward && this.hasAnimation('walk-back')
          ? 'walk-back'
          : 'walk'
      );
    } else {
      this.playAnimation('idle');
    }
  }

  // --------------------------------------------------
  // DEBUG DE COLISIONES
  // --------------------------------------------------

  private readonly updateDebugCollisions = () => {
    const body = this.fighter.body as MatterJS.BodyType | null;

    this.debugCollisions.clear();

    if (!body) return;

    const colors = [
      HEAD_COLOR,
      TORSO_COLOR,
      LEGS_COLOR
    ];

    // Las partes 1, 2 y 3 son las tres hurtboxes.
    const hurtboxParts = body.parts.slice(1);

    hurtboxParts.forEach((part, index) => {
      const color = colors[index];

      if (color === undefined) return;

      const bounds = part.bounds;

      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;

      this.debugCollisions
        .fillStyle(color, 0.20)
        .fillRect(
          bounds.min.x,
          bounds.min.y,
          width,
          height
        );

      this.debugCollisions
        .lineStyle(2, color, 1)
        .strokeRect(
          bounds.min.x,
          bounds.min.y,
          width,
          height
        );
    });

    // Pushbox independiente de las hurtboxes.
    const pushbox = this.getPushboxBounds();

    this.debugCollisions
      .lineStyle(2, PUSHBOX_COLOR, 1)
      .strokeRect(
        pushbox.left,
        pushbox.top,
        pushbox.width,
        pushbox.height
      );
  };

  // --------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------

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
