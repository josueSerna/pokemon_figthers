
import Phaser from 'phaser';

export class KnockbackController {
  private readonly target: Phaser.Physics.Matter.Sprite;

  private static readonly HORIZONTAL_FORCE = 18;
  private static readonly VERTICAL_FORCE = -5;

  constructor(target: Phaser.Physics.Matter.Sprite) {
    this.target = target;
  }

  apply(direction: -1 | 1) {
    this.target.setVelocityX(
      direction * KnockbackController.HORIZONTAL_FORCE
    );

    this.target.setVelocityY(
      KnockbackController.VERTICAL_FORCE
    );
  }
}
