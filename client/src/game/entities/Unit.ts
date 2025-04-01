import Phaser from 'phaser';
import { UnitType } from '../../types/game';
import { GridUtils } from '../utils/GridUtils';

interface UnitConfig {
  id: string;
  playerId: string;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  state: string;
}

export default class Unit extends Phaser.GameObjects.Container {
  // Core unit properties
  public id: string;
  public type: UnitType;
  public playerId: string;
  public health: number;
  public attack: number;
  public defense: number;
  public speed: number;
  public state: string;
  
  // Position in grid coordinates
  public gridX: number;
  public gridY: number;
  
  // Remaining actions for current turn
  public movesLeft: number;
  public actionsLeft: number;
  
  // Visual components
  private sprite: Phaser.GameObjects.Image;
  private healthBar: Phaser.GameObjects.Graphics;
  private selectionIndicator: Phaser.GameObjects.Graphics;
  
  // Animation states
  private isMoving: boolean = false;
  private currentPath: {x: number, y: number}[] = [];
  private moveTween?: Phaser.Tweens.Tween;
  
  constructor(scene: Phaser.Scene, x: number, y: number, type: UnitType, config: UnitConfig) {
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
    
    // Store unit properties
    this.id = config.id;
    this.type = type;
    this.playerId = config.playerId;
    this.health = config.health;
    this.attack = config.attack;
    this.defense = config.defense;
    this.speed = config.speed;
    this.state = config.state;
    
    // Store grid position
    this.gridX = x;
    this.gridY = y;
    
    // Set available actions for the turn
    this.movesLeft = this.speed;
    this.actionsLeft = 1;
    
    // Create sprite based on unit type
    this.sprite = scene.add.image(0, 0, type);
    
    // Set origin to bottom-center for isometric positioning
    this.sprite.setOrigin(0.5, 1);
    
    // Apply player-specific tint
    if (this.playerId === 'player1') {
      this.sprite.setTint(0x3498db); // Blue for player 1
    } else {
      this.sprite.setTint(0xe74c3c); // Red for player 2/AI
    }
    
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
    
    // Add to scene
    scene.add.existing(this);
    
    // Make interactive
    this.setSize(this.sprite.width, this.sprite.height);
    this.setInteractive();
  }
  
  updateHealthBar() {
    this.healthBar.clear();
    
    // Health bar background
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(-15, -45, 30, 5);
    
    // Health bar fill
    const healthPercentage = this.health / this.getMaxHealth();
    const barWidth = 30 * healthPercentage;
    
    // Color based on health percentage
    let barColor = 0x00ff00; // Green
    if (healthPercentage < 0.6) barColor = 0xffff00; // Yellow
    if (healthPercentage < 0.3) barColor = 0xff0000; // Red
    
    this.healthBar.fillStyle(barColor, 1);
    this.healthBar.fillRect(-15, -45, barWidth, 5);
  }
  
  getMaxHealth() {
    // Different units have different max health
    switch(this.type) {
      case 'worker': return 8;
      case 'melee': return 15;
      case 'ranged': return 10;
      default: return 10;
    }
  }
  
  showSelectionHighlight(show: boolean) {
    this.selectionIndicator.setVisible(show);
    
    if (show) {
      this.selectionIndicator.clear();
      this.selectionIndicator.lineStyle(2, 0xffff00, 1);
      this.selectionIndicator.strokeCircle(0, -20, 25);
    }
  }
  
  move(targetX: number, targetY: number, path: {x: number, y: number}[]) {
    // Already moving, ignore
    if (this.isMoving) return;
    
    this.isMoving = true;
    this.currentPath = [...path];
    
    // Remove starting position
    this.currentPath.shift();
    
    // Update grid position immediately (for game logic)
    this.gridX = targetX;
    this.gridY = targetY;
    
    // If there's a path, follow it
    if (this.currentPath.length > 0) {
      this.followPath();
    } else {
      this.isMoving = false;
    }
  }
  
  followPath() {
    if (this.currentPath.length === 0) {
      this.isMoving = false;
      return;
    }
    
    // Get the next point in the path
    const nextPoint = this.currentPath.shift();
    if (!nextPoint) {
      this.isMoving = false;
      return;
    }
    
    // Calculate the next position in screen space
    const { screenX, screenY } = GridUtils.cartesianToIsometric(
      nextPoint.x, nextPoint.y, 64, 32
    );
    
    // The container position is in the center of the map
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 3;
    const mapWidth = 15 * 32; // Half tile width for offset * map width
    const mapHeight = 15 * 16; // Half tile height for offset * map height
    
    const targetX = centerX + screenX - mapWidth / 2;
    const targetY = centerY + screenY - mapHeight / 2;
    
    // Create the movement tween
    this.moveTween = this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: 200,
      ease: 'Linear',
      onComplete: () => {
        // Continue following the path
        this.followPath();
      }
    });
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
  
  playAttackAnimation(targetX: number, targetY: number) {
    // Simple attack animation - move toward target then back
    const startX = this.x;
    const startY = this.y;
    
    // Calculate direction toward target
    const { screenX, screenY } = GridUtils.cartesianToIsometric(
      targetX, targetY, 64, 32
    );
    
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 3;
    const mapWidth = 15 * 32;
    const mapHeight = 15 * 16;
    
    const targetScreenX = centerX + screenX - mapWidth / 2;
    const targetScreenY = centerY + screenY - mapHeight / 2;
    
    // Calculate movement direction
    const dx = targetScreenX - startX;
    const dy = targetScreenY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and scale
    const moveX = dx / distance * 20;
    const moveY = dy / distance * 20;
    
    // Tween forward then back
    this.scene.tweens.add({
      targets: this,
      x: startX + moveX,
      y: startY + moveY,
      duration: 100,
      yoyo: true,
      repeat: 1
    });
  }
  
  playGatherAnimation() {
    // Simple gather animation - bob up and down
    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 200,
      yoyo: true,
      repeat: 1
    });
  }
  
  resetForNewTurn() {
    this.movesLeft = this.speed;
    this.actionsLeft = 1;
  }
  
  getStats() {
    return {
      id: this.id,
      type: this.type,
      health: this.health,
      attack: this.attack,
      defense: this.defense,
      speed: this.speed,
      movesLeft: this.movesLeft,
      actionsLeft: this.actionsLeft
    };
  }
  
  update(time: number, delta: number) {
    // Handle animations or effects over time
    
    // Update depth sorting based on y position
    this.setDepth(1000 + this.gridY);
  }
}

export { Unit };
