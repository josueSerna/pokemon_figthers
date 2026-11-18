
import type { CharacterDefinition } from './types';
import { createSpriteSheet } from './helpers/createSpriteSheet';

import { charizardNeutralAttacks } from '../gameplay/attacks/characters/charizard/charizardNeutralAttacks';
import { charizardNeutralCrouchAttacks } from '../gameplay/attacks/characters/charizard/charizardNeutralCrouchAttacks';
import { charizardNeutralAirAttack } from '../gameplay/attacks/characters/charizard/charizardNeutralAirAttack';

export const charizard: CharacterDefinition = {
  id: 'charizard',
  name: 'Charizard',
  description: 'Un Pokémon volador con gran movilidad aérea.',
  availability: 'available',

  stats: {
    maxHealth: 1110,
    movementSpeed: 190,
    jumpForce: 500,
    maxJumps: 2,
    fallSpeed: 900,
    defense: 10
  },

  visualScale: 1.6,
  defaultFlipX: false,

  dash: {
    speed: 420,
    doubleTapWindow: 250
  },

  dashAttack: {
  dashAttack: {
    damage: 100,
    hitboxWidth: 100,
    hitboxHeight: 75,
    hitboxOffsetX: 65,
    hitboxOffsetY: 0
  }
},
  attacks: {
    neutral: {
      standing: charizardNeutralAttacks,
      crouching: charizardNeutralCrouchAttacks,
      air: charizardNeutralAirAttack
    }
  },

  assets: {
    portrait: '/assets/characters/charizard/Charizar_base.png',
    icon: '/assets/characters/charizard/Charizar_icon.png',
    portraitCrop: {
      x: 132,
      y: 38,
      width: 100,
      height: 100
    },

    spriteSheets: {
      idle: createSpriteSheet('charizard', 'charizard-idle', 'charizard_idle.png'),
      walk: createSpriteSheet('charizard', 'charizard-walk', 'charizard_walk.png'),
      jump: createSpriteSheet('charizard', 'charizard-jump', 'charizard_jump.png'),
      jumpUp: createSpriteSheet('charizard', 'charizard-jump-up', 'charizard_jump_up.png'),
      doubleJump: createSpriteSheet('charizard', 'charizard-double-jump', 'charizard_double_jump.png'),
      jumpFall: createSpriteSheet('charizard', 'charizard-jump-fall', 'charizard_jump_fall.png'),
      jumpLand: createSpriteSheet('charizard', 'charizard-jump-land', 'charizard_jump_land.png'),
      takeDamage: createSpriteSheet('charizard', 'charizard-take-damage', 'charizard_take_damage.png'),
      crouch: createSpriteSheet('charizard', 'charizard-crouch', 'charizard_crouch.png'),
      idleCrouch: createSpriteSheet('charizard', 'charizard-crouch_idle', 'charizard_crouch_idle.png'),

      neutralOne: createSpriteSheet('charizard', 'charizard-neutral-one', 'charizard_neutral_one.png'),
      neutralTwo: createSpriteSheet('charizard', 'charizard-neutral-two', 'charizard_neutral_two.png'),
      neutralThree: createSpriteSheet('charizard', 'charizard-neutral-three', 'charizard_neutral_three.png'),

      neutralCrouchOne: createSpriteSheet('charizard', 'charizard-neutral-crouch-one', 'charizard_neutral_crouch_one.png'),
      neutralCrouchTwo: createSpriteSheet('charizard', 'charizard-neutral-crouch-two', 'charizard_neutral_crouch_two.png'),
      neutralCrouchThree: createSpriteSheet('charizard', 'charizard-neutral-crouch-three', 'charizard_neutral_crouch_three.png'),

      neutralAir: createSpriteSheet('charizard', 'charizard-neutral-air', 'charizard_neutral_air.png'),

      dash: createSpriteSheet('charizard', 'charizard-dash', 'charizard_dash.png'),
      dashAttack: createSpriteSheet('charizard', 'charizard-dash-attack', 'charizard_dash_attack.png')
    }
  },

  animations: [
    {
      key: 'idle',
      assetKey: 'idle',
      startFrame: 0,
      endFrame: 11,
      frameRate: 6,
      repeat: -1
    },
    {
      key: 'walk',
      assetKey: 'walk',
      startFrame: 0,
      endFrame: 23,
      frameRate: 16,
      repeat: -1
    },
    {
      key: 'walk-back',
      assetKey: 'walk',
      startFrame: 23,
      endFrame: 0,
      frameRate: 13,
      repeat: -1
    },
    {
      key: 'crouch',
      assetKey: 'crouch',
      startFrame: 0,
      endFrame: 4,
      frameRate: 16,
      repeat: 0
    },
    {
      key: 'idleCrouch',
      assetKey: 'idleCrouch',
      startFrame: 1,
      endFrame: 8,
      frameRate: 6,
      repeat: -1
    },
    {
      key: 'takeDamage',
      assetKey: 'takeDamage',
      startFrame: 1,
      endFrame: 8,
      frameRate: 16,
      repeat: 0
    },
    {
      key: 'jump',
      assetKey: 'jump',
      startFrame: 0,
      endFrame: 3,
      frameRate: 12,
      repeat: 0
    },
    {
      key: 'jump-up',
      assetKey: 'jumpUp',
      startFrame: 0,
      endFrame: 1,
      frameRate: 12,
      repeat: 0
    },
    {
      key: 'double-jump',
      assetKey: 'doubleJump',
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0
    },
    {
      key: 'jump-fall',
      assetKey: 'jumpFall',
      startFrame: 1,
      endFrame: 4,
      frameRate: 6,
      repeat: -1
    },
    {
      key: 'jump-land',
      assetKey: 'jumpLand',
      startFrame: 0,
      endFrame: 3,
      frameRate: 12,
      repeat: 0
    },
    {
      key: 'dash',
      assetKey: 'dash',
      startFrame: 0,
      endFrame: 8,
      frameRate: 18,
      repeat: 0
    },
    {
      key: 'dashAttack',
      assetKey: 'dashAttack',
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0
    }
  ],

  hurtbox: {}
};
