import Phaser from 'phaser';
import { EventBridge } from '../../lib/events/EventBridge';
import { GridUtils } from '../utils/GridUtils';
import { PathFinder } from '../utils/PathFinding';
import { FogOfWar } from '../utils/FogOfWar';
import Unit from '../entities/Unit';
import Building from '../entities/Building';
import { TileType, UnitType, BuildingType } from '../../types/game';
import { SoundService } from '../../lib/services/SoundService';

export default class MainScene extends Phaser.Scene {
  /**
   * Returns a formatted display name for a faction
   */
  getFactionDisplayName(faction: string): string {
    switch (faction) {
      case 'nephites':
        return 'Nephites';
      case 'lamanites':
        return 'Lamanites';
      case 'mulekites':
        return 'Mulekites';
      case 'anti-nephi-lehies':
        return 'Anti-Nephi-Lehies';
      case 'jaredites':
        return 'Jaredites';
      default:
        return 'Unknown Faction';
    }
  }
  // Map properties
  private mapWidth: number = 15;
  private mapHeight: number = 15;
  private tileWidth: number = 64;
  private tileHeight: number = 32;
  private tileColumnOffset: number = 32; // Half width for isometric offset
  private tileRowOffset: number = 16; // Half height for isometric offset
  
  // Game objects
  private tiles: Phaser.GameObjects.Image[][] = [];
  private units: Unit[] = [];
  private buildings: Building[] = [];
  private selectedEntity: Unit | Building | null = null;
  private pathFinder: PathFinder;
  private highlightedTiles: Phaser.GameObjects.Image[] = [];
  
  // Player data
  private players: any[] = [];
  private currentPlayerIndex: number = 0;
  private turn: number = 1;

  // Graphics
  private movementOverlay: Phaser.GameObjects.Graphics;
  private buildingPlacementOverlay!: Phaser.GameObjects.Graphics; // Using definite assignment assertion
  private selectedBuildingPlacementTile!: Phaser.GameObjects.Graphics; // Using definite assignment assertion
  private buildingPlacementTiles: Array<{tile: Phaser.GameObjects.Image, x: number, y: number}> = [];
  private selectedBuildingTile: {x: number, y: number} | null = null;
  private selectionIndicator: Phaser.GameObjects.Image;
  private fogOfWar!: FogOfWar; // Using definite assignment assertion
  private soundService: SoundService = SoundService.getInstance();
  
  constructor() {
    super('MainScene');
    
    // Initialize properties to avoid LSP errors
    this.pathFinder = new PathFinder(0, 0); // Will be properly initialized in create()
    this.movementOverlay = undefined as any; // Will be initialized in create()
    this.buildingPlacementOverlay = undefined as any; // Will be initialized when needed
    this.selectedBuildingPlacementTile = undefined as any; // Will be initialized when needed
    this.selectionIndicator = undefined as any; // Will be initialized when needed
  }
  
