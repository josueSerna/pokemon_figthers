
import type { CharacterHurtboxDefinition } from './HurtboxDefinition';

export const hurtboxRegistry: Record<string, CharacterHurtboxDefinition> = {
  lucario: {
    idle: {
      head: { width: 42, height: 42, offsetX: 0, offsetY: -70 },
      torso: { width: 48, height: 58, offsetX: 0, offsetY: -15 },
      legs: { width: 54, height: 34, offsetX: 0, offsetY: 115 }
    },
    jump: {
      head: { width: 42, height: 42, offsetX: 0, offsetY: -70 },
      torso: { width: 48, height: 58, offsetX: 0, offsetY: -15 },
      legs: { width: 54, height: 34, offsetX: 0, offsetY: 34 }
    },
    crouch: {
      head: { width: 42, height: 38, offsetX: 0, offsetY: -45 },
      torso: { width: 48, height: 48, offsetX: 0, offsetY: 0 },
      legs: { width: 54, height: 30, offsetX: 0, offsetY: 35 }
    }
  },

  gengar: {
    idle: {
      head: { width: 120, height: 70, offsetX: 0, offsetY: -40},
      torso: { width: 180, height: 90, offsetX: 0, offsetY: 40 },
      legs: { width: 120, height: 50, offsetX: 0, offsetY: 115 }
    },
    jump: {
      head: { width: 120, height: 70, offsetX: 0, offsetY: -65 },
      torso: { width: 180, height: 90, offsetX: 0, offsetY: -15 },
      legs: { width: 100, height: 50, offsetX: 0, offsetY: 65 }
    },
    crouch: {
      head: { width: 130, height: 42, offsetX: -20, offsetY: 25 },
      torso: { width: 140, height: 48, offsetX: -20, offsetY: 70 },
      legs: { width: 140, height: 30, offsetX: -20, offsetY:  112 }
    }
  },

  charizard: {
     idle: {
    head: {
      width: 62,
      height: 100,
      offsetX: 70,
      offsetY: -50 
    },
    torso: {
      width: 100,
      height: 70,
      offsetX: 24,
      offsetY: 40
    },
    legs: {
      width: 150,
      height: 115,
      offsetX: 20,
      offsetY: 130
    }
     },
    jump: {
      head: { width: 62, height: 100, offsetX: 100, offsetY: -50 },
      torso: { width: 120, height: 70, offsetX: 35, offsetY: 20 },
      legs: { width: 150, height: 100, offsetX: 40, offsetY: 100 }
    },
    crouch: {
      head: { width: 100, height: 50, offsetX: 130, offsetY: 110 },
      torso: { width: 100, height: 100, offsetX: 40, offsetY: 130 },
      legs: { width: 76, height: 100, offsetX: -50, offsetY: 135 }
    }
  }
};
