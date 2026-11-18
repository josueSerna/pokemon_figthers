
import type Phaser from 'phaser';

import type {
  FighterAbility,
  AbilityContext
} from './types';

import type { InputManager } from '../input/InputManager';

export class AbilityController {
  private readonly abilities: readonly FighterAbility[];
  private readonly context: AbilityContext;
  private readonly input: InputManager;

  constructor(
    abilities: readonly FighterAbility[],
    context: AbilityContext,
    input: InputManager
  ) {
    this.abilities = abilities;
    this.context = context;
    this.input = input;
  }

  setup() {
    this.abilities.forEach((ability) => {
      ability.setup(this.context);
    });
  }

  update() {
    this.abilities.forEach((ability) => {
      if (this.input.justPressed('specialAttack')) {
        ability.handleAction?.('specialAttack', true);
      }

      if (this.input.justReleased('specialAttack')) {
        ability.handleAction?.('specialAttack', false);
      }
    });

    this.abilities.forEach((ability) => {
      ability.update();
    });
  }

  blocksMovement(): boolean {
    return this.abilities.some(
      (ability) => ability.blocksMovement?.() ?? false
    );
  }

  destroy() {
    this.abilities.forEach((ability) => {
      ability.destroy();
    });
  }
}
