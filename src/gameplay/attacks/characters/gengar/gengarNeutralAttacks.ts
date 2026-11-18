
import type { NeutralAttackDefinition } from '../../NeutralAttackController';

export const gengarNeutralAttacks: (
  NeutralAttackDefinition | undefined
)[] = [
  {
    type: 'melee',

    animationKey: 'gengar-neutral-one',
    textureKey: 'gengar-neutral-one',

    damage: 5,

    frameStart: 0,
    frameEnd: 5,
    frameRate: 12,

    activeFrames: [2, 3],

    hitboxWidth: 120,
    hitboxHeight: 52,
    hitboxOffsetX: -100,
    hitboxOffsetY: 40
  },

  {
    type: 'ranged',

    animationKey: 'gengar-neutral-two',
    textureKey: 'gengar-neutral-two',

    damage: 15,

    frameStart: 0,
    frameEnd: 8,
    frameRate: 12,

    activeFrames: [3,4,5,6,7],

    hitboxWidth: 150,
    hitboxHeight: 150,
    hitboxOffsetX:-230,
    hitboxOffsetY: -70,

    secondaryAnimation: {
      textureKey: 'move-scary-face',
      animationKey: 'move-scary-face',

      frameStart: 0,
      frameEnd: 5,
      frameRate: 20,

      triggerFrame: 4,

      // Distancia hacia delante de Gengar.
      offsetX: -150,
      offsetY: 0,
      scale: 1
    }
  },

  undefined
];
