
import type { FighterAbility } from '../gameplay/abilities/types';

import type {
  CharacterAttackConfig
} from '../gameplay/attacks/neutralAttackTypes';

import type {
  SpriteBoundsRegion
} from '../gameplay/physics/SpriteBoundsAnalyzer';

import type {
  CharacterDashAttackConfig
} from '../gameplay/attacks/DashAttackType';

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

export interface CharacterDashConfig {
  speed: number;
  doubleTapWindow?: number;
}

/**
 * Configuración individual de una parte de la hurtbox.
 */
export interface CharacterHurtboxPartConfig {
  /**
   * Región normalizada del sprite que se analizará.
   * Sus valores van de 0 a 1.
   */
  bounds?: SpriteBoundsRegion;

  widthFactor?: number;
  heightFactor?: number;

  offsetX?: number;
  offsetY?: number;
}

/**
 * Configuración general de las hurtboxes del personaje.
 */
export interface CharacterHurtboxConfig {
  widthFactor?: number;
  heightFactor?: number;
  offsetX?: number;

  /**
   * Región general del sprite.
   * Se conserva para compatibilidad con el análisis anterior.
   */
  bounds?: SpriteBoundsRegion;

  /**
   * Configuración independiente de cada parte.
   */
  head?: CharacterHurtboxPartConfig;
  torso?: CharacterHurtboxPartConfig;
  legs?: CharacterHurtboxPartConfig;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  description: string;
  availability: CharacterAvailability;
  dashAttack?: CharacterDashAttackConfig;

  stats: CharacterStats;

  visualScale: number;
  defaultFlipX?: boolean;

  dash?: CharacterDashConfig;

  assets: CharacterAssets;

  animations: readonly CharacterAnimation[];

  abilityFactories?: readonly FighterAbilityFactory[];

  attacks?: CharacterAttackConfig;

  hurtbox?: CharacterHurtboxConfig;
}
