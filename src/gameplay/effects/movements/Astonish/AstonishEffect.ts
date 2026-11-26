
import Phaser from 'phaser';

import type {
  NeutralVisualEffectDefinition
} from '../../../attacks/neutralAttackTypes';

import type {
  NeutralVisualEffectPlayer,
  NeutralVisualEffectArea
} from '../../../attacks/NeutralAttackController';

export class AstonishEffect implements NeutralVisualEffectPlayer {
  private readonly scene: Phaser.Scene;

  private readonly visualTextureKey = 'astonish-particle';

  // Objetos de la onda inicial de Gengar.
  private waveObjects: Phaser.GameObjects.GameObject[] = [];

  // Objetos del efecto que aparece sobre el rival.
  private hitObjects: Phaser.GameObjects.GameObject[] = [];

  // Temporizadores independientes.
  private waveCleanupTimer?: Phaser.Time.TimerEvent;
  private hitCleanupTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(
    effect: NeutralVisualEffectDefinition,
    x: number,
    y: number,
    _direction: 1 | -1,
    depth: number,
    scale = 1,
    area?: NeutralVisualEffectArea
  ): void {
    if (effect.key !== 'astonish') return;

    const effectScale = scale * (effect.scale ?? 1);

    const centerX = x + (effect.offsetX ?? 0);
    const centerY = y + (effect.offsetY ?? 0);

    if (area) {
      this.playOpponentEffect(
        centerX,
        centerY,
        depth,
        effectScale,
        area
      );

      return;
    }

    this.playGengarWave(
      centerX,
      centerY,
      depth,
      effectScale
    );
  }

  // =========================================================
  // ONDA INICIAL DE GENGAR
  // =========================================================

  private playGengarWave(
    x: number,
    y: number,
    depth: number,
    scale: number
  ): void {
    this.clearWave();

    const radius = 65 * scale;

    // Anillo exterior.
    const outerRing = this.scene.add.graphics();

    outerRing.lineStyle(
      12 * scale,
      0x32104f,
      0.95
    );

    outerRing.strokeCircle(0, 0, radius);

    outerRing
      .setPosition(x, y)
      .setDepth(depth)
      .setScale(0.25)
      .setAlpha(0);

    this.waveObjects.push(outerRing);

    // Expansión.
    this.scene.tweens.add({
      targets: outerRing,
      scale: 1.65,
      duration: 280,
      ease: 'Quad.easeOut'
    });

    // Aparición y desaparición.
    this.scene.tweens.add({
      targets: outerRing,
      alpha: 0.95,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    // Anillo interior.
    const innerRing = this.scene.add.graphics();

    innerRing.lineStyle(
      5 * scale,
      0x9b45d0,
      0.9
    );

    innerRing.strokeCircle(0, 0, radius * 0.82);

    innerRing
      .setPosition(x, y)
      .setDepth(depth + 1)
      .setScale(0.2)
      .setAlpha(0);

    this.waveObjects.push(innerRing);

    // Expansión.
    this.scene.tweens.add({
      targets: innerRing,
      scale: 1.8,
      delay: 45,
      duration: 290,
      ease: 'Quad.easeOut'
    });

    // Aparición y desaparición.
    this.scene.tweens.add({
      targets: innerRing,
      alpha: 0.9,
      delay: 45,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    this.waveCleanupTimer = this.scene.time.delayedCall(
      450,
      () => this.clearWave()
    );
  }

  // =========================================================
  // ONDA SOBRE EL RIVAL
  // =========================================================

  private playOpponentEffect(
    _x: number,
    _y: number,
    depth: number,
    scale: number,
    area: NeutralVisualEffectArea
  ): void {
    this.clearHit();

    const width = Math.max(area.width, 50);
    const height = Math.max(area.height, 50);

    // Centro aproximado del cuerpo del rival.
    const centerX = area.x + width / 2;
    const centerY = area.y + height * 0.42;

    const radius = Math.max(width, height) * 0.32;

    // Anillo exterior.
    const outerRing = this.scene.add.graphics();

    outerRing.lineStyle(
      11 * scale,
      0x32104f,
      0.95
    );

    outerRing.strokeCircle(0, 0, radius);

    outerRing
      .setPosition(centerX, centerY)
      .setDepth(depth)
      .setScale(0.25)
      .setAlpha(0);

    this.hitObjects.push(outerRing);

    this.scene.tweens.add({
      targets: outerRing,
      scale: 1.5,
      duration: 300,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: outerRing,
      alpha: 0.9,
      duration: 110,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    // Anillo interior.
    const innerRing = this.scene.add.graphics();

    innerRing.lineStyle(
      5 * scale,
      0x9b45d0,
      0.95
    );

    innerRing.strokeCircle(0, 0, radius * 0.75);

    innerRing
      .setPosition(centerX, centerY)
      .setDepth(depth + 1)
      .setScale(0.2)
      .setAlpha(0);

    this.hitObjects.push(innerRing);

    this.scene.tweens.add({
      targets: innerRing,
      scale: 1.65,
      delay: 50,
      duration: 300,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: innerRing,
      alpha: 0.9,
      delay: 50,
      duration: 110,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    // Signo de exclamación sobre la cabeza.
    const exclamation = this.scene.add.text(
      area.headX,
      area.headY - 10 * scale,
      '!',
      {
        fontFamily: 'Arial',
        fontSize: `${76 * scale}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#32104f',
        strokeThickness: 9 * scale
      }
    );

    exclamation
      .setOrigin(0.5, 1)
      .setDepth(depth + 3)
      .setScale(0.4)
      .setAlpha(0);

    this.hitObjects.push(exclamation);

    // Aparición del signo.
    this.scene.tweens.add({
      targets: exclamation,
      alpha: 1,
      scale: 1,
      y: exclamation.y - 12 * scale,
      duration: 130,
      ease: 'Back.easeOut'
    });

    // Desaparición del signo.
    this.scene.tweens.add({
      targets: exclamation,
      y: exclamation.y - 35 * scale,
      alpha: 0,
      delay: 650,
      duration: 300,
      ease: 'Quad.easeIn'
    });

    this.hitCleanupTimer = this.scene.time.delayedCall(
      1150,
      () => this.clearHit()
    );
  }

  // =========================================================
  // LIMPIEZA INDEPENDIENTE DE EFECTOS
  // =========================================================

  private clearWave(): void {
    this.waveCleanupTimer?.remove(false);
    this.waveCleanupTimer = undefined;

    for (const object of this.waveObjects) {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }

    this.waveObjects = [];
  }

  private clearHit(): void {
    this.hitCleanupTimer?.remove(false);
    this.hitCleanupTimer = undefined;

    for (const object of this.hitObjects) {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }

    this.hitObjects = [];
  }

  // =========================================================
  // DESTRUCCIÓN GENERAL
  // =========================================================

  destroy(): void {
    this.clearWave();
    this.clearHit();
  }
}
