import type { CharacterDefinition } from './types';

const gengarSpriteSheet = (
  key: string,
  fileName: string
) => ({
  key,
  path: `/assets/characters/gengar/${fileName}`,
  frameWidth: 256,
  frameHeight: 256
});

export const gengar: CharacterDefinition = {
  id: 'gengar',
  name: 'Gengar',
  description: 'Un Pokémon volador con gran movilidad aérea.',
  availability: 'available',
  stats: {
    maxHealth: 150,
    movementSpeed: 360,
    jumpForce: 400,
    maxJumps: 2,
    fallSpeed: 700,
    defense: 10
  },
  visualScale: 1.2,
  defaultFlipX: true,
  assets: {
    portrait: '/assets/characters/gengar/gengar_base.png',
    icon: '/assets/characters/gengar/gengar_icon.png',
    portraitCrop: { x: 132, y: 38, width: 100, height: 100 },
    spriteSheets: {
      idle: gengarSpriteSheet('gengar-idle', 'gengar_idle.png'),
      walk: gengarSpriteSheet('gengar-walk', 'gengar_walk.png'),
      jump: gengarSpriteSheet('gengar-jump', 'gengar_jump.png'),
      fall: gengarSpriteSheet('gengar-fall', 'gengar_fall.png'),
       airJump: gengarSpriteSheet(
        'gengar-air-jump',
        'gengar_air_jump.png'
      ),
    //   takeDamage: gengarSpriteSheet('gengar-take-damage', 'gengar_take_damage.png'),
      crouch: gengarSpriteSheet(
        'gengar-crouch',
        'gengar_crouch.png'
      ),
        neutralOne: gengarSpriteSheet(
    'gengar-neutral-one',
    'gengar_neutral_one.png'
  ),
          neutralTwo: gengarSpriteSheet(
    'gengar-neutral-two',
    'gengar_neutral_two.png'
  ),
            moveScaryFace: gengarSpriteSheet(
    'move-scary-face',
    'attack/move_scary_face.png'
  ),
    }
  },
  animations: [
    { key: 'idle', assetKey: 'idle', startFrame: 0, endFrame: 8, frameRate: 6, repeat: -1 },
    { key: 'walk', assetKey: 'walk', startFrame: 3, endFrame: 8, frameRate: 8, repeat: -1 },
    { key: 'walk-back', assetKey: 'walk', startFrame: 8, endFrame: 3, frameRate: 8, repeat: -1 },
    { key: 'jump', assetKey: 'jump', startFrame: 1, endFrame: 8, frameRate: 16, repeat: 0 },
    { key: 'jump-fall', assetKey: 'fall', startFrame: 1, endFrame: 8, frameRate: 8, repeat: -1 },
    { key: 'airJump', assetKey: 'airJump', startFrame: 2, endFrame: 8, frameRate: 16, repeat: 0 },
    { key: 'airJump-fall', assetKey: 'fall', startFrame: 7, endFrame: 8, frameRate: 8, repeat: -1 },
    { key: 'crouch', assetKey: 'crouch', startFrame: 0, endFrame: 8, frameRate: 12, repeat: 0 },
    { key: 'neutral-one', assetKey: 'neutralOne', startFrame: 0, endFrame: 8, frameRate: 12, repeat: 0 },
    // { key: 'takeDamage', assetKey: 'takeDamage', startFrame: 1, endFrame: 8, frameRate: 16, repeat: 0 }
  ]
};
