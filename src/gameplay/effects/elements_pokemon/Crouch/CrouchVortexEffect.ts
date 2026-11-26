
import Phaser from 'phaser';

type VortexParticle = {
  gameObject: Phaser.GameObjects.Image;
  tween: Phaser.Tweens.Tween;
};

type ParticleState = {
  progress: number;
  angle: number;
  radius: number;
};

// Píxeles del frame que pertenecen al charco negro (sin cuerpo de Gengar).
type PoolMask = {
  width: number;
  height: number;
  data: Uint8Array;
};

export class CrouchVortexEffect {
  private readonly scene: Phaser.Scene;
  private readonly visual: Phaser.GameObjects.Sprite;

  // ---------------------------------------------------------------------------
  // AJUSTES
  // ---------------------------------------------------------------------------

  // Charco medido sobre el spritesheet (frames de 256x256), en píxeles del frame.
  private readonly poolCenterX = 127;
  private readonly poolCenterY = 216;
  private readonly poolRadiusX = 126;
  private readonly poolRadiusY = 34;

  // Color del charco en el PNG (12, 3, 36) y tolerancia al compararlo.
  private readonly poolColor = { r: 12, g: 3, b: 36 };
  private readonly poolTolerance = 12;

  // Si el componente más grande de ese color tiene menos píxeles que esto,
  // se considera que el frame no tiene charco.
  private readonly minPoolPixels = 2500;

  private readonly spawnDelay = 40;
  private readonly particleCount = 18;

  private readonly minDuration = 450;
  private readonly maxDuration = 850;

  // Tamaño de cada hebra, en píxeles del frame.
  private readonly minLength = 12;
  private readonly maxLength = 26;
  private readonly minThickness = 3;
  private readonly maxThickness = 6;

  private readonly colors = [
    0x7023a0,
    0x812ebc,
    0xa34cdb,
    0x4b126f,
    0xc084fc
  ];

  // ---------------------------------------------------------------------------

  private readonly glowTextureKey = 'crouch-vortex-glow';

  private readonly particles: VortexParticle[] = [];
  private readonly poolMasks = new Map<string, PoolMask>();

  // Conserva la última máscara válida del charco.
  private lastValidPoolMask?: PoolMask;

  private spawnTimer?: Phaser.Time.TimerEvent;
  private fadeTween?: Phaser.Tweens.Tween;

  private active = false;
  private destroyed = false;

  private fadeState = { alpha: 0 };

  constructor(
    scene: Phaser.Scene,
    visual: Phaser.GameObjects.Sprite
  ) {
    this.scene = scene;
    this.visual = visual;

    this.createGlowTexture();
  }

  update(isCrouching: boolean): void {
    if (this.destroyed) return;

    if (isCrouching === this.active) return;

    this.active = isCrouching;

    this.fadeTween?.stop();

    this.fadeTween = this.scene.tweens.add({
      targets: this.fadeState,
      alpha: isCrouching ? 1 : 0,
      duration: 350,
      ease: 'Sine.easeInOut'
    });

    if (isCrouching) {
      this.startSpawning();
    } else {
      this.stopSpawning();
    }
  }

  private startSpawning(): void {
    if (this.spawnTimer) return;

    this.spawnTimer = this.scene.time.addEvent({
      delay: this.spawnDelay,
      loop: true,
      callback: () => {
        if (!this.destroyed && this.active) {
          this.spawnParticles();
        }
      }
    });

    this.spawnParticles();
  }

  private stopSpawning(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;
  }

  private spawnParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

      // La raíz cuadrada reparte las partículas de forma pareja en el área
      // del óvalo, en lugar de amontonarlas en el centro.
      const radius = Math.sqrt(Phaser.Math.FloatBetween(0.04, 1));

      const length = Phaser.Math.FloatBetween(
        this.minLength,
        this.maxLength
      );

      const thickness = Phaser.Math.FloatBetween(
        this.minThickness,
        this.maxThickness
      );

      const particle = this.scene.add
        .image(this.visual.x, this.visual.y, this.glowTextureKey)
        .setTint(Phaser.Utils.Array.GetRandom(this.colors))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(this.visual.depth + 4)
        .setAlpha(0);

      const state: ParticleState = {
        progress: 0,
        angle,
        radius
      };

