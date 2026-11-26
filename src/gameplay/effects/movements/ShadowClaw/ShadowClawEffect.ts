
import Phaser from 'phaser';

import type {
  NeutralVisualEffectDefinition
} from '../../../attacks/neutralAttackTypes';

import type {
  NeutralVisualEffectPlayer
} from '../../../attacks/NeutralAttackController';

// Tamaño real de cada frame en el spritesheet (grilla 3x2, 768x512).
const FRAME_SIZE = 256;
const FRAME_COUNT = 5;
const FRAME_COLUMNS = 3;

// Menor SAMPLE_STEP = silueta más precisa, pero más costosa al construirla.
const SAMPLE_STEP = 3;
const ALPHA_THRESHOLD = 100;

type CoverableEffect = NeutralVisualEffectDefinition & {
  width?: number;
  height?: number;
  duration?: number;
};

type Silhouette = {
  edge: Phaser.Math.Vector2[];
  body: Phaser.Math.Vector2[];
};

type SilhouetteEmitterOptions = {
  frequency: number;
  quantity: number;
  lifespan: { min: number; max: number };
  speed: { min: number; max: number };
  gravityY: number;
  scaleStart: number;
  alpha: { start: number; end: number };
  tint: number[];
  edgeBias: number;
  jitter: number;
};

export class ShadowClawEffect implements NeutralVisualEffectPlayer {
  private readonly scene: Phaser.Scene;

  private readonly textureKey = 'shadow-claw';
  private readonly animationKey = 'shadow-claw-animation';
  private readonly particleTextureKey = 'shadow-claw-particle';

  private sprite?: Phaser.GameObjects.Sprite;
  private auraBack?: Phaser.GameObjects.Particles.ParticleEmitter;
  private wispsFront?: Phaser.GameObjects.Particles.ParticleEmitter;

  private activeTweens: Phaser.Tweens.Tween[] = [];
  private cleanupTimer?: Phaser.Time.TimerEvent;

  private silhouettes: Silhouette[] = [];

  private currentScaleX = 1;
  private currentScaleY = 1;
  private currentRotation = 0;
  private currentFlip = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.createParticleTexture();

