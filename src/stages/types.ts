export type StageAvailability = 'available' | 'locked';

/** Un efecto de sonido propio del escenario (ambiente, multitud, truenos...). */
export interface StageSoundEffect {
  path: string;
  volume?: number;
  /** Se repite sin parar (útil para ambientes). */
  loop?: boolean;
  /** Empieza solo al comenzar la partida. Pensado para ambientes con loop. */
  autoplay?: boolean;
}

export interface StageDefinition {
  id: string;
  name: string;
  description: string;
  availability: StageAvailability;

  assets: {
    /** Imagen para la pantalla de selección (si falta se muestra un marcador). */
    preview?: string;

    /** Video de fondo. */
    video: {
      path: string;
      /** Resolución real del video (1280 x 720 por defecto). */
      width?: number;
      height?: number;
      /** Silenciado por defecto: el audio se maneja con `music`. */
      muted?: boolean;
      volume?: number;
    };

    /** Música de fondo del escenario. */
    music?: {
      path: string;
      volume?: number;
      /** true por defecto. */
      loop?: boolean;
    };

    /**
     * Efectos de sonido. La clave es el nombre con el que los llamas:
     * stageController.playEffect('crowd-cheer')
     */
    soundEffects?: Record<string, StageSoundEffect>;
  };

  /** Altura del suelo para este escenario (520 por defecto). */
  groundY?: number;
}