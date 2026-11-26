
import type { NeutralAttackDefinition } from '../../neutralAttackTypes';

export const gengarNeutralAttacks: (
  NeutralAttackDefinition | undefined
)[] = [
  {
  type: 'melee',

  animationKey: 'neutral-one',
  textureKey: 'gengar-neutral-one',

  damage: 5,

  frameStart: 0,
  frameEnd: 4,
  frameRate: 12,

  activeFrames: [3, 4],

  hitboxWidth: 200,
  hitboxHeight: 150,
  hitboxOffsetX: -200,
  hitboxOffsetY: -20,

  visualEffect: {
    key: 'shadow-claw',
    triggerFrame: 1,
    offsetX: 20,
    offsetY: 10,
    scale: 1,
    rotation: -20,
  }
},
 {
  type: 'ranged',

  animationKey: 'neutral-two',
  textureKey: 'gengar-neutral-two',

  damage: 5,

  frameStart: 0,
  frameEnd: 4,
  frameRate: 12,

  activeFrames: [3, 4],

  hitboxWidth: 250,
  hitboxHeight: 100,
  hitboxOffsetX: -200,
  hitboxOffsetY: -50,

  visualEffect: {
    key: 'astonish',
    triggerFrame: 3,
    scale: 1
  },

  hitVisualEffect: {
    key: 'astonish',
    triggerFrame: 3,
    scale: 1
  }
},

{
  type: 'melee',

  animationKey: 'neutral-three',
  textureKey: 'gengar-neutral-three',

  damage: 5,

  frameStart: 0,
  frameEnd: 8,
  frameRate: 12,

  activeFrames: [3, 4, 5],

  hitboxWidth: 270,
  hitboxHeight: 90,
  hitboxOffsetX: -210,
  hitboxOffsetY: -35,

  // Arco de aire frío durante la animación.
  visualEffect: {
    key: 'lick-arc',
    triggerFrame: 5,
    offsetX: 40,
    offsetY: 10,
    scale: 1
  },

  // Efecto que aparece cuando golpea al rival.
  hitVisualEffect: {
    key: 'lick',
    triggerFrame: 5,
    scale: 1
  }
},

  undefined
];
