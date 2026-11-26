
export type HurtboxState = 'idle' | 'jump' | 'crouch';

export type HurtboxRegion = 'head' | 'torso' | 'legs';

export interface HurtboxRegionDefinition {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface HurtboxStateDefinition {
  head: HurtboxRegionDefinition;
  torso: HurtboxRegionDefinition;
  legs: HurtboxRegionDefinition;
}

export type CharacterHurtboxDefinition = Record<
  HurtboxState,
  HurtboxStateDefinition
>;
