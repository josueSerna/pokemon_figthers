import type Phaser from 'phaser';

export interface AbilityContext {
  scene: Phaser.Scene;
  fighter: Phaser.Physics.Arcade.Sprite;
  opponent: {
    x: number;
    fighter?: Phaser.Physics.Arcade.Sprite;
    takeDamage?: (amount: number) => void;
  };
  animationKey: (key: string) => string;
}

export interface FighterAbility {
  readonly id: string;
  setup(context: AbilityContext): void;
  update(): void;
  handleAction?(action: string, pressed: boolean): void;
  blocksMovement?(): boolean;
  destroy(): void;
}
