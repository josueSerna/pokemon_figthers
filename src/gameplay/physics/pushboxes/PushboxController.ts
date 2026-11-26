
import Phaser from 'phaser';

import type { PushboxDefinition } from './PushboxDefinition';

import {
  DEFAULT_PUSHBOX,
  pushboxRegistry
} from './PushboxRegistry';

export interface PushboxBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export class PushboxController {
  private readonly fighter: Phaser.Physics.Matter.Sprite;
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly groundY: number;
  private readonly configuration: PushboxDefinition;

  constructor(
    fighter: Phaser.Physics.Matter.Sprite,
    visual: Phaser.GameObjects.Sprite,
    characterId: string,
    groundY: number
  ) {
    this.fighter = fighter;
    this.visual = visual;
    this.groundY = groundY;

    this.configuration =
      pushboxRegistry[characterId] ?? DEFAULT_PUSHBOX;
  }

  getBounds(crouching: boolean): PushboxBounds {
    const body = this.fighter.body as MatterJS.BodyType | null;

    const grounded =
      body !== null &&
      body.bounds.max.y >= this.groundY - 3 &&
      body.velocity.y >= -0.5;

    const width = this.configuration.width;

    const height = crouching
      ? this.configuration.crouchHeight
      : this.configuration.height;

    const bottom = grounded
      ? this.groundY
      : this.visual.y + DEFAULT_PUSHBOX.height / 2;

    const top = bottom - height;

    const centerX =
      this.visual.x + this.configuration.offsetX;

    return {
      left: centerX - width / 2,
      right: centerX + width / 2,
      top,
      bottom,
      centerX,
      centerY: top + height / 2,
      width,
      height
    };
  }
}
