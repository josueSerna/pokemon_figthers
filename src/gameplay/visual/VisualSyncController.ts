
import Phaser from 'phaser';

export class VisualSyncController {
  private readonly fighter: Phaser.Physics.Matter.Sprite;
  private readonly visual: Phaser.GameObjects.Sprite;

  private lastBodyX: number;
  private lastBodyY: number;

  constructor(
    fighter: Phaser.Physics.Matter.Sprite,
    visual: Phaser.GameObjects.Sprite
  ) {
    this.fighter = fighter;
    this.visual = visual;

    this.lastBodyX = fighter.x;
    this.lastBodyY = fighter.y;
  }

  update() {
    const deltaX = this.fighter.x - this.lastBodyX;
    const deltaY = this.fighter.y - this.lastBodyY;

    this.visual.x += deltaX;
    this.visual.y += deltaY;

    this.lastBodyX = this.fighter.x;
    this.lastBodyY = this.fighter.y;
  }

  syncAfterBodyRebuild() {
    this.lastBodyX = this.fighter.x;
    this.lastBodyY = this.fighter.y;
  }

  moveVisualX(amount: number) {
    this.visual.x += amount;
    this.lastBodyX += amount;
  }
}
