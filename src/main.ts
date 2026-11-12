
import Phaser from 'phaser';
import { IntroScene } from './scenes/IntroScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { GameScene } from './scenes/GameScene';
import './style.css';
import { ModeSelectScene } from './scenes/ModeselectScene';
import { PlaySelectScene } from './scenes/PlayselectScene';
import { StageSelectScene } from './stages/Stageselectscene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },

  scene: [IntroScene, MainMenuScene,  PlaySelectScene, ModeSelectScene,CharacterSelectScene, StageSelectScene, GameScene]
};

new Phaser.Game(config);
