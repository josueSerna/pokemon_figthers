import Phaser from 'phaser';
import type { AbilityContext, FighterAbility } from './types';

export class AuraSphereAbility implements FighterAbility {
  readonly id = 'aura-sphere';

  private context?: AbilityContext;
  private sphere?: Phaser.GameObjects.Sprite;
  private sphereOverlap?: Phaser.Physics.Arcade.Collider;
  private debugHitbox?: Phaser.GameObjects.Graphics;
  private projectileTween?: Phaser.Tweens.Tween;
  private releaseTimer?: Phaser.Time.TimerEvent;
  private charging = false;
  private launching = false;
  private sphereStarted = false;
  private sphereProjectile = false;
  private chargeStartedAt = 0;
  private projectileDamage = 5;

  setup(context: AbilityContext) {
    this.context = context;
    this.debugHitbox = context.scene.add.graphics().setDepth(10);
    context.scene.events.on('postupdate', this.updateDebugHitbox);
  }

  handleAction(action: string, pressed: boolean) {
    if (action !== 'specialAttack') {
      return;
    }
    if (pressed) {
      this.startCharging();
    } else {
      this.releaseCharging();
    }
  }

  startCharging() {
    if (!this.context || this.launching) {
      return;
    }

    const { scene, fighter } = this.context;
    this.charging = true;
    this.chargeStartedAt = scene.time.now;
    this.createSphere();
    this.sphereStarted = false;
    this.sphereProjectile = false;
    this.projectileTween?.stop();
    fighter.setVelocityX(0);
    this.sphere?.setVisible(false);
    this.sphere?.anims.stop();
    fighter.anims.play(this.animationKey('recharged'), true);
    fighter.once(
      `animationcomplete-${this.animationKey('recharged')}`,
      this.startChargeIdle,
      this
    );
    this.releaseTimer = scene.time.delayedCall(4000, () => this.releaseCharging());
  }

  releaseCharging() {
    if (!this.context || !this.charging) {
      return;
    }

    const { scene, fighter } = this.context;
    this.charging = false;
    this.projectileDamage = this.getChargeDamage(scene.time.now - this.chargeStartedAt);
    this.releaseTimer?.remove(false);
    this.releaseTimer = undefined;
    fighter.setVelocityX(0);

    if (!this.sphereStarted) {
      this.sphereStarted = true;
      this.sphere?.setVisible(true);
    }

    this.launching = true;
    this.sphereStarted = false;
    this.sphere?.anims.stop();
    fighter.anims.play(this.animationKey('launch'), true);
    fighter.once(`animationcomplete-${this.animationKey('launch')}`, () => {
      this.launching = false;
    });
  }

  update() {
    if (!this.context || !this.sphere || this.sphereProjectile) {
      return;
    }

    const { fighter } = this.context;
    if (this.sphereProjectile) {
      this.checkProjectileHit();
      return;
    }
    if (this.launching) {
      this.updateLaunchPosition(fighter.anims.currentFrame?.index ?? 0);
      if ((fighter.anims.currentFrame?.index ?? 0) >= 7 && !this.sphereProjectile) {
        this.launchSphere();
      }
      return;
    }

    this.sphere.setPosition(
      fighter.x + (fighter.flipX ? -10 : 10),
      fighter.y + 50
    );
      this.updateSphereHitbox();
  }

  private updateSphereHitbox() {
  if (!this.sphere?.body) {
    return;
  }

  const body = this.sphere.body as Phaser.Physics.Arcade.Body;

  const frame = this.sphere.anims.currentFrame?.index ?? 0;

  // El radio crece durante los primeros 8 frames.
  const radiusByFrame = [
    5, 10, 18, 28, 38, 46, 52, 58, 58,
    58, 58, 58, 58
  ];

  const radius = radiusByFrame[
    Phaser.Math.Clamp(frame, 0, radiusByFrame.length - 1)
  ];

  // Compensamos la escala del sprite.
  const scale = this.sphere.scaleX;

  body.setCircle(
    radius / scale,
    this.sphere.width / 2 - radius / scale,
    this.sphere.height / 2 - radius / scale
  );
}

  blocksMovement() {
    return this.charging || this.launching;
  }

  private startChargeIdle() {
    if (this.charging) {
      this.context?.fighter.anims.play(
        this.animationKey('charge-idle'),
        true
      );
      this.sphereStarted = true;
      this.sphere?.setVisible(true).anims.play(
        this.animationKey('aura-sphere'),
        true
      );
      this.sphere?.once(
        `animationcomplete-${this.animationKey('aura-sphere')}`,
        () => {
        if (this.charging) {
          this.sphere?.anims.play(
            this.animationKey('aura-sphere-hold'),
            true
          );
        }
        }
      );
    }
  }

  private animationKey(key: string) {
    return this.context?.animationKey(key) ?? key;
  }

