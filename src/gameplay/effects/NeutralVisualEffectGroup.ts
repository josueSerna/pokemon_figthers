
import type {
  NeutralVisualEffectPlayer,
  NeutralVisualEffectArea
} from '../attacks/NeutralAttackController';

import type {
  NeutralVisualEffectDefinition
} from '../attacks/neutralAttackTypes';

export class NeutralVisualEffectGroup
  implements NeutralVisualEffectPlayer {

  private readonly players: NeutralVisualEffectPlayer[];

  constructor(players: NeutralVisualEffectPlayer[]) {
    this.players = players;
  }

  play(
    effect: NeutralVisualEffectDefinition,
    x: number,
    y: number,
    direction: 1 | -1,
    depth: number,
    scale = 1,
    area?: NeutralVisualEffectArea
  ): void {
    for (const player of this.players) {
      player.play(
        effect,
        x,
        y,
        direction,
        depth,
        scale,
        area
      );
    }
  }

  destroy(): void {
    for (const player of this.players) {
      player.destroy();
    }
  }
}
