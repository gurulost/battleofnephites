import Phaser from 'phaser';
import { BuildingType, UnitType } from '../../types/game';
import { GridUtils } from '../utils/GridUtils';

interface BuildingConfig {
  id: string;
  playerId: string;
  health: number;
  defense: number;
  state: string;
  productionQueue?: UnitType[];
}

export default class Building extends Phaser.GameObjects.Container {
  // Core building properties
  public id: string;
  public type: BuildingType;
  public playerId: string;
  public health: number;
  public defense: number;
  public state: string;
  
  // Position in grid coordinates
  public gridX: number;
  public gridY: number;
  
  // Production
  public productionQueue: UnitType[] = [];
  public turnsToNextUnit: number = 0;
  
  // Visual components
  private sprite: Phaser.GameObjects.Image;
  private healthBar: Phaser.GameObjects.Graphics;
  private selectionIndicator: Phaser.GameObjects.Graphics;
  private productionIcon?: Phaser.GameObjects.Image;
  
  constructor(scene: Phaser.Scene, x: number, y: number, type: BuildingType, config: BuildingConfig) {
    // Calculate the pixel position from grid coordinates
    const { screenX, screenY } = GridUtils.cartesianToIsometric(
      x, y, 64, 32
    );
    
    // The container position is in the center of the map
    const centerX = scene.cameras.main.width / 2;
    const centerY = scene.cameras.main.height / 3;
    const mapWidth = 15 * 32; // Half tile width for offset * map width
    const mapHeight = 15 * 16; // Half tile height for offset * map height
    
    super(scene, centerX + screenX - mapWidth / 2, centerY + screenY - mapHeight / 2);
    
    // Store building properties
    this.id = config.id;
    this.type = type;
    this.playerId = config.playerId;
    this.health = config.health;
    this.defense = config.defense;
    this.state = config.state;
    
    // Store grid position
    this.gridX = x;
    this.gridY = y;
    
    // Initialize production queue if provided
    this.productionQueue = config.productionQueue || [];
    
    // Create sprite based on building type (for now using generic sprites regardless of faction)
    // const faction = this.playerId === 'player1' ? 'nephite' : 'lamanite';
    // this.sprite = scene.add.image(0, 0, `${faction}-${type}`);
    this.sprite = scene.add.image(0, 0, type);
    
    // Set origin to bottom-center for isometric positioning
    this.sprite.setOrigin(0.5, 1);
    
    // Create health bar
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();
    
    // Create selection indicator (initially invisible)
    this.selectionIndicator = scene.add.graphics();
    this.selectionIndicator.setVisible(false);
    
    // Add all visual components to the container
    this.add([this.selectionIndicator, this.sprite, this.healthBar]);
    
    // Set depth based on y-position for proper isometric sorting
    this.setDepth(1000 + this.gridY);
    
    // Make building interactive
    this.setSize(this.sprite.width, this.sprite.height);
    this.setInteractive();
    
    // Add to scene
    scene.add.existing(this);
    
    // If there's already something in production queue, show icon
    this.updateProductionIcon();
  }
  
  updateHealthBar() {
    this.healthBar.clear();
    
    // Health bar background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(-20, -50, 40, 5);
    
    // Health bar fill
    const healthPercentage = this.health / this.getMaxHealth();
    const barWidth = 40 * healthPercentage;
    
    // Color based on health percentage
    let barColor = 0x00ff00; // Green
    if (healthPercentage < 0.6) barColor = 0xffff00; // Yellow
    if (healthPercentage < 0.3) barColor = 0xff0000; // Red
    
    this.healthBar.fillStyle(barColor, 1);
    this.healthBar.fillRect(-20, -50, barWidth, 5);
  }
  
  getMaxHealth() {
    // Different buildings have different max health
    switch(this.type) {
      case 'city': return 25;
      case 'barracks': return 15;
      default: return 20;
    }
  }
  
  showSelectionHighlight(show: boolean) {
    this.selectionIndicator.setVisible(show);
    
    if (show) {
      this.selectionIndicator.clear();
      this.selectionIndicator.lineStyle(2, 0xffff00, 1);
      this.selectionIndicator.strokeCircle(0, -25, 30);
    }
  }
  
  takeDamage(amount: number) {
    this.health -= amount;
    this.updateHealthBar();
    
    // Flash red when taking damage
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5,
      yoyo: true,
      duration: 100,
      repeat: 1
    });
  }
  
  addToProductionQueue(unitType: UnitType) {
    this.productionQueue.push(unitType);
    
    // If this is the first unit in the queue, set production time
    if (this.productionQueue.length === 1) {
      this.turnsToNextUnit = this.getProductionTime(unitType);
    }
    
    // Update the production icon
    this.updateProductionIcon();
  }
  
  getProductionTime(unitType: UnitType): number {
    // Different unit types take different amounts of time to produce
    switch(unitType) {
      case 'worker': return 1;
      case 'melee': return 2;
      case 'ranged': return 3;
      default: return 2;
    }
  }
  
  processTurn() {
    // If there's something in the production queue, reduce turns remaining
    if (this.productionQueue.length > 0 && this.turnsToNextUnit > 0) {
      this.turnsToNextUnit--;
    }
  }
  
  getProducedUnit(): UnitType | null {
    // If production is complete, return and remove the first unit in the queue
    if (this.productionQueue.length > 0 && this.turnsToNextUnit <= 0) {
      const unit = this.productionQueue.shift()!;
      
      // Set up production for the next unit in queue if any
      if (this.productionQueue.length > 0) {
        this.turnsToNextUnit = this.getProductionTime(this.productionQueue[0]);
      }
      
      // Update the production icon
      this.updateProductionIcon();
      
      return unit;
    }
    
    return null;
  }
  
  updateProductionIcon() {
    // Remove existing icon if any
    if (this.productionIcon) {
      this.productionIcon.destroy();
      this.productionIcon = undefined;
    }
    
    // If there's something in the queue, show production icon
    if (this.productionQueue.length > 0) {
      // Show the unit type that's being produced (using generic sprites for now)
      // const faction = this.playerId === 'player1' ? 'nephite' : 'lamanite';
      const unitType = this.productionQueue[0];
      this.productionIcon = this.scene.add.image(15, -35, unitType);
      this.productionIcon.setScale(0.5);
      this.add(this.productionIcon);
    }
  }
  
  getStats() {
    return {
      id: this.id,
      type: this.type,
      health: this.health,
      defense: this.defense,
      productionQueue: this.productionQueue,
      turnsToNextUnit: this.turnsToNextUnit
    };
  }
  
  update(time: number, delta: number) {
    // Handle animations or effects over time
    
    // Update depth sorting based on y position
    this.setDepth(1000 + this.gridY);
  }
}

export { Building };
