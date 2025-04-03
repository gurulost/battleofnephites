import Phaser from 'phaser';
import Unit from '../entities/Unit';
import Building from '../entities/Building';
import { GridUtils } from './GridUtils';

/**
 * Enhanced Fog of War implementation using render textures
 * for smoother visuals and better performance.
 * 
 * Features:
 * - True line-of-sight visibility using recursive shadowcasting algorithm
 * - Smooth transitions between visibility states with circular brushes
 * - Proper occlusion for terrain like hills
 * - Memory-efficient storage of visibility state
 * - Optimized rendering with Phaser RenderTexture
 */
export class FogOfWar {
  private scene: Phaser.Scene = null!;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private tileWidth: number = 0;
  private tileHeight: number = 0;
  private tileColumnOffset: number = 0; // Half width for isometric offset
  private tileRowOffset: number = 0;    // Half height for isometric offset
  
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
    
    // Set isometric offsets - these should match the values used in MainScene
    this.tileColumnOffset = tileWidth / 2; // Half width for isometric offset
    this.tileRowOffset = tileHeight / 2;   // Half height for isometric offset
    
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
    // Using a slightly larger radius for the unexplored brush to ensure full coverage
    const unexploredBrushSize = Math.max(this.tileWidth, this.tileHeight) * 1.5;
    this.unexploredBrush = this.scene.add.graphics().fillStyle(0x000000, 0.8);
    this.unexploredBrush.fillCircle(0, 0, unexploredBrushSize);
    
    // Create brush for explored but not visible areas (semi-transparent fog)
    // Using a circular brush with smooth edges for better visual transitions
    const exploredBrushSize = Math.max(this.tileWidth, this.tileHeight) * 1.2;
    this.exploredBrush = this.scene.add.graphics().fillStyle(0x000000, 0.4);
    this.exploredBrush.fillCircle(0, 0, exploredBrushSize);
    
    // Create brush for visible areas (clear/erase)
    // Using a slightly larger radius for smooth transitions between visible and explored areas
    const visibleBrushSize = Math.max(this.tileWidth, this.tileHeight) * 1.3;
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
   * Calculate field of view from a source point using recursive shadowcasting
   * This provides a more accurate field of view with proper line of sight blocking
   */
  private calculateFieldOfView(sourceX: number, sourceY: number, range: number) {
    // Mark the source position as visible
    this.currentVisibility[sourceY][sourceX] = true;
    
    // Calculate field of view in all 8 octants
    for (let octant = 0; octant < 8; octant++) {
      this.castLight(sourceX, sourceY, range, 1, 1.0, 0.0, octant);
    }
  }
  
  /**
   * Recursive shadowcasting algorithm adapted for isometric grids
   * @param sourceX Source X position
   * @param sourceY Source Y position
   * @param range Maximum view range
   * @param row Current row being processed
   * @param startSlope Start slope of the visibility cone
   * @param endSlope End slope of the visibility cone
   * @param octant Current octant (0-7)
   */
  private castLight(
    sourceX: number, 
    sourceY: number, 
    range: number, 
    row: number, 
    startSlope: number, 
    endSlope: number, 
    octant: number
  ) {
    // If start slope >= end slope, we're done with this recursive call
    if (startSlope >= endSlope) {
      return;
    }
    
    // Convert from octant to actual delta x, y for the current octant
    const [dx, dy] = this.getOctantTransform(octant);
    
    // Calculate actual distance for range checks (using squared distance)
    const rangeSquared = range * range;
    
    // Determine the ending column (exclusive) based on the slopes
    const endCol = Math.ceil(endSlope * row);
    
    // Start col is usually the floor of startSlope * row, but can be limited by range
    let startCol = Math.floor(startSlope * row);
    
    // We'll skip any columns that would be out of the map
    let colsStarted = false;
    
    // Process the entire row
    for (let col = startCol; col <= endCol; col++) {
      // Calculate actual grid coordinates based on octant
      const gridX = sourceX + dx * col + dy * row;
      const gridY = sourceY + dy * col + dx * row;
      
      // Skip if out of bounds
      if (
        gridX < 0 || 
        gridX >= this.mapWidth || 
        gridY < 0 || 
        gridY >= this.mapHeight
      ) {
        continue;
      }
      
      // Calculate squared distance to ensure we're within range
      const distSquared = (gridX - sourceX) * (gridX - sourceX) + 
                          (gridY - sourceY) * (gridY - sourceY);
      
      if (distSquared > rangeSquared) {
        continue;
      }
      
      // Mark as visible if within range
      if (distSquared <= rangeSquared) {
        this.currentVisibility[gridY][gridX] = true;
        colsStarted = true;
      }
      
      // Get current tile to check if it blocks vision
      const tile = this.getTileAt(gridX, gridY);
      const isBlocking = tile && this.isTileBlockingLineOfSight(tile);
      
      // Handle walls/blockers and calculate new slopes
      if (isBlocking) {
        // If we hit a wall and we were scanning...
        if (colsStarted) {
          // Recursively scan the next row with the reduced visible area
          const newStartSlope = startSlope;
          const newEndSlope = (col - 0.5) / row;
          this.castLight(sourceX, sourceY, range, row + 1, newStartSlope, newEndSlope, octant);
        }
        
        // This column is a wall, update startSlope for later columns
        startSlope = (col + 0.5) / row;
        
        // If the start slope is now greater than or equal to endSlope, we're done
        if (startSlope >= endSlope) {
          return;
        }
      }
    }
    
    // If we didn't hit any walls, continue with the next row using the same slopes
    if (colsStarted) {
      this.castLight(sourceX, sourceY, range, row + 1, startSlope, endSlope, octant);
    }
  }
  
