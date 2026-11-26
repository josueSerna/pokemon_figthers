
import Phaser from 'phaser';

import type { CharacterDefinition } from '../../characters/types';
import type { HurtboxController } from './hurtboxes/HurtBoxController';

interface FighterBodyFactoryConfig {
  scene: Phaser.Scene;
  definition: CharacterDefinition;
  hurtboxController: HurtboxController;
  spawnX: number;
  spawnY?: number;
}

export class FighterBodyFactory {
  static create({
    scene,
    definition,
    hurtboxController,
    spawnX,
    spawnY = 348
  }: FighterBodyFactoryConfig): Phaser.Physics.Matter.Sprite {
    const idleAsset = definition.assets.spriteSheets.idle;

    const sprite = scene.matter.add.sprite(
      spawnX,
      spawnY,
      idleAsset.key,
      0
    );

    sprite.setVisible(false);

    const hurtbox = hurtboxController.createInitialBody();

    scene.matter.body.setPosition(hurtbox.body, {
      x: spawnX + hurtbox.offsetX,
      y: spawnY + hurtbox.offsetY
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
}
