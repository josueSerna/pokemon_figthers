
export type NeutralAttackType = 'melee' | 'ranged';

export interface NeutralImpactDefinition {
  textureKey: string;
  animationKey?: string;
  frameStart?: number;
  frameEnd?: number;
  frameRate?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface NeutralSecondaryAnimation {
  textureKey: string;
  animationKey: string;
  frameStart: number;
  frameEnd: number;
  frameRate: number;
  triggerFrame: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface NeutralAttackDefinition {
  type: NeutralAttackType;
  animationKey: string;
  textureKey: string;
  damage: number;
  activeFrames: number[];
  frameStart: number;
  frameEnd: number;
  frameRate: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  secondaryAnimation?: NeutralSecondaryAnimation;
  impact?: NeutralImpactDefinition;
  followAttackerY?: boolean;
}

export interface CharacterNeutralAttackConfig {
  standing?: readonly (NeutralAttackDefinition | undefined)[];
  crouching?: readonly (NeutralAttackDefinition | undefined)[];
  air?: NeutralAttackDefinition;
}

export interface CharacterAttackConfig {
  neutral?: CharacterNeutralAttackConfig;
}
