
import type { NeutralAttackDefinition } from "../../neutralAttackTypes";

export const gengarNeutralCrouchAttacks: readonly (
  NeutralAttackDefinition | undefined
)[] = [
  {
    type: "melee",
    animationKey: "crouch-neutral-one",
    textureKey: "gengar-crouch-neutral-one",

    // Valores configurables
    damage: 5,
    activeFrames: [4],

    frameStart: 0,
    frameEnd: 4,
    frameRate: 12,

    hitboxWidth: 200,
    hitboxHeight: 100,
    hitboxOffsetX: -220,
    hitboxOffsetY: 50,

      visualEffect: {
    key: 'lick-arc',
    triggerFrame: 4,
    offsetX: 40,
    offsetY: 100,
    scale: 1
  },

    hitVisualEffect: {
    key: 'lick',
    triggerFrame: 4,
    scale: 1
  }
  },

   {
    type: "melee",
    animationKey: "crouch-neutral-two",
    textureKey: "gengar-crouch-neutral-two",

    // Valores configurables
    damage: 5,
    activeFrames: [4],

    frameStart: 0,
    frameEnd: 4,
    frameRate: 12,

    hitboxWidth: 200,
    hitboxHeight: 100,
    hitboxOffsetX: -220,
    hitboxOffsetY: 50,
    
      visualEffect: {
    key: 'hex-vortex',
    triggerFrame: 5,
    offsetX: 0,
    offsetY: 0,
    scale: 1
  }
  },
];
