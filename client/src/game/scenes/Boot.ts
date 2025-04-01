import Phaser from 'phaser';
import { EventBridge } from '../../lib/events/EventBridge';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Show loading progress
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(
      this.cameras.main.width / 2 - 160,
      this.cameras.main.height / 2 - 25,
      320,
      50
    );

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    // Update progress bar as assets load
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(
        this.cameras.main.width / 2 - 150,
        this.cameras.main.height / 2 - 15,
        300 * value,
        30
      );
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load tileset for isometric map
    this.load.svg('grass', 'src/assets/tiles/grass.svg');
    this.load.svg('forest', 'src/assets/tiles/forest.svg');
    this.load.svg('hill', 'src/assets/tiles/hill.svg');

    // Load unit sprites
    this.load.svg('worker', 'src/assets/units/worker.svg');
    this.load.svg('melee', 'src/assets/units/melee.svg');
    this.load.svg('ranged', 'src/assets/units/ranged.svg');

    // Load building sprites
    this.load.svg('city', 'src/assets/buildings/city.svg');
    this.load.svg('barracks', 'src/assets/buildings/barracks.svg');

    // Load action indicators
    this.load.svg('move-indicator', 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/move.svg');
    this.load.svg('attack-indicator', 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/target.svg');
    this.load.svg('gather-indicator', 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/tool.svg');
    this.load.svg('build-indicator', 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/home.svg');
  }

  create() {
    console.log('Boot scene loaded, waiting for game start signal...');
    
    // Wait for the UI to signal game start
    EventBridge.on('ui:startGame', () => {
      console.log('Starting game from boot scene...');
      this.scene.start('MainScene');
    });
  }
}