  preload() {
    // Load the tile assets
    this.load.svg('grass', 'src/assets/tiles/grass.svg');
    this.load.svg('forest', 'src/assets/tiles/forest.svg');
    this.load.svg('hill', 'src/assets/tiles/hill.svg');
    
    // Load the action indicators
    this.load.svg('attack-indicator', 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/target.svg');
    this.load.svg('gather-indicator', 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/tool.svg');
    
    // Load particle image for effects
    this.load.svg('particle', 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/circle.svg');
    
    // Load unit assets for all factions
    // Nephites
    this.load.svg('nephite-worker', 'assets/images/units/nephite-worker.svg');
    this.load.svg('nephite-melee', 'assets/images/units/nephite-melee.svg');
    this.load.svg('nephite-ranged', 'assets/images/units/nephite-ranged.svg');
    
    // Lamanites
    this.load.svg('lamanite-worker', 'assets/images/units/lamanite-worker.svg');
    this.load.svg('lamanite-melee', 'assets/images/units/lamanite-melee.svg');
    this.load.svg('lamanite-ranged', 'assets/images/units/lamanite-ranged.svg');
    
    // Mulekites
    this.load.svg('mulekites-worker', 'assets/images/units/mulekites-worker.svg');
    this.load.svg('mulekites-melee', 'assets/images/units/mulekites-melee.svg');
    this.load.svg('mulekites-ranged', 'assets/images/units/mulekites-ranged.svg');
    
    // Anti-Nephi-Lehies
    this.load.svg('anti-nephi-lehies-worker', 'assets/images/units/anti-nephi-lehies-worker.svg');
    this.load.svg('anti-nephi-lehies-melee', 'assets/images/units/anti-nephi-lehies-melee.svg');
    this.load.svg('anti-nephi-lehies-ranged', 'assets/images/units/anti-nephi-lehies-ranged.svg');
    
    // Jaredites
    this.load.svg('jaredites-worker', 'assets/images/units/jaredites-worker.svg');
    this.load.svg('jaredites-melee', 'assets/images/units/jaredites-melee.svg');
    this.load.svg('jaredites-ranged', 'assets/images/units/jaredites-ranged.svg');
    
    // Load building assets for all factions
    // Nephites
    this.load.svg('nephite-city', 'assets/images/buildings/nephite-city.svg');
    this.load.svg('nephite-barracks', 'assets/images/buildings/nephite-barracks.svg');
    
    // Lamanites
    this.load.svg('lamanite-city', 'assets/images/buildings/lamanite-city.svg');
    this.load.svg('lamanite-barracks', 'assets/images/buildings/lamanite-barracks.svg');
    
    // Mulekites
    this.load.svg('mulekites-city', 'assets/images/buildings/mulekites-city.svg');
    this.load.svg('mulekites-barracks', 'assets/images/buildings/mulekites-barracks.svg');
    
    // Anti-Nephi-Lehies
    this.load.svg('anti-nephi-lehies-city', 'assets/images/buildings/anti-nephi-lehies-city.svg');
    this.load.svg('anti-nephi-lehies-barracks', 'assets/images/buildings/anti-nephi-lehies-barracks.svg');
    
    // Jaredites
    this.load.svg('jaredites-city', 'assets/images/buildings/jaredites-city.svg');
    this.load.svg('jaredites-barracks', 'assets/images/buildings/jaredites-barracks.svg');
    
    // Load sound effects
    this.load.audio('attack', 'assets/sounds/attack.mp3');
    this.load.audio('build', 'assets/sounds/build.mp3');
    this.load.audio('gather', 'assets/sounds/gather.mp3');
    this.load.audio('move', 'assets/sounds/move.mp3');
    this.load.audio('select', 'assets/sounds/select.mp3');
    this.load.audio('unit-created', 'assets/sounds/unit-created.mp3');
    this.load.audio('unit-destroyed', 'assets/sounds/unit-destroyed.mp3');
    this.load.audio('building-destroyed', 'assets/sounds/building-destroyed.mp3');
    this.load.audio('error', 'assets/sounds/error.mp3');
    this.load.audio('victory', 'assets/sounds/victory.mp3');
    this.load.audio('defeat', 'assets/sounds/defeat.mp3');
  }

  create() {
    console.log('Main scene started');
    
    // Initialize path finder
    this.pathFinder = new PathFinder(this.mapWidth, this.mapHeight);
    
    // Create graphics for movement overlay
    this.movementOverlay = this.add.graphics();
    
    // Center the map in the game window
    const worldCenterX = this.cameras.main.width / 2;
    const worldCenterY = this.cameras.main.height / 3; // Place it slightly higher than center
    
    // Initialize players (Player 1 is human, Player 2 is AI)
    this.initializePlayers();
    
    // Create the isometric tilemap
    this.createMap(worldCenterX, worldCenterY);
    
    // Place initial units and buildings for both players
    this.placeInitialEntities();
    
    // Initialize fog of war
    this.initializeFogOfWar(worldCenterX, worldCenterY);
    
    // Set up input handlers
    this.setupInputHandlers();
    
    // Set up event handlers for communication with React
    this.setupEventHandlers();
    
    // Start playing theme music
    this.soundService.playMusic('theme');
    
    // Initial UI update
    this.updateUI();
  }
  
  /**
   * Initializes the fog of war system
   */
  initializeFogOfWar(centerX: number, centerY: number) {
    // Create the fog of war system
    this.fogOfWar = new FogOfWar(
      this,
      this.mapWidth,
      this.mapHeight,
      this.tileWidth,
      this.tileHeight
    );
    
    // Get the player's units and buildings
    const humanPlayer = this.players.find(p => p.id === 'player1');
    if (humanPlayer) {
      const playerUnits = this.units.filter(u => u.playerId === humanPlayer.id);
      const playerBuildings = this.buildings.filter(b => b.playerId === humanPlayer.id);
      
      // Update visibility based on player's units and buildings
      this.fogOfWar.update(playerUnits, centerX, centerY, playerBuildings);
    }
  }
  
  initializePlayers(customPlayers: any[] | null = null) {
    // If custom players are provided (from game setup), use those
    if (customPlayers && Array.isArray(customPlayers) && customPlayers.length > 0) {
      this.players = customPlayers;
      
      // Update map dimensions based on number of players
      if (customPlayers.length > 1) {
        // Adjust map size based on opponent count (customPlayers.length - 1)
        const opponentCount = customPlayers.length - 1;
        switch (opponentCount) {
          case 1:
            this.mapWidth = 15;
            this.mapHeight = 15;
            break;
          case 2:
            this.mapWidth = 20;
            this.mapHeight = 20;
            break;
          case 3:
            this.mapWidth = 25;
            this.mapHeight = 25;
            break;
          case 4:
            this.mapWidth = 30;
            this.mapHeight = 30;
            break;
          case 5:
            this.mapWidth = 35;
            this.mapHeight = 35;
            break;
          default:
            this.mapWidth = 15;
            this.mapHeight = 15;
        }
      }
      
      // Set current player to human (first player)
      this.currentPlayerIndex = 0;
      return;
    }
    
    // Get the selected faction from game setup store
    // Attempt to access game setup state from window object where it might be stored by React
    const gameSetupState = (window as any).gameSetupState;
    
    // Default values if game setup state isn't available
    const selectedFaction = gameSetupState?.selectedFaction || 'nephites';
    const numberOfOpponents = gameSetupState?.opponents || 1;
    
    // Available factions for AI opponents
    const availableFactions: any[] = ['nephites', 'lamanites', 'mulekites', 'anti-nephi-lehies', 'jaredites'];
    
    // Filter out player's faction from available AI factions
    const aiFactions = availableFactions.filter(faction => faction !== selectedFaction);
    
    // Human player with selected faction
    this.players.push({
      id: 'player1',
      faction: selectedFaction,
      resources: { food: 10, production: 10 },
      units: [],
      buildings: [],
      startingCityId: 'city1'
    });
    
    // Add AI opponents based on setup
    for (let i = 0; i < numberOfOpponents; i++) {
      // Select a faction for the AI, cycling through available factions if needed
      const aiFaction = aiFactions[i % aiFactions.length];
      
      this.players.push({
        id: `player${i + 2}`,
        faction: aiFaction,
        resources: { food: 10, production: 10 },
        units: [],
        buildings: [],
        startingCityId: `city${i + 2}`
      });
    }
    
    // Set current player to human
    this.currentPlayerIndex = 0;
  }
  
  /**
   * Create a map using the provided tile data
   */
  createMapFromData(mapData: any[][], centerX: number, centerY: number) {
    // Create the tiles array (empty) to be filled with images
    this.tiles = Array(this.mapHeight).fill(0).map(() => Array(this.mapWidth).fill(null));
    
    // Walkability properties for each tile type
    const walkability: Record<TileType, boolean> = {
      'grass': true,
      'forest': true,
      'hill': true
    };
    
    // Calculate the offset to center the map
    const mapWidthPx = this.mapWidth * this.tileColumnOffset;
    const mapHeightPx = this.mapHeight * this.tileRowOffset;
    
    // Create the tiles with isometric positioning
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileData = mapData[y][x];
        const tileType: TileType = tileData.type;
        
        // Calculate isometric position
        const { screenX, screenY } = GridUtils.cartesianToIsometric(
          x, y, this.tileWidth, this.tileHeight
        );
        
        // Create the tile sprite
        const tile = this.add.image(
          centerX + screenX - mapWidthPx / 2,
          centerY + screenY - mapHeightPx / 2,
          tileType
        );
        
        // Store the logical grid coordinates and tile type on the tile object for easy access
        tile.setData('gridX', x);
        tile.setData('gridY', y);
        tile.setData('tileType', tileType);
        tile.setData('walkable', tileData.walkable !== undefined ? tileData.walkable : walkability[tileType]);
        
        // Add resource depletion data
        // Each resource tile has a limited number of resources that can be gathered
        if (tileType === 'forest' || tileType === 'hill') {
          tile.setData('resourcesLeft', 5); // Each forest/hill has 5 production resources
        } else if (tileType === 'grass') {
          tile.setData('resourcesLeft', 8); // Each grass tile has 8 food resources
        }
        
        // Set origin to bottom center for isometric positioning
        tile.setOrigin(0.5, 1);
        
        // Add to our tiles array for later reference
        this.tiles[y][x] = tile;
        
        // Make tile interactive
        tile.setInteractive();
        
        // Update pathfinder with walkability data
        this.pathFinder.setWalkableAt(x, y, tile.getData('walkable'));
      }
    }
    
    // Sort all tiles by their y position to handle depth correctly
    this.children.depthSort();
  }
  
  /**
   * Create a randomly generated map
   */
  createMap(centerX: number, centerY: number) {
    // Generate a random map with different tile types
    const tileTypes: TileType[] = ['grass', 'forest', 'hill'];
    const walkability: Record<TileType, boolean> = {
      'grass': true,
      'forest': true,
      'hill': true
    };
    
    const mapData: { type: TileType, walkable: boolean }[][] = [];
    
    // Initialize mapData with random tile types
    for (let y = 0; y < this.mapHeight; y++) {
      mapData[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // Mostly grass (70%), some forest (20%), and a few hills (10%)
        const rand = Math.random();
        let tileType: TileType;
        
        if (rand < 0.7) tileType = 'grass';
        else if (rand < 0.9) tileType = 'forest';
        else tileType = 'hill';
        
        mapData[y][x] = {
          type: tileType,
          walkable: walkability[tileType]
        };
        
        // Update pathfinder with walkability data
        this.pathFinder.setWalkableAt(x, y, walkability[tileType]);
      }
    }
    
    // Ensure both starting cities are on grass tiles
    // Player 1 starting position (bottom left quadrant)
    const p1StartX = Math.floor(this.mapWidth * 0.25);
    const p1StartY = Math.floor(this.mapHeight * 0.75);
    mapData[p1StartY][p1StartX] = { type: 'grass', walkable: true };
    
    // Player 2 starting position (top right quadrant)
    const p2StartX = Math.floor(this.mapWidth * 0.75);
    const p2StartY = Math.floor(this.mapHeight * 0.25);
    mapData[p2StartY][p2StartX] = { type: 'grass', walkable: true };
    
    // Create the tiles array (empty) to be filled with images
    this.tiles = Array(this.mapHeight).fill(0).map(() => Array(this.mapWidth).fill(null));
    
    // Calculate the offset to center the map
    const mapWidthPx = this.mapWidth * this.tileColumnOffset;
    const mapHeightPx = this.mapHeight * this.tileRowOffset;
    
    // Create the tiles with isometric positioning
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = mapData[y][x].type;
        
        // Calculate isometric position
        const { screenX, screenY } = GridUtils.cartesianToIsometric(
          x, y, this.tileWidth, this.tileHeight
        );
        
        // Create the tile sprite
        const tile = this.add.image(
          centerX + screenX - mapWidthPx / 2,
          centerY + screenY - mapHeightPx / 2,
          tileType
        );
        
        // Store the logical grid coordinates and tile type on the tile object for easy access
        tile.setData('gridX', x);
        tile.setData('gridY', y);
        tile.setData('tileType', tileType);
        tile.setData('walkable', mapData[y][x].walkable);
        
        // Add resource depletion data
        // Each resource tile has a limited number of resources that can be gathered
        if (tileType === 'forest' || tileType === 'hill') {
          tile.setData('resourcesLeft', 5); // Each forest/hill has 5 production resources
        } else if (tileType === 'grass') {
          tile.setData('resourcesLeft', 8); // Each grass tile has 8 food resources
        }
        
        // Set origin to bottom center for isometric positioning
        tile.setOrigin(0.5, 1);
        
        // Add to our tiles array for later reference
        this.tiles[y][x] = tile;
        
        // Make tile interactive
        tile.setInteractive();
      }
    }
    
