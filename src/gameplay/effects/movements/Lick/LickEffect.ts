import Phaser from 'phaser';

interface NeutralVisualEffectDefinition {
  key: string;
  triggerFrame: number;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  rotation?: number;
  triggerOnHit?: boolean;
}

interface NeutralVisualEffectArea {
  x: number;
  y: number;
  width: number;
  height: number;
  headX?: number;
  headY?: number;
}

export class LickEffect {
  private scene: Phaser.Scene;

  private objects: Phaser.GameObjects.GameObject[] = [];

  // Tweens que no apuntan a un objeto del juego (por ejemplo, el barrido del arco).
  private activeTweens: Phaser.Tweens.Tween[] = [];

  private readonly particleColors = [
    0xc7b5ff,
    0xa88cff,
    0xe7dfff,
    0x8b75d8,
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
    console.log('[LickEffect] Efecto recibido:', effect.key);

    const effectScale = scale * (effect.scale ?? 1);

    // Estela de aire que acompaña el barrido de la lengua (frame 5).
    if (effect.key === 'lick-arc') {
      const forwardOffset = 65 * effectScale;

      this.createAirArc(
        x + forwardOffset * direction,
        y,
        direction,
        depth + 2,
        effectScale
      );

      return;
    }

    // Efectos visuales cuando el ataque impacta.
    if (effect.key !== 'lick' || !area) {
      return;
    }

    const centerX = area.x + area.width / 2;
    const centerY = area.y + area.height * 0.42;

    const impactX =
      centerX + (effect.offsetX ?? 0) * direction;

    const impactY =
      centerY + (effect.offsetY ?? 0);

    const impactDepth = depth + 2;

    this.createShockwave(
      impactX,
      impactY,
      impactDepth,
      effectScale
    );

    this.createColdVapor(
      impactX,
      impactY,
      direction,
      impactDepth,
      effectScale
    );

    this.createMicroDroplets(
      impactX,
      impactY,
      direction,
      impactDepth,
      effectScale
    );

    this.createImpactFlash(
      impactX,
      impactY,
      impactDepth,
      effectScale
    );
  }

  // Onda expansiva amplia.
  private createShockwave(
    x: number,
    y: number,
    depth: number,
    scale: number
  ): void {
    const wave = this.scene.add.graphics();

    wave.setDepth(depth);
    wave.setPosition(x, y);
    wave.setBlendMode(Phaser.BlendModes.ADD);

    wave.lineStyle(2, 0xd8d0ff, 0.65);
    wave.strokeEllipse(0, 0, 28 * scale, 18 * scale);

    wave.lineStyle(1, 0xa58aff, 0.35);
    wave.strokeEllipse(0, 0, 42 * scale, 26 * scale);

    this.objects.push(wave);

    this.scene.tweens.add({
      targets: wave,
      scaleX: 6.5,
      scaleY: 5,
      alpha: 0,
      duration: 230,
      ease: 'Quad.Out',
      onComplete: () => {
        wave.destroy();
        this.removeObject(wave);
      },
    });

    const secondWave = this.scene.add.graphics();

    secondWave.setDepth(depth - 0.1);
    secondWave.setPosition(x, y);
    secondWave.setBlendMode(Phaser.BlendModes.ADD);

    secondWave.lineStyle(1, 0xc9baff, 0.3);
    secondWave.strokeEllipse(0, 0, 24 * scale, 15 * scale);

    secondWave.setAlpha(0);

    this.objects.push(secondWave);

    this.scene.tweens.add({
      targets: secondWave,
      alpha: 0.7,
      delay: 35,
      duration: 35,
      yoyo: true,
      scaleX: 5.5,
      scaleY: 4,
      ease: 'Quad.Out',
      onComplete: () => {
        secondWave.destroy();
        this.removeObject(secondWave);
      },
    });
  }

  // Vapor frío que se dispersa hacia delante.
  private createColdVapor(
    x: number,
    y: number,
    direction: 1 | -1,
    depth: number,
    scale: number
  ): void {
    const vaporCount = 8;

    for (let i = 0; i < vaporCount; i++) {
      const radius = Phaser.Math.Between(10, 17) * scale;

      const vapor = this.scene.add.ellipse(
        x + Phaser.Math.Between(-10, 10) * scale,
        y + Phaser.Math.Between(-8, 8) * scale,
        radius * 2,
        radius * 1.3,
        i % 2 === 0 ? 0xb9b4e8 : 0x8174bb,
        0.18
      );

      vapor.setDepth(depth - 0.2);
      vapor.setBlendMode(Phaser.BlendModes.ADD);

      this.objects.push(vapor);

      const driftX =
        direction * Phaser.Math.Between(30, 65) * scale;

      const driftY =
        Phaser.Math.Between(-35, -10) * scale;

      this.scene.tweens.add({
        targets: vapor,
        x: vapor.x + driftX,
        y: vapor.y + driftY,
        scaleX: Phaser.Math.FloatBetween(1.5, 2.3),
        scaleY: Phaser.Math.FloatBetween(1.3, 1.9),
        alpha: 0,
        duration: Phaser.Math.Between(250, 390),
        delay: i * 20,
        ease: 'Quad.Out',
        onComplete: () => {
          vapor.destroy();
          this.removeObject(vapor);
        },
      });
    }
  }

