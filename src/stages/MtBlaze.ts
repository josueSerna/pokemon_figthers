import type { StageDefinition } from './types';


export const mtBlaze: StageDefinition = {
  id: 'mt-blaze',
  name: 'Mt. Blaze',
  description: 'Cambia este texto por la descripción del escenario.',
  availability: 'available',
  assets: {
    preview: '/assets/stages/stages_image/mt_blaze_preview.jpg',
    video: {
      path: '/assets/stages/stages_animated/mt_blaze.mp4',
       width: 1280,
       height: 720,
      muted: true
    },
    music: {
      path: '/assets/audio/Music/stages/mt_blaze_back.mp3',
      volume: 0.3,
      loop: true
    },
  },
  groundY: 700
};