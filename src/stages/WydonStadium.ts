import type { StageDefinition } from './types';

export const wydonStadium: StageDefinition = {
  id: 'wydon-stadium',
  name: 'Estadio Wydon',
  description: 'Cambia este texto por la descripción del escenario.',
  availability: 'available',
  assets: {
    preview: '/assets/stages/stages_image/wydon_stadium_preview.jpg',
    video: {
      path: '/assets/stages/stages_animated/wydon_stadium.mp4',
       width: 1280,
       height: 720,
      muted: true
    },
    music: {
      path: '/assets/audio/Music/stages/wydon_stadium_back.mp3',
      volume: 0.1,
      loop: true
    },
  },
  groundY: 700
};