    // Preparamos las siluetas al crear el efecto,
    // no durante el primer ataque.
    this.buildSilhouettes();
  }

  play(
    effectDef: NeutralVisualEffectDefinition,
    x: number,
    y: number,
    direction: 1 | -1,
    depth: number,
    scale = 1
  ): void {
    if (effectDef.key !== 'shadow-claw') return;

    const effect = effectDef as CoverableEffect;

    this.destroy();

    const positionX = x + (effect.offsetX ?? 0) * direction;
    const positionY = y + (effect.offsetY ?? 0);

    const rotation = Phaser.Math.DegToRad(
      (effect.rotation ?? 0) * direction
    );

    const scaleX =
      ((effect.width ?? FRAME_SIZE) * scale) / FRAME_SIZE;

    const scaleY =
      ((effect.height ?? FRAME_SIZE) * scale) / FRAME_SIZE;

    this.currentScaleX = scaleX;
    this.currentScaleY = scaleY;
    this.currentRotation = rotation;
    this.currentFlip = direction === -1 ? -1 : 1;

    const duration =
      effect.duration ?? (FRAME_COUNT / 12) * 1000;

    this.createAnimation(duration);

    this.sprite = this.scene.add
      .sprite(positionX, positionY, this.textureKey, 0)
      .setOrigin(0.5)
      .setScale(scaleX, scaleY)
      .setFlipX(direction === -1)
      .setRotation(rotation)
      .setAlpha(0.95)
      .setDepth(depth + 1);

    const maxScale = Math.max(scaleX, scaleY);

    this.auraBack = this.createSilhouetteEmitter(
      positionX,
      positionY,
      {
        frequency: 14,
        quantity: 5,
        lifespan: { min: 300, max: 600 },
        speed: { min: 6, max: 30 },
        gravityY: -35,
        scaleStart: 1.25,
        alpha: { start: 0.55, end: 0 },
        tint: [
          0x1a0430,
          0x240638,
          0x35104f,
          0x4b126f
        ],
        edgeBias: 0.85,
        jitter: 10 * maxScale
      }
    ).setDepth(depth);

    this.wispsFront = this.createSilhouetteEmitter(
      positionX,
      positionY,
      {
        frequency: 18,
        quantity: 3,
        lifespan: { min: 220, max: 450 },
        speed: { min: 15, max: 55 },
        gravityY: -60,
        scaleStart: 0.6,
        alpha: { start: 0.8, end: 0 },
        tint: [
          0x4b126f,
          0x7023a0,
          0x812ebc
        ],
        edgeBias: 1,
        jitter: 4 * maxScale
      }
    ).setDepth(depth + 2);

    this.sprite.play(this.animationKey);

    this.activeTweens.push(
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.8, to: 1 },
        duration: 65,
        yoyo: true,
        repeat: 2
      })
    );

    this.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      () => this.fadeOut()
    );
  }

  // =========================================================
  // SILUETAS
  // =========================================================

  /**
   * Lee los píxeles de la imagen una sola vez.
   *
   * Antes se utilizaba getPixelAlpha() miles de veces.
   * Ahora trabajamos directamente con los datos del canvas.
   */
  private buildSilhouettes(): void {
    if (this.silhouettes.length > 0) return;

    if (!this.scene.textures.exists(this.textureKey)) {
      console.warn(
        `No se encontró la textura: ${this.textureKey}`
      );
      return;
    }

    const texture = this.scene.textures.get(this.textureKey);

    const source = texture.getSourceImage() as HTMLImageElement;

    const imageWidth = source.naturalWidth || source.width;
    const imageHeight = source.naturalHeight || source.height;

    if (
      imageWidth < FRAME_SIZE * FRAME_COLUMNS ||
      imageHeight < FRAME_SIZE * 2
    ) {
      console.warn(
        'El spritesheet de ShadowClaw tiene dimensiones incorrectas.'
      );
      return;
    }

    // Creamos un canvas temporal para leer los píxeles.
    const canvas = document.createElement('canvas');

    canvas.width = imageWidth;
    canvas.height = imageHeight;

    const context = canvas.getContext('2d', {
      willReadFrequently: true
    });

    if (!context) return;

    context.drawImage(
      source,
      0,
      0,
      imageWidth,
      imageHeight
    );

    // Una sola lectura de todos los píxeles.
    const imageData = context.getImageData(
      0,
      0,
      imageWidth,
      imageHeight
    );

    const pixels = imageData.data;

    const alphaAt = (
      px: number,
      py: number,
      frame: number
    ): number => {
      if (
        px < 0 ||
        py < 0 ||
        px >= FRAME_SIZE ||
        py >= FRAME_SIZE
      ) {
        return 0;
      }

      const frameX =
        (frame % FRAME_COLUMNS) * FRAME_SIZE;

      const frameY =
        Math.floor(frame / FRAME_COLUMNS) * FRAME_SIZE;

      const imageX = frameX + px;
      const imageY = frameY + py;

      const index =
        (imageY * imageWidth + imageX) * 4 + 3;

      return pixels[index];
    };

    const half = FRAME_SIZE / 2;

    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      const edge: Phaser.Math.Vector2[] = [];
      const body: Phaser.Math.Vector2[] = [];

      for (
        let py = 0;
        py < FRAME_SIZE;
        py += SAMPLE_STEP
      ) {
        for (
          let px = 0;
          px < FRAME_SIZE;
          px += SAMPLE_STEP
        ) {
          if (
            alphaAt(px, py, frame) < ALPHA_THRESHOLD
          ) {
            continue;
          }

          const isEdge =
            alphaAt(
              px - SAMPLE_STEP,
              py,
              frame
            ) < ALPHA_THRESHOLD ||
            alphaAt(
              px + SAMPLE_STEP,
              py,
              frame
            ) < ALPHA_THRESHOLD ||
            alphaAt(
              px,
              py - SAMPLE_STEP,
              frame
            ) < ALPHA_THRESHOLD ||
            alphaAt(
              px,
              py + SAMPLE_STEP,
              frame
            ) < ALPHA_THRESHOLD;

          const point = new Phaser.Math.Vector2(
            px - half,
            py - half
          );

          if (isEdge) {
            edge.push(point);
          } else {
            body.push(point);
          }
        }
      }

      this.silhouettes.push({
        edge,
        body
      });
    }
  }

  /**
   * Obtiene un punto aleatorio de la silueta
   * y aplica escala, volteo y rotación.
   */
  private randomSilhouettePoint(
    out: Phaser.Types.Math.Vector2Like,
    edgeBias: number,
    jitter: number
  ): void {
    const frameIndex = this.sprite
      ? Phaser.Math.Clamp(
          Number(this.sprite.frame.name),
          0,
          FRAME_COUNT - 1
        )
      : 0;

    const silhouette = this.silhouettes[frameIndex];

    if (!silhouette) {
      out.x = 0;
      out.y = 0;
      return;
    }

    const useEdge =
      Math.random() < edgeBias ||
      silhouette.body.length === 0;

    const pool = useEdge
      ? silhouette.edge
      : silhouette.body;

    if (pool.length === 0) {
      out.x = 0;
      out.y = 0;
      return;
    }

    const point = Phaser.Utils.Array.GetRandom(pool);

    const lx =
      point.x *
      this.currentScaleX *
      this.currentFlip;

    const ly =
      point.y * this.currentScaleY;

    const cos = Math.cos(this.currentRotation);
    const sin = Math.sin(this.currentRotation);

    out.x =
      lx * cos -
      ly * sin +
      Phaser.Math.FloatBetween(-jitter, jitter);

    out.y =
      lx * sin +
      ly * cos +
      Phaser.Math.FloatBetween(-jitter, jitter);
  }

  private createSilhouetteEmitter(
    x: number,
    y: number,
    options: SilhouetteEmitterOptions
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const avgScale =
      (this.currentScaleX + this.currentScaleY) / 2;

    const zone: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig =
      {
        type: 'random',
        source: {
          getRandomPoint: (
            point: Phaser.Types.Math.Vector2Like
          ) => {
            this.randomSilhouettePoint(
              point,
              options.edgeBias,
              options.jitter
            );
          }
        }
      };

    return this.scene.add.particles(
      x,
      y,
      this.particleTextureKey,
      {
        emitting: true,
        frequency: options.frequency,
        quantity: options.quantity,
        lifespan: options.lifespan,
        speed: options.speed,
        angle: {
          min: 0,
          max: 360
        },
        gravityY: options.gravityY,
        scale: {
          start: options.scaleStart * avgScale,
          end: 0
        },
        alpha: options.alpha,
        tint: options.tint,
        blendMode: Phaser.BlendModes.NORMAL,
        maxParticles: 400,
        emitZone: zone
      }
    );
  }

  // =========================================================
  // RECURSOS
  // =========================================================

  private createAnimation(totalDurationMs: number): void {
    if (this.scene.anims.exists(this.animationKey)) {
      this.scene.anims.remove(this.animationKey);
    }

    this.scene.anims.create({
      key: this.animationKey,
      frames: this.scene.anims.generateFrameNumbers(
        this.textureKey,
        {
          start: 0,
          end: FRAME_COUNT - 1
        }
      ),
      duration: totalDurationMs,
      repeat: 0
    });
  }

  private createParticleTexture(): void {
    if (
      this.scene.textures.exists(this.particleTextureKey)
    ) {
      return;
    }

    const size = 32;

    const texture = this.scene.textures.createCanvas(
      this.particleTextureKey,
      size,
      size
    );

    if (!texture) return;

    const context = texture.getContext();

    const gradient = context.createRadialGradient(
      16,
      16,
      0,
      16,
      16,
      16
    );

    gradient.addColorStop(
      0,
      'rgba(255,255,255,1)'
    );

    gradient.addColorStop(
      0.45,
      'rgba(255,255,255,0.55)'
    );

    gradient.addColorStop(
      1,
      'rgba(255,255,255,0)'
    );

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    texture.refresh();
  }

  // =========================================================
  // DESAPARICIÓN
  // =========================================================

  private fadeOut(): void {
    this.wispsFront?.stop();
    this.auraBack?.stop();

    this.activeTweens.forEach(tween => tween.stop());
    this.activeTweens = [];

    const sprite = this.sprite;

    this.activeTweens.push(
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 140,
        onComplete: () => {
          sprite?.destroy();

          if (this.sprite === sprite) {
            this.sprite = undefined;
          }
        }
      })
    );

    // Esperamos a que terminen las partículas restantes.
    this.cleanupTimer = this.scene.time.delayedCall(
      650,
      () => this.destroy()
    );
  }

  // =========================================================
  // DESTRUCCIÓN
  // =========================================================

  destroy(): void {
    this.cleanupTimer?.remove(false);
    this.cleanupTimer = undefined;

    this.activeTweens.forEach(tween => tween.stop());
    this.activeTweens = [];

    this.sprite?.destroy();
    this.sprite = undefined;

    this.auraBack?.destroy();
    this.auraBack = undefined;

    this.wispsFront?.destroy();
    this.wispsFront = undefined;
  }
}
