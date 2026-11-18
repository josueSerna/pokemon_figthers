
import type { SpriteSheetAsset } from '../types';

export function createSpriteSheet(
  characterId: string,
  key: string,
  fileName: string,
  frameWidth = 256,
  frameHeight = 256
): SpriteSheetAsset {
  return {
    key,
    path: `/assets/characters/${characterId}/${fileName}`,
    frameWidth,
    frameHeight
  };
}
