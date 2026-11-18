import Phaser from 'phaser';

interface HitStopState {
  timer: Phaser.Time.TimerEvent;
  previousAnimationScale: number;
  pausedSprites: Map<Phaser.GameObjects.Sprite, boolean>;
}

export class HitStopController {
  private static readonly states =
    new WeakMap<Phaser.Scene, HitStopState>();

  static isActive(scene: Phaser.Scene): boolean {
    return this.states.has(scene);
  }

  static freeze(
    scene: Phaser.Scene,
    duration = 60,
    onComplete?: () => void,
    sprites: Phaser.GameObjects.Sprite[] = []
  ): void {
    let state = this.states.get(scene);

    if (!state) {
      state = {
        timer: null as unknown as Phaser.Time.TimerEvent,
        previousAnimationScale: scene.anims.globalTimeScale,
        pausedSprites: new Map()
      };

      this.states.set(scene, state);

      scene.matter.world.pause();

      scene.anims.globalTimeScale = 0;
    } else {
      state.timer.remove(false);
    }

    // Pausar las animaciones de los luchadores.
    for (const sprite of sprites) {
      if (state.pausedSprites.has(sprite)) {
        continue;
      }

      const wasPlaying = sprite.anims.isPlaying;

      state.pausedSprites.set(sprite, wasPlaying);

      if (wasPlaying) {
        sprite.anims.pause();
      }
    }

    state.timer = scene.time.delayedCall(duration, () => {
      const currentState = this.states.get(scene);

      if (!currentState) {
        return;
      }

      // Restaurar la velocidad global de las animaciones.
      scene.anims.globalTimeScale =
        currentState.previousAnimationScale;

      // Reanudar únicamente las animaciones que estaban activas.
      currentState.pausedSprites.forEach(
        (wasPlaying, sprite) => {
          if (wasPlaying && sprite.active) {
            sprite.anims.resume();
          }
        }
      );

      // Reanudar la física.
      scene.matter.world.resume();

      this.states.delete(scene);

      onComplete?.();
    });

    this.states.set(scene, state);
  }

  static cancel(scene: Phaser.Scene): void {
    const state = this.states.get(scene);

    if (!state) {
      return;
    }

    state.timer.remove(false);

    scene.anims.globalTimeScale =
      state.previousAnimationScale;

    state.pausedSprites.forEach((wasPlaying, sprite) => {
      if (wasPlaying && sprite.active) {
        sprite.anims.resume();
      }
    });

    scene.matter.world.resume();

    this.states.delete(scene);
  }
}