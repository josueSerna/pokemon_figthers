
import type { CharacterHurtboxDefinition } from './HurtboxDefinition';

export const hurtboxRegistry: Record<string, CharacterHurtboxDefinition> = {
  lucario: {
    idle: {
      head: { width: 42, height: 42, offsetX: 0, offsetY: -70 },
      torso: { width: 48, height: 58, offsetX: 0, offsetY: -15 },
      legs: { width: 54, height: 34, offsetX: 0, offsetY: 34 }
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
      head: { width: 58, height: 48, offsetX: 0, offsetY: -65 },
      torso: { width: 62, height: 58, offsetX: 0, offsetY: -15 },
      legs: { width: 58, height: 32, offsetX: 0, offsetY: 30 }
    },
    jump: {
      head: { width: 58, height: 48, offsetX: 0, offsetY: -65 },
      torso: { width: 62, height: 58, offsetX: 0, offsetY: -15 },
      legs: { width: 58, height: 32, offsetX: 0, offsetY: 30 }
    },
    crouch: {
      head: { width: 58, height: 42, offsetX: 0, offsetY: -42 },
      torso: { width: 62, height: 48, offsetX: 0, offsetY: 0 },
      legs: { width: 58, height: 30, offsetX: 0, offsetY: 32 }
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
