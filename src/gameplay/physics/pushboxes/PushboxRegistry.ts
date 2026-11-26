
import type { PushboxDefinition } from './PushboxDefinition';

export const DEFAULT_PUSHBOX: PushboxDefinition = {
  width: 72,
  height: 110,
  crouchHeight: 70,
  offsetX: 0
};

export const pushboxRegistry: Record<string, PushboxDefinition> = {
  charizard: {
    width: 72,
    height: 150,
    crouchHeight: 70,
    offsetX: 20
  },

  gengar: {
    width: 72,
    height: 150,
    crouchHeight: 70,
    offsetX: 0
  },

  lucario: {
    width: 20,
    height: 90,
    crouchHeight: 65,
    offsetX: 0
  }
};
