
import Phaser from 'phaser';

export const SCREEN_WIDTH = 1280;
export const SCREEN_HEIGHT = 720;

export const PLAYER_COLORS = [
  { label: 'P1', color: 0xd62839, hex: '#ff6b73' },
  { label: 'P2', color: 0x2f6fe4, hex: '#6aa9ff' }
] as const;

/** Fondo espacial con estrellas que parpadean. */
export function drawSpaceBackground(scene: Phaser.Scene) {
  scene.add.rectangle(
    SCREEN_WIDTH / 2,
    SCREEN_HEIGHT / 2,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    0x0b1220
  );

  scene.add.rectangle(
    SCREEN_WIDTH / 2,
    SCREEN_HEIGHT * 0.75,
    SCREEN_WIDTH,
    SCREEN_HEIGHT * 0.5,
    0x1d3350,
    0.35
  );

  const rng = new Phaser.Math.RandomDataGenerator(['menu-stars']);

  for (let i = 0; i < 70; i++) {
    const star = scene.add.circle(
      rng.between(0, SCREEN_WIDTH),
      rng.between(0, SCREEN_HEIGHT),
      rng.pick([1, 1, 1.5, 2]),
      0xffffff,
      rng.realInRange(0.3, 0.9)
    );

    scene.tweens.add({
      targets: star,
      alpha: 0.1,
      duration: rng.between(900, 2600),
      yoyo: true,
      repeat: -1
    });
  }
}

/** Barra superior: "VOLVER" a la izquierda y banner amarillo con el título. */
export function drawHeader(
  scene: Phaser.Scene,
  title: string,
  showBack = true
) {
  const g = scene.add.graphics();

  g.fillStyle(0x05080f, 0.92);
  g.fillRect(0, 0, SCREEN_WIDTH, 64);

  g.fillStyle(0x75c9c8, 1);
  g.fillRect(0, 64, SCREEN_WIDTH, 3);

  // Banner amarillo inclinado, centrado en la pantalla.
  g.fillStyle(0xf2c718, 1);
  g.fillPoints(
    [
      new Phaser.Math.Vector2(480, 10),
      new Phaser.Math.Vector2(880, 10),
      new Phaser.Math.Vector2(858, 54),
      new Phaser.Math.Vector2(458, 54)
    ],
    true
  );

  scene.add.text(669, 32, title, {
    color: '#1a1a1a',
    fontSize: '25px',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  if (showBack) {
    scene.add.text(28, 32, '◀  ESC  VOLVER', {
      color: '#ffffff',
      fontSize: '14px',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
  }
}

/** Ficha circular roja/azul con "P1" / "P2". */
export function drawToken(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  playerIndex: number
) {
  const player = PLAYER_COLORS[playerIndex];

  scene.add
    .circle(x, y, radius, player.color)
    .setStrokeStyle(Math.max(2, radius * 0.15), 0xffffff);

  scene.add.text(x, y, player.label, {
    color: '#ffffff',
    fontSize: `${Math.round(radius * 0.95)}px`,
    fontStyle: 'bold'
  }).setOrigin(0.5);
}

/** Escala una imagen para que quepa en un área sin deformarse. */
export function fitImage(
  image: Phaser.GameObjects.Image,
  maxWidth: number,
  maxHeight: number
) {
  image.setScale(1);

  const scale = Math.min(
    maxWidth / image.width,
    maxHeight / image.height
  );

  image.setScale(scale);
}
