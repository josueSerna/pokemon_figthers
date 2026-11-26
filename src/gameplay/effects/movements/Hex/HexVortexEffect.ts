import Phaser from 'phaser';

type BlobLayer = 'body' | 'glow' | 'shine';

// Masa del chorro: cada mancha tiene una posición fija dentro de la columna,
// así que el conjunto se mueve como un solo cuerpo líquido.
type Blob = {
  image: Phaser.GameObjects.Image;
  layer: BlobLayer;
  t: number; // altura dentro del chorro: 0 = base, 1 = punta
  angle: number;
  radius: number; // fracción del ancho del chorro
  size: number;
  seed: number;
  maxAlpha: number;
};

// Gota que sale despedida y cae de nuevo al charco.
// Las posiciones están en el plano del charco (x, z) y la altura (h),
// en píxeles para un sprite con scale = 1.
type Droplet = {
  body: Phaser.GameObjects.Image;
  shine: Phaser.GameObjects.Image;
  active: boolean;
  x: number;
  z: number;
  h: number;
  vx: number;
  vz: number;
  vh: number;
  size: number;
};

// Onda que se abre en el líquido cuando algo cae o revienta.
type Ripple = {
  image: Phaser.GameObjects.Image;
  active: boolean;
  x: number;
  z: number;
  progress: number;
  duration: number;
  maxSize: number;
};

// Burbuja tóxica: crece sobre el chorro o sobre el charco y revienta.
type Bubble = {
  ring: Phaser.GameObjects.Image;
  shine: Phaser.GameObjects.Image;
  active: boolean;
  onJet: boolean;
  t: number;
  angle: number;
  x: number;
  z: number;
  progress: number;
  life: number;
  size: number;
};

// Vapor tóxico que sube lentamente desde el charco.
type Vapor = {
  image: Phaser.GameObjects.Image;
  active: boolean;
  x: number;
  z: number;
  progress: number;
  duration: number;
  size: number;
  drift: number;
};

type EffectState = 'idle' | 'intro' | 'running' | 'outro';

/**
 * Chorro de veneno que sale del charco negro de Gengar: un líquido espeso y
 * brillante que sube, forma una gota pesada en la punta, salpica y vuelve a
 * caer al charco. Ocurre una sola vez y el efecto se limpia solo al terminar.
 *
 * El tamaño se toma del charco del PRIMER frame (el más grande) y se
 * mantiene fijo, aunque el charco del sprite se encoja en los frames siguientes.
 */
export class HexVortexEffect {
  private readonly scene: Phaser.Scene;

  // ---------------------------------------------------------------------------
  // AJUSTES (en píxeles, para un sprite con scale = 1)
  // ---------------------------------------------------------------------------

  // Charco del primer frame (spritesheet de 256x256): unos 252 x 68 px.
  private readonly poolRadiusX = 126;
  private readonly poolRadiusY = 34;

  // Chorro
  private readonly coneBaseRatio = 0.55; // ancho de la base respecto al charco
  private readonly coneHeight = 190; // altura máxima

  // Salpicadura única
  private readonly cycleDuration = 1.7; // segundos que dura la subida y la caída
  private readonly gravity = 1200; // más alto = las gotas caen más rápido

  // Cantidad de partículas (baja estos números si necesitas más rendimiento)
  private readonly bodyBlobCount = 80;
  private readonly glowBlobCount = 40;
  private readonly shineBlobCount = 14;
  private readonly maxDroplets = 40;
  private readonly maxRipples = 24;
  private readonly maxBubbles = 24;
  private readonly maxVapors = 16;

  private readonly crownDropletCount = 14; // gotas al salir el chorro
  private readonly apexDropletCount = 10; // gotas al llegar a lo más alto

  // Tiempos de entrada y salida (segundos)
  private readonly introDuration = 0.32;
  private readonly outroDuration = 0.5;

  // Colores: violeta oscuro y espeso, con un toque tóxico.
  private readonly bodyColors = [0x2a0845, 0x3b0d63, 0x4e1380, 0x5f1a99];
  private readonly glowColors = [0xa02ee0, 0xc05aff, 0xb03fe0, 0x9b35e8];
  private readonly dropletColors = [0x3b0d63, 0x4e1380, 0x5f1a99];
  private readonly vaporColors = [0x8a5cc8, 0x6f3fb0];