      const tween = this.scene.tweens.add({
        targets: state,
        progress: 1,
        duration: Phaser.Math.Between(
          this.minDuration,
          this.maxDuration
        ),
        ease: 'Sine.easeIn',

        onUpdate: () => {
          if (!particle.active) return;

          this.updateParticle(
            particle,
            state,
            length,
            thickness
          );
        },

        onComplete: () => {
          particle.destroy();
          this.removeParticle(particle);
        }
      });

      this.particles.push({
        gameObject: particle,
        tween
      });
    }
  }

  private updateParticle(
    particle: Phaser.GameObjects.Image,
    state: ParticleState,
    length: number,
    thickness: number
  ): void {
    const visual = this.visual;

    // No comprobar visual.visible:
    // El sprite de Gengar se oculta durante los ataques neutrales,
    // pero el vórtice debe continuar dibujándose.
    if (!visual.active) {
      particle.setAlpha(0);
      return;
    }

    // Espiral: gira alrededor del centro del charco mientras se acerca a él.
    const angle = state.angle + state.progress * Math.PI * 1.5;
    const radius = state.radius * (1 - state.progress * 0.92);

    // Posición dentro del frame (el óvalo del charco, aplastado en Y).
    const u = this.poolCenterX + Math.cos(angle) * radius * this.poolRadiusX;
    const v = this.poolCenterY + Math.sin(angle) * radius * this.poolRadiusY;

    // Dirección del giro en el frame, para orientar la hebra.
    const tangentU = -Math.sin(angle) * this.poolRadiusX;
    const tangentV = Math.cos(angle) * this.poolRadiusY;
    const tangentLength = Math.hypot(tangentU, tangentV) || 1;

    const directionU = tangentU / tangentLength;
    const directionV = tangentV / tangentLength;

    const world = this.frameToWorld(u, v);
    const flip = visual.flipX ? -1 : 1;

    const absScaleX = Math.abs(visual.scaleX);
    const absScaleY = Math.abs(visual.scaleY);

    const shrink = 1 - state.progress * 0.5;

    particle
      .setPosition(world.x, world.y)
      .setRotation(
        Math.atan2(
          directionV * visual.scaleY,
          directionU * flip * visual.scaleX
        )
      )
      .setDisplaySize(
        length * absScaleX * shrink,
        thickness * absScaleY * shrink
      )
      // Mantener las partículas por encima del sprite de ataque.
      .setDepth(visual.depth + 4);

    // Solo se ve sobre los píxeles del charco.
    const coverage = this.getPoolCoverage(
      u,
      v,
      directionU,
      directionV,
      length / 2
    );

    const lifeAlpha =
      Math.min(1, state.progress * 6) * (1 - state.progress);

    particle.setAlpha(
      this.fadeState.alpha * lifeAlpha * coverage * 0.9
    );
  }

  // ---------------------------------------------------------------------------
  // Máscara del charco
  // ---------------------------------------------------------------------------

  /** Convierte un punto del frame (píxeles) a coordenadas del mundo. */
  private frameToWorld(
    u: number,
    v: number
  ): { x: number; y: number } {
    const visual = this.visual;

    const width = visual.width;
    const height = visual.height;

    const horizontal = visual.flipX ? width - u : u;
    const vertical = visual.flipY ? height - v : v;

    return {
      x: visual.x + (horizontal - visual.originX * width) * visual.scaleX,
      y: visual.y + (vertical - visual.originY * height) * visual.scaleY
    };
  }

  /** Fracción (0 a 1) de la hebra que está sobre el charco. */
  private getPoolCoverage(
    u: number,
    v: number,
    directionU: number,
    directionV: number,
    halfLength: number
  ): number {
    const mask = this.getPoolMask();

    let hits = 0;

    if (this.isPoolPixel(mask, u, v)) hits++;

    if (
      this.isPoolPixel(
        mask,
        u + directionU * halfLength,
        v + directionV * halfLength
      )
    ) {
      hits++;
    }

    if (
      this.isPoolPixel(
        mask,
        u - directionU * halfLength,
        v - directionV * halfLength
      )
    ) {
      hits++;
    }

    return hits / 3;
  }

  private isPoolPixel(
    mask: PoolMask,
    u: number,
    v: number
  ): boolean {
    const x = Math.floor(u);
    const y = Math.floor(v);

    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) {
      return false;
    }

    return mask.data[y * mask.width + x] === 1;
  }

  /**
   * Obtiene la máscara del charco.
   *
   * Si el sprite está oculto durante el ataque, reutiliza la última máscara
   * válida que se obtuvo mientras Gengar estaba agachado.
   *
   * Si el frame actual no contiene el charco, también reutiliza esa máscara.
   */
  private getPoolMask(): PoolMask {
    if (!this.visual.visible && this.lastValidPoolMask) {
      return this.lastValidPoolMask;
    }

    const frame = this.visual.frame;
    const key = `${this.visual.texture.key}|${frame.name}`;

    const cached = this.poolMasks.get(key);

    if (cached) {
      return cached;
    }

    const mask = this.buildPoolMask(frame);

    this.poolMasks.set(key, mask);

    let poolPixels = 0;

    for (let i = 0; i < mask.data.length; i++) {
      if (mask.data[i] === 1) {
        poolPixels++;
      }
    }

    if (poolPixels >= this.minPoolPixels) {
      this.lastValidPoolMask = mask;
      return mask;
    }

    return this.lastValidPoolMask ?? mask;
  }

  /**
   * Busca en el frame los píxeles del color del charco y se queda con la
   * región conectada más grande. Así se descartan la boca, las pupilas y los
   * contornos del cuerpo, y el cuerpo de Gengar queda siempre fuera.
   */
  private buildPoolMask(
    frame: Phaser.Textures.Frame
  ): PoolMask {
    const width = frame.cutWidth;
    const height = frame.cutHeight;
    const size = width * height;

    const mask: PoolMask = {
      width,
      height,
      data: new Uint8Array(size)
    };

    try {
      const image = frame.source.image as unknown as CanvasImageSource;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', {
        willReadFrequently: true
      });

      if (!context) return mask;

      context.drawImage(
        image,
        frame.cutX,
        frame.cutY,
        width,
        height,
        0,
        0,
        width,
        height
      );

      const pixels = context.getImageData(
        0,
        0,
        width,
        height
      ).data;

      // 1. Píxeles con el color del charco.
      const isPool = new Uint8Array(size);

      for (let i = 0; i < size; i++) {
        const offset = i * 4;

        if (pixels[offset + 3] < 128) continue;

        const difference =
          Math.abs(pixels[offset] - this.poolColor.r) +
          Math.abs(pixels[offset + 1] - this.poolColor.g) +
          Math.abs(pixels[offset + 2] - this.poolColor.b);

        if (difference <= this.poolTolerance) {
          isPool[i] = 1;
        }
      }

      // 2. Región conectada más grande.
      const visited = new Uint8Array(size);
      const queue = new Int32Array(size);

      let best = new Int32Array(0);

      for (let start = 0; start < size; start++) {
        if (!isPool[start] || visited[start]) continue;

        let head = 0;
        let tail = 0;

        const visit = (index: number): void => {
          if (isPool[index] && !visited[index]) {
            visited[index] = 1;
            queue[tail++] = index;
          }
        };

        visit(start);

        while (head < tail) {
          const index = queue[head++];
          const x = index % width;
          const y = (index - x) / width;

          if (x > 0) visit(index - 1);
          if (x < width - 1) visit(index + 1);
          if (y > 0) visit(index - width);
          if (y < height - 1) visit(index + width);
        }

        if (tail > best.length) {
          best = queue.slice(0, tail);
        }
      }

      // 3. Si es muy pequeña, este frame no tiene charco.
      if (best.length < this.minPoolPixels) return mask;

      for (let i = 0; i < best.length; i++) {
        mask.data[best[i]] = 1;
      }
    } catch (error) {
      console.warn(
        '[CrouchVortexEffect] No se pudo leer el frame para crear la máscara del charco:',
        error
      );
    }

    return mask;
  }

  // ---------------------------------------------------------------------------
  // Recursos
  // ---------------------------------------------------------------------------

  /** Brillo suave: degradado radial blanco que se tiñe con el color de cada partícula. */
  private createGlowTexture(): void {
    if (this.scene.textures.exists(this.glowTextureKey)) return;

    const size = 32;

    const texture = this.scene.textures.createCanvas(
      this.glowTextureKey,
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

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    texture.refresh();
  }

  private removeParticle(
    particle: Phaser.GameObjects.Image
  ): void {
    const index = this.particles.findIndex(
      item => item.gameObject === particle
    );

    if (index !== -1) {
      this.particles.splice(index, 1);
    }
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.active = false;

    this.stopSpawning();

    this.fadeTween?.stop();
    this.fadeTween = undefined;

    for (const particle of this.particles) {
      particle.tween.stop();
      particle.gameObject.destroy();
    }

    this.particles.length = 0;
    this.poolMasks.clear();
    this.lastValidPoolMask = undefined;
  }
}
