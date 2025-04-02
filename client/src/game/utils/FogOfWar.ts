import Phaser from 'phaser';
import { Unit } from '../entities/Unit';

/**
 * Manages fog of war in the game world - controls visibility of unexplored areas
 */
export class FogOfWar {
  private scene: Phaser.Scene;
  private mapWidth: number;
  private mapHeight: number;
  private tileWidth: number;
  private tileHeight: number;
  private fogLayer: Phaser.GameObjects.Graphics;
  private visibilityMap: boolean[][] = []; // Tracks if a tile has been revealed
  private currentVisibility: boolean[][] = []; // Tracks currently visible tiles
  
  // Sight ranges for different unit types
  private sightRanges = {
    'worker': 2,
    'melee': 2,
    'ranged': 3
  };
  
  /**
   * Create a new fog of war manager
   */
  constructor(
    scene: Phaser.Scene, 
    mapWidth: number, 
    mapHeight: number, 
    tileWidth: number, 
    tileHeight: number
  ) {
    this.scene = scene;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    
    // Create the fog layer graphics object
    this.fogLayer = scene.add.graphics();
    
    // Initialize visibility maps
    this.initializeVisibilityMaps();
  }
  
  /**
   * Initialize visibility maps with default values
   */
  private initializeVisibilityMaps() {
    this.visibilityMap = Array(this.mapHeight)
      .fill(null)
      .map(() => Array(this.mapWidth).fill(false));
      
    this.currentVisibility = Array(this.mapHeight)
      .fill(null)
      .map(() => Array(this.mapWidth).fill(false));
  }
  
  /**
   * Reset the fog of war to completely hidden
   */
  public reset() {
    this.initializeVisibilityMaps();
    this.drawFog();
  }
  
  /**
   * Resize the fog of war system to match a new map size
   */
  public resize(mapWidth: number, mapHeight: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.initializeVisibilityMaps();
  }
  
  /**
   * Update the fog of war based on current unit positions
   */
  public update(playerUnits: Unit[], centerX: number, centerY: number) {
    // Reset current visibility
    this.currentVisibility = Array(this.mapHeight)
      .fill(null)
      .map(() => Array(this.mapWidth).fill(false));
    
    // Update visibility based on unit positions
    playerUnits.forEach(unit => {
      this.updateVisibilityForUnit(unit);
    });
    
    // Update the permanent visibility map
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.currentVisibility[y][x]) {
          this.visibilityMap[y][x] = true;
        }
      }
    }
    
    // Redraw the fog
    this.drawFog(centerX, centerY);
  }
  
  /**
   * Update the visibility map based on a single unit's position
   */
  private updateVisibilityForUnit(unit: Unit) {
    const x = unit.gridX;
    const y = unit.gridY;
    const sightRange = this.sightRanges[unit.type] || 2;
    
    // Update visibility in a square around the unit's position
    for (let dy = -sightRange; dy <= sightRange; dy++) {
      for (let dx = -sightRange; dx <= sightRange; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        // Check if tile is within map bounds
        if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
          // Simple line-of-sight check (Manhattan distance)
          const distance = Math.abs(dx) + Math.abs(dy);
          if (distance <= sightRange) {
            this.currentVisibility[ny][nx] = true;
          }
        }
      }
    }
  }
  
  /**
   * Draw the fog of war overlay
   */
  private drawFog(centerX: number = 0, centerY: number = 0) {
    // Clear previous fog
    this.fogLayer.clear();
    
    // Semi-transparent black for unexplored areas
    this.fogLayer.fillStyle(0x000000, 0.8);
    
    // Semi-transparent black for explored but not currently visible areas
    this.fogLayer.fillStyle(0x000000, 0.4);
    
    // Draw fog for each tile
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        // Skip currently visible tiles
        if (this.currentVisibility[y][x]) continue;
        
        // Use different transparency for explored vs unexplored tiles
        if (this.visibilityMap[y][x]) {
          this.fogLayer.fillStyle(0x000000, 0.4); // Explored but not visible
        } else {
          this.fogLayer.fillStyle(0x000000, 0.8); // Unexplored
        }
        
        // Calculate isometric position for this tile
        const tileX = centerX + ((x - y) * this.tileWidth / 2);
        const tileY = centerY + ((x + y) * this.tileHeight / 2);
        
        // Draw a polygon for the isometric tile
        this.fogLayer.beginPath();
        this.fogLayer.moveTo(tileX, tileY - this.tileHeight / 2);
        this.fogLayer.lineTo(tileX + this.tileWidth / 2, tileY);
        this.fogLayer.lineTo(tileX, tileY + this.tileHeight / 2);
        this.fogLayer.lineTo(tileX - this.tileWidth / 2, tileY);
        this.fogLayer.closePath();
        this.fogLayer.fillPath();
      }
    }
  }
  
  /**
   * Check if a specific tile is currently visible
   */
  public isTileVisible(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
      return false;
    }
    return this.currentVisibility[y][x];
  }
  
  /**
   * Check if a specific tile has been explored
   */
  public isTileExplored(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
      return false;
    }
    return this.visibilityMap[y][x];
  }
  
  /**
   * Reveal the entire map
   */
  public revealAll() {
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        this.visibilityMap[y][x] = true;
        this.currentVisibility[y][x] = true;
      }
    }
    this.fogLayer.clear();
  }
  
  /**
   * Reveal a specific area of the map
   */
  public revealArea(centerX: number, centerY: number, radius: number) {
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= radius) {
            this.visibilityMap[y][x] = true;
            this.currentVisibility[y][x] = true;
          }
        }
      }
    }
    this.drawFog();
  }
}