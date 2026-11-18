
import Phaser from 'phaser';

const HEAD_COLOR = 0xf0b34a;
const TORSO_COLOR = 0x439fe0;
const LEGS_COLOR = 0x42b983;
const PUSHBOX_COLOR = 0xd65bce;

const HURTBOX_COLORS = [
  HEAD_COLOR,
  TORSO_COLOR,
  LEGS_COLOR
];

export class CollisionDebugger {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly fighter: Phaser.Physics.Matter.Sprite;

  private readonly getPushboxBounds: () => {
    left: number;
    top: number;
    width: number;
    height: number;
  };

  constructor(
    scene: Phaser.Scene,
    fighter: Phaser.Physics.Matter.Sprite,
    getPushboxBounds: () => {
      left: number;
      top: number;
      width: number;
      height: number;
    }
  ) {
    this.fighter = fighter;
    this.getPushboxBounds = getPushboxBounds;

    this.graphics = scene.add.graphics().setDepth(10);

    scene.events.on('postupdate', this.update);
  }

  destroy(scene: Phaser.Scene) {
    scene.events.off('postupdate', this.update);
    this.graphics.destroy();
  }

  private readonly update = () => {
    const body = this.fighter.body as MatterJS.BodyType | null;

    this.graphics.clear();

    if (!body) return;

    this.drawHurtboxes(body);
    this.drawPushbox();
  };

  private drawHurtboxes(body: MatterJS.BodyType) {
    const hurtboxParts = body.parts.slice(1);

    hurtboxParts.forEach((part, index) => {
      const color = HURTBOX_COLORS[index];

      if (color === undefined) return;

      const bounds = part.bounds;

      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;

      this.graphics
        .fillStyle(color, 0.20)
        .fillRect(
          bounds.min.x,
          bounds.min.y,
          width,
          height
        );

      this.graphics
        .lineStyle(2, color, 1)
        .strokeRect(
          bounds.min.x,
          bounds.min.y,
          width,
          height
        );
    });
  }

  private drawPushbox() {
    const pushbox = this.getPushboxBounds();

    this.graphics
      .lineStyle(2, PUSHBOX_COLOR, 1)
      .strokeRect(
        pushbox.left,
        pushbox.top,
        pushbox.width,
        pushbox.height
      );
  }
}
