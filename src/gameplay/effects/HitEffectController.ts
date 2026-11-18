import Phaser from 'phaser';

export class HitEffectController {
  private readonly scene: Phaser.Scene;

  private readonly activeEffects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  showImpact(
    x: number,
    y: number,
    direction: -1 | 1
  ): () => void {
    const graphics = this.scene.add.graphics();

    graphics.setPosition(x, y);
    graphics.setDepth(1000);
    graphics.setScale(direction, 1);

    // Cuadrícula base de 6px por "píxel" para mantener la nitidez retro
    const p = 6;

    const px = (
      gx: number,
      gy: number,
      gw: number,
      gh: number,
      color: number
    ) => {
      graphics.fillStyle(color, 1);
      graphics.fillRect(gx * p, gy * p, gw * p, gh * p);
    };

    // Paleta de colores de fuego
    const C_OUTLINE = 0x4a0e00; // Contorno café/rojo muy oscuro
    const C_RED = 0xe62e00;     // Rojo fuego exterior
    const C_ORANGE = 0xff7700;  // Naranja cuerpo del puño
    const C_YELLOW = 0xffd000;  // Amarillo brillo nudillos/dedos
    const C_WHITE = 0xffffcc;   // Núcleo incandescente

    // 1. PICOS DE FUEGO EXTERIOR (Aura explosiva alrededor del puño)
    // Picos superiores
    px(-5, -8, 2, 3, C_RED);
    px(-2, -10, 2, 4, C_RED);
    px(2, -9, 2, 3, C_RED);
    px(5, -7, 3, 2, C_RED);

    // Picos frontales (impacto)
    px(8, -4, 3, 2, C_RED);
    px(9, -1, 4, 2, C_RED);
    px(8, 2, 3, 2, C_RED);

    // Picos inferiores
    px(5, 5, 3, 2, C_RED);
    px(1, 6, 2, 3, C_RED);
    px(-3, 6, 2, 3, C_RED);
    px(-6, 4, 2, 3, C_RED);

    // Estela de fuego trasera (en lugar de la manga)
    px(-9, -4, 3, 2, C_RED);
    px(-11, -1, 4, 2, C_RED);
    px(-9, 2, 3, 2, C_RED);

    // Relleno naranja de los picos de fuego
    px(-4, -7, 2, 2, C_ORANGE);
    px(-2, -8, 2, 3, C_ORANGE);
    px(2, -7, 2, 2, C_ORANGE);
    px(8, -1, 3, 2, C_ORANGE);
    px(1, 5, 2, 2, C_ORANGE);
    px(-3, 5, 2, 2, C_ORANGE);
    px(-9, -1, 3, 2, C_ORANGE);

    // 2. CONTORNO OSCURO DEL PUÑO (Solo el puño, sin manga)
    px(-6, -4, 1, 8, C_OUTLINE); // Borde trasero de la mano
    px(-5, -5, 11, 1, C_OUTLINE); // Borde superior
    px(-5, 4, 10, 1, C_OUTLINE);  // Borde inferior
    px(5, -4, 2, 1, C_OUTLINE);   // Curva nudillo frontal superior
    px(6, -3, 2, 6, C_OUTLINE);   // Frente de los dedos
    px(5, 3, 2, 1, C_OUTLINE);    // Curva dedo inferior

    // 3. RELLENO PRINCIPAL DEL PUÑO EN LLAMAS
    px(-5, -4, 10, 8, C_ORANGE);
    px(5, -3, 1, 6, C_ORANGE);

    // 4. NUDILLOS Y VOLUMEN LUMINOSO (Amarillo intenso)
    // Nudillos superiores
    px(-3, -4, 2, 3, C_YELLOW);
    px(0, -4, 2, 3, C_YELLOW);
    px(3, -4, 2, 3, C_YELLOW);

    // Dedos doblados al frente
    px(2, -1, 4, 2, C_YELLOW);
    px(2, 2, 3, 2, C_YELLOW);

    // 5. LÍNEAS INTERNAS DE LOS DEDOS Y EL PULGAR (Contorno oscuro)
    px(-1, -2, 1, 3, C_OUTLINE); // Separación nudillos
    px(2, -2, 1, 2, C_OUTLINE);  // Separación dedo índice/medio
    px(1, 1, 5, 1, C_OUTLINE);   // Línea horizontal entre dedos
    px(-3, 0, 4, 1, C_OUTLINE);  // Borde superior del pulgar
    px(-3, 1, 1, 2, C_OUTLINE);  // Curva trasera del pulgar
    px(-2, 2, 3, 1, C_OUTLINE);  // Borde inferior del pulgar

    // Relleno brillante del pulgar
    px(-2, 1, 3, 1, C_YELLOW);

    // 6. NÚCLEO INCANDESCENTE (Brillos blancos de calor máximo)
    px(-2, -3, 1, 1, C_WHITE);
    px(1, -3, 1, 1, C_WHITE);
    px(4, -2, 1, 2, C_WHITE);
    px(4, 2, 1, 1, C_WHITE);
    px(8, -1, 1, 2, C_WHITE); // Punta de llama frontal

    // 7. CHISPAS PIXELADAS SUELTAS ALREDEDOR
    const particles: Phaser.GameObjects.Rectangle[] = [];

    const particleData = [
      { x: -45, y: -42, size: 6, color: C_YELLOW },
      { x: 48, y: -36, size: 6, color: C_RED },
      { x: 60, y: 18, size: 6, color: C_ORANGE },
      { x: -36, y: 42, size: 6, color: C_ORANGE },
      { x: 12, y: -58, size: 6, color: C_WHITE },
      { x: 36, y: 42, size: 6, color: C_YELLOW }
    ];

    particleData.forEach((particle) => {
      const object = this.scene.add.rectangle(
        x + particle.x * direction,
        y + particle.y,
        particle.size,
        particle.size,
        particle.color
      );

      object.setDepth(1001);

      particles.push(object);
      this.activeEffects.push(object);
    });

    this.activeEffects.push(graphics);

    let finished = false;

    // ANIMACIÓN DESPUÉS DEL HITSTOP
    const finishImpact = () => {
      if (finished) {
        return;
      }

      finished = true;

      this.scene.tweens.add({
        targets: graphics,
        alpha: 0,
        scaleX: direction * 1.35,
        scaleY: 1.35,
        x: x + 22 * direction,
        duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          graphics.destroy();
          this.removeEffect(graphics);
        }
      });

      particles.forEach((particle, index) => {
        const distance = 24 + index * 6;
        const verticalDir = index % 2 === 0 ? -1 : 1;

        this.scene.tweens.add({
          targets: particle,
          x: particle.x + distance * direction,
          y: particle.y + distance * 0.7 * verticalDir,
          alpha: 0,
          scale: 0,
          duration: 220,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            particle.destroy();
            this.removeEffect(particle);
          }
        });
      });
    };

    return finishImpact;
  }

  destroy() {
    this.activeEffects.forEach((effect) => {
      if (effect.active) {
        effect.destroy();
      }
    });

    this.activeEffects.length = 0;
  }

  private removeEffect(
    effect: Phaser.GameObjects.GameObject
  ) {
    const index = this.activeEffects.indexOf(effect);

    if (index !== -1) {
      this.activeEffects.splice(index, 1);
    }
  }
}