  /**
   * Get the delta x and y for a given octant
   * This transforms coordinates based on which octant we're processing
   */
  private getOctantTransform(octant: number): [number, number] {
    switch (octant) {
      case 0: return [1, 0];   // E
      case 1: return [0, 1];   // S
      case 2: return [0, -1];  // N
      case 3: return [-1, 0];  // W
      case 4: return [1, -1];  // NE
      case 5: return [-1, -1]; // NW
      case 6: return [-1, 1];  // SW
      case 7: return [1, 1];   // SE
      default: return [0, 0];  // Should never happen
    }
  }
  
  /**
   * Get the tile at the specified grid position
   */
  private getTileAt(x: number, y: number): any {
    // Boundary check
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
      return null;
    }
    
    // Try multiple methods to access tiles from the scene
    const mainScene = this.scene as any;
    
    // Method 1: Direct tiles array (most common implementation)
    if (mainScene.tiles && mainScene.tiles[y] && mainScene.tiles[y][x]) {
      return mainScene.tiles[y][x];
    }
    
    // Method 2: Map object with tiles property
    if (mainScene.map && mainScene.map.tiles && mainScene.map.tiles[y] && mainScene.map.tiles[y][x]) {
      return mainScene.map.tiles[y][x];
    }
    
    // Method 3: getTileAt method (if the scene provides this API)
    if (mainScene.getTileAt && typeof mainScene.getTileAt === 'function') {
      try {
        return mainScene.getTileAt(x, y);
      } catch (e) {
        // Silently fail and try other methods
      }
    }
    
    // Method 4: mapData with direct access
    if (mainScene.mapData && mainScene.mapData[y] && mainScene.mapData[y][x]) {
      return mainScene.mapData[y][x];
    }
    
    // If we can't find the tile data through any method, return null
    return null;
  }
  
  /**
   * Check if a tile blocks line of sight (e.g., hills)
   */
  private isTileBlockingLineOfSight(tile: any): boolean {
    // Return false if tile is null or undefined
    if (!tile) return false;
    
    // Try multiple methods to get the tile type, depending on how tiles are implemented
    let tileType: string | null = null;
    
    // Method 1: getData API (Phaser game object with data manager)
    if (tile.getData && typeof tile.getData === 'function') {
      tileType = tile.getData('tileType');
    } 
    // Method 2: Direct property access
    else if (tile.tileType) {
      tileType = tile.tileType;
    }
    // Method 3: type property (from our Tile interface)
    else if (tile.type) {
      tileType = tile.type;
    }
    
    // For debugging (can be removed in production)
    if (tileType && this.blockerTileTypes.includes(tileType)) {
      // console.log(`Found blocking tile of type ${tileType} at grid position`);
    }
    
    // Check if this tile type blocks line of sight
    return tileType !== null && this.blockerTileTypes.includes(tileType);
  }
  
  /**
   * Draw the fog of war using render texture for improved performance and visuals
   * @param centerX The x-coordinate of the map center in screen space
   * @param centerY The y-coordinate of the map center in screen space
   */
  private drawFog(centerX: number = 0, centerY: number = 0) {
    // Validate center coordinates to make sure they're provided
    if (!centerX || !centerY) {
      centerX = this.scene.cameras.main.width / 2;
      centerY = this.scene.cameras.main.height / 3; // Common isometric positioning
      console.log('Using default map center for fog of war:', centerX, centerY);
    }
    
    // Clear the fog texture completely first
    this.fogTexture.clear();
    
    // Fill it with the unexplored (darkest) fog color
    this.fogTexture.fill(0x000000, 0.8);
    
    // Calculate proper isometric tile offsets for the map
    // These need to match the exact offsets used for entity placement in the main scene
    const mapWidthPx = this.mapWidth * this.tileColumnOffset; // Half-width for diamond tiles
    const mapHeightPx = this.mapHeight * this.tileRowOffset; // Half-height for diamond tiles
    
    // Position fog exactly as the map is positioned
    this.fogTexture.setPosition(0, 0);
    
    // Step 1: Draw the explored areas (semi-transparent fog)
    // To improve performance, we only need to process tiles that have been revealed
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        // Only draw explored tiles that aren't currently visible
        if (this.visibilityMap[y][x] && !this.currentVisibility[y][x]) {
          // Calculate the isometric screen position for this tile
          const { screenX, screenY } = GridUtils.cartesianToIsometric(
            x, y, this.tileWidth, this.tileHeight
          );
          
          // Adjust for map center and calculate actual pixel position on screen
          const pixelX = centerX + screenX - mapWidthPx / 2;
          const pixelY = centerY + screenY - mapHeightPx / 2;
          
          // Draw the semi-transparent explored area brush
          this.fogTexture.draw(this.exploredBrush, pixelX, pixelY);
        }
      }
    }
    
    // Step 2: Draw visible areas (erase/clear fog using the visibleBrush)
    // This creates clear areas where the player can currently see
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        if (this.currentVisibility[y][x]) {
          // Calculate the isometric screen position for this tile
          const { screenX, screenY } = GridUtils.cartesianToIsometric(
            x, y, this.tileWidth, this.tileHeight
          );
          
          // Adjust for map center and calculate actual pixel position on screen
          const pixelX = centerX + screenX - mapWidthPx / 2;
          const pixelY = centerY + screenY - mapHeightPx / 2;
          
          // Erase the fog at visible areas for a clear view
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