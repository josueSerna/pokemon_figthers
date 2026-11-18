
import type { NeutralAttackDefinition } from '../../neutralAttackTypes';

export const charizardNeutralAttacks: (
  NeutralAttackDefinition | undefined
)[] = [
  {
    type: 'melee',
    animationKey: 'charizard-neutral-one',
    textureKey: 'charizard-neutral-one',
    damage: 5,
    frameStart: 0,
    frameEnd: 4,
    frameRate: 12,
    activeFrames: [1,2],
    hitboxWidth: 60,
    hitboxHeight: 90,
    hitboxOffsetX: 140,
    hitboxOffsetY: 0
  },
  {
    type: 'melee',
    animationKey: 'charizard-neutral-two',
    textureKey: 'charizard-neutral-two',
    damage: 10,
    frameStart: 0,
    frameEnd: 4,
    frameRate: 12,
    activeFrames: [1,2,3],
    hitboxWidth: 80,
    hitboxHeight: 150,
    hitboxOffsetX: 120,
    hitboxOffsetY: -50
  },
  {
    type: 'melee',
    animationKey: 'charizard-neutral-three',
    textureKey: 'charizard-neutral-three',
    damage: 20,
    frameStart: 0,
    frameEnd: 8,
    frameRate: 12,
    activeFrames: [4,5],
    hitboxWidth: 100,
    hitboxHeight: 100,
    hitboxOffsetX: 120,
    hitboxOffsetY: 0
  }
];
