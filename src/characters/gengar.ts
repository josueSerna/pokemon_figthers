import type { CharacterDefinition } from "./types";
import { createSpriteSheet } from "./helpers/createSpriteSheet";
import { gengarNeutralAttacks } from "../gameplay/attacks/characters/gengar/gengarNeutralAttacks";
import { gengarNeutralCrouchAttacks } from "../gameplay/attacks/characters/gengar/gengarNeutralCrouchAttacks";

export const gengar: CharacterDefinition = {
  id: "gengar",
  name: "Gengar",
  description: "Un Pokémon volador con gran movilidad aérea.",
  availability: "available",

  stats: {
    maxHealth: 150,
    movementSpeed: 360,
    jumpForce: 400,
    maxJumps: 1,
    fallSpeed: 700,
    defense: 10,
  },

  dash: {
    speed: 420,
    doubleTapWindow: 250,
  },

  attacks: {
    neutral: {
      standing: gengarNeutralAttacks,
      crouching: gengarNeutralCrouchAttacks,
    },
  },

  visualScale: 1.2,
  defaultFlipX: true,

  assets: {
    portrait: "/assets/characters/gengar/gengar_base.png",
    icon: "/assets/characters/gengar/gengar_icon.png",

    portraitCrop: {
      x: 132,
      y: 38,
      width: 100,
      height: 100,
    },

    spriteSheets: {
      idle: createSpriteSheet("gengar", "gengar-idle", "gengar_idle.png"),
      idleCrouch: createSpriteSheet(
        "gengar",
        "gengar-crouch_idle",
        "gengar_crouch_idle.png",
      ),
      walk: createSpriteSheet("gengar", "gengar-walk", "gengar_walk.png"),
      walkBack: createSpriteSheet(
        "gengar",
        "gengar-walk-back",
        "gengar_walk_back.png",
      ),

      jump: createSpriteSheet("gengar", "gengar-jump", "gengar_jump.png"),
      jumpUp: createSpriteSheet(
        "gengar",
        "gengar-jump-up",
        "gengar_jump_up.png",
      ),
      jumpFall: createSpriteSheet(
        "gengar",
        "gengar-jump-fall",
        "gengar_jump_fall.png",
      ),
      jumpLand: createSpriteSheet(
        "gengar",
        "gengar-jump-land",
        "gengar_jump_land.png",
      ),

      crouch: createSpriteSheet("gengar", "gengar-crouch", "gengar_crouch.png"),
      dash: createSpriteSheet("gengar", "gengar-dash", "gengar_dash.png"),
      dashBack: createSpriteSheet(
        "gengar",
        "gengar-dash-back",
        "gengar_dash_back.png",
      ),

      neutralOne: createSpriteSheet(
        "gengar",
        "gengar-neutral-one",
        "gengar_neutral_one.png",
      ),

      neutralTwo: createSpriteSheet(
        "gengar",
        "gengar-neutral-two",
        "gengar_neutral_two.png",
      ),

      neutralThree: createSpriteSheet(
        "gengar",
        "gengar-neutral-three",
        "gengar_neutral_three.png",
      ),

      crouchNeutralOne: createSpriteSheet(
        "gengar",
        "gengar-crouch-neutral-one",
        "gengar_crouch_neutral_one.png",
      ),

        crouchNeutralTwo: createSpriteSheet(
        "gengar",
        "gengar-crouch-neutral-two",
        "gengar_crouch_neutral_two.png",
      ),
    },
  },

  animations: [
    {
      key: "idle",
      assetKey: "idle",
      startFrame: 0,
      endFrame: 8,
      frameRate: 6,
      repeat: -1,
    },
    {
      key: "walk",
      assetKey: "walk",
      startFrame: 1,
      endFrame: 23,
      frameRate: 20,
      repeat: -1,
    },
    {
      key: "walk-back",
      assetKey: "walkBack",
      startFrame: 1,
      endFrame: 23,
      frameRate: 20,
      repeat: -1,
    },
    {
      key: "jump",
      assetKey: "jump",
      startFrame: 1,
      endFrame: 4,
      frameRate: 16,
      repeat: 0,
    },
    {
      key: "jump-up",
      assetKey: "jumpUp",
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0,
    },
    {
      key: "jump-fall",
      assetKey: "jumpFall",
      startFrame: 1,
      endFrame: 4,
      frameRate: 8,
      repeat: -1,
    },
    {
      key: "jump-land",
      assetKey: "jumpLand",
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0,
    },
    {
      key: "crouch",
      assetKey: "crouch",
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0,
    },
    {
      key: "idleCrouch",
      assetKey: "idleCrouch",
      startFrame: 1,
      endFrame: 4,
      frameRate: 6,
      repeat: -1,
    },
    {
      key: "dash",
      assetKey: "dash",
      startFrame: 0,
      endFrame: 8,
      frameRate: 18,
      repeat: 0,
    },
    {
      key: "dash-back",
      assetKey: "dashBack",
      startFrame: 0,
      endFrame: 8,
      frameRate: 18,
      repeat: 0,
    },
    {
      key: "neutral-one",
      assetKey: "neutralOne",
      startFrame: 1,
      endFrame: 4,
      frameRate: 12,
      repeat: 0,
    },
    {
      key: "neutral-two",
      assetKey: "neutralTwo",
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0,
    },

    {
      key: "neutral-three",
      assetKey: "neutralThree",
      startFrame: 0,
      endFrame: 8,
      frameRate: 12,
      repeat: 0,
    },

    {
      key: "crouch-neutral-one",
      assetKey: "crouchNeutralOne",
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0,
    },
    {
      key: "crouch-neutral-two",
      assetKey: "crouchNeutralTwo",
      startFrame: 0,
      endFrame: 4,
      frameRate: 12,
      repeat: 0,
    },
  ],
  hurtbox: {},
};
