
import Phaser from 'phaser';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT
} from '../ui/Menuui';

export class IntroScene extends Phaser.Scene {
  private music?: Phaser.Sound.BaseSound;
  private started = false;

  private logo?: Phaser.GameObjects.Image;
  private startText?: Phaser.GameObjects.Text;

  constructor() {
    super('IntroScene');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#101827');

    // Logo del juego.
    this.load.image(
      'game-logo',
      '/assets/logos/logo_game.png'
    );

    // Música del juego.
    this.load.audio(
      'main-menu-music',
      '/assets/audio/Music/init_screen.mp3'
    );

    // Vídeo del menú principal.
    this.load.video(
      'main-menu-video',
      '/assets/init/loading_screen.mp4'
    );
  }

  create() {
    this.cameras.main.setBackgroundColor('#101827');

    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;

    // Fondo decorativo.
    this.add.rectangle(
      centerX,
      centerY,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x101827
    );

    // Logo.
    this.logo = this.add.image(
      centerX,
      230,
      'game-logo'
    );

    // Conservamos la proporción original del logo.
    const logoScale = Math.min(
      500 / this.logo.width,
      250 / this.logo.height
    );

    this.logo.setScale(logoScale);

    // Créditos.
    this.add.text(
      centerX,
      430,
      'Un juego creado por Josue Serna',
      {
        color: '#ffffff',
        fontSize: '23px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.add.text(
      centerX,
      470,
      'Este proyecto no tiene fines de monetización.',
      {
        color: '#aaaaaa',
        fontSize: '18px'
      }
    ).setOrigin(0.5);

    // Instrucción para comenzar.
    this.startText = this.add.text(
      centerX,
      600,
      'PULSA CUALQUIER TECLA PARA JUGAR',
      {
        color: '#75c9c8',
        fontSize: '25px',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Efecto de parpadeo.
    this.tweens.add({
      targets: this.startText,
      alpha: 0.25,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Esperamos la interacción del jugador.
    this.input.once(
      'pointerdown',
      this.startGame
    );

    this.input.keyboard?.once(
      'keydown',
      this.startGame
    );
  }

  // Comienza el juego.
  private readonly startGame = () => {
    if (this.started) return;

    this.started = true;

    // Iniciamos la música después de la interacción.
    this.music = this.sound.add(
      'main-menu-music',
      {
        loop: true,
        volume: 0.3
      }
    );

    this.music.play();

    // Entramos al menú principal.
    this.scene.start('MainMenuScene');
  };
}
