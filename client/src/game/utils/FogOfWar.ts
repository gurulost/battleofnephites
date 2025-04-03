import Phaser from 'phaser';
import Unit from '../entities/Unit';
import Building from '../entities/Building';
import { GridUtils } from './GridUtils';

/**
 * Enhanced Fog of War implementation using render textures
 * for smoother visuals and better performance
 */
export class FogOfWar {
  private scene: Phaser.Scene = null!;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private tileWidth: number = 0;
  private tileHeight: number = 0;
  
  // Main fog of war render texture
  private fogTexture: Phaser.GameObjects.RenderTexture = null!;
  
  // Reusable "brushes" for drawing the fog
  private unexploredBrush: Phaser.GameObjects.Graphics = null!;
  private exploredBrush: Phaser.GameObjects.Graphics = null!;
  private visibleBrush: Phaser.GameObjects.Graphics = null!;
  
  // Tracking visibility
  private visibilityMap: boolean[][] = []; // Tracks if a tile has been revealed
  private currentVisibility: boolean[][] = []; // Tracks currently visible tiles
  
  // Sight ranges for different unit and building types
  private sightRanges = {
    // Units
    'worker': 2,
    'melee': 2,
    'ranged': 3,
    // Buildings
    'city': 3,
    'barracks': 2
  };
  
  // Line of sight blockers - tiles that block visibility
  private blockerTileTypes = ['hill'];
  
  /**
   * Create a new fog of war manager with improved rendering
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
    
    // Initialize visibility maps
    this.initializeVisibilityMaps();
    
    // Create the main fog texture that covers the entire screen
    this.fogTexture = scene.add.renderTexture(
      0, 0, 
      scene.cameras.main.width, 
      scene.cameras.main.height
    );
    
    // Set high depth to ensure it's drawn on top of all game elements
    this.fogTexture.setDepth(5000);
    
    // Create reusable brush graphics for fog drawing
    this.createBrushes();
    
    // Initial fog rendering
    this.drawFog();
  }
  
  /**
   * Create brush graphics used for fog drawing
   */
  private createBrushes() {
    // Create brush for completely unexplored areas (dark fog)
    this.unexploredBrush = this.scene.add.graphics().fillStyle(0x000000, 0.8);
    this.unexploredBrush.fillRect(-this.tileWidth, -this.tileHeight, this.tileWidth * 2, this.tileHeight * 2);
    
    // Create brush for explored but not visible areas (semi-transparent fog)
    this.exploredBrush = this.scene.add.graphics().fillStyle(0x000000, 0.4);
    this.exploredBrush.fillRect(-this.tileWidth, -this.tileHeight, this.tileWidth * 2, this.tileHeight * 2);
    
    // Create brush for visible areas (clear/erase)
    const visibleBrushSize = Math.max(this.tileWidth, this.tileHeight) * 1.2; // Slightly larger
    this.visibleBrush = this.scene.add.graphics().fillStyle(0xffffff, 1);
    this.visibleBrush.fillCircle(0, 0, visibleBrushSize);
    
    // Set them all as invisible in the scene - we only use them as brushes for the render texture
    this.unexploredBrush.setVisible(false);
    this.exploredBrush.setVisible(false);
    this.visibleBrush.setVisible(false);
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
    
    // Resize the render texture to match the screen
    this.fogTexture.resize(
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    );
  }
  
