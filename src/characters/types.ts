import type { FighterAbility } from '../gameplay/abilities/types';

export type CharacterAvailability = 'available' | 'locked';
export type FighterAbilityFactory = () => FighterAbility;

export interface CharacterStats {
  maxHealth: number;
  movementSpeed: number;
  jumpForce: number;
  maxJumps: number;
  fallSpeed: number;
  defense: number;
}

export interface HitboxSize {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface SpriteSheetAsset {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
}

export interface CharacterAssets {
  portrait?: string;
  icon?: string;
  portraitCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  spriteSheets: Record<string, SpriteSheetAsset>;
}

export interface CharacterAnimation {
  key: string;
  assetKey: string;
  startFrame: number;
  endFrame: number;
  frameRate: number;
  repeat: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  availability: CharacterAvailability;
  stats: CharacterStats;
  hitbox: HitboxSize;
  visualScale: number;
  assets: CharacterAssets;
  animations: readonly CharacterAnimation[];
  abilityFactories?: readonly FighterAbilityFactory[];
}