  // Acento verde tóxico en brillos, burbujas y vapor.
  // Pon toxicAccentChance en 0 si lo quieres solo violeta.
  private readonly toxicColors = [0x8cff3a, 0xb6ff6a];
  private readonly toxicAccentChance = 0.15;

  // ---------------------------------------------------------------------------

  private readonly blobTextureKey = 'hex-vortex-blob';
  private readonly glowTextureKey = 'hex-vortex-glow';
  private readonly groundTextureKey = 'hex-vortex-ground';
  private readonly ringTextureKey = 'hex-vortex-ring';

  private groundGlow?: Phaser.GameObjects.Image;
  private baseGlow?: Phaser.GameObjects.Image;
  private core?: Phaser.GameObjects.Image;
  private blobs: Blob[] = [];
  private droplets: Droplet[] = [];
  private ripples: Ripple[] = [];
  private bubbles: Bubble[] = [];
  private vapors: Vapor[] = [];

  private state: EffectState = 'idle';

  private x = 0;
  private y = 0;
  private depth = 0;
  private scale = 1;

  private elapsed = 0;
  private introTime = 0;
  private outroTime = 0;

  private growth = 0; // entrada del efecto (0 a 1, con un pequeño rebote)
  private appear = 0; // aparición del brillo del suelo (0 a 1)
  private fade = 1; // desvanecido al terminar (1 a 0)

