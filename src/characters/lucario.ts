import type { CharacterDefinition } from './types';
import { AuraSphereAbility } from '../gameplay/abilities/AuraSphereAbility';

const lucarioSpriteSheet = (
  key: string,
  fileName: string,
  frameWidth = 256,
  frameHeight = 256
) => ({
  key,
  path: `/assets/characters/lucario/${fileName}`,
  frameWidth,
  frameHeight
});

export const lucario: CharacterDefinition = {
  id: 'lucario',
  name: 'Lucario',
  description: 'Un luchador equilibrado capaz de cargar y lanzar Aura Sphere.',
  availability: 'available',
  stats: {
    maxHealth: 100,
    movementSpeed: 450,
    jumpForce: 500,
    maxJumps: 2,
    fallSpeed: 900,
    defense: 10
  },

  visualScale: 1.2,
  defaultFlipX: false,
  assets: {
    portrait: '/assets/characters/lucario/lucario_base.png',
    icon: '/assets/characters/lucario/lucario_icon.png',
    portraitCrop: { x: 92, y: 20, width: 82, height: 94 },
    spriteSheets: {
      idle: lucarioSpriteSheet('lucario-idle', 'lucario_idle.png'),
      walk: lucarioSpriteSheet('lucario-walk', 'lucario_walk.png'),
      jump: lucarioSpriteSheet('lucario-jump', 'lucario_jump.png'),
      fall: lucarioSpriteSheet('lucario-fall', 'lucario_fall.png',   253,
  242),
      crouch: lucarioSpriteSheet('lucario-crouch', 'lucario_crouch.png'),
       airJump: lucarioSpriteSheet(
        'lucario-air-jump',
        'lucario_air_jump.png',253,
  242
      ),
      recharged: lucarioSpriteSheet(
        'lucario-recharged',
        'lucario_recharged.png'
      ),
      chargeIdle: lucarioSpriteSheet(
        'lucario-charge-idle',
        'lucario_recharge_idle.png'
      ),
      launch: lucarioSpriteSheet('lucario-launch', 'lucario_launch.png'),
      auraSphere: lucarioSpriteSheet(
        'aura-sphere',
        'proyectil/aura_sphere.png'
      )
    }
  },
  abilityFactories: [() => new AuraSphereAbility()],
  animations: [
    { key: 'walk', assetKey: 'walk', startFrame: 0, endFrame: 8, frameRate: 20, repeat: -1 },
    { key: 'walk-back', assetKey: 'walk', startFrame: 8, endFrame: 0, frameRate: 20, repeat: -1 },
    { key: 'jump', assetKey: 'jump', startFrame: 3, endFrame: 6, frameRate: 16, repeat: 0 },
    { key: 'jump-fall', assetKey: 'fall', startFrame: 0, endFrame: 6, frameRate: 4, repeat: 0 },
    { key: 'idle', assetKey: 'idle', startFrame: 1, endFrame: 8, frameRate: 10, repeat: -1 },
    { key: 'airJump', assetKey: 'airJump', startFrame: 0, endFrame: 9, frameRate: 12, repeat: 0 },
    { key: 'crouch', assetKey: 'crouch', startFrame: 3, endFrame: 8, frameRate: 12, repeat: 0 },
    { key: 'recharged', assetKey: 'recharged', startFrame: 0, endFrame: 8, frameRate: 12, repeat: 0 },
    { key: 'charge-idle', assetKey: 'chargeIdle', startFrame: 0, endFrame: 8, frameRate: 12, repeat: -1 },
    { key: 'launch', assetKey: 'launch', startFrame: 0, endFrame: 8, frameRate: 12, repeat: 0 },
    { key: 'aura-sphere', assetKey: 'auraSphere', startFrame: 0, endFrame: 12, frameRate: 3.25, repeat: 0 },
    { key: 'aura-sphere-hold', assetKey: 'auraSphere', startFrame: 10, endFrame: 12, frameRate: 4, repeat: -1 }
  ]
};
