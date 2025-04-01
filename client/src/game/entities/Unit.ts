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
    
    // Create sprite based on unit type and faction
    const faction = this.playerId === 'player1' ? 'nephite' : 'lamanite';
    this.sprite = scene.add.image(0, 0, `${faction}-${type}`);
    
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
    
    // Make unit interactive
    this.setSize(this.sprite.width, this.sprite.height);
    this.setInteractive();
    
    // Add to scene
    scene.add.existing(this);
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
  
  move(targetX: number, targetY: number, path: {x: number, y: number}[], onComplete?: () => void) {
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
      this.followPath(onComplete);
    } else {
      this.isMoving = false;
      if (onComplete) onComplete();
    }
  }
  
  followPath(onComplete?: () => void) {
    if (this.currentPath.length === 0) {
      this.isMoving = false;
      if (onComplete) onComplete();
      return;
    }
    
    // Get the next point in the path
    const nextPoint = this.currentPath.shift();
    if (!nextPoint) {
      this.isMoving = false;
      if (onComplete) onComplete();
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
        // If this is the last step in the path
        if (this.currentPath.length === 0) {
          this.isMoving = false;
          if (onComplete) onComplete();
        } else {
          // Continue following the path
          this.followPath(onComplete);
        }
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
    // Attack animation with multiple visual effects
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
    
    // Show attack icon
    const attackIcon = this.scene.add.image(0, -40, 'attack-indicator');
    attackIcon.setScale(0.6);
    attackIcon.setTint(0xff0000);
    this.add(attackIcon);
    
    // Fade and scale up then remove the indicator
    this.scene.tweens.add({
      targets: attackIcon,
      alpha: 0,
      scale: 1,
      y: -60,
      duration: 800,
      onComplete: () => {
        attackIcon.destroy();
      }
    });
    
    // Flash the unit sprite to indicate attack
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.7,
      duration: 50,
      yoyo: true,
      repeat: 1
    });
    
    // Tween forward then back (lunge attack)
    this.scene.tweens.add({
      targets: this,
      x: startX + moveX,
      y: startY + moveY,
      duration: 100,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // After attacking, add slash effect at target position
        if (this.type !== 'ranged') {
          // For melee units, add slash effect
          this.createMeleeImpactEffect(targetScreenX, targetScreenY);
        } else {
          // For ranged units, add projectile effect
          this.createRangedAttackEffect(startX, startY, targetScreenX, targetScreenY);
        }
      }
    });
  }
  
  createMeleeImpactEffect(targetX: number, targetY: number) {
    // Create slash effect at target position
    const slash = this.scene.add.graphics();
    slash.x = targetX - this.x;
    slash.y = targetY - this.y - 30;
    this.add(slash);
    
    // Draw slash
    slash.lineStyle(3, 0xff0000, 1);
    slash.beginPath();
    slash.moveTo(-10, -10);
    slash.lineTo(10, 10);
    slash.moveTo(10, -10);
    slash.lineTo(-10, 10);
    slash.closePath();
    slash.strokePath();
    
    // Fade out and destroy
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        slash.destroy();
      }
    });
  }
  
  createRangedAttackEffect(startX: number, startY: number, targetX: number, targetY: number) {
    // Create projectile
    const projectile = this.scene.add.graphics();
    projectile.x = 0;
    projectile.y = -20;
    this.add(projectile);
    
    // Draw projectile
    projectile.fillStyle(0xff0000, 1);
    projectile.fillCircle(0, 0, 5);
    
    // Calculate direction vector
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize
    const ndx = dx / distance;
    const ndy = dy / distance;
    
    // Create position for projectile to move to (relative to unit)
    const targetLocalX = ndx * 50;
    const targetLocalY = ndy * 50 - 20; // -20 to account for projectile's y offset
    
    // Animate projectile
    this.scene.tweens.add({
      targets: projectile,
      x: targetLocalX,
      y: targetLocalY,
      duration: 200,
      onComplete: () => {
        // Create impact effect at end position
        const impact = this.scene.add.graphics();
        impact.x = targetX - this.x;
        impact.y = targetY - this.y - 30;
        this.add(impact);
        
        // Draw impact
        impact.fillStyle(0xff0000, 0.7);
        impact.fillCircle(0, 0, 10);
        
        // Fade out and destroy
        this.scene.tweens.add({
          targets: [projectile, impact],
          alpha: 0,
          duration: 200,
          onComplete: () => {
            projectile.destroy();
            impact.destroy();
          }
        });
      }
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
    
    // Show resource gathering graphic
    const gatherIcon = this.scene.add.image(0, -40, 'gather-indicator');
    gatherIcon.setScale(0.6);
    gatherIcon.setTint(0xffff00);
    this.add(gatherIcon);
    
    // Fade and scale up then remove the indicator
    this.scene.tweens.add({
      targets: gatherIcon,
      alpha: 0,
      scale: 1,
      y: -60,
      duration: 800,
      onComplete: () => {
        gatherIcon.destroy();
      }
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
