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
    movementSpeed: 190,
    jumpForce: 500,
    maxJumps: 2,
    fallSpeed: 900,
    defense: 10
  },
  visualScale: 1.6,
  defaultFlipX: false,
  assets: {
    portrait: '/assets/characters/charizard/Charizar_base.png',
    icon: '/assets/characters/charizard/Charizar_icon.png',
    portraitCrop: { x: 132, y: 38, width: 100, height: 100 },
    spriteSheets: {
      idle: charizardSpriteSheet('charizard-idle', 'charizard_idle.png'),
      walk: charizardSpriteSheet('charizard-walk', 'charizard_walk.png'),
      jump: charizardSpriteSheet('charizard-jump', 'charizard_jump.png'),
      jumpUp: charizardSpriteSheet('charizard-jump-up', 'charizard_jump_up.png'),
      doubleJump: charizardSpriteSheet('charizard-double-jump', 'charizard_double_jump.png'),
      jumpFall: charizardSpriteSheet('charizard-jump-fall', 'charizard_jump_fall.png'),
      jumpLand: charizardSpriteSheet('charizard-jump-land', 'charizard_jump_land.png'),
      takeDamage: charizardSpriteSheet('charizard-take-damage', 'charizard_take_damage.png'),
      crouch: charizardSpriteSheet('charizard-crouch', 'charizard_crouch.png'),
      idleCrouch: charizardSpriteSheet('charizard-crouch_idle', 'charizard_crouch_idle.png'),
      neutralOne: charizardSpriteSheet('charizard-neutral-one', 'charizard_neutral_one.png'),
      neutralTwo: charizardSpriteSheet('charizard-neutral-two', 'charizard_neutral_two.png'),
      neutralThree: charizardSpriteSheet('charizard-neutral-three', 'charizard_neutral_three.png'),
    }
  },
  animations: [
    { key: 'idle', assetKey: 'idle', startFrame: 0, endFrame: 11, frameRate: 6, repeat: -1 },
    { key: 'walk', assetKey: 'walk', startFrame: 0, endFrame: 23, frameRate: 16, repeat: -1 },
    { key: 'walk-back', assetKey: 'walk', startFrame: 23, endFrame: 0, frameRate: 13, repeat: -1 },
    { key: 'crouch', assetKey: 'crouch', startFrame: 0, endFrame: 4, frameRate: 16, repeat: 0 },
    { key: 'idleCrouch', assetKey: 'idleCrouch', startFrame: 1, endFrame: 8, frameRate: 6, repeat: -1 },
    { key: 'takeDamage', assetKey: 'takeDamage', startFrame: 1, endFrame: 8, frameRate: 16, repeat: 0 },
    { key: 'jump', assetKey: 'jump', startFrame: 0, endFrame: 3, frameRate: 12, repeat: 0 },
    { key: 'jump-up', assetKey: 'jumpUp', startFrame: 0, endFrame: 1, frameRate: 12, repeat: 0 },
    { key: 'double-jump', assetKey: 'doubleJump', startFrame: 0, endFrame: 4, frameRate: 12, repeat: 0 },
    { key: 'jump-fall', assetKey: 'jumpFall', startFrame: 1, endFrame: 4, frameRate: 6 , repeat: -1 },
    { key: 'jump-land', assetKey: 'jumpLand', startFrame: 0, endFrame: 3, frameRate: 12, repeat: 0 },
    { key: 'neutral-one', assetKey: 'neutralOne', startFrame: 0, endFrame: 4, frameRate: 12, repeat: 0 },
    { key: 'neutral-two', assetKey: 'neutralTwo', startFrame: 0, endFrame: 4, frameRate: 12, repeat: 0 },
    { key: 'neutral-three', assetKey: 'neutralThree', startFrame: 0, endFrame: 8, frameRate: 12, repeat: 0 }  
  ]
};
