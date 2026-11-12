import type { StageDefinition } from './types';

export const lavanderTown: StageDefinition = {
  id: 'lavander-town',
  name: 'lavander Town',
  description: 'Cambia este texto por la descripción del escenario.',
  availability: 'available',
  assets: {
    preview: '/assets/stages/stages_image/lavander_town_preview.jpg',
    video: {
      path: '/assets/stages/stages_animated/lavander_town.mp4',
      width: 1280,
      height: 720,
      muted: true
    },
    music: {
      path: '',
      volume: 0.5,
      loop: true
    },
  },
  groundY: 520
};