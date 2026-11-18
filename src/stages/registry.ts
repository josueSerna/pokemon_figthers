import type { StageDefinition } from './types';
import { wydonStadium } from './WydonStadium';
import { lavanderTown } from './LavanderTown';
import { mtBlaze } from './MtBlaze';

const stages: StageDefinition[] = [
  wydonStadium,
  lavanderTown,
  mtBlaze
];

export function getStages() {
  return stages;
}

export function getStageById(id: string) {
  return stages.find((stage) => stage.id === id);
}

export function getDefaultStage() {
  return stages.find((stage) => stage.availability === 'available') ?? stages[0];
}