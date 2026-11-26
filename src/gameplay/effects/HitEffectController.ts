
import Phaser from 'phaser';

export class HitEffectController {
  private readonly scene: Phaser.Scene;

  private readonly activeEffects: Phaser.GameObjects.GameObject[] = [];

  private readonly activeTextures = new Map<
    Phaser.GameObjects.GameObject,
    string
  >();

  private static nextTextureId = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  showImpact(x: number, y: number, direction: -1 | 1): () => void {
    const key = `fire-punch-${HitEffectController.nextTextureId++}`;

    const texture = this.scene.textures.createCanvas(key, 120, 120);

    if (!texture) return () => {};

    const ctx = texture.getContext();

    ctx.clearRect(0, 0, 120, 120);
    ctx.imageSmoothingEnabled = true;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const outline = '#e95b18';
    const fistColor = '#fff2c9';

    // SILUETA PRINCIPAL DEL PUÑO
    ctx.fillStyle = fistColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 6;

    ctx.beginPath();

    ctx.moveTo(29, 57);

    ctx.quadraticCurveTo(25, 43, 33, 34);
    ctx.quadraticCurveTo(39, 24, 51, 27);
    ctx.quadraticCurveTo(63, 19, 74, 28);
    ctx.quadraticCurveTo(87, 21, 96, 34);

    ctx.quadraticCurveTo(104, 44, 98, 59);

    ctx.lineTo(94, 77);
    ctx.quadraticCurveTo(90, 94, 72, 98);

    ctx.quadraticCurveTo(54, 101, 40, 91);
    ctx.quadraticCurveTo(28, 83, 29, 69);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // SEPARACIÓN DE LOS DEDOS
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4.5;

    ctx.beginPath();

    ctx.moveTo(46, 39);
    ctx.quadraticCurveTo(44, 55, 49, 77);

    ctx.moveTo(62, 34);
    ctx.quadraticCurveTo(60, 54, 64, 81);

    ctx.moveTo(78, 35);
    ctx.quadraticCurveTo(79, 53, 78, 74);

    ctx.stroke();

    // PULGAR CERRADO EN EL COSTADO DERECHO
    ctx.beginPath();

    ctx.moveTo(83, 57);
    ctx.quadraticCurveTo(94, 49, 99, 60);
    ctx.quadraticCurveTo(103, 71, 93, 82);
    ctx.quadraticCurveTo(87, 89, 78, 89);

    ctx.stroke();

    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const effect = this.scene.add.image(x, y, key);

    effect
      .setDepth(1000)
      .setScale(1)
      .setFlipX(direction === -1);

    this.activeEffects.push(effect);
    this.activeTextures.set(effect, key);

    let finished = false;

    const finishImpact = () => {
      if (finished || !effect.active) return;

      finished = true;

      this.scene.tweens.add({
        targets: effect,
        alpha: 0,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 160,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          effect.destroy();
          this.removeEffect(effect);
        }
      });
    };

    return finishImpact;
  }

  destroy() {
    this.activeEffects.forEach((effect) => {
      if (effect.active) effect.destroy();

      const textureKey = this.activeTextures.get(effect);

      if (textureKey) {
        this.scene.textures.remove(textureKey);
      }
    });

    this.activeEffects.length = 0;
    this.activeTextures.clear();
  }

  private removeEffect(effect: Phaser.GameObjects.GameObject) {
    const index = this.activeEffects.indexOf(effect);

    if (index !== -1) {
      this.activeEffects.splice(index, 1);
    }

    const textureKey = this.activeTextures.get(effect);

    if (textureKey) {
      this.scene.textures.remove(textureKey);
      this.activeTextures.delete(effect);
    }
  }
}
