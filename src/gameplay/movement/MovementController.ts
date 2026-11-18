
import type Phaser from 'phaser';
import type { CharacterDefinition } from '../../characters/types';

export class MovementController {
  private readonly fighter: Phaser.Physics.Matter.Sprite;
  private readonly stats: CharacterDefinition['stats'];

  constructor(
    fighter: Phaser.Physics.Matter.Sprite,
    stats: CharacterDefinition['stats']
  ) {
    this.fighter = fighter;
    this.stats = stats;
  }

  applyGravity(delta: number) {
    const currentVelocity = this.fighter.getVelocity().y;
    const gravity = this.stats.fallSpeed;

    const gravityStep = gravity * (delta / 1000) / 60;
    const nextVelocity = currentVelocity + gravityStep;

    this.fighter.setVelocityY(
      Math.min(nextVelocity, 1200 / 60)
    );
  }

  applyMovement(
    left: boolean,
    right: boolean,
    crouching: boolean
  ) {
    const speed = this.stats.movementSpeed / 60;

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
}
