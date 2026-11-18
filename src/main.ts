
import Phaser from 'phaser';
import { IntroScene } from './scenes/IntroScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { GameScene } from './scenes/GameScene';
import './style.css';
import { ModeSelectScene } from './scenes/ModeselectScene';
import { PlaySelectScene } from './scenes/PlayselectScene';
import { StageSelectScene } from './stages/Stageselectscene';
import { VersusScene } from './scenes/VersusScene';
import { HurtboxTestScene } from './scenes/HurtboxTestScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  physics: {
    default: 'matter',
    matter: {
      gravity: {
        x: 0,
        y: 1
      },
      debug: false
    }
  },

  scene: [
      // HurtboxTestScene,
    IntroScene,
    MainMenuScene,
    PlaySelectScene,
    ModeSelectScene,
    CharacterSelectScene,
    StageSelectScene,
    VersusScene,
    GameScene
  ]
};

new Phaser.Game(config);
