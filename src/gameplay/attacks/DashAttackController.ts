import Phaser from 'phaser';

import type { CharacterDefinition } from '../../characters/types';

import type { InputManager } from '../input/InputManager';
import type { AnimationController } from '../animations/AnimationController';
import type { DashController } from '../movement/DashController';

import { HitEffectController } from '../effects/HitEffectController';
import { HitStopController } from '../effects/HitStopController';
import { KnockbackController } from '../effects/KnockbackController';

export class DashAttackController {
  private readonly scene: Phaser.Scene;

  private readonly attacker: Phaser.GameObjects.Sprite;

  private readonly opponent: Phaser.Physics.Matter.Sprite;

  private readonly definition: CharacterDefinition;

  private readonly input: InputManager;

  private readonly animations: AnimationController;

  private readonly dashController: DashController;

  private readonly takeDamage: (amount: number) => void;

  private readonly hitboxGraphics: Phaser.GameObjects.Graphics;

  private readonly hitEffectController: HitEffectController;

  private readonly knockbackController: KnockbackController;

  private attacking = false;

  private hasHit = false;

  constructor(
    scene: Phaser.Scene,
    attacker: Phaser.GameObjects.Sprite,
    opponent: Phaser.Physics.Matter.Sprite,
    definition: CharacterDefinition,
    input: InputManager,
    animations: AnimationController,
    dashController: DashController,
    takeDamage: (amount: number) => void
  ) {
    this.scene = scene;
    this.attacker = attacker;
    this.opponent = opponent;
    this.definition = definition;
    this.input = input;
    this.animations = animations;
    this.dashController = dashController;
    this.takeDamage = takeDamage;

    this.hitboxGraphics = scene.add.graphics();
    this.hitboxGraphics.setDepth(attacker.depth + 2);

    this.hitEffectController = new HitEffectController(scene);

    this.knockbackController = new KnockbackController(opponent);
  }

  update(): void {
    if (this.attacking) {
      this.updateHitbox();
      return;
    }

    if (!this.input.isDown('dashAttack')) {
      return;
    }

    if (!this.definition.dashAttack) {
      return;
    }

    if (!this.dashController.isAttackWindow) {
      return;
    }

    this.startAttack();
  }

  destroy(): void {
    this.animations.offComplete(
      'dashAttack',
      this.finishAttack
    );

    this.hitboxGraphics.destroy();

    this.hitEffectController.destroy();

    this.attacking = false;
  }

  private startAttack(): void {
    if (
      !this.definition.dashAttack ||
      !this.animations.has('dashAttack') ||
      !this.dashController.startDashAttack()
    ) {
      return;
    }

    this.attacking = true;
    this.hasHit = false;

    this.animations.offComplete(
      'dashAttack',
      this.finishAttack
    );

    this.animations.onComplete(
      'dashAttack',
      this.finishAttack
    );

    this.animations.play('dashAttack', false);
  }

  private readonly finishAttack = (): void => {
    if (!this.attacking) {
      return;
    }

    this.attacking = false;

    this.hitboxGraphics.clear();

    this.animations.offComplete(
      'dashAttack',
      this.finishAttack
    );
  };

  private updateHitbox(): void {
    const attack = this.definition.dashAttack?.dashAttack;

    if (!attack) {
      return;
    }

    const hitbox = this.getHitbox(
      attack.hitboxWidth,
      attack.hitboxHeight,
      attack.hitboxOffsetX,
      attack.hitboxOffsetY
    );

    this.hitboxGraphics.clear();

    this.hitboxGraphics
      .fillStyle(0xff3333, 0.25)
      .fillRect(
        hitbox.x,
        hitbox.y,
        hitbox.width,
        hitbox.height
      );

    this.hitboxGraphics
      .lineStyle(2, 0xff3333, 1)
      .strokeRect(
        hitbox.x,
        hitbox.y,
        hitbox.width,
        hitbox.height
      );

    if (!this.hasHit) {
      this.checkHitbox(hitbox, attack.damage);
    }
  }

  private getHitbox(
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
  ): Phaser.Geom.Rectangle {
    const direction = this.attacker.flipX ? -1 : 1;

    const x = direction === -1
      ? this.attacker.x - offsetX - width
      : this.attacker.x + offsetX;

    const y = this.attacker.y + offsetY;

    return new Phaser.Geom.Rectangle(
      x,
      y,
      width,
      height
    );
  }

  private checkHitbox(
    hitbox: Phaser.Geom.Rectangle,
    damage: number
  ): void {
    const body = this.opponent.body as
      MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const parts = body.parts.length > 1
      ? body.parts.slice(1)
      : [body];

    for (const part of parts) {
      const bounds = part.bounds;

      const opponentHitbox = new Phaser.Geom.Rectangle(
        bounds.min.x,
        bounds.min.y,
        bounds.max.x - bounds.min.x,
        bounds.max.y - bounds.min.y
      );

      const intersects =
        Phaser.Geom.Intersects.RectangleToRectangle(
          hitbox,
          opponentHitbox
        );

      if (!intersects) {
        continue;
      }

      this.hasHit = true;

      this.hitboxGraphics.clear();

      const direction: -1 | 1 =
        this.opponent.x >= this.attacker.x ? 1 : -1;

      const impactX = Phaser.Math.Clamp(
        this.opponent.x,
        hitbox.left,
        hitbox.right
      );

      const impactY = this.opponent.y - 20;

      // Aplicar daño.
      this.takeDamage(damage);

      // Crear el efecto visual.
      const finishEffect =
        this.hitEffectController.showImpact(
          impactX,
          impactY,
          direction
        );

      // Congelar a ambos luchadores durante el impacto.
      HitStopController.freeze(
        this.scene,
        220,
        () => {
          // Continuar el efecto visual.
          finishEffect();

          // Aplicar el empuje al rival.
          this.knockbackController.apply(direction);
        },
        [
          this.attacker,
          this.opponent
        ]
      );

      return;
    }
  }
}