    // Sort all tiles by their y position to handle depth correctly
    this.children.depthSort();
  }
  
  /**
   * Place initial entities using custom starting positions from map data
   */
  placeInitialEntitiesFromData(startingPositions: any) {
    // Process each player's starting position
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      const playerKey = `player${i + 1}`;
      
      // Check if we have a valid starting position for this player
      if (startingPositions[playerKey]) {
        const startX = startingPositions[playerKey].x;
        const startY = startingPositions[playerKey].y;
        
        // Create player's starting city
        this.createBuilding('city', startX, startY, player.id, `city${i + 1}`);
        
        // Create player's starting worker near city
        // Try to find an empty adjacent tile
        const adjacentTiles = this.getAdjacentTiles(startX, startY);
        let workerPos = { x: startX + 1, y: startY }; // Default position
        
        for (const tile of adjacentTiles) {
          if (this.isValidTile(tile.x, tile.y) && !this.getEntityAtTile(tile.x, tile.y)) {
            workerPos = tile;
            break;
          }
        }
        
        this.createUnit('worker', workerPos.x, workerPos.y, player.id);
      }
    }
    
    // Update the walkability map based on building positions
    this.updatePathfinderWalkability();
  }
  
  /**
   * Place initial entities at default locations
   */
  placeInitialEntities() {
    // Player 1 starting entities (bottom left area)
    const p1StartX = Math.floor(this.mapWidth * 0.25);
    const p1StartY = Math.floor(this.mapHeight * 0.75);
    
    // Create player 1's starting city
    this.createBuilding('city', p1StartX, p1StartY, 'player1', 'city1');
    
    // Create player 1's starting worker
    this.createUnit('worker', p1StartX + 1, p1StartY, 'player1');
    
    // Player 2 starting entities (top right area)
    const p2StartX = Math.floor(this.mapWidth * 0.75);
    const p2StartY = Math.floor(this.mapHeight * 0.25);
    
    // Create player 2's starting city
    this.createBuilding('city', p2StartX, p2StartY, 'player2', 'city2');
    
    // Create player 2's starting worker
    this.createUnit('worker', p2StartX - 1, p2StartY, 'player2');
    
    // For additional players (if any)
    for (let i = 2; i < this.players.length; i++) {
      // Calculate evenly distributed positions around the map
      const angle = (i / this.players.length) * 2 * Math.PI;
      const distance = Math.min(this.mapWidth, this.mapHeight) * 0.4;
      
      const centerX = this.mapWidth / 2;
      const centerY = this.mapHeight / 2;
      
      let startX = Math.floor(centerX + Math.cos(angle) * distance);
      let startY = Math.floor(centerY + Math.sin(angle) * distance);
      
      // Ensure coordinates are within the map bounds
      startX = Math.max(1, Math.min(this.mapWidth - 2, startX));
      startY = Math.max(1, Math.min(this.mapHeight - 2, startY));
      
      // Create starting city and worker
      this.createBuilding('city', startX, startY, this.players[i].id, `city${i + 1}`);
      this.createUnit('worker', startX + 1, startY, this.players[i].id);
    }
    
    // Update the walkability map based on building positions
    this.updatePathfinderWalkability();
  }
  
  createUnit(type: UnitType, x: number, y: number, playerId: string, id?: string, canActOnFirstTurn: boolean = true) {
    // Create a unique ID if not provided
    const unitId = id || `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Get player reference
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;
    
    // Create the unit with appropriate stats based on type
    let health = 10;
    let attack = 1;
    let defense = 1;
    let speed = 2;
    
    switch(type) {
      case 'worker':
        health = 8;
        attack = 1;
        defense = 1;
        speed = 2;
        break;
      case 'melee':
        health = 15;
        attack = 4;
        defense = 2;
        speed = 2;
        break;
      case 'ranged':
        health = 10;
        attack = 3;
        defense = 1;
        speed = 2;
        break;
    }
    
    // Create the unit instance
    const unit = new Unit(
      this,
      x,
      y,
      type,
      {
        id: unitId,
        playerId,
        health,
        attack,
        defense,
        speed,
        state: 'idle',
        canActOnFirstTurn
      }
    );
    
    // Add to our units array and player's units
    this.units.push(unit);
    player.units.push({
      id: unitId,
      type,
      health,
      attack,
      defense,
      speed,
      x,
      y,
      playerId
    });
    
    return unit;
  }
  
  createBuilding(type: BuildingType, x: number, y: number, playerId: string, id?: string) {
    // Create a unique ID if not provided
    const buildingId = id || `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Get player reference
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;
    
    // Create the building with appropriate stats based on type
    let health = 20;
    let defense = 2;
    
    switch(type) {
      case 'city':
        health = 25;
        defense = 3;
        break;
      case 'barracks':
        health = 15;
        defense = 2;
        break;
    }
    
    // Create the building instance
    const building = new Building(
      this,
      x,
      y,
      type,
      {
        id: buildingId,
        playerId,
        health,
        defense,
        state: 'idle',
        productionQueue: []
      }
    );
    
    // Add to our buildings array and player's buildings
    this.buildings.push(building);
    player.buildings.push({
      id: buildingId,
      type,
      health,
      defense,
      x,
      y,
      playerId,
      productionQueue: []
    });
    
    // Mark this tile as not walkable
    this.pathFinder.setWalkableAt(x, y, false);
    
    return building;
  }
  
  /**
   * Resets the game state for a new game
   */
  resetGameState() {
    // Clear all entities
    this.units.forEach(unit => unit.destroy());
    this.buildings.forEach(building => building.destroy());
    
    // Reset arrays
    this.units = [];
    this.buildings = [];
    this.players = [];
    this.selectedEntity = null;
    this.highlightedTiles = [];
    
    // Reset turn counter
    this.turn = 1;
    this.currentPlayerIndex = 0;
    
    // Clear any existing tiles
    if (this.tiles.length > 0) {
      for (let y = 0; y < this.tiles.length; y++) {
        for (let x = 0; x < this.tiles[y].length; x++) {
          if (this.tiles[y][x]) {
            this.tiles[y][x].destroy();
          }
        }
      }
      this.tiles = [];
    }
    
    // Clear any overlays
    this.movementOverlay.clear();
  }
  
  setupInputHandlers() {
    // Handle tile and entity clicks
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: any) => {
      console.log("Object clicked:", gameObject.type, gameObject);
      
      // Check if the clicked object is a unit or building
      if (gameObject instanceof Unit || gameObject instanceof Building) {
        console.log("Clicked on entity:", gameObject.type, gameObject.id);
        
        // If we have a unit selected and click on an enemy, attack it
        if (this.selectedEntity instanceof Unit && 
            this.selectedEntity.playerId === this.getCurrentPlayer().id &&
            gameObject.playerId !== this.getCurrentPlayer().id &&
            this.isCurrentPlayerTurn() &&
            this.selectedEntity.actionsLeft > 0) {
          
          // Check if in attack range
          const dx = Math.abs(this.selectedEntity.gridX - gameObject.gridX);
          const dy = Math.abs(this.selectedEntity.gridY - gameObject.gridY);
          const distance = dx + dy;
          const attackRange = this.selectedEntity.type === 'ranged' ? 2 : 1;
          
          if (distance <= attackRange) {
            // Attack the enemy
            this.attackEntity(this.selectedEntity, gameObject);
            return;
          }
        }
        
        // Otherwise just select the entity (if it's yours)
        if (gameObject.playerId === this.getCurrentPlayer().id || !this.isCurrentPlayerTurn()) {
          this.selectEntity(gameObject);
        }
        return;
      }
      
      // Otherwise handle tile clicks
      if (pointer.rightButtonDown()) {
        // Right click - context action for selected entity
        if (this.selectedEntity && this.selectedEntity instanceof Unit) {
          const gridX = gameObject.getData('gridX');
          const gridY = gameObject.getData('gridY');
          
          if (typeof gridX === 'number' && typeof gridY === 'number') {
            this.handleUnitAction(this.selectedEntity, gridX, gridY);
          }
        }
      } else {
        // Left click - select tile/entity or perform action
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        
        if (typeof gridX === 'number' && typeof gridY === 'number') {
          const entityAtTile = this.getEntityAtTile(gridX, gridY);
          
          if (entityAtTile) {
            // If it's an enemy and we have a unit selected that can attack, attack it
            if (entityAtTile.playerId !== this.getCurrentPlayer().id && 
                this.selectedEntity instanceof Unit &&
                this.selectedEntity.playerId === this.getCurrentPlayer().id &&
                this.isCurrentPlayerTurn() &&
                this.selectedEntity.actionsLeft > 0) {
              
              // Check if in attack range
              const dx = Math.abs(this.selectedEntity.gridX - entityAtTile.gridX);
              const dy = Math.abs(this.selectedEntity.gridY - entityAtTile.gridY);
              const distance = dx + dy;
              const attackRange = this.selectedEntity.type === 'ranged' ? 2 : 1;
              
              if (distance <= attackRange) {
                // Attack the enemy
                this.attackEntity(this.selectedEntity, entityAtTile);
                return;
              }
            }
            // Otherwise select the entity
            this.selectEntity(entityAtTile);
          } else {
            // If no entity at tile and we have a selected unit, try to move there
            if (this.selectedEntity && this.selectedEntity instanceof Unit) {
              this.handleUnitAction(this.selectedEntity, gridX, gridY);
            } else {
              // Deselect if clicking on empty tile
              this.selectEntity(null);
            }
          }
        }
      }
    });
    
    // Handle pointer over events to show combat prediction
    this.input.on('gameobjectover', (pointer: Phaser.Input.Pointer, gameObject: any) => {
      // Only show predictions when we have a unit selected that can attack
      if (this.selectedEntity instanceof Unit && 
          this.selectedEntity.playerId === this.getCurrentPlayer().id &&
          this.isCurrentPlayerTurn() &&
          this.selectedEntity.actionsLeft > 0) {
        
        // Check if we're hovering over an enemy unit or building
        if ((gameObject instanceof Unit || gameObject instanceof Building) && 
             gameObject.playerId !== this.getCurrentPlayer().id) {
          
          // Check if the enemy is in attack range
          const dx = Math.abs(this.selectedEntity.gridX - gameObject.gridX);
          const dy = Math.abs(this.selectedEntity.gridY - gameObject.gridY);
          const distance = dx + dy;
          const attackRange = this.selectedEntity.type === 'ranged' ? 2 : 1;
          
          if (distance <= attackRange) {
            // Get terrain defense bonus
            const defenderTile = this.tiles[gameObject.gridY][gameObject.gridX];
            const terrainType = defenderTile.getData('tileType');
            
            let terrainDefenseBonus = 0;
            if (terrainType === 'forest') {
              terrainDefenseBonus = 1;
            } else if (terrainType === 'hill') {
              terrainDefenseBonus = 2;
            }
            
            // Emit prediction event with attacker and defender info
            EventBridge.emit('phaser:potentialCombat', {
              attackerId: this.selectedEntity.id,
              defenderId: gameObject.id,
              terrainDefenseBonus
            });
          }
        }
      }
    });
    
    // Handle pointer out events to clear combat prediction
    this.input.on('gameobjectout', (pointer: Phaser.Input.Pointer, gameObject: any) => {
      if ((gameObject instanceof Unit || gameObject instanceof Building)) {
        // Clear the combat prediction
        EventBridge.emit('phaser:clearCombatPrediction', {});
      }
    });
  }
  
  setupEventHandlers() {
    // Listen for events from React UI
    
    // Custom game setup from game options
    EventBridge.on('ui:setupGame', (data: any) => {
      console.log('Custom game setup received:', data);
      
      // Reset the current game state
      this.resetGameState();
      
      // Prioritize data passed through the event if it's complete
      if (data && data.players && data.players.length > 0) {
        console.log('Using data passed through event');
        
        // Set map dimensions from event data
        if (data.map && data.map.width && data.map.height) {
          this.mapWidth = data.map.width || 15;
          this.mapHeight = data.map.height || 15;
        }
        
        // Initialize players with event data
        this.initializePlayers(data.players);
      } 
      // Fallback to window.gameSetupState
      else {
        // Check the global game setup state
        const gameSetupState = (window as any).gameSetupState;
        
        if (gameSetupState && gameSetupState.selectedFaction) {
          console.log('Using global game setup state:', gameSetupState);
          
          // Set map size based on number of opponents
          const opponentCount = gameSetupState.opponents || 1;
          if (opponentCount >= 1 && opponentCount <= 5) {
            // Scale map size with opponent count
            const baseSize = 15;
            const sizeIncrement = 5;
            this.mapWidth = baseSize + (opponentCount - 1) * sizeIncrement;
            this.mapHeight = baseSize + (opponentCount - 1) * sizeIncrement;
          } else {
            this.mapWidth = 15;
            this.mapHeight = 15;
          }
          
          // Create player data based on setup
          const players = [];
          
          // Available factions for AI opponents
          const availableFactions = ['nephites', 'lamanites', 'mulekites', 'anti-nephi-lehies', 'jaredites'];
          
          // Filter out player's faction from available AI factions
          const aiFactions = availableFactions.filter(faction => faction !== gameSetupState.selectedFaction);
          
          // Create human player data
          players.push({
            id: 'player1',
            name: this.getFactionDisplayName(gameSetupState.selectedFaction),
            faction: gameSetupState.selectedFaction,
            resources: { food: 10, production: 10 },
            units: [],
            buildings: [],
            startingCityId: 'city1'
          });
          
          // Add AI opponents based on setup
          for (let i = 0; i < opponentCount; i++) {
            const aiFaction = aiFactions[i % aiFactions.length];
            
            players.push({
              id: `player${i + 2}`,
              name: this.getFactionDisplayName(aiFaction) + ` ${i + 1}`,
              faction: aiFaction,
              resources: { food: 10, production: 10 },
              units: [],
              buildings: [],
              startingCityId: `city${i + 2}`
            });
          }
          
          // Initialize players with generated data
          this.initializePlayers(players);
        } else {
          // No valid setup data, use defaults
          console.log('No valid setup data, using defaults');
          this.mapWidth = 15;
          this.mapHeight = 15;
          this.initializePlayers();
        }
      }
      
      // Recreate the map
      const worldCenterX = this.cameras.main.width / 2;
      const worldCenterY = this.cameras.main.height / 3;
      
      // Use map data from the event if available
      if (data && data.map && data.map.data && Array.isArray(data.map.data)) {
        this.createMapFromData(data.map.data, worldCenterX, worldCenterY);
      } else {
        // Otherwise create a random map
        this.createMap(worldCenterX, worldCenterY);
      }
      
      // Place initial entities based on starting positions or default positions
      if (data && data.map && data.map.startingPositions) {
        this.placeInitialEntitiesFromData(data.map.startingPositions);
      } else {
        this.placeInitialEntities();
      }
      
      // Initialize fog of war
      this.initializeFogOfWar(worldCenterX, worldCenterY);
      
      // Reset pathfinder with new map size
      this.pathFinder = new PathFinder(this.mapWidth, this.mapHeight);
      this.updatePathfinderWalkability();
      
      // Update UI
      this.updateUI();
    });
    
    // Train unit action
    EventBridge.on('game:trainUnit', (data: { buildingId: string, unitType: UnitType }) => {
      const building = this.buildings.find(b => b.id === data.buildingId);
      if (building) {
        this.trainUnit(building, data.unitType);
      }
    });
    
    // Build building action
    EventBridge.on('game:buildBuilding', (data: { buildingType: BuildingType, x: number, y: number }) => {
      if (this.isCurrentPlayerTurn() && this.isValidBuildingLocation(data.x, data.y)) {
        this.buildBuilding(data.buildingType, data.x, data.y);
      }
    });
    
    // Building placement highlight tiles
    EventBridge.on('ui:showBuildingPlacementTiles', (data: { tiles: Array<{x: number, y: number}>, buildingType: string }) => {
      this.highlightBuildingPlacementTiles(data.tiles, data.buildingType);
    });
    
    // Clear building placement highlights
    EventBridge.on('ui:hideBuildingPlacementTiles', () => {
      this.clearBuildingPlacementHighlights();
    });
    
    // Select a specific tile during building placement
    EventBridge.on('ui:selectBuildingPlacementTile', (data: { x: number, y: number }) => {
      this.selectBuildingPlacementTile(data.x, data.y);
    });
    
    // End turn action
    EventBridge.on('game:endTurn', () => {
      this.endTurn();
    });
    
    // Selection handling
    EventBridge.on('game:selectEntity', (data: { id: string, type: 'unit' | 'building' }) => {
      let entity = null;
      
      if (data.type === 'unit') {
        entity = this.units.find(u => u.id === data.id);
      } else {
        entity = this.buildings.find(b => b.id === data.id);
      }
      
      if (entity) {
        this.selectEntity(entity);
      }
    });
  }
  
  selectEntity(entity: Unit | Building | null) {
    // Clear previous selection
    this.clearHighlightedTiles();
    
    if (this.selectedEntity) {
      if (this.selectedEntity instanceof Unit) {
        this.selectedEntity.showSelectionHighlight(false);
      } else {
        this.selectedEntity.showSelectionHighlight(false);
      }
    }
    
    this.selectedEntity = entity;
    
    if (entity) {
      // Show selection highlight
      entity.showSelectionHighlight(true);
      
      // Play selection sound
      this.soundService.playSound('select');
      
      // If it's a unit and it's the current player's turn, show movement range
      if (entity instanceof Unit && entity.playerId === this.getCurrentPlayer().id) {
        this.showMovementRange(entity);
      }
      
      // Send selection info to React UI
      EventBridge.emit('phaser:entitySelected', {
        id: entity.id,
        type: entity instanceof Unit ? 'unit' : 'building',
        playerId: entity.playerId,
        stats: entity.getStats()
      });
    } else {
      // Nothing selected, notify UI
      EventBridge.emit('phaser:entitySelected', { id: null });
    }
  }
  
  showMovementRange(unit: Unit) {
    if (unit.movesLeft <= 0) return;
    
    // Get all tiles within movement range
    const movementTiles = this.pathFinder.findTilesInRange(
      unit.gridX, unit.gridY, unit.movesLeft
    );
    
    // Highlight those tiles
    this.movementOverlay.clear();
    this.movementOverlay.fillStyle(0x00ff00, 0.3);
    
    movementTiles.forEach(tile => {
      if (this.isValidMovementTile(tile.x, tile.y)) {
        const { screenX, screenY } = GridUtils.cartesianToIsometric(
          tile.x, tile.y, this.tileWidth, this.tileHeight
        );
        
        const worldX = this.cameras.main.width / 2 + screenX - (this.mapWidth * this.tileColumnOffset) / 2;
        const worldY = this.cameras.main.height / 3 + screenY - (this.mapHeight * this.tileRowOffset) / 2;
        
        // Create a polygon shape for the isometric tile
        const points = [
          { x: worldX, y: worldY - this.tileHeight / 2 },
          { x: worldX + this.tileWidth / 2, y: worldY },
          { x: worldX, y: worldY + this.tileHeight / 2 },
          { x: worldX - this.tileWidth / 2, y: worldY }
        ];
        
        this.movementOverlay.beginPath();
        this.movementOverlay.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.movementOverlay.lineTo(points[i].x, points[i].y);
        }
        this.movementOverlay.closePath();
        this.movementOverlay.fillPath();
        
        // Store the highlighted tile for later clearing
        this.highlightedTiles.push(this.tiles[tile.y][tile.x]);
      }
    });
  }
  
  clearHighlightedTiles() {
    this.movementOverlay.clear();
    this.highlightedTiles = [];
  }
  
  /**
   * Highlight tiles for building placement
   */
  highlightBuildingPlacementTiles(tiles: Array<{x: number, y: number}>, buildingType: string) {
    // Clear any existing highlights
    this.clearHighlightedTiles();
    this.clearBuildingPlacementHighlights();
    
    // Create a graphics object for building placement highlights
    if (!this.buildingPlacementOverlay) {
      this.buildingPlacementOverlay = this.add.graphics();
    } else {
      this.buildingPlacementOverlay.clear();
    }
    
    // Use a different color for building placement
    this.buildingPlacementOverlay.fillStyle(0x4a90e2, 0.4); // Blue color for building placement
    
    // Highlight each valid tile
    tiles.forEach(tile => {
      if (this.isValidBuildingLocation(tile.x, tile.y)) {
        const { screenX, screenY } = GridUtils.cartesianToIsometric(
          tile.x, tile.y, this.tileWidth, this.tileHeight
        );
        
        const worldX = this.cameras.main.width / 2 + screenX - (this.mapWidth * this.tileColumnOffset) / 2;
        const worldY = this.cameras.main.height / 3 + screenY - (this.mapHeight * this.tileRowOffset) / 2;
        
        // Create an isometric diamond shape for the highlight
        const points = [
          { x: worldX, y: worldY - this.tileHeight / 2 },
          { x: worldX + this.tileWidth / 2, y: worldY },
          { x: worldX, y: worldY + this.tileHeight / 2 },
          { x: worldX - this.tileWidth / 2, y: worldY }
        ];
        
        this.buildingPlacementOverlay.beginPath();
        this.buildingPlacementOverlay.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.buildingPlacementOverlay.lineTo(points[i].x, points[i].y);
        }
        this.buildingPlacementOverlay.closePath();
        this.buildingPlacementOverlay.fillPath();
        
        // Store the highlighted tile for later reference
        this.buildingPlacementTiles.push({
          tile: this.tiles[tile.y][tile.x],
          x: tile.x,
          y: tile.y
        });
      } else {
        console.log(`Tile at ${tile.x}, ${tile.y} is not a valid building location.`);
      }
    });
    
    // Select the first valid tile by default
    if (this.buildingPlacementTiles.length > 0) {
      this.selectBuildingPlacementTile(this.buildingPlacementTiles[0].x, this.buildingPlacementTiles[0].y);
    }
  }
  
  /**
   * Clear building placement highlights
   */
  clearBuildingPlacementHighlights() {
    if (this.buildingPlacementOverlay) {
      this.buildingPlacementOverlay.clear();
    }
    
    if (this.selectedBuildingPlacementTile) {
      this.selectedBuildingPlacementTile.clear();
    }
    
    this.buildingPlacementTiles = [];
    this.selectedBuildingTile = null;
  }
  
  /**
   * Highlight a specific tile as the selected building placement
   */
  selectBuildingPlacementTile(x: number, y: number) {
    // Find if this is a valid placement tile
    const placementTile = this.buildingPlacementTiles.find((pt: {tile: Phaser.GameObjects.Image, x: number, y: number}) => pt.x === x && pt.y === y);
    
    if (!placementTile) {
      console.log(`Tile at ${x}, ${y} is not a valid building placement tile.`);
      return;
    }
    
    // Clear the previous selection highlight
    if (!this.selectedBuildingPlacementTile) {
      this.selectedBuildingPlacementTile = this.add.graphics();
    } else {
      this.selectedBuildingPlacementTile.clear();
    }
    
    // Store the selected tile
    this.selectedBuildingTile = { x, y };
    
    // Convert grid position to screen coordinates
    const { screenX, screenY } = GridUtils.cartesianToIsometric(
      x, y, this.tileWidth, this.tileHeight
    );
    
    const worldX = this.cameras.main.width / 2 + screenX - (this.mapWidth * this.tileColumnOffset) / 2;
    const worldY = this.cameras.main.height / 3 + screenY - (this.mapHeight * this.tileRowOffset) / 2;
    
    // Create an isometric diamond outline for the selected tile
    const points = [
      { x: worldX, y: worldY - this.tileHeight / 2 },
      { x: worldX + this.tileWidth / 2, y: worldY },
      { x: worldX, y: worldY + this.tileHeight / 2 },
      { x: worldX - this.tileWidth / 2, y: worldY }
    ];
    
    // Draw a thicker, more vibrant outline for the selected tile
    this.selectedBuildingPlacementTile.lineStyle(3, 0xffd700, 1); // Gold color for selection
    this.selectedBuildingPlacementTile.beginPath();
    this.selectedBuildingPlacementTile.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.selectedBuildingPlacementTile.lineTo(points[i].x, points[i].y);
    }
    this.selectedBuildingPlacementTile.closePath();
    this.selectedBuildingPlacementTile.strokePath();
    
    // Add pulsing effect to the selected tile
    this.tweens.add({
      targets: this.selectedBuildingPlacementTile,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }
  
  handleUnitAction(unit: Unit, targetX: number, targetY: number) {
    // Check if it's this player's turn and unit
    if (!this.isCurrentPlayerTurn() || unit.playerId !== this.getCurrentPlayer().id) {
      console.log("Not your turn or unit");
      return;
    }
    
    // Check if the unit has actions left
    if (unit.actionsLeft <= 0) {
      console.log("No actions left for this unit");
      return;
    }
    
    // Check what's at the target tile
    const entityAtTarget = this.getEntityAtTile(targetX, targetY);
    const targetTile = this.tiles[targetY][targetX];
    
    if (entityAtTarget) {
      // If enemy entity, attack
      if (entityAtTarget.playerId !== unit.playerId) {
        this.attackEntity(unit, entityAtTarget);
      } 
      // If friendly entity, do nothing (or implement special actions later)
    } else if (unit.type === 'worker' && this.canGatherFromTile(targetX, targetY)) {
      // Worker gathering resources
      if (this.isAdjacentTile(unit.gridX, unit.gridY, targetX, targetY)) {
        // If worker is adjacent to the resource tile, gather immediately
        this.gatherResource(unit, targetX, targetY);
      } else if (unit.movesLeft > 0) {
        // If not adjacent, try to move there first
        this.moveUnitForAction(unit, targetX, targetY, () => {
          this.gatherResource(unit, targetX, targetY);
        });
      }
    } else if (this.isValidMovementTile(targetX, targetY) && unit.movesLeft > 0) {
      // Empty tile - check if we can move there
      this.moveUnit(unit, targetX, targetY);
    }
  }
  
  /**
   * Checks if a tile has resources that can be gathered
   */
  canGatherFromTile(x: number, y: number): boolean {
    if (!this.isValidTile(x, y)) return false;
    
    const tile = this.tiles[y][x];
    if (!tile) return false;
    
    const tileType = tile.getData('tileType');
    
    // Resource tiles are grass (food), forest (production), and hill (production)
    return tileType === 'grass' || tileType === 'forest' || tileType === 'hill';
  }
  
  /**
   * Get the resource amount that a worker from a specific faction will gather from a tile
   */
  getResourceAmountForFaction(tileType: string, faction: string): { amount: number, type: 'food' | 'production' } {
    let amount = 0;
    let type: 'food' | 'production' = 'food';
    
    // Base resource amounts
    if (tileType === 'grass') {
      amount = 2;
      type = 'food';
    } else if (tileType === 'forest') {
      amount = 2;
      type = 'production';
    } else if (tileType === 'hill') {
      amount = 3;
      type = 'production';
    }
    
    // Faction-specific bonuses
    if (faction === 'nephites' && tileType === 'hill') {
      // Nephites are skilled miners
      amount += 1; // +1 production from hills
    } else if (faction === 'lamanites' && tileType === 'forest') {
      // Lamanites are skilled hunters/gatherers
      amount += 1; // +1 production from forests
    } else if (faction === 'mulekites' && tileType === 'grass') {
      // Mulekites are skilled farmers
      amount += 1; // +1 food from grassland
    }
    
    return { amount, type };
  }
  
  /**
   * Checks if two tiles are adjacent
   */
  isAdjacentTile(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }
  
  /**
   * Moves a unit to a position and then performs an action
   */
  moveUnitForAction(unit: Unit, targetX: number, targetY: number, onComplete: () => void) {
    // Check if unit has actions left before attempting to move
    if (unit.actionsLeft <= 0) {
      console.log("Unit has no actions left");
      return;
    }
    
    // Find a path to an adjacent tile
    const adjacentTiles = this.getAdjacentTiles(targetX, targetY);
    let bestTile = null;
    let shortestPath = null;
    
    for (const tile of adjacentTiles) {
      if (this.isValidTile(tile.x, tile.y) && !this.getEntityAtTile(tile.x, tile.y)) {
        const path = this.pathFinder.findPath(unit.gridX, unit.gridY, tile.x, tile.y, unit.movesLeft);
        if (path && path.length > 0 && (shortestPath === null || path.length < shortestPath.length)) {
          shortestPath = path;
          bestTile = tile;
        }
      }
    }
    
    if (bestTile && shortestPath) {
      // Move to the adjacent tile, then gather
      this.moveUnit(unit, bestTile.x, bestTile.y, () => {
        // After moving, check if the unit still has an action
        if (unit.actionsLeft > 0) {
          onComplete();
        } else {
          console.log("Unit ran out of actions during movement");
        }
      });
    } else {
      console.log("No valid path to target found within movement range");
    }
  }
  
  moveUnit(unit: Unit, targetX: number, targetY: number, onComplete?: () => void) {
    // Check if destination is within move range
    const path = this.pathFinder.findPath(unit.gridX, unit.gridY, targetX, targetY, unit.movesLeft);
    
    if (path.length === 0) {
      console.log("No valid path to destination");
      return;
    }
    
    // Play movement sound
    this.soundService.playSound('move');
    
    // Unit can move there - update position
    const moveCost = path.length - 1; // Exclude starting position
    
    // Check if the unit will have any moves left for additional actions
    const willHaveMovesLeft = unit.movesLeft - moveCost > 0;
    
    // Update walkability maps (unit no longer at old position)
    this.pathFinder.setWalkableAt(unit.gridX, unit.gridY, true);
    
    // Move the unit
    unit.move(targetX, targetY, path, () => {
      // Callback when movement animation is complete
      
      // Update fog of war if this is a player unit
      if (unit.playerId === 'player1') {
        // Get world center coordinates for drawing
        const worldCenterX = this.cameras.main.width / 2;
        const worldCenterY = this.cameras.main.height / 3;
        
        // Get all player units and buildings for visibility calculation
        const playerUnits = this.units.filter(u => u.playerId === 'player1');
        const playerBuildings = this.buildings.filter(b => b.playerId === 'player1');
        
        // Update fog of war
        this.fogOfWar.update(playerUnits, worldCenterX, worldCenterY, playerBuildings);
      }
      
      // Call the completion callback if provided
      if (onComplete) {
        onComplete();
      }
    });
    
    // Update walkability maps (unit now at new position)
    this.pathFinder.setWalkableAt(targetX, targetY, false);
    
    // Reduce movement points
    unit.movesLeft -= moveCost;
    
    // If unit used all movement points, they can't perform actions that require movement
    if (unit.movesLeft <= 0 && unit.actionsLeft > 0) {
      console.log("Unit has used all movement points but still has actions");
    }
    
    // Clear and update highlights
    this.clearHighlightedTiles();
    if (unit.movesLeft > 0) {
      this.showMovementRange(unit);
    }
    
    // Update UI
    this.updateUI();
    
    // Emit event for UI
    EventBridge.emit('phaser:unitMoved', {
      unitId: unit.id,
      newX: targetX,
      newY: targetY,
      movesLeft: unit.movesLeft,
      actionsLeft: unit.actionsLeft
    });
  }
  
  attackEntity(attacker: Unit, defender: Unit | Building) {
    // Check if in range (adjacent for melee, 2 tiles for ranged)
    const dx = Math.abs(attacker.gridX - defender.gridX);
    const dy = Math.abs(attacker.gridY - defender.gridY);
    const distance = dx + dy;
    
    const attackRange = attacker.type === 'ranged' ? 2 : 1;
    
    if (distance > attackRange) {
      console.log("Target out of attack range");
      return;
    }
    
    // Check if the unit has actions left
    if (attacker.actionsLeft <= 0) {
      console.log("No actions left for this unit");
      return;
    }
    
    // Play attack sound
    this.soundService.playSound('attack');
    
    // Get terrain at defender's location
    const defenderTile = this.tiles[defender.gridY][defender.gridX];
    const terrainType = defenderTile.getData('tileType');
    
    // Calculate terrain defense bonus
    let terrainDefenseBonus = 0;
    if (terrainType === 'forest') {
      terrainDefenseBonus = 1; // Forest gives +1 defense
    } else if (terrainType === 'hill') {
      terrainDefenseBonus = 2; // Hills give +2 defense
    }
    
    // Calculate attack damage based on attacker's attack vs defender's defense
    const baseDamage = attacker.attack;
    const totalDefense = defender.defense + terrainDefenseBonus;
    
    // Damage is reduced by half of defense value (minimum 1 damage)
    const mitigatedDamage = Math.max(1, baseDamage - totalDefense / 2);
    
    // Apply damage to the defender
    defender.takeDamage(mitigatedDamage);
    
    // Show attack animation
    attacker.playAttackAnimation(defender.gridX, defender.gridY);
    
    // Create floating damage text
    this.showDamageText(defender.gridX, defender.gridY, mitigatedDamage);
    
    // Use up the attacker's action
    attacker.actionsLeft = 0;
    
    // Check if defender is defeated
    if (defender.health <= 0) {
      this.destroyEntity(defender);
      // Update the pathfinder after entity is destroyed
      this.updatePathfinderWalkability();
    }
    
    // Update UI
    this.updateUI();
    
    // Emit event for UI
    EventBridge.emit('phaser:attackPerformed', {
      attackerId: attacker.id,
      defenderId: defender.id,
      damage: mitigatedDamage,
      terrainBonus: terrainDefenseBonus,
      defenderRemaining: defender.health
    });
  }
  
  /**
   * Show floating damage text at the specified grid position
   */
  showDamageText(gridX: number, gridY: number, damage: number) {
    // Convert grid position to screen coordinates
    const { screenX, screenY } = GridUtils.cartesianToIsometric(
      gridX, gridY, 64, 32
    );
    
    // The container position is in the center of the map
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 3;
    const mapWidth = 15 * 32; // Half tile width for offset * map width
    const mapHeight = 15 * 16; // Half tile height for offset * map height
    
    const x = centerX + screenX - mapWidth / 2;
    const y = centerY + screenY - mapHeight / 2;
    
    // Create the damage text
    const damageText = this.add.text(x, y - 50, `-${damage}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    });
    damageText.setOrigin(0.5, 0.5);
    
    // Animate the text
    this.tweens.add({
      targets: damageText,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        damageText.destroy();
      }
    });
  }
  
  destroyEntity(entity: Unit | Building) {
    // Make the tile walkable again
    this.pathFinder.setWalkableAt(entity.gridX, entity.gridY, true);
    
    // Store entity position for death effect
    const entityX = entity.x;
    const entityY = entity.y;
    const isUnit = entity instanceof Unit;
    
    // Create death animation effect
    if (isUnit) {
      // Play death sound
      this.soundService.playSound('unitDestroyed');
      
      // Create death particles effect for unit
      const particles = this.add.particles(0, 0, 'particle', {
        x: entityX,
        y: entityY,
        speed: { min: 20, max: 50 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 },
        lifespan: 800,
        quantity: 15,
        tint: 0xff0000
      });
      
      // Auto-destroy particles after animation completes
      this.time.delayedCall(800, () => {
        particles.destroy();
      });
      
      // Add a "defeated" text that fades up
      const defeatText = this.add.text(entityX, entityY - 20, 'Defeated!', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
      });
      defeatText.setOrigin(0.5, 0.5);
      
      // Animate the text
      this.tweens.add({
        targets: defeatText,
        y: entityY - 60,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          defeatText.destroy();
        }
      });
    } else {
      // For buildings, create a "collapse" effect
      this.soundService.playSound('buildingDestroyed');
      
      // Create smoke/dust particles
      const particles = this.add.particles(0, 0, 'particle', {
        x: entityX,
        y: entityY,
        speed: { min: 10, max: 30 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 1200,
        quantity: 25,
        tint: 0x888888
      });
      
      // Auto-destroy particles after animation completes
      this.time.delayedCall(1200, () => {
        particles.destroy();
      });
    }
    
    // Remove from appropriate array
    if (isUnit) {
      this.units = this.units.filter(u => u.id !== entity.id);
      
      // Remove from player's units array
      const player = this.players.find(p => p.id === entity.playerId);
      if (player) {
        player.units = player.units.filter((u: any) => u.id !== entity.id);
      }
    } else {
      this.buildings = this.buildings.filter(b => b.id !== entity.id);
      
      // Remove from player's buildings array
      const player = this.players.find(p => p.id === entity.playerId);
      if (player) {
        player.buildings = player.buildings.filter((b: any) => b.id !== entity.id);
        
        // Check if this was a starting city
        if (player.startingCityId === entity.id) {
          // Player has lost their starting city - check win condition
          this.checkWinCondition(player.id);
        }
      }
    }
    
    // Add a short delay before physically destroying the entity
    // This gives time for death animation to be visible
    this.time.delayedCall(200, () => {
      // Fade out the entity
      this.tweens.add({
        targets: entity,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          // Physically destroy the sprite
          entity.destroy();
        }
      });
    });
    
    // If this was the selected entity, clear selection
    if (this.selectedEntity && this.selectedEntity.id === entity.id) {
      this.selectEntity(null);
    }
  }
  
  checkWinCondition(defeatedPlayerId: string) {
    // The player who lost their starting city has been defeated
    const victor = this.players.find(p => p.id !== defeatedPlayerId);
    if (victor) {
      console.log(`Player ${defeatedPlayerId} has been defeated! Player ${victor.id} is victorious!`);
      
      // Play victory/defeat sound
      if (victor.id === 'player1') {
        this.soundService.playSound('victory');
      } else {
        this.soundService.playSound('defeat');
      }
      
      // Create a visual victory notification on screen
      const isPlayerVictory = victor.id === 'player1';
      const message = isPlayerVictory ? 'VICTORY!' : 'DEFEAT!';
      const textColor = isPlayerVictory ? '#44ff44' : '#ff4444';
      
      // First create a darkened overlay for the game screen
      const overlay = this.add.rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7
      );
      overlay.setDepth(5000); // Ensure it appears above everything
      
      // Add the victory/defeat text
      const victoryText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 50,
        message,
        {
          fontFamily: 'Arial',
          fontSize: '72px',
          fontStyle: 'bold',
          color: textColor,
          stroke: '#000000',
          strokeThickness: 8,
          align: 'center'
        }
      );
      victoryText.setOrigin(0.5, 0.5);
      victoryText.setDepth(5001);
      
      // Add some detail text
      const victoryReason = `You have ${isPlayerVictory ? 'captured' : 'lost'} the enemy's starting city!`;
      const detailText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 30,
        victoryReason,
        {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center'
        }
      );
      detailText.setOrigin(0.5, 0.5);
      detailText.setDepth(5001);
      
      // Add continue button text
      const continueText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 100,
        'Click anywhere to continue',
        {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#aaaaaa',
          align: 'center'
        }
      );
      continueText.setOrigin(0.5, 0.5);
      continueText.setDepth(5001);
      
      // Make the continue text pulse
      this.tweens.add({
        targets: continueText,
        alpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
      
      // Add input handler to dismiss the game over screen
      this.input.once('pointerdown', () => {
        // Clean up the game over UI
        overlay.destroy();
        victoryText.destroy();
        detailText.destroy();
        continueText.destroy();
        
        // Game over - emit victory event to React UI
        EventBridge.emit('phaser:gameOver', {
          victorId: victor.id,
          victoryType: 'conquest',
          victorFaction: victor.faction
        });
      });
      
      // Also pause gameplay
      this.scene.pause();
    }
  }
  
  trainUnit(building: Building, unitType: UnitType) {
    // Check if this is a valid building for training (city can train workers, barracks can train soldiers)
    let canTrain = false;
    
    if (building.type === 'city' && unitType === 'worker') {
      canTrain = true;
    } else if (building.type === 'barracks' && (unitType === 'melee' || unitType === 'ranged')) {
      canTrain = true;
    }
    
    if (!canTrain) {
      console.log(`${building.type} cannot train ${unitType}`);
      return;
    }
    
    // Get the player
    const player = this.players.find(p => p.id === building.playerId);
    if (!player) return;
    
    // Check if player has enough resources
    const costs = {
      worker: { food: 2, production: 1 },
      melee: { food: 1, production: 3 },
      ranged: { food: 1, production: 4 }
    };
    
    if (player.resources.food < costs[unitType].food || 
        player.resources.production < costs[unitType].production) {
      console.log("Not enough resources to train unit");
      return;
    }
    
    // Play unit creation sound
    this.soundService.playSound('unitCreated');
    
    // Deduct resources
    player.resources.food -= costs[unitType].food;
    player.resources.production -= costs[unitType].production;
    
    // Add to building's production queue
    building.addToProductionQueue(unitType);
    
    // Update UI
    this.updateUI();
    
    // Emit event for UI
    EventBridge.emit('phaser:unitQueued', {
      buildingId: building.id,
      unitType,
      queueLength: building.productionQueue.length
    });
  }
  
  buildBuilding(buildingType: BuildingType, x: number, y: number) {
    // Check if this is a valid location (must be empty and walkable)
    if (!this.isValidBuildingLocation(x, y)) {
      console.log("Invalid building location");
      return;
    }
    
    // Get the current player
    const player = this.getCurrentPlayer();
    
    // Check if player has enough resources
    const costs = {
      city: { food: 5, production: 10 },
      barracks: { food: 2, production: 5 }
    };
    
    if (player.resources.food < costs[buildingType].food || 
        player.resources.production < costs[buildingType].production) {
      console.log("Not enough resources to build structure");
      return;
    }
    
    // Play building sound
    this.soundService.playSound('build');
    
    // Deduct resources
    player.resources.food -= costs[buildingType].food;
    player.resources.production -= costs[buildingType].production;
    
    // Create the building
    this.createBuilding(buildingType, x, y, player.id);
    
    // Update walkability map
    this.updatePathfinderWalkability();
    
    // Update UI
    this.updateUI();
    
    // Emit event for UI
    EventBridge.emit('phaser:buildingCreated', {
      buildingType,
      x,
      y,
      playerId: player.id
    });
  }
  
  gatherResource(worker: Unit, targetX: number, targetY: number) {
    // First check if worker has actions left
    if (worker.actionsLeft <= 0) {
      console.log("Worker has no actions left to gather resources");
      return;
    }
    
    // Check if the tile has resources
    const tile = this.tiles[targetY][targetX];
    if (!tile) return;
    
    // Validate that it's a proper resource tile
    const tileType = tile.getData('tileType');
    if (!this.canGatherFromTile(targetX, targetY)) {
      console.log(`Cannot gather resources from ${tileType} tile`);
      return;
    }
    
    // Check if tile has any resources left
    const resourcesLeft = tile.getData('resourcesLeft') || 0;
    if (resourcesLeft <= 0) {
      console.log(`This ${tileType} tile has been depleted of resources`);
      
      // Show depleted message
      this.showResourceGainedText(targetX, targetY, 0, 'depleted', ' (Depleted)');
      
      // Play fail sound
      this.soundService.playSound('error');
      return;
    }
    
    // Play gather sound
    this.soundService.playSound('gather');
    
    // Get the player and their faction
    const player = this.players.find(p => p.id === worker.playerId);
    if (!player) return;
    
    // Calculate resources gained based on faction bonuses
    const { amount: resourceGained, type: resourceType } = 
      this.getResourceAmountForFaction(tileType, player.faction);
    
    // Add resources to player
    player.resources[resourceType] += resourceGained;
    
    // Use up worker's action
    worker.actionsLeft = 0;
    
    // Show gathering animation
    worker.playGatherAnimation();
    
    // Deplete resource from tile
    const newResourcesLeft = resourcesLeft - 1;
    tile.setData('resourcesLeft', newResourcesLeft);
    
    // Update tile appearance based on resources left
    if (newResourcesLeft <= 0) {
      // Apply a desaturated filter to show depletion
      tile.setTint(0xaaaaaa);
    } else if (newResourcesLeft <= 2) {
      // Critical low resources - reddish tint
      tile.setTint(0xff9999);
    } else if (newResourcesLeft <= 3) {
      // Low resources - yellowish tint
      tile.setTint(0xffee88);
    } else {
      // Plenty of resources - normal color
      tile.clearTint();
    }
    
    // Update UI
    this.updateUI();
    
    // Create special message if faction gets a bonus on this tile type
    let bonusText = '';
    if ((player.faction === 'nephites' && tileType === 'hill') ||
        (player.faction === 'lamanites' && tileType === 'forest') ||
        (player.faction === 'mulekites' && tileType === 'grass')) {
      bonusText = ' (Faction Bonus!)';
    }
    
    // Show floating text indicating resource gained
    this.showResourceGainedText(targetX, targetY, resourceGained, resourceType, bonusText);
    
    // Add a small indicator of resources left
    if (newResourcesLeft <= 2 && newResourcesLeft > 0) {
      this.showResourceGainedText(targetX, targetY + 0.2, newResourcesLeft, 'left', ' remaining');
    }
    
    // Emit event for UI
    EventBridge.emit('phaser:resourceGathered', {
      workerId: worker.id,
      resourceType,
      amount: resourceGained,
      tileX: targetX,
      tileY: targetY,
      hasFactionBonus: bonusText !== '',
      resourcesLeft: newResourcesLeft
    });
  }
  
  /**
   * Show floating text indicating resource gained
   */
  showResourceGainedText(gridX: number, gridY: number, amount: number, resourceType: string, bonusText: string = '') {
    // Convert grid position to screen coordinates
    const { screenX, screenY } = GridUtils.cartesianToIsometric(
      gridX, gridY, 64, 32
    );
    
    // The container position is in the center of the map
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 3;
    const mapWidth = 15 * 32; // Half tile width for offset * map width
    const mapHeight = 15 * 16; // Half tile height for offset * map height
    
    const x = centerX + screenX - mapWidth / 2;
    const y = centerY + screenY - mapHeight / 2;
    
    // Determine color based on resource type
    let textColor = '#ffffff'; // Default
    if (resourceType === 'food') {
      textColor = '#44ff44'; // Green for food
    } else if (resourceType === 'production') {
      textColor = '#ffbb44'; // Orange for production
    } else if (resourceType === 'depleted') {
      textColor = '#ff4444'; // Red for depleted message
    } else if (resourceType === 'left') {
      textColor = '#aaaaaa'; // Gray for resources left
    }
    
    // Create the resource text with proper formatting based on type
    let message = `+${amount} ${resourceType}${bonusText}`;
    
    // Special case formatting for depleted resources and resources left
    if (resourceType === 'depleted') {
      message = `Resources Depleted${bonusText}`;
    } else if (resourceType === 'left') {
      message = `${amount} ${bonusText}`;
    }
    
    const resourceText = this.add.text(x, y - 50, message, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: textColor,
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    });
    resourceText.setOrigin(0.5, 0.5);
    
    // If this is a bonus, make it slightly larger and add a glow effect
    if (bonusText) {
      resourceText.setFontSize(22);
      
      // Add a glow effect for bonus resources
      // Convert hex color to number for glow effect
      const colorNum = parseInt(textColor.replace('#', '0x'));
      const glowFX = resourceText.preFX?.addGlow(colorNum, 4, 0, false, 0.1, 16);
      
      // Add a slight bounce effect
      this.tweens.add({
        targets: resourceText,
        scale: 1.2,
        duration: 200,
        yoyo: true
      });
    }
    
    // Animate the text
    this.tweens.add({
      targets: resourceText,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      delay: bonusText ? 300 : 0, // Delay the fade out for bonus text
      onComplete: () => {
        resourceText.destroy();
      }
    });
  }
  
  endTurn() {
    // Process end of turn actions
    
    // 1. Process building production queues
    this.buildings.forEach(building => {
      if (building.playerId === this.getCurrentPlayer().id) {
        building.processTurn();
        
        // Check if a unit was produced
        const producedUnit = building.getProducedUnit();
        if (producedUnit) {
          // Find an empty adjacent tile for the new unit
          const adjacentTiles = this.getAdjacentTiles(building.gridX, building.gridY);
          const emptyTile = adjacentTiles.find(tile => 
            !this.getEntityAtTile(tile.x, tile.y) && this.pathFinder.isWalkableAt(tile.x, tile.y)
          );
          
          if (emptyTile) {
            // Create the new unit with canActOnFirstTurn set to false
            const newUnit = this.createUnit(producedUnit, emptyTile.x, emptyTile.y, building.playerId, undefined, false);
            
            // Initialize the unit's actions for the first turn
            if (newUnit) {
              newUnit.initializeFirstTurnActions();
            }
            
            // Update pathfinder
            this.updatePathfinderWalkability();
            
            // Play creation sound effect
            this.soundService.playSound('unitCreated');
            
            // Emit event to notify UI of unit creation
            EventBridge.emit('phaser:unitCreated', {
              unitType: producedUnit,
              x: emptyTile.x,
              y: emptyTile.y,
              playerId: building.playerId
            });
          }
        }
      }
    });
    
    // 2. Switch to the next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
    // 3. If we've come back to the first player, increment the turn counter
    if (this.currentPlayerIndex === 0) {
      this.turn++;
    }
    
    // 4. Refresh units' movement and action points for the new current player
    this.units.forEach(unit => {
      if (unit.playerId === this.getCurrentPlayer().id) {
        unit.resetForNewTurn();
      }
    });
    
    // 5. If current player is AI, handle AI turn
    if (this.getCurrentPlayer().id === 'player2') {
      this.handleAITurn();
    }
    
    // Clear selection
    this.selectEntity(null);
    
    // Ensure pathfinding grid is up-to-date
    this.updatePathfinderWalkability();
    
    // Update UI with new turn information
    this.updateUI();
    
    // Emit turn changed event
    EventBridge.emit('phaser:turnChanged', {
      currentPlayerId: this.getCurrentPlayer().id,
      turn: this.turn
    });
  }
  
  handleAITurn() {
    // Very simple AI for now - just end the turn
    // This can be expanded later
    setTimeout(() => {
      this.endTurn();
    }, 500);
  }
  
  updateUI() {
    // Send updated game state to React UI
    const currentPlayer = this.getCurrentPlayer();
    
    EventBridge.emit('phaser:gameStateUpdate', {
      turn: this.turn,
      currentPlayerId: currentPlayer.id,
      players: this.players.map(player => ({
        id: player.id,
        faction: player.faction,
        resources: player.resources,
        units: player.units.length,
        buildings: player.buildings.length
      }))
    });
  }
  
  // Helper methods
  
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }
  
  isCurrentPlayerTurn() {
    return this.currentPlayerIndex === 0; // Player 1 is human
  }
  
  getEntityAtTile(x: number, y: number): Unit | Building | null {
    // Check units first
    const unit = this.units.find(u => u.gridX === x && u.gridY === y);
    if (unit) return unit;
    
    // Then check buildings
    const building = this.buildings.find(b => b.gridX === x && b.gridY === y);
    if (building) return building;
    
    return null;
  }
  
  isValidTile(x: number, y: number): boolean {
    // Check if within map bounds
    return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight;
  }
  
  isValidMovementTile(x: number, y: number): boolean {
    // Check if within map bounds
    if (!this.isValidTile(x, y)) {
      return false;
    }
    
    // Check if tile is walkable (no other entity there)
    if (!this.pathFinder.isWalkableAt(x, y)) {
      return false;
    }
    
    return true;
  }
  
  isValidBuildingLocation(x: number, y: number): boolean {
    // Check if within map bounds
    if (!this.isValidTile(x, y)) {
      return false;
    }
    
    // Check if tile is empty (no other entity there)
    if (this.getEntityAtTile(x, y)) {
      return false;
    }
    
    // Check if tile is walkable (some tiles might not support buildings)
    const tile = this.tiles[y][x];
    if (!tile || !tile.getData('walkable')) {
      return false;
    }
    
    return true;
  }
  
  getAdjacentTiles(x: number, y: number) {
    const adjacent = [
      { x: x+1, y },
      { x: x-1, y },
      { x, y: y+1 },
      { x, y: y-1 }
    ];
    
    // Filter to only include tiles within map bounds
    return adjacent.filter(tile => 
      tile.x >= 0 && tile.x < this.mapWidth && 
      tile.y >= 0 && tile.y < this.mapHeight
    );
  }
  
  updatePathfinderWalkability() {
    // Reset walkability based on tile types
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = this.tiles[y][x];
        this.pathFinder.setWalkableAt(x, y, tile.getData('walkable'));
      }
    }
    
    // Mark units as not walkable
    this.units.forEach(unit => {
      this.pathFinder.setWalkableAt(unit.gridX, unit.gridY, false);
    });
    
    // Mark buildings as not walkable
    this.buildings.forEach(building => {
      this.pathFinder.setWalkableAt(building.gridX, building.gridY, false);
    });
  }
  
  // Game loop update method
  update(time: number, delta: number) {
    // Update all units
    this.units.forEach(unit => unit.update(time, delta));
    
    // Update all buildings
    this.buildings.forEach(building => building.update(time, delta));
  }
}
