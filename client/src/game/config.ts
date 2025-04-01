import Phaser from 'phaser';
import BootScene from './scenes/Boot';
import MainScene from './scenes/Main';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#87CEEB', // Sky blue background
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  pixelArt: true,
  scene: [BootScene, MainScene],
  // Use WebGL with alpha
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  }
};
