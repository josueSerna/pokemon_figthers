
import type { NeutralAttackDefinition } from '../../neutralAttackTypes';

export const charizardNeutralCrouchAttacks: (
  NeutralAttackDefinition | undefined
)[] = [
  {
    type: 'melee',
    animationKey: 'charizard-neutral-crouch-one',
    textureKey: 'charizard-neutral-crouch-one',
    damage: 5,
    frameStart: 0,
    frameEnd: 4,
    frameRate: 12,
    activeFrames: [],
    hitboxWidth: 0,
    hitboxHeight: 0,
    hitboxOffsetX: 0,
    hitboxOffsetY: 0
  },
  {
    type: 'melee',
    animationKey: 'charizard-neutral-crouch-two',
    textureKey: 'charizard-neutral-crouch-two',
    damage: 10,
    frameStart: 0,
    frameEnd: 4,
    frameRate: 12,
    activeFrames: [],
    hitboxWidth: 0,
    hitboxHeight: 0,
    hitboxOffsetX: 0,
    hitboxOffsetY: 0
  },
  {
    type: 'melee',
    animationKey: 'charizard-neutral-crouch-three',
    textureKey: 'charizard-neutral-crouch-three',
    damage: 20,
    frameStart: 0,
    frameEnd: 8,
    frameRate: 16,
    activeFrames: [],
    hitboxWidth: 0,
    hitboxHeight: 0,
    hitboxOffsetX: 0,
    hitboxOffsetY: 0
  }
];
