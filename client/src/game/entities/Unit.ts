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
  canActOnFirstTurn?: boolean;
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
  private sprite!: Phaser.GameObjects.Sprite; // Changed from Image to Sprite to support animations
  private healthBar!: Phaser.GameObjects.Graphics;
  private selectionIndicator!: Phaser.GameObjects.Graphics;
  private animLayer!: Phaser.GameObjects.Container; // For animation effects
  
  // Animation states
  private isMoving: boolean = false;
  private currentPath: {x: number, y: number}[] = [];
  private moveTween?: Phaser.Tweens.Tween;
  private currentAnimation: string = 'idle';
  
  // Whether this unit can act on the turn it was created
  public canActOnFirstTurn: boolean = true;
  
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
    
    // Set whether unit can act on first turn (defaults to true if not specified)
    if (config.canActOnFirstTurn !== undefined) {
      this.canActOnFirstTurn = config.canActOnFirstTurn;
    }
    
    // Store grid position
    this.gridX = x;
    this.gridY = y;
    
    // Set available actions for the turn
    this.movesLeft = this.speed;
    this.actionsLeft = 1;
    
    // Create sprite based on unit type and faction
    // Determine the faction based on player ID
    let faction = 'nephites'; // Default faction
    
    // Find the player's faction from the players array
    const playerEntity = (scene as any).players?.find((p: any) => p.id === this.playerId);
    if (playerEntity && playerEntity.faction) {
      faction = playerEntity.faction;
    }
    
    // Use faction-specific unit sprites with animation support
    const sprite = scene.add.sprite(0, 0, `${faction}-${type}`);
    this.sprite = sprite;
    
    // Set origin to bottom-center for isometric positioning
    this.sprite.setOrigin(0.5, 1);
    
    // Create animation container to hold effects
    this.animLayer = scene.add.container(0, -20);
    
    // Create health bar
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();
    
    // Create selection indicator (initially invisible)
    this.selectionIndicator = scene.add.graphics();
    this.selectionIndicator.setVisible(false);
    
    // Add all visual components to the container
    this.add([this.selectionIndicator, this.sprite, this.healthBar, this.animLayer]);
    
    // Set up idle animation if it exists
    if (scene.anims.exists(`${faction}-${type}-idle`)) {
      this.sprite.play(`${faction}-${type}-idle`);
      this.currentAnimation = 'idle';
    }
    
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
    
    // Set state to moving which triggers animation
    this.setUnitState('moving');
    
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
      this.setUnitState('idle');
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
    // Set attacking state
    this.setUnitState('attacking');
    
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
    
    // Show attack icon with pulse effect
    const attackIcon = this.scene.add.image(0, -40, 'attack-indicator');
    attackIcon.setScale(0.6);
    attackIcon.setTint(0xff0000);
    this.add(attackIcon);
    
    // Pulse the attack icon for better visibility
    this.scene.tweens.add({
      targets: attackIcon,
      scale: 0.8,
      duration: 150,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // After pulsing, fade and move upward
        this.scene.tweens.add({
          targets: attackIcon,
          alpha: 0,
          scale: 1,
          y: -60,
          duration: 600,
          onComplete: () => {
            attackIcon.destroy();
          }
        });
      }
    });
    
    // Pre-attack anticipation (slight pullback)
    this.scene.tweens.add({
      targets: this,
      x: startX - moveX * 0.3,
      y: startY - moveY * 0.3,
      duration: 100,
      onComplete: () => {
        // Flash the unit sprite to indicate attack
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.7,
          duration: 50,
          yoyo: true,
          repeat: 1
        });
        
        // Forward lunge attack
        this.scene.tweens.add({
          targets: this,
          x: startX + moveX * 1.2,
          y: startY + moveY * 1.2,
          duration: 150,
          ease: 'Power1',
          onComplete: () => {
            // After attacking, add effect at target position
            if (this.type !== 'ranged') {
              // For melee units, add slash effect
              this.createMeleeImpactEffect(targetScreenX, targetScreenY);
            } else {
              // For ranged units, add projectile effect
              this.createRangedAttackEffect(startX, startY, targetScreenX, targetScreenY);
            }
            
            // Return to original position
            this.scene.tweens.add({
              targets: this,
              x: startX,
              y: startY,
              duration: 250,
              ease: 'Power1',
              onComplete: () => {
                // Return to idle state after attack animation completes
                this.setUnitState('idle');
              }
            });
          }
        });
      }
    });
  }
  
  createMeleeImpactEffect(targetX: number, targetY: number) {
    // Create container for slash effects at target position
    const effectContainer = this.scene.add.container(targetX, targetY - 30);
    
    // Create primary slash effect
    const slash = this.scene.add.graphics();
    
    // Draw primary slash (X shape)
    slash.lineStyle(4, 0xff3333, 1);
    slash.beginPath();
    slash.moveTo(-15, -15);
    slash.lineTo(15, 15);
    slash.moveTo(15, -15);
    slash.lineTo(-15, 15);
    slash.closePath();
    slash.strokePath();
    
    // Create secondary slash for more impact
    const secondarySlash = this.scene.add.graphics();
    secondarySlash.lineStyle(3, 0xffff00, 0.8);
    
    // Draw diagonal lines
    secondarySlash.beginPath();
    secondarySlash.moveTo(-10, 0);
    secondarySlash.lineTo(10, 0);
    secondarySlash.moveTo(0, -10);
    secondarySlash.lineTo(0, 10);
    secondarySlash.closePath();
    secondarySlash.strokePath();
    
    // Add both effects to container
    effectContainer.add([slash, secondarySlash]);
    
    // Add small particles around the impact
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: targetX,
      y: targetY - 20,
      speed: { min: 15, max: 30 },
      scale: { start: 0.4, end: 0 },
      quantity: 5,
      lifespan: 300,
      tint: 0xff3333
    });
    
    // Scale slash for impact effect
    this.scene.tweens.add({
      targets: slash,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        // Rotate and fade out the secondary slash
        this.scene.tweens.add({
          targets: secondarySlash,
          rotation: 0.3,
          alpha: 0,
          duration: 200,
        });
        
        // Fade out the primary slash
        this.scene.tweens.add({
          targets: slash,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            effectContainer.destroy();
          }
        });
      }
    });
    
    // Cleanup particles after they finish
    this.scene.time.delayedCall(400, () => {
      particles.destroy();
    });
  }
  
  createRangedAttackEffect(startX: number, startY: number, targetX: number, targetY: number) {
    // Create projectile with container to handle multiple visual elements
    const projectileContainer = this.scene.add.container(0, -20);
    this.add(projectileContainer);
    
    // Create main projectile graphic
    const projectile = this.scene.add.graphics();
    projectile.fillStyle(0xff3333, 1);
    projectile.fillCircle(0, 0, 6);
    
    // Add a glow/trail effect
    const glow = this.scene.add.graphics();
    glow.fillStyle(0xff9933, 0.6);
    glow.fillCircle(0, 0, 9);
    
    // Add both to the container
    projectileContainer.add([glow, projectile]);
    
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
    
    // Create trail particles that follow the projectile
    const particles = this.scene.add.particles(startX, startY - 20, 'particle', {
      follow: projectileContainer,
      followOffset: { x: -2 * ndx, y: -2 * ndy },
      scale: { start: 0.3, end: 0 },
      speed: 10,
      lifespan: 200,
      quantity: 2,
      frequency: 30,
      tint: 0xff7700
    });
    
    // Pulse the glow effect
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: -1
    });
    
    // Animate projectile movement
    this.scene.tweens.add({
      targets: projectileContainer,
      x: targetLocalX,
      y: targetLocalY,
      duration: 300,
      ease: 'Power1',
      onComplete: () => {
        // Stop the particles
        particles.destroy();
        
        // Create impact effect at end position
        const impactContainer = this.scene.add.container(targetX, targetY - 30);
        
        // Create main impact graphic
        const impact = this.scene.add.graphics();
        impact.fillStyle(0xff3333, 0.8);
        impact.fillCircle(0, 0, 12);
        
        // Create impact ring
        const ring = this.scene.add.graphics();
        ring.lineStyle(2, 0xff9933, 0.7);
        ring.strokeCircle(0, 0, 15);
        
        // Add both to container
        impactContainer.add([impact, ring]);
        
        // Add impact particles
        const impactParticles = this.scene.add.particles(targetX, targetY - 20, 'particle', {
          speed: { min: 20, max: 40 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.4, end: 0 },
          lifespan: 300,
          quantity: 8,
          tint: 0xff3333
        });
        
        // Expand and fade impact
        this.scene.tweens.add({
          targets: impact,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 300
        });
        
        // Expand ring
        this.scene.tweens.add({
          targets: ring,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            impactContainer.destroy();
            projectileContainer.destroy();
          }
        });
        
        // Cleanup impact particles
        this.scene.time.delayedCall(400, () => {
          impactParticles.destroy();
        });
      }
    });
  }
  
  playGatherAnimation() {
    // Set gathering state
    this.setUnitState('gathering');
    
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
        // Return to idle state after gathering animation completes
        this.setUnitState('idle');
      }
    });
  }
  
  resetForNewTurn() {
    this.movesLeft = this.speed;
    this.actionsLeft = 1;
  }
  
  /**
   * Initialize unit actions for the first turn
   * Can be used to disable actions for newly created units
   */
  initializeFirstTurnActions() {
    if (!this.canActOnFirstTurn) {
      this.movesLeft = 0;
      this.actionsLeft = 0;
    }
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
      actionsLeft: this.actionsLeft,
      canActOnFirstTurn: this.canActOnFirstTurn
    };
  }
  
  /**
   * Play the appropriate animation based on state
   * @param animName The name of the animation to play
   */
  playAnimation(animName: string) {
    // Only change animation if it's different from current
    if (this.currentAnimation === animName) return;
    
    const faction = this.getFaction();
    const animKey = `${faction}-${this.type}-${animName}`;
    
    // Check if animation exists before playing
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey);
      this.currentAnimation = animName;
    }
  }
  
  /**
   * Get the faction of this unit
   */
  getFaction(): string {
    // Find the player's faction from the players array
    const playerEntity = (this.scene as any).players?.find((p: any) => p.id === this.playerId);
    if (playerEntity && playerEntity.faction) {
      return playerEntity.faction;
    }
    return 'nephites'; // Default faction
  }
  
  /**
   * Set unit state and trigger appropriate animations
   */
  setUnitState(newState: string) {
    const oldState = this.state;
    this.state = newState;
    
    // Trigger animation changes based on state
    switch (newState) {
      case 'moving':
        this.playAnimation('move');
        break;
      case 'attacking':
        this.playAnimation('attack');
        break;
      case 'gathering':
        this.playAnimation('gather');
        break;
      case 'idle':
      default:
        this.playAnimation('idle');
        break;
    }
  }
  
  update(time: number, delta: number) {
    // Handle animations or effects over time
    
    // Update depth sorting based on y position
    this.setDepth(1000 + this.gridY);
    
    // If we've finished moving or attacking but animation is still playing
    if (!this.isMoving && this.state !== 'moving' && this.currentAnimation === 'move') {
      this.playAnimation('idle');
    }
  }
}

export { Unit };