  // Microgotas que salen despedidas siguiendo un arco.
  private createMicroDroplets(
    x: number,
    y: number,
    direction: 1 | -1,
    depth: number,
    scale: number
  ): void {
    const particleCount = Phaser.Math.Between(8, 12);

    for (let i = 0; i < particleCount; i++) {
      const radius = Phaser.Math.FloatBetween(1.2, 2) * scale;

      const color =
        this.particleColors[
          Phaser.Math.Between(0, this.particleColors.length - 1)
        ];

      const particle = this.scene.add.ellipse(
        x,
        y,
        radius * 2,
        radius * 2,
        color,
        Phaser.Math.FloatBetween(0.45, 0.85)
      );

      particle.setDepth(depth + 0.5);
      particle.setBlendMode(Phaser.BlendModes.ADD);

      this.objects.push(particle);

      const velocityX =
        direction * Phaser.Math.Between(35, 85) * scale;

      const velocityY =
        Phaser.Math.Between(-85, -30) * scale;

      const travelTime = Phaser.Math.Between(100, 150);

      const targetX = x + velocityX * 0.15;
      const apexY = y + velocityY * 0.55;

      const fallY =
        y + Phaser.Math.Between(5, 22) * scale;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: apexY,
        duration: travelTime,
        ease: 'Quad.Out',
        onComplete: () => {
          if (!particle.active) {
            return;
          }

          this.scene.tweens.add({
            targets: particle,
            x: targetX + velocityX * 0.08,
            y: fallY,
            alpha: 0,
            scale: 0.3,
            duration: 130,
            ease: 'Quad.In',
            onComplete: () => {
              particle.destroy();
              this.removeObject(particle);
            },
          });
        },
      });
    }
  }

  // Estela de aire en forma de "C" que recorre la trayectoria de la lengua.
  // Una cabeza avanza de arriba hacia abajo y deja una cola que se afina y
  // se desvanece, como una cuchilla de aire comprimido.
  private createAirArc(
    x: number,
    y: number,
    direction: 1 | -1,
    depth: number,
    scale: number
  ): void {
    // --- Ajustes de forma y tiempo (modifica estos valores para afinar) ---
    const radiusX = 70 * scale;          // cuánto se abre hacia delante
    const radiusY = 34 * scale;          // altura de la "C"
    const centerYOffset = 10 * scale;    // baja o sube todo el arco
    const startAngle = Phaser.Math.DegToRad(-110); // inicio (arriba, cerca de la boca)
    const endAngle = Phaser.Math.DegToRad(110);    // final (abajo, cerca de la boca)
    const tilt = Phaser.Math.DegToRad(-14);        // inclinación general
    const trailLength = 0.5;             // largo de la cola (0 a 1)
    const sweepDuration = 210;           // ms que dura el barrido
    const steps = 28;                    // suavidad de la curva

    const arc = this.scene.add.graphics();

    arc.setPosition(x, y + centerYOffset);
    arc.setDepth(depth);
    arc.setBlendMode(Phaser.BlendModes.ADD);

    this.objects.push(arc);

    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);

    // Aplica inclinación y espejo según la dirección del ataque.
    const transform = (vx: number, vy: number) => ({
      x: (vx * cosTilt - vy * sinTilt) * direction,
      y: vx * sinTilt + vy * cosTilt,
    });

    // Punto y normal de la curva en t (0 a 1). `offset` separa curvas paralelas.
    const sample = (t: number, offset: number) => {
      const angle = Phaser.Math.Linear(startAngle, endAngle, t);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const rx = radiusX + offset;
      const ry = radiusY + offset * 0.6;

      const nx = cos / rx;
      const ny = sin / ry;
      const length = Math.hypot(nx, ny) || 1;

      return {
        position: transform(cos * rx, sin * ry),
        normal: transform(nx / length, ny / length),
      };
    };

    // Cinta afilada en ambos extremos, más gruesa cerca de la cabeza.
    const drawRibbon = (
      tailT: number,
      headT: number,
      maxWidth: number,
      color: number,
      alpha: number,
      offset = 0
    ): void => {
      const outer: { x: number; y: number }[] = [];
      const inner: { x: number; y: number }[] = [];

      for (let i = 0; i <= steps; i++) {
        const s = i / steps;
        const t = Phaser.Math.Linear(tailT, headT, s);

        const { position, normal } = sample(t, offset);
        const width = maxWidth * Math.sin(Math.PI * Math.pow(s, 1.6));

        outer.push({
          x: position.x + normal.x * width * 0.6,
          y: position.y + normal.y * width * 0.6,
        });

        inner.push({
          x: position.x - normal.x * width * 0.4,
          y: position.y - normal.y * width * 0.4,
        });
      }

      const shape = [...outer, ...inner.reverse()];

      arc.fillStyle(color, alpha);
      arc.beginPath();
      arc.moveTo(shape[0].x, shape[0].y);

      for (let i = 1; i < shape.length; i++) {
        arc.lineTo(shape[i].x, shape[i].y);
      }

      arc.closePath();
      arc.fillPath();
    };

    const draw = (progress: number): void => {
      arc.clear();

      const headT = Math.min(progress, 1);
      const tailT = Phaser.Math.Clamp(progress - trailLength, 0, 1);

      if (headT - tailT < 0.01) {
        return;
      }

      // Resplandor exterior de aire frío.
      drawRibbon(tailT, headT, 30 * scale, 0x7f63ff, 0.16);
      drawRibbon(tailT, headT, 18 * scale, 0x9b83ff, 0.32);

      // Núcleo luminoso.
      drawRibbon(tailT, headT, 6 * scale, 0xe3dcff, 0.9);

      // Líneas finas paralelas que dan sensación de velocidad.
      const streakTail = tailT + (headT - tailT) * 0.15;
      drawRibbon(streakTail, headT, 2.5 * scale, 0xc9baff, 0.55, 11 * scale);
      drawRibbon(streakTail, headT, 2 * scale, 0xc9baff, 0.4, -9 * scale);
    };

    const state = { progress: 0 };
    let lastWispAt = 0;

    const sweep = this.scene.tweens.add({
      targets: state,
      progress: 1 + trailLength,
      duration: sweepDuration,
      ease: 'Quad.Out',
      onUpdate: () => {
        draw(state.progress);

        // Pequeñas volutas de niebla que quedan tras la punta.
        const headT = Math.min(state.progress, 1);

        if (headT < 1 && headT - lastWispAt >= 0.07) {
          lastWispAt = headT;

          const { position, normal } = sample(headT, 0);

          this.createArcWisp(
            arc.x + position.x,
            arc.y + position.y,
            normal.x,
            normal.y,
            depth,
            scale
          );
        }
      },
      onComplete: () => {
        arc.destroy();
        this.removeObject(arc);

        const index = this.activeTweens.indexOf(sweep);

        if (index !== -1) {
          this.activeTweens.splice(index, 1);
        }
      },
    });

    this.activeTweens.push(sweep);
  }

  // Voluta de niebla fría que se aleja del borde del arco.
  private createArcWisp(
    x: number,
    y: number,
    normalX: number,
    normalY: number,
    depth: number,
    scale: number
  ): void {
    const size = Phaser.Math.Between(9, 15) * scale;

    const wisp = this.scene.add.ellipse(
      x,
      y,
      size * 1.6,
      size,
      0xb9b4e8,
      0.2
    );

    wisp.setDepth(depth - 0.2);
    wisp.setBlendMode(Phaser.BlendModes.ADD);

    this.objects.push(wisp);

    const distance = Phaser.Math.Between(12, 26) * scale;

    this.scene.tweens.add({
      targets: wisp,
      x: x + normalX * distance,
      y: y + normalY * distance - 8 * scale,
      scaleX: 2,
      scaleY: 1.6,
      alpha: 0,
      duration: Phaser.Math.Between(220, 320),
      ease: 'Quad.Out',
      onComplete: () => {
        wisp.destroy();
        this.removeObject(wisp);
      },
    });
  }

  // Destello frío amplio y breve.
  private createImpactFlash(
    x: number,
    y: number,
    depth: number,
    scale: number
  ): void {
    const flash = this.scene.add.graphics();

    flash.setPosition(x, y);
    flash.setDepth(depth + 1);
    flash.setBlendMode(Phaser.BlendModes.ADD);

    flash.lineStyle(2, 0xe5e1ff, 0.9);
    flash.strokeEllipse(0, 0, 30 * scale, 42 * scale);

    flash.lineStyle(1, 0x9d8bff, 0.65);
    flash.strokeEllipse(0, 0, 42 * scale, 58 * scale);

    this.objects.push(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 34,
      ease: 'Linear',
      onComplete: () => {
        flash.destroy();
        this.removeObject(flash);
      },
    });
  }

  private removeObject(
    object: Phaser.GameObjects.GameObject
  ): void {
    const index = this.objects.indexOf(object);

    if (index !== -1) {
      this.objects.splice(index, 1);
    }
  }

  clear(): void {
    this.activeTweens.forEach(tween => tween.stop());
    this.activeTweens = [];

    for (const object of this.objects) {
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }

    this.objects = [];
  }

  destroy(): void {
    this.clear();
  }
}