  /**
   * Update the fog of war based on current unit positions
   */
  public update(playerUnits: Unit[], centerX: number, centerY: number, playerBuildings: Building[] = []) {
    // Reset current visibility
    this.currentVisibility = Array(this.mapHeight)
      .fill(null)
      .map(() => Array(this.mapWidth).fill(false));
    
    // Update visibility based on unit positions
    playerUnits.forEach(unit => {
      this.updateVisibilityForUnit(unit);
    });
    
    // Update visibility based on building positions
    playerBuildings.forEach(building => {
      this.updateVisibilityForBuilding(building);
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
   * Update the visibility map based on a single unit's position using Field of View
   */
  private updateVisibilityForUnit(unit: Unit) {
    const x = unit.gridX;
    const y = unit.gridY;
    const sightRange = this.sightRanges[unit.type] || 2;
    
    // Mark the unit's position as visible
    this.currentVisibility[y][x] = true;
    
    // Calculate field of view in all directions
    this.calculateFieldOfView(x, y, sightRange);
  }
  
  /**
   * Update the visibility map based on a building's position
   */
  private updateVisibilityForBuilding(building: Building) {
    const x = building.gridX;
    const y = building.gridY;
    const sightRange = this.sightRanges[building.type] || 2;
    
    // Mark the building's position as visible
    this.currentVisibility[y][x] = true;
    
    // Calculate field of view in all directions
    this.calculateFieldOfView(x, y, sightRange);
  }
  
  /**
   * Calculate field of view from a source point
   * Uses a recursive shadowcasting-inspired approach adapted for a grid
   */
  private calculateFieldOfView(sourceX: number, sourceY: number, range: number) {
    // Mark the source position as visible
    this.currentVisibility[sourceY][sourceX] = true;
    
    // Use an optimized approach that only checks tiles within range
    // and uses early termination for line-of-sight tests
    for (let y = Math.max(0, sourceY - range); y <= Math.min(this.mapHeight - 1, sourceY + range); y++) {
      for (let x = Math.max(0, sourceX - range); x <= Math.min(this.mapWidth - 1, sourceX + range); x++) {
        // Skip the source tile
        if (x === sourceX && y === sourceY) continue;
        
        // Use Euclidean distance for more natural circular vision
        const dx = x - sourceX;
        const dy = y - sourceY;
        const distanceSquared = dx * dx + dy * dy;
        
        // Only check tiles within range using squared distance for efficiency
        // (avoids costly square root calculations)
        if (distanceSquared <= range * range) {
          // Check line of sight using optimized Bresenham's algorithm
          if (this.hasLineOfSight(sourceX, sourceY, x, y)) {
            this.currentVisibility[y][x] = true;
          }
        }
      }
    }
  }
  
  /**
   * Check if there's a clear line of sight between two points
   * Uses Bresenham's line algorithm to check for blocking tiles
   */
  private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    // Improved Bresenham's line algorithm with better handling of edge cases
    
    // Early return for adjacent tiles (always visible)
    if (Math.abs(x1 - x0) <= 1 && Math.abs(y1 - y0) <= 1) {
      return true;
    }
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    // Track the last tile we checked to avoid redundant checks
    let lastX = x0;
    let lastY = y0;
    
    while (x !== x1 || y !== y1) {
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
      
      // Skip the source and destination
      if ((x !== x0 || y !== y0) && (x !== x1 || y !== y1)) {
        // Only check each tile once (in case of diagonals)
        if (x !== lastX || y !== lastY) {
          // Check if this is a blocking tile (e.g., a hill)
          const tile = this.getTileAt(x, y);
          if (tile && this.isTileBlockingLineOfSight(tile)) {
            return false; // Line of sight is blocked
          }
          
          lastX = x;
          lastY = y;
        }
      }
    }
    
    return true; // Line of sight is clear
  }
  
  /**
   * Get the tile at the specified grid position
   */
  private getTileAt(x: number, y: number): any {
    // Access the tile data from the scene
    // This is a simplified placeholder - in the real implementation,
    // you'd need to access the actual tile data from the Main scene
    // You could pass a callback function to the constructor or a reference to the tiles array
    
    // For demonstration, we'll check if we have access to tiles array in the scene
    const mainScene = this.scene as any;
    if (mainScene.tiles && mainScene.tiles[y] && mainScene.tiles[y][x]) {
      return mainScene.tiles[y][x];
    }
    
    return null;
  }
  
  /**
   * Check if a tile blocks line of sight (e.g., hills)
   */
  private isTileBlockingLineOfSight(tile: any): boolean {
    // Get the tile type
    const tileType = tile.getData ? tile.getData('tileType') : null;
    
    // Check if this tile type blocks line of sight
    return this.blockerTileTypes.includes(tileType);
  }
  
  /**
   * Draw the fog of war using render texture for improved performance and visuals
   */
  private drawFog(centerX: number = 0, centerY: number = 0) {
    // Clear the fog texture
    this.fogTexture.clear();
    
    // Fill it with the unexplored (darkest) fog color
    this.fogTexture.fill(0x000000, 0.8);
    
    // Calculate offsets for proper tile positioning
    const mapWidthPx = this.mapWidth * (this.tileWidth / 2);
    const mapHeightPx = this.mapHeight * (this.tileHeight / 2);
    
    // Step 1: Draw the explored areas (semi-transparent fog)
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.visibilityMap[y][x] && !this.currentVisibility[y][x]) {
          // Calculate the screen position for this tile
          const { screenX, screenY } = GridUtils.cartesianToIsometric(
            x, y, this.tileWidth, this.tileHeight
          );
          
          // Get actual pixel coordinates relative to screen
          const pixelX = centerX + screenX - mapWidthPx / 2;
          const pixelY = centerY + screenY - mapHeightPx / 2;
          
          // Draw the explored but not visible brush (semi-transparent)
          this.fogTexture.draw(this.exploredBrush, pixelX, pixelY);
        }
      }
    }
    
    // Step 2: Draw visible areas (erase/clear fog)
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.currentVisibility[y][x]) {
          // Calculate the screen position for this tile
          const { screenX, screenY } = GridUtils.cartesianToIsometric(
            x, y, this.tileWidth, this.tileHeight
          );
          
          // Get actual pixel coordinates relative to screen
          const pixelX = centerX + screenX - mapWidthPx / 2;
          const pixelY = centerY + screenY - mapHeightPx / 2;
          
          // Erase the fog at visible areas
          this.fogTexture.erase(this.visibleBrush, pixelX, pixelY);
        }
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
    // Clear the fog entirely
    this.fogTexture.clear();
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