  private updateLaunchPosition(frameIndex: number) {
    if (!this.context || !this.sphere) {
      return;
    }

    const { fighter } = this.context;
    const rightOffsets = [50, 30, 50, 20, 35, 85, 125, 160, 190];
    const leftOffsets = rightOffsets.map((offset) => -offset);
    const yOffsets = [0, 40, 20, 10, 10, 10, 10, 10, 50];
    const frame = Phaser.Math.Clamp(frameIndex, 0, rightOffsets.length - 1);
    const progress = frame / (rightOffsets.length - 1);
    const xOffsets = fighter.flipX ? leftOffsets : rightOffsets;

    this.sphere.setPosition(
      fighter.x + Phaser.Math.Interpolation.CatmullRom(xOffsets, progress),
      fighter.y + Phaser.Math.Interpolation.CatmullRom(yOffsets, progress)
    );
  }

  private launchSphere() {
    if (!this.context || !this.sphere) {
      return;
    }

    const { scene, fighter } = this.context;
    this.sphereProjectile = true;
    this.sphere.anims.stop();
    this.projectileTween = scene.tweens.add({
      targets: this.sphere,
      x: this.sphere.x + (fighter.flipX ? -1000 : 1000),
      duration: 700 / (0.3 * 1.2),
      ease: 'linear',
      onComplete: () => {
        this.destroySphere();
      }
    });
  }

  private createSphere() {
    if (!this.context || this.sphere) {
      return;
    }
    this.sphere = this.context.scene.add.sprite(0, 0, 'aura-sphere', 0);
    this.sphere.setScale(0.5).setDepth(1).setVisible(false);
    this.context.scene.physics.add.existing(this.sphere);
    (this.sphere.body as Phaser.Physics.Arcade.Body).setCircle(48, 80, 80);
    if (this.context.opponent.fighter) {
      this.sphereOverlap = this.context.scene.physics.add.overlap(
        this.sphere,
        this.context.opponent.fighter,
        this.handleSphereHit,
        undefined,
        this
      );
    }
  }

  private readonly handleSphereHit = () => {
    if (!this.sphereProjectile || !this.context) {
      return;
    }
    this.context.opponent.takeDamage?.(this.projectileDamage);
    this.destroySphere();
  };

  private readonly updateDebugHitbox = () => {
    this.debugHitbox?.clear();
    if (!this.debugHitbox || !this.sphere?.body) {
      return;
    }

    const body = this.sphere.body as Phaser.Physics.Arcade.Body;
    this.debugHitbox
      .lineStyle(2, 0x3399ff, 1)
      .fillStyle(0x3399ff, 0.2)
      .fillCircle(body.center.x, body.center.y, body.width / 2)
      .strokeCircle(body.center.x, body.center.y, body.width / 2);
  };

  private checkProjectileHit() {
    if (!this.context?.opponent.fighter || !this.sphere?.body) {
      return;
    }
    const sphereBody = this.sphere.body as Phaser.Physics.Arcade.Body;
    const opponentBody = this.context.opponent.fighter.body as Phaser.Physics.Arcade.Body;
    sphereBody.updateFromGameObject();
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(
          sphereBody.x,
          sphereBody.y,
          sphereBody.width,
          sphereBody.height
        ),
        new Phaser.Geom.Rectangle(
          opponentBody.x,
          opponentBody.y,
          opponentBody.width,
          opponentBody.height
        )
      )
    ) {
      this.context.opponent.takeDamage?.(this.projectileDamage);
      this.destroySphere();
    }
  }

  private getChargeDamage(duration: number) {
    if (duration >= 2500) {
      return 20;
    }
    if (duration >= 1000) {
      return 10;
    }
    return 5;
  }

//   private updateSphereHitbox() {
//   if (!this.sphere?.body) {
//     return;
//   }

//   const body = this.sphere.body as Phaser.Physics.Arcade.Body;

//   const frame = this.sphere.anims.currentFrame?.index ?? 0;

//   // El radio crece durante los primeros 8 frames.
//   const radiusByFrame = [
//     5, 10, 18, 28, 38, 46, 52, 58, 58,
//     58, 58, 58, 58
//   ];

//   const radius = radiusByFrame[
//     Phaser.Math.Clamp(frame, 0, radiusByFrame.length - 1)
//   ];

//   // Compensamos la escala del sprite.
//   const scale = this.sphere.scaleX;

//   body.setCircle(
//     radius / scale,
//     this.sphere.width / 2 - radius / scale,
//     this.sphere.height / 2 - radius / scale
//   );
// }

  private destroySphere() {
    this.projectileTween?.stop();
    this.projectileTween = undefined;
    this.sphereOverlap?.destroy();
    this.sphereOverlap = undefined;
    this.sphere?.destroy();
    this.sphere = undefined;
    this.sphereProjectile = false;
  }

  destroy() {
    this.releaseTimer?.remove(false);
    this.context?.scene.events.off('postupdate', this.updateDebugHitbox);
    this.debugHitbox?.destroy();
    this.destroySphere();
  }
}
