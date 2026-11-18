
import type { AnimationContext } from './types';

export class AnimationController {
  private readonly scene: AnimationContext['scene'];
  private readonly visual: AnimationContext['visual'];
  private readonly definition: AnimationContext['definition'];
  private readonly animationPrefix: string;

  constructor(context: AnimationContext) {
    this.scene = context.scene;
    this.visual = context.visual;
    this.definition = context.definition;
    this.animationPrefix = context.animationPrefix;
  }

  setup() {
    this.definition.animations.forEach((animation) => {
      const asset =
        this.definition.assets.spriteSheets[animation.assetKey];

      if (!asset) {
        console.error(
          `No existe el spritesheet: ${animation.assetKey}`
        );
        return;
      }

      const animationKey = this.getKey(animation.key);

      if (this.scene.anims.exists(animationKey)) {
        return;
      }

      const frames = this.scene.anims.generateFrameNumbers(
        asset.key,
        {
          start: animation.startFrame,
          end: animation.endFrame
        }
      );

      if (frames.length === 0) {
        console.error(
          `No se pudieron generar frames para: ${animation.key}`
        );
        return;
      }

      this.scene.anims.create({
        key: animationKey,
        frames,
        frameRate: animation.frameRate,
        repeat: animation.repeat
      });
    });
  }

  play(key: string, ignoreIfPlaying = true) {
    if (!this.has(key)) {
      return;
    }

    const animationKey = this.getKey(key);

    if (!this.scene.anims.exists(animationKey)) {
      return;
    }

    if (this.visual.anims.currentAnim?.key === animationKey) {
      return;
    }

    this.visual.anims.play(animationKey, ignoreIfPlaying);
  }

  onComplete(key: string, callback: () => void) {
    this.visual.on(
      `animationcomplete-${this.getKey(key)}`,
      callback
    );
  }

  offComplete(key: string, callback: () => void) {
    this.visual.off(
      `animationcomplete-${this.getKey(key)}`,
      callback
    );
  }

  has(key: string) {
    return this.definition.animations.some(
      (animation) => animation.key === key
    );
  }

  isPlaying(key: string) {
    return (
      this.visual.anims.currentAnim?.key === this.getKey(key)
    );
  }

  getCurrentFrameIndex(key: string): number | undefined {
    if (!this.isPlaying(key)) {
      return undefined;
    }

    return this.visual.anims.currentFrame?.index;
  }

  getKey(key: string) {
    return `${this.animationPrefix}-${key}`;
  }
}
