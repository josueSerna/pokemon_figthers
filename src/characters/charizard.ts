import type { CharacterDefinition } from './types';

const charizardSpriteSheet = (
  key: string,
  fileName: string
) => ({
  key,
  path: `/assets/characters/charizard/${fileName}`,
  frameWidth: 256,
  frameHeight: 256
});

export const charizard: CharacterDefinition = {
  id: 'charizard',
  name: 'Charizard',
  description: 'Un Pokémon volador con gran movilidad aérea.',
  availability: 'available',
  stats: {
    maxHealth: 150,
    movementSpeed: 150,
    jumpForce: 320,
    maxJumps: 2,
    fallSpeed: 900,
    defense: 10
  },
  hitbox: {
    width: 100,
    height: 160,
    offsetX: 90,
    offsetY: 80,
  },
  visualScale: 1.25,
  assets: {
    portrait: '/assets/characters/charizard/Charizar_base.png',
    icon: '/assets/characters/charizard/Charizar_icon.png',
    portraitCrop: { x: 132, y: 38, width: 100, height: 100 },
    spriteSheets: {
      idle: charizardSpriteSheet('charizard-idle', 'charizard_idle.png'),
      walk: charizardSpriteSheet('charizard-walk', 'charizard_walk.png'),
      jump: charizardSpriteSheet('charizard-jump', 'charizard_jump.png'),
      takeDamage: charizardSpriteSheet('charizard-take-damage', 'charizard_take_damage.png'),
      crouch: charizardSpriteSheet(
        'charizard-crouch',
        'charizard_agacharse.png'
      ),
      airJump: charizardSpriteSheet(
        'charizard-air-jump',
        'segundo_charizard (1).png'
      )
    }
  },
  animations: [
    { key: 'idle', assetKey: 'idle', startFrame: 0, endFrame: 8, frameRate: 6, repeat: -1 },
    { key: 'walk', assetKey: 'walk', startFrame: 0, endFrame: 8, frameRate: 8, repeat: -1 },
    { key: 'walk-back', assetKey: 'walk', startFrame: 8, endFrame: 0, frameRate: 8, repeat: -1 },
    { key: 'jump', assetKey: 'jump', startFrame: 0, endFrame: 8, frameRate: 8, repeat: 0 },
    { key: 'crouch', assetKey: 'crouch', startFrame: 0, endFrame: 8, frameRate: 8, repeat: 0 },
    { key: 'airJump', assetKey: 'airJump', startFrame: 0, endFrame: 7, frameRate: 8, repeat: 0 },
    { key: 'takeDamage', assetKey: 'takeDamage', startFrame: 1, endFrame: 8, frameRate: 16, repeat: 0 }
  ]
};
