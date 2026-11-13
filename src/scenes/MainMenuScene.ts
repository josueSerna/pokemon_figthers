
import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../ui/Menuui';

export class MainMenuScene extends Phaser.Scene {
  private background?: Phaser.GameObjects.Video;
  private music?: Phaser.Sound.BaseSound;

  private logo?: Phaser.GameObjects.Image;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private buttonTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MainMenuScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');

    // Creamos el vídeo de fondo.
    this.background = this.add.video(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      'main-menu-video'
    );

    this.background
      .setMute(true)
      .setDepth(-1);

    // Esperamos a que el vídeo conozca su resolución.
    this.background.once(
      Phaser.GameObjects.Events.VIDEO_METADATA,
      () => {
        if (!this.background?.video) return;

        const videoWidth = this.background.video.videoWidth;
        const videoHeight = this.background.video.videoHeight;

        console.log(
          'Resolución real del vídeo:',
          videoWidth,
          videoHeight
        );

        // Establecemos el tamaño interno del objeto.
        this.background.setSize(
          videoWidth,
          videoHeight
        );

        // Ajustamos el vídeo al tamaño lógico del juego.
        this.background.setDisplaySize(
          SCREEN_WIDTH,
          SCREEN_HEIGHT
        );
      }
    );

    // Reproducimos el vídeo en bucle.
    this.background.play(true);

    // Logo.
    this.logo = this.add.image(
      SCREEN_WIDTH / 2,
      115,
      'game-logo'
    );

    // Botones.
    this.createButton('JUGAR', 0, () => {
      this.stopMusic();
      this.scene.start('PlaySelectScene');
    });

    this.createButton('OPCIONES', 1);

    this.createButton('CRÉDITOS', 2);

    // Ajustamos el logo y los botones.
    this.resizeElements(SCREEN_WIDTH, SCREEN_HEIGHT);

    // Recuperamos la música.
    this.music = this.sound.get('main-menu-music')
      ?? undefined;

    this.startMusicIfUnlocked();

    // Esperamos la interacción del usuario si el audio está bloqueado.
    if (this.sound.locked) {
      this.input.once(
        'pointerdown',
        this.startMusicIfUnlocked
      );

      this.input.keyboard?.once(
        'keydown',
        this.startMusicIfUnlocked
      );
    }

    // Limpieza al abandonar la escena.
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this
    );
  }

  // Ajusta el logo y los botones.
  private resizeElements(width: number, height: number) {
    const centerX = width / 2;

    const scale = Math.min(
      width / 960,
      height / 540
    );

    // Logo.
    this.logo
      ?.setPosition(centerX, height * 0.19)
      .setDisplaySize(
        350 * scale,
        125 * scale
      );

    // Posiciones de los botones.
    const buttonYPositions = [
      height * 0.59,
      height * 0.70,
      height * 0.81
    ];

    this.buttons.forEach((button, index) => {
      button
        .setPosition(centerX, buttonYPositions[index])
        .setSize(280 * scale, 52 * scale);
    });

    this.buttonTexts.forEach((text, index) => {
      text
        .setPosition(centerX, buttonYPositions[index])
        .setFontSize(`${24 * scale}px`);
    });
  }

  // Inicia la música cuando el navegador lo permite.
  private readonly startMusicIfUnlocked = () => {
    if (this.sound.locked) return;

    if (!this.music) {
      this.music = this.sound.get('main-menu-music')
        ?? this.sound.add('main-menu-music', {
          loop: true,
          volume: 0.3
        });
    }

    if (!this.music.isPlaying) {
      this.music.play();
    }
  };

  // Detiene y destruye la música.
  private stopMusic = () => {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
  };

  // Limpia los recursos al abandonar el menú.
  private handleShutdown() {
    this.stopMusic();
  }

  // Crea un botón del menú.
  private createButton(
    label: string,
    index: number,
    action?: () => void
  ) {
    const button = this.add.rectangle(
      0,
      0,
      280,
      52,
      0x101827,
      0.85
    )
      .setStrokeStyle(2, 0x75c9c8, 1)
      .setInteractive({
        useHandCursor: true
      });

    const text = this.add.text(
      0,
      0,
      label,
      {
        color: '#ffffff',
        fontSize: '24px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0x243450, 0.95);
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x101827, 0.85);
    });

    if (action) {
      button.on('pointerdown', action);
    }

    this.buttons[index] = button;
    this.buttonTexts[index] = text;
  }
}
