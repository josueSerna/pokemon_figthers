import type Phaser from 'phaser';
import type { CharacterDefinition } from '../../characters/types';

export interface AnimationContext {
  scene: Phaser.Scene;
  visual: Phaser.GameObjects.Sprite;
  definition: CharacterDefinition;
  animationPrefix: string;
}

export interface AnimationSystem {
  setup(): void;
  update(delta: number): void;
  destroy(): void;
}