  private level = 0; // nivel de la salpicadura: 0 = reposo, 1 = punto más alto
  private cycleFlash = 0; // destello del charco al lanzarse el chorro
  private launched = false;
  private apexDone = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.createBlobTexture();
    this.createGlowTexture();
    this.createGroundTexture();
    this.createRingTexture();
  }

  /**
   * @param x centro del charco en pantalla
   * @param y centro del charco en pantalla
   * @param depth profundidad del efecto (ponlo por encima del sprite)
   * @param scale escala del sprite de Gengar
   */
  play(
    x: number,
    y: number,
    depth: number,
    scale = 1
  ): void {
    this.destroyObjects();

this.x = x;
this.y = y + (this.poolRadiusY * scale) + (60 * scale);
this.depth = depth;
this.scale = scale;

    this.elapsed = 0;
    this.introTime = 0;
    this.outroTime = 0;
    this.growth = 0;
    this.appear = 0;
    this.fade = 1;
    this.level = 0;
    this.cycleFlash = 0;
    this.launched = false;
    this.apexDone = false;

    // --- Suelo ---
    this.groundGlow = this.createImage(this.groundTextureKey, 0xc9a0ff, true)
      .setDepth(depth);

    this.baseGlow = this.createImage(this.glowTextureKey, 0xb03fe0, true)
      .setDepth(depth + 0.3);

    for (let i = 0; i < this.maxRipples; i++) {
      this.ripples.push({
        image: this.createImage(this.ringTextureKey, 0xcfa6ff, true)
          .setDepth(depth + 0.1),
        active: false,
        x: 0,
        z: 0,
        progress: 0,
        duration: 0.5,
        maxSize: 30
      });
    }

    for (let i = 0; i < this.maxVapors; i++) {
      this.vapors.push({
        image: this.createImage(this.glowTextureKey, 0x8a5cc8, true)
          .setDepth(depth + 2.7),
        active: false,
        x: 0,
        z: 0,
        progress: 0,
        duration: 1,
        size: 40,
        drift: 0
      });
    }

    // --- Chorro ---
    for (let i = 0; i < this.bodyBlobCount; i++) {
      this.blobs.push(
        this.createBlob('body', (i + Math.random()) / this.bodyBlobCount)
      );
    }

    for (let i = 0; i < this.glowBlobCount; i++) {
      this.blobs.push(
        this.createBlob('glow', (i + Math.random()) / this.glowBlobCount)
      );
    }

    for (let i = 0; i < this.shineBlobCount; i++) {
      this.blobs.push(
        this.createBlob('shine', (i + Math.random()) / this.shineBlobCount)
      );
    }

    this.core = this.createImage(this.glowTextureKey, 0xb03fe0, true)
      .setDepth(depth + 1);

    // --- Burbujas ---
    for (let i = 0; i < this.maxBubbles; i++) {
      this.bubbles.push({
        ring: this.createImage(this.ringTextureKey, 0xcfa6ff, true),
        shine: this.createImage(this.glowTextureKey, 0xffffff, true),
        active: false,
        onJet: true,
        t: 0,
        angle: 0,
        x: 0,
        z: 0,
        progress: 0,
        life: 0.7,
        size: 8
      });
    }

    // --- Gotas ---
    for (let i = 0; i < this.maxDroplets; i++) {
      this.droplets.push({
        body: this.createImage(this.blobTextureKey, 0x4e1380, false)
          .setDepth(depth + 2.5),
        shine: this.createImage(this.glowTextureKey, 0xf3c4ff, true)
          .setDepth(depth + 2.6),
        active: false,
        x: 0,
        z: 0,
        h: 0,
        vx: 0,
        vz: 0,
        vh: 0,
        size: 6
      });
    }

    this.state = 'intro';

    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.handleUpdate);
  }

  /** Mueve el efecto si el personaje se desplaza mientras está activo. */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  stop(): void {
    if (this.state === 'idle' || this.state === 'outro') return;

    this.state = 'outro';
    this.outroTime = 0;
  }

  destroy(): void {
    this.destroyObjects();
  }

  // ---------------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------------

  private readonly handleUpdate = (_time: number, delta: number): void => {
    if (this.state === 'idle') return;

    const dt = Math.min(delta / 1000, 0.05);
    this.elapsed += dt;

    if (this.state === 'intro') {
      this.introTime += dt / this.introDuration;

      const t = Math.min(1, this.introTime);

      this.growth = this.easeOutBack(t);
      this.appear = Math.min(1, this.growth);

      if (t >= 1) {
        this.state = 'running';
      }
    } else if (this.state === 'outro') {
      this.outroTime += dt / this.outroDuration;

      const t = Math.min(1, this.outroTime);

      this.fade = 1 - t;
      this.growth = 1 - t;
      this.appear = 1;

      if (t >= 1) {
        this.destroyObjects();
        return;
      }
    } else {
      this.growth = 1;
      this.appear = 1;
    }

    // Avance de la única salpicadura (0 a 1). No se repite.
    const u = Math.min(this.elapsed / this.cycleDuration, 1);

    this.level = this.splashLevel(u);
    this.cycleFlash = Math.max(0, 1 - u / 0.2);

    if (this.state !== 'outro') {
      // El chorro sale: corona de gotas, burbujas, vapor y onda grande.
      if (!this.launched) {
        this.launched = true;
        this.spawnLaunch();
      }

      // El chorro llega a lo más alto: la gota de la punta se rompe.
      if (!this.apexDone && u >= 0.36) {
        this.apexDone = true;
        this.spawnApex();
      }

      // Burbujas que crecen sobre el chorro mientras está arriba.
      if (this.level > 0.15 && Math.random() < dt * 16) {
        this.spawnBubble(true);
      }

      // Burbujas y vapor en el charco mientras el chorro cae.
      if (u > 0.45 && u < 0.9) {
        if (Math.random() < dt * 9) this.spawnBubble(false);
        if (Math.random() < dt * 8) this.spawnVapor();
      }

      // Ya cayó: el efecto se desvanece y se limpia solo.
      if (u >= 0.92) {
        this.stop();
      }
    }

    this.updateGround();
    this.updateJet();
    this.updateDroplets(dt);
    this.updateBubbles(dt);
    this.updateVapors(dt);
    this.updateRipples(dt);
  };

  private destroyObjects(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.handleUpdate);

    this.groundGlow?.destroy();
    this.groundGlow = undefined;

    this.baseGlow?.destroy();
    this.baseGlow = undefined;

    this.core?.destroy();
    this.core = undefined;

    for (const blob of this.blobs) blob.image.destroy();

    for (const droplet of this.droplets) {
      droplet.body.destroy();
      droplet.shine.destroy();
    }

    for (const ripple of this.ripples) ripple.image.destroy();

    for (const bubble of this.bubbles) {
      bubble.ring.destroy();
      bubble.shine.destroy();
    }

    for (const vapor of this.vapors) vapor.image.destroy();

    this.blobs = [];
    this.droplets = [];
    this.ripples = [];
    this.bubbles = [];
    this.vapors = [];

    this.state = 'idle';
  }

  // ---------------------------------------------------------------------------
  // Salpicadura: sube rápido, se sostiene un instante y cae acelerando
  // ---------------------------------------------------------------------------

  private splashLevel(u: number): number {
    if (u < 0.38) {
      // Sube con fuerza y va frenando.
      const v = u / 0.38;

      return 1 - Math.pow(1 - v, 3);
    }

    if (u < 0.5) {
      // Instante en lo más alto.
      return 1;
    }

    if (u < 0.92) {
      // Cae cada vez más rápido, como por gravedad.
      const v = (u - 0.5) / 0.42;

      return 1 - v * v;
    }

    // Ya cayó por completo.
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Suelo: brillo tenue del charco envenenado
  // ---------------------------------------------------------------------------

  private updateGround(): void {
    const scale = this.scale;
    const rx = this.poolRadiusX * scale;
    const ry = this.poolRadiusY * scale;
    const baseHalf = this.poolRadiusX * this.coneBaseRatio * scale;

    const a = this.fade * this.appear;
    const pulse = 0.92 + 0.08 * Math.sin(this.elapsed * 4);

    // Brillo turbio que llena el charco; se enciende al salir el chorro.
    this.groundGlow
      ?.setPosition(this.x, this.y)
      .setDisplaySize(rx * 2.1, ry * 2.1)
      .setAlpha(Math.min(1, (0.5 + 0.25 * this.cycleFlash) * pulse) * a);

    // Foco en la base del chorro.
    this.baseGlow
      ?.setPosition(this.x, this.y)
      .setDisplaySize(baseHalf * 2.4, baseHalf * 2.4 * (ry / rx) * 1.3)
      .setAlpha((0.25 + 0.2 * this.level) * a);
  }

  // ---------------------------------------------------------------------------
  // Chorro: líquido espeso que sube y baja
  // ---------------------------------------------------------------------------

  /**
   * Semiancho del chorro a la altura t.
   * - Abajo es ancho y arriba se afina, como un cono.
   * - En lo más alto se forma una gota pesada (un bulbo) en la punta.
   * - Cuanto más alto está, más delgado se estira; al bajar se ensancha.
   * - Ondas lentas por la superficie dan sensación de líquido espeso.
   */
  private jetRadius(
    t: number,
    seed: number,
    baseHalf: number
  ): number {
    const s = this.level;

    const widthFactor = 0.85 + 0.3 * (1 - s);
    const stem = 0.1 + 0.9 * Math.pow(1 - t, 1.35);
    const tip = Math.sqrt(Math.max(0, 1 - Math.pow(t, 10)));
    const bulb = Math.pow(s, 3) * 0.45 * Math.exp(-Math.pow((t - 0.86) / 0.1, 2));
    const wave = 1 + 0.08 * Math.sin(t * 9 - this.elapsed * 5 + seed);

    return baseHalf * (widthFactor * stem * tip + bulb) * wave;
  }

  private createBlob(layer: BlobLayer, t: number): Blob {
    let textureKey = this.blobTextureKey;
    let tint: number;
    let additive = true;
    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    let radius: number;
    let size: number;
    let maxAlpha: number;

    if (layer === 'body') {
      // Cuerpo oscuro y casi opaco, como un líquido espeso.
      tint = Phaser.Utils.Array.GetRandom(this.bodyColors);
      additive = false;
      radius = Math.sqrt(Phaser.Math.FloatBetween(0, 1)) * 1.05;
      size = Phaser.Math.FloatBetween(40, 70);
      maxAlpha = Phaser.Math.FloatBetween(0.5, 0.7);
    } else if (layer === 'glow') {
      // Brillo tenue en la superficie, con algún toque tóxico.
      textureKey = this.glowTextureKey;
      tint =
        Math.random() < this.toxicAccentChance
          ? Phaser.Utils.Array.GetRandom(this.toxicColors)
          : Phaser.Utils.Array.GetRandom(this.glowColors);
      radius = Phaser.Math.FloatBetween(0.8, 1.1);
      size = Phaser.Math.FloatBetween(22, 42);
      maxAlpha = Phaser.Math.FloatBetween(0.12, 0.22);
    } else {
      // Reflejos brillantes arriba a la izquierda: acabado húmedo y viscoso.
      textureKey = this.glowTextureKey;
      tint = 0xf3e6ff;
      angle = Phaser.Math.FloatBetween(-1.1, -0.3);
      radius = Phaser.Math.FloatBetween(0.95, 1.02);
      size = Phaser.Math.FloatBetween(6, 12);
      maxAlpha = Phaser.Math.FloatBetween(0.5, 0.8);
    }

    return {
      image: this.createImage(textureKey, tint, additive),
      layer,
      t: t * 0.97,
      angle,
      radius,
      size,
      seed: Phaser.Math.FloatBetween(0, 6),
      maxAlpha
    };
  }

  private updateJet(): void {
    const scale = this.scale;
    const baseHalf = this.poolRadiusX * this.coneBaseRatio * scale;
    const perspective = this.poolRadiusY / this.poolRadiusX;

    // La masa aparece al empezar a subir y se disuelve al terminar de caer.
    const alpha =
      this.fade * Math.min(1, this.growth) * Math.min(1, this.level * 5);

    const height = this.coneHeight * scale * this.level;

    for (const blob of this.blobs) {
      const t = blob.t;

      // Oscilación leve para que la masa respire, sin girar como humo.
      const angle = blob.angle + Math.sin(this.elapsed * 2.2 + blob.seed) * 0.18;

      const radius =
        this.jetRadius(t, blob.seed, baseHalf) * blob.radius + 2 * scale;

      const facing = Math.cos(angle);

      const px = Math.sin(angle) * radius;
      const py = -t * height + facing * radius * perspective;

      const size = blob.size * scale * (0.55 + 0.45 * (1 - t));

      let blobAlpha = blob.maxAlpha * alpha;
      let depthFront = 2;
      let depthBack = 0.5;

      if (blob.layer === 'glow') {
        // Un destello lento recorre la superficie hacia arriba.
        blobAlpha *= 0.7 + 0.3 * Math.sin(t * 8 - this.elapsed * 5 + blob.seed);
        depthFront = 2.2;
        depthBack = 0.6;
      } else if (blob.layer === 'shine') {
        // Los reflejos solo se ven en la cara que mira al frente.
        blobAlpha *= facing > 0.2 ? 0.8 + 0.2 * Math.sin(this.elapsed * 6 + blob.seed) : 0;
        depthFront = 2.3;
        depthBack = 0.7;
      }

      blob.image
        .setPosition(this.x + px, this.y + py)
        .setDisplaySize(size, size)
        .setAlpha(blobAlpha)
        // Lo que está detrás del chorro queda detrás, lo de delante encima.
        .setDepth(this.depth + (facing > 0 ? depthFront : depthBack));
    }

    // Núcleo luminoso tenue a lo largo del eje del chorro.
    const pulse = 0.85 + 0.15 * Math.sin(this.elapsed * 6);

    this.core
      ?.setPosition(this.x, this.y - height * 0.42)
      .setDisplaySize(baseHalf * 0.9, Math.max(1, height))
      .setAlpha(0.18 * alpha * pulse);
  }

  // ---------------------------------------------------------------------------
  // Gotas
  // ---------------------------------------------------------------------------

  /** Al salir el chorro: corona de gotas, burbujas y vapor. */
  private spawnLaunch(): void {
    const baseHalf = this.poolRadiusX * this.coneBaseRatio;
    const maxRadius = this.poolRadiusX * 0.95;

    this.spawnRipple(0, 0, this.poolRadiusX * 1.9, 0.75);

    for (let i = 0; i < this.crownDropletCount; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startRadius = baseHalf * 0.85;

      const vh = Phaser.Math.FloatBetween(180, 400);
      const flightTime = (2 * vh) / this.gravity;

      // Limita el alcance para que la gota caiga siempre dentro del charco.
      const speed = Math.min(
        Phaser.Math.FloatBetween(70, 160),
        Math.max(10, (maxRadius - startRadius) / flightTime)
      );

      this.spawnDroplet(
        Math.cos(angle) * startRadius,
        Math.sin(angle) * startRadius,
        0,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        vh,
        Phaser.Math.FloatBetween(6, 11)
      );
    }

    for (let i = 0; i < 8; i++) this.spawnBubble(false);
    for (let i = 0; i < 8; i++) this.spawnVapor();
  }

  /** En lo más alto: la gota de la punta se rompe y cae en lluvia. */
  private spawnApex(): void {
    const baseHalf = this.poolRadiusX * this.coneBaseRatio;
    const maxRadius = this.poolRadiusX * 0.95;
    const startHeight = this.coneHeight * 0.96;

    for (let i = 0; i < this.apexDropletCount; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startRadius = baseHalf * 0.15;

      const vh = Phaser.Math.FloatBetween(-40, 200);

      const flightTime =
        (vh + Math.sqrt(vh * vh + 2 * this.gravity * startHeight)) /
        this.gravity;

      const speed = Math.min(
        Phaser.Math.FloatBetween(30, 100),
        Math.max(10, (maxRadius - startRadius) / flightTime)
      );

      this.spawnDroplet(
        Math.cos(angle) * startRadius,
        Math.sin(angle) * startRadius,
        startHeight,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        vh,
        Phaser.Math.FloatBetween(5, 10)
      );
    }

    for (let i = 0; i < 5; i++) this.spawnVapor();
  }

  private spawnDroplet(
    x: number,
    z: number,
    h: number,
    vx: number,
    vz: number,
    vh: number,
    size: number
  ): void {
    const droplet = this.droplets.find(item => !item.active);

    if (!droplet) return;

    droplet.active = true;
    droplet.x = x;
    droplet.z = z;
    droplet.h = h;
    droplet.vx = vx;
    droplet.vz = vz;
    droplet.vh = vh;
    droplet.size = size;

    droplet.body.setTint(Phaser.Utils.Array.GetRandom(this.dropletColors));

    // Reflejo blanco-violeta, o verde tóxico de vez en cuando.
    droplet.shine.setTint(
      Math.random() < this.toxicAccentChance * 2
        ? Phaser.Utils.Array.GetRandom(this.toxicColors)
        : 0xf3c4ff
    );
  }

  private updateDroplets(dt: number): void {
    const scale = this.scale;
    const perspective = this.poolRadiusY / this.poolRadiusX;
    const alpha = this.fade;

    for (const droplet of this.droplets) {
      if (!droplet.active) continue;

      droplet.x += droplet.vx * dt;
      droplet.z += droplet.vz * dt;
      droplet.vh -= this.gravity * dt;
      droplet.h += droplet.vh * dt;

      // Cae al charco: la gota desaparece y abre una onda.
      if (droplet.h <= 0 && droplet.vh < 0) {
        droplet.active = false;
        droplet.body.setAlpha(0);
        droplet.shine.setAlpha(0);

        this.spawnRipple(droplet.x, droplet.z, 26, 0.45);

        continue;
      }

      const screenX = this.x + droplet.x * scale;
      const screenY = this.y + (droplet.z * perspective - droplet.h) * scale;

      // La gota espesa se estira bastante en la dirección en que se mueve.
      const velocityX = droplet.vx;
      const velocityY = droplet.vz * perspective - droplet.vh;
      const speed = Math.hypot(velocityX, velocityY);

      const thickness = droplet.size * scale;
      const length = thickness * (1 + Math.min(1.6, speed / 500));

      droplet.body
        .setPosition(screenX, screenY)
        .setRotation(Math.atan2(velocityY, velocityX))
        .setDisplaySize(length, thickness)
        .setAlpha(0.95 * alpha);

      droplet.shine
        .setPosition(screenX - thickness * 0.15, screenY - thickness * 0.2)
        .setDisplaySize(thickness * 0.55, thickness * 0.55)
        .setAlpha(0.85 * alpha);
    }
  }

  // ---------------------------------------------------------------------------
  // Burbujas tóxicas
  // ---------------------------------------------------------------------------

  private spawnBubble(onJet: boolean): void {
    const bubble = this.bubbles.find(item => !item.active);

    if (!bubble) return;

    bubble.active = true;
    bubble.onJet = onJet;
    bubble.progress = 0;
    bubble.life = Phaser.Math.FloatBetween(0.5, 0.9);
    bubble.size = Phaser.Math.FloatBetween(5, 12);

    if (onJet) {
      // En la cara que mira al frente, para que se vea.
      bubble.t = Phaser.Math.FloatBetween(0.08, 0.8);
      bubble.angle = Phaser.Math.FloatBetween(-0.9, 0.9);
    } else {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Math.sqrt(Math.random()) * this.poolRadiusX * 0.85;

      bubble.x = Math.cos(angle) * distance;
      bubble.z = Math.sin(angle) * distance;
    }

    bubble.ring.setTint(
      Math.random() < this.toxicAccentChance * 1.5
        ? Phaser.Utils.Array.GetRandom(this.toxicColors)
        : 0xcfa6ff
    );

    bubble.ring.setDepth(this.depth + (onJet ? 2.3 : 0.4));
    bubble.shine.setDepth(this.depth + (onJet ? 2.4 : 0.45));
  }

  private updateBubbles(dt: number): void {
    const scale = this.scale;
    const perspective = this.poolRadiusY / this.poolRadiusX;
    const baseHalf = this.poolRadiusX * this.coneBaseRatio * scale;
    const height = this.coneHeight * scale * this.level;

    for (const bubble of this.bubbles) {
      if (!bubble.active) continue;

      bubble.progress += dt / bubble.life;

      // Si el chorro ya bajó, las burbujas que estaban en él revientan.
      const lostJet = bubble.onJet && this.level < 0.05;

      if (bubble.progress >= 1 || lostJet) {
        bubble.active = false;
        bubble.ring.setAlpha(0);
        bubble.shine.setAlpha(0);

        // Al reventar en el charco abre una pequeña onda.
        if (!bubble.onJet && bubble.progress >= 1) {
          this.spawnRipple(bubble.x, bubble.z, 18, 0.3);
        }

        continue;
      }

      const p = bubble.progress;

      // Crece y, al final, revienta: se expande rápido y se desvanece.
      const grow = p < 0.75 ? 0.6 + 0.4 * (p / 0.75) : 1 + ((p - 0.75) / 0.25) * 0.6;
      const alphaMultiplier = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;

      let screenX: number;
      let screenY: number;

      if (bubble.onJet) {
        const radius = this.jetRadius(bubble.t, bubble.angle * 3, baseHalf);

        screenX = this.x + Math.sin(bubble.angle) * radius;
        screenY =
          this.y - bubble.t * height + Math.cos(bubble.angle) * radius * perspective;
      } else {
        screenX = this.x + bubble.x * scale;
        screenY = this.y + bubble.z * perspective * scale;
      }

      const size = bubble.size * grow * scale;

      // Las burbujas del charco se ven aplastadas, como domos sobre el líquido.
      bubble.ring
        .setPosition(screenX, screenY)
        .setDisplaySize(size, bubble.onJet ? size : size * 0.6)
        .setAlpha(0.75 * alphaMultiplier * this.fade);

      bubble.shine
        .setPosition(screenX - size * 0.18, screenY - size * 0.18)
        .setDisplaySize(size * 0.3, size * 0.3)
        .setAlpha(0.9 * alphaMultiplier * this.fade);
    }
  }

  // ---------------------------------------------------------------------------
  // Vapor tóxico
  // ---------------------------------------------------------------------------

  private spawnVapor(): void {
    const vapor = this.vapors.find(item => !item.active);

    if (!vapor) return;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Math.sqrt(Math.random()) * this.poolRadiusX * 0.8;

    vapor.active = true;
    vapor.x = Math.cos(angle) * distance;
    vapor.z = Math.sin(angle) * distance;
    vapor.progress = 0;
    vapor.duration = Phaser.Math.FloatBetween(0.9, 1.4);
    vapor.size = Phaser.Math.FloatBetween(30, 56);
    vapor.drift = Phaser.Math.FloatBetween(-25, 25);

    vapor.image.setTint(
      Math.random() < this.toxicAccentChance * 2
        ? Phaser.Utils.Array.GetRandom(this.toxicColors)
        : Phaser.Utils.Array.GetRandom(this.vaporColors)
    );
  }

  private updateVapors(dt: number): void {
    const scale = this.scale;
    const perspective = this.poolRadiusY / this.poolRadiusX;

    for (const vapor of this.vapors) {
      if (!vapor.active) continue;

      vapor.progress += dt / vapor.duration;

      if (vapor.progress >= 1) {
        vapor.active = false;
        vapor.image.setAlpha(0);

        continue;
      }

      const p = vapor.progress;

      // Sube lentamente, se ensancha y se disipa.
      const size = vapor.size * (0.7 + 0.6 * p) * scale;

      vapor.image
        .setPosition(
          this.x + (vapor.x + vapor.drift * p) * scale,
          this.y + vapor.z * perspective * scale - 60 * scale * p
        )
        .setDisplaySize(size * 1.3, size)
        .setAlpha(Math.sin(Math.PI * p) * 0.14 * this.fade);
    }
  }

  // ---------------------------------------------------------------------------
  // Ondas en el charco
  // ---------------------------------------------------------------------------

  private spawnRipple(
    x: number,
    z: number,
    maxSize: number,
    duration: number
  ): void {
    const ripple = this.ripples.find(item => !item.active);

    if (!ripple) return;

    ripple.active = true;
    ripple.x = x;
    ripple.z = z;
    ripple.progress = 0;
    ripple.duration = duration;
    ripple.maxSize = maxSize;
  }

  private updateRipples(dt: number): void {
    const scale = this.scale;
    const perspective = this.poolRadiusY / this.poolRadiusX;

    for (const ripple of this.ripples) {
      if (!ripple.active) continue;

      ripple.progress += dt / ripple.duration;

      if (ripple.progress >= 1) {
        ripple.active = false;
        ripple.image.setAlpha(0);

        continue;
      }

      const p = ripple.progress;
      const eased = 1 - (1 - p) * (1 - p);

      const size = (6 + (ripple.maxSize - 6) * eased) * scale;

      ripple.image
        .setPosition(
          this.x + ripple.x * scale,
          this.y + ripple.z * perspective * scale
        )
        .setDisplaySize(size, size * perspective)
        .setAlpha((1 - p) * 0.7 * this.fade);
    }
  }

  // ---------------------------------------------------------------------------
  // Utilidades y texturas
  // ---------------------------------------------------------------------------

  private createImage(
    textureKey: string,
    tint: number,
    additive: boolean
  ): Phaser.GameObjects.Image {
    return this.scene.add
      .image(this.x, this.y, textureKey)
      .setTint(tint)
      .setBlendMode(
        additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL
      )
      .setAlpha(0);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /** Mancha líquida: disco con centro sólido y borde suave. */
  private createBlobTexture(): void {
    if (this.scene.textures.exists(this.blobTextureKey)) return;

    const size = 64;

    const texture = this.scene.textures.createCanvas(
      this.blobTextureKey,
      size,
      size
    );

    if (!texture) return;

    const context = texture.getContext();
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.75)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    texture.refresh();
  }

  /** Brillo suave: degradado radial blanco que se tiñe con el color de cada partícula. */
  private createGlowTexture(): void {
    if (this.scene.textures.exists(this.glowTextureKey)) return;

    const size = 64;

    const texture = this.scene.textures.createCanvas(
      this.glowTextureKey,
      size,
      size
    );

    if (!texture) return;

    const context = texture.getContext();
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    texture.refresh();
  }

  /** Brillo del suelo: intenso en el centro y sin borde duro. */
  private createGroundTexture(): void {
    if (this.scene.textures.exists(this.groundTextureKey)) return;

    const size = 256;

    const texture = this.scene.textures.createCanvas(
      this.groundTextureKey,
      size,
      size
    );

    if (!texture) return;

    const context = texture.getContext();
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);

    gradient.addColorStop(0, 'rgba(240,150,255,0.95)');
    gradient.addColorStop(0.35, 'rgba(176,63,224,0.65)');
    gradient.addColorStop(0.75, 'rgba(110,30,170,0.35)');
    gradient.addColorStop(1, 'rgba(70,15,120,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    texture.refresh();
  }

  /** Anillo suave para ondas y burbujas: transparente por dentro y por fuera. */
  private createRingTexture(): void {
    if (this.scene.textures.exists(this.ringTextureKey)) return;

    const size = 128;

    const texture = this.scene.textures.createCanvas(
      this.ringTextureKey,
      size,
      size
    );

    if (!texture) return;

    const context = texture.getContext();
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);

    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.92, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    texture.refresh();
  }
}