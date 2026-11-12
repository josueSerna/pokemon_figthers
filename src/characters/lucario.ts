import type { CharacterDefinition } from './types';
import { AuraSphereAbility } from '../gameplay/abilities/AuraSphereAbility';

const lucarioSpriteSheet = (
  key: string,
  fileName: string
) => ({
  key,
  path: `/assets/characters/lucario/${fileName}`,
  frameWidth: 256,
  frameHeight: 256
});

export const lucario: CharacterDefinition = {
  id: 'lucario',
  name: 'Lucario',
  description: 'Un luchador equilibrado capaz de cargar y lanzar Aura Sphere.',
  availability: 'available',
  stats: {
    maxHealth: 100,
    movementSpeed: 250,
    jumpForce: 400,
    maxJumps: 1,
    fallSpeed: 900,
    defense: 10
  },
  hitbox: {
    width: 90,
    height: 170,
    offsetX: 83,
    offsetY: 65
  },
  visualScale: 1,
  assets: {
    portrait: '/assets/characters/lucario/lucario_base.png',
    icon: '/assets/characters/lucario/lucario_icon.png',
    portraitCrop: { x: 92, y: 20, width: 82, height: 94 },
    spriteSheets: {
      idle: lucarioSpriteSheet('lucario-idle', 'lucario-idle.png'),
      walk: lucarioSpriteSheet('lucario-walk', 'lucario-walk.png'),
      jump: lucarioSpriteSheet('lucario-jump', 'lucario-jump.png'),
      crouch: lucarioSpriteSheet('lucario-crouch', 'lucario-crouch.png'),
      recharged: lucarioSpriteSheet(
        'lucario-recharged',
        'lucario_recharged_re.png'
      ),
      chargeIdle: lucarioSpriteSheet(
        'lucario-charge-idle',
        'lucario_recharge_idle.png'
      ),
      launch: lucarioSpriteSheet('lucario-launch', 'lucario_launche_re.png'),
      auraSphere: lucarioSpriteSheet(
        'aura-sphere',
        'proyectil/aura_sphere.png'
      )
    }
  },
  abilityFactories: [() => new AuraSphereAbility()],
  animations: [
    { key: 'walk', assetKey: 'walk', startFrame: 0, endFrame: 8, frameRate: 14, repeat: -1 },
    { key: 'walk-back', assetKey: 'walk', startFrame: 8, endFrame: 0, frameRate: 14, repeat: -1 },
    { key: 'jump', assetKey: 'jump', startFrame: 3, endFrame: 7, frameRate: 16, repeat: 0 },
    { key: 'idle', assetKey: 'idle', startFrame: 1, endFrame: 8, frameRate: 10, repeat: -1 },
    { key: 'crouch', assetKey: 'crouch', startFrame: 3, endFrame: 8, frameRate: 12, repeat: 0 },
    { key: 'recharged', assetKey: 'recharged', startFrame: 0, endFrame: 8, frameRate: 12, repeat: 0 },
    { key: 'charge-idle', assetKey: 'chargeIdle', startFrame: 0, endFrame: 8, frameRate: 12, repeat: -1 },
    { key: 'launch', assetKey: 'launch', startFrame: 0, endFrame: 8, frameRate: 12, repeat: 0 },
    { key: 'aura-sphere', assetKey: 'auraSphere', startFrame: 0, endFrame: 12, frameRate: 3.25, repeat: 0 },
    { key: 'aura-sphere-hold', assetKey: 'auraSphere', startFrame: 10, endFrame: 12, frameRate: 4, repeat: -1 }
  ]
};
