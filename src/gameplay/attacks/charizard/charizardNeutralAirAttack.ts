import type { NeutralAttackDefinition } from '../../neutralAttackTypes';

export const charizardNeutralAirAttack: NeutralAttackDefinition = {
  type: 'melee',

  animationKey: 'charizard-neutral-air',
  textureKey: 'charizard-neutral-air',

  damage: 10,

  frameStart: 0,
  frameEnd: 4,
  frameRate: 12,

  activeFrames: [2, 3],

  hitboxWidth: 80,
  hitboxHeight: 80,
  hitboxOffsetX: 120,
  hitboxOffsetY: 0,

  followAttackerY: true
};
