
import Phaser from 'phaser';
import type { StageDefinition } from './types';

const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;

// Resolución por defecto de los videos de los escenarios.
const DEFAULT_VIDEO_WIDTH = 1280;
const DEFAULT_VIDEO_HEIGHT = 720;

const videoKey = (stage: StageDefinition) =>
  `stage-video-${stage.id}`;

const musicKey = (stage: StageDefinition) =>
  `stage-music-${stage.id}`;

const effectKey = (stage: StageDefinition, name: string) =>
  `stage-sfx-${stage.id}-${name}`;

/**
 * Se encarga de todo lo que es el escenario durante la partida:
 * video de fondo, música y efectos de sonido.
 *
 * Uso en una escena:
 * preload(): StageController.preload(this, stage);
 * create(): this.stageController = new StageController(this, stage); this.stageController.create();
 * cierre: this.stageController.destroy();
 */
export class StageController {
  private readonly scene: Phaser.Scene;
  private readonly stage: StageDefinition;

  private video?: Phaser.GameObjects.Video;
  private music?: Phaser.Sound.BaseSound;
  private loops: Phaser.Sound.BaseSound[] = [];

  constructor(scene: Phaser.Scene, stage: StageDefinition) {
    this.scene = scene;
    this.stage = stage;
  }

  /** Carga video y audios del escenario (llamar desde preload). */
  static preload(scene: Phaser.Scene, stage: StageDefinition) {
    const { video, music, soundEffects } = stage.assets;

    if (!scene.cache.video.exists(videoKey(stage))) {
      scene.load.video(videoKey(stage), video.path);
    }

    if (music && !scene.cache.audio.exists(musicKey(stage))) {
      scene.load.audio(musicKey(stage), music.path);
    }

    Object.entries(soundEffects ?? {}).forEach(([name, effect]) => {
      const key = effectKey(stage, name);

      if (!scene.cache.audio.exists(key)) {
        scene.load.audio(key, effect.path);
      }
    });
  }

  create() {
    this.createVideo();
    this.createMusic();
    this.createAmbientEffects();
  }

  /** Reproduce un efecto una vez. */
  playEffect(name: string) {
    const effect = this.stage.assets.soundEffects?.[name];
    const key = effectKey(this.stage, name);

    if (!effect || !this.scene.cache.audio.exists(key)) return;

    this.scene.sound.play(key, {
      volume: effect.volume ?? 1
    });
  }

  destroy() {
    // El sonido es global en Phaser: hay que detenerlo a mano al salir.
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;

    this.loops.forEach((sound) => {
      sound.stop();
      sound.destroy();
    });

    this.loops = [];

    this.video?.stop();
    this.video?.destroy();
    this.video = undefined;
  }

  // ---------------------------------------------------------------------

  private createVideo() {
    const key = videoKey(this.stage);

    if (!this.scene.cache.video.exists(key)) return;

    const { video } = this.stage.assets;

    const background = this.scene.add.video(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      key
    );

    background
      .setDepth(-1)
      .setMute(video.muted ?? true);

    if (video.volume !== undefined) {
      background.setVolume(video.volume);
    }

    // Primero el tamaño interno del objeto y después el tamaño en pantalla.
    const fitBackground = (width: number, height: number) => {
      background.setSize(width, height);

      // Ajusta el video al tamaño lógico del juego manteniendo la proporción.
      const scale = Math.min(
        SCREEN_WIDTH / width,
        SCREEN_HEIGHT / height
      );

      background.setDisplaySize(
        width * scale,
        height * scale
      );
    };

    // Tamaño inicial mientras se cargan los metadatos.
    fitBackground(
      video.width ?? DEFAULT_VIDEO_WIDTH,
      video.height ?? DEFAULT_VIDEO_HEIGHT
    );

    // Cuando el video conoce su resolución real, se reajusta.
    const applyRealSize = () => {
      const element = background.video;

      if (!element?.videoWidth || !element?.videoHeight) return;

      fitBackground(
        element.videoWidth,
        element.videoHeight
      );
    };

    background.once(
      Phaser.GameObjects.Events.VIDEO_METADATA,
      applyRealSize
    );

    background.on(
      Phaser.GameObjects.Events.VIDEO_PLAY,
      applyRealSize
    );

    background.play(true);

    this.video = background;
  }

  private createMusic() {
    const { music } = this.stage.assets;
    const key = musicKey(this.stage);

    // Si el archivo no existe o no se pudo decodificar, se omite.
    if (!music || !this.scene.cache.audio.exists(key)) return;

    this.music = this.scene.sound.add(key, {
      volume: music.volume ?? 0.6,
      loop: music.loop ?? true
    });

    this.music.play();
  }

  private createAmbientEffects() {
    Object.entries(this.stage.assets.soundEffects ?? {}).forEach(
      ([name, effect]) => {
        const key = effectKey(this.stage, name);

        if (
          !effect.autoplay ||
          !this.scene.cache.audio.exists(key)
        ) {
          return;
        }

        const sound = this.scene.sound.add(key, {
          volume: effect.volume ?? 1,
          loop: effect.loop ?? true
        });

        sound.play();
        this.loops.push(sound);
      }
    );
  }
}
