import Phaser from 'phaser';
import { EventBridge } from '../../lib/events/EventBridge';
import { GridUtils } from '../utils/GridUtils';
import { PathFinder } from '../utils/PathFinding';
import Unit from '../entities/Unit';
import Building from '../entities/Building';
import { TileType, UnitType, BuildingType } from '../../types/game';

export default class MainScene extends Phaser.Scene {
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
  private selectionIndicator: Phaser.GameObjects.Image;
  
  constructor() {
    super('MainScene');
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
    
    // Set up input handlers
    this.setupInputHandlers();
    
    // Set up event handlers for communication with React
    this.setupEventHandlers();
    
    // Initial UI update
    this.updateUI();
  }
  
  initializePlayers() {
    // Human player (Nephites)
    this.players.push({
      id: 'player1',
      faction: 'nephites',
      resources: { food: 10, production: 10 },
      units: [],
      buildings: [],
      startingCityId: 'city1'
    });
    
    // AI player (Lamanites)
    this.players.push({
      id: 'player2',
      faction: 'lamanites',
      resources: { food: 10, production: 10 },
      units: [],
      buildings: [],
      startingCityId: 'city2'
    });
    
    // Set current player to human
    this.currentPlayerIndex = 0;
  }
  
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
    
    // Update the walkability map based on building positions
    this.updatePathfinderWalkability();
  }
  
  createUnit(type: UnitType, x: number, y: number, playerId: string, id?: string) {
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
        state: 'idle'
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
  
  setupInputHandlers() {
    // Handle tile clicks
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: any) => {
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
            // Select the entity
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
  }
  
  setupEventHandlers() {
    // Listen for events from React UI
    
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
  
  handleUnitAction(unit: Unit, targetX: number, targetY: number) {
    // Check if it's this player's turn and unit
    if (!this.isCurrentPlayerTurn() || unit.playerId !== this.getCurrentPlayer().id) {
      console.log("Not your turn or unit");
      return;
    }
    
    // Check if the unit has moves left
    if (unit.movesLeft <= 0) {
      console.log("No moves left for this unit");
      return;
    }
    
    // Check what's at the target tile
    const entityAtTarget = this.getEntityAtTile(targetX, targetY);
    
    if (entityAtTarget) {
      // If enemy entity, attack
      if (entityAtTarget.playerId !== unit.playerId) {
        this.attackEntity(unit, entityAtTarget);
      } 
      // If friendly entity, do nothing (or implement special actions later)
    } else if (this.isValidMovementTile(targetX, targetY)) {
      // Empty tile - check if we can move there
      this.moveUnit(unit, targetX, targetY);
    }
  }
  
  moveUnit(unit: Unit, targetX: number, targetY: number) {
    // Check if destination is within move range
    const path = this.pathFinder.findPath(unit.gridX, unit.gridY, targetX, targetY, unit.movesLeft);
    
    if (path.length === 0) {
      console.log("No valid path to destination");
      return;
    }
    
    // Unit can move there - update position
    const moveCost = path.length - 1; // Exclude starting position
    
    // Update walkability maps (unit no longer at old position)
    this.pathFinder.setWalkableAt(unit.gridX, unit.gridY, true);
    
    // Move the unit
    unit.move(targetX, targetY, path);
    
    // Update walkability maps (unit now at new position)
    this.pathFinder.setWalkableAt(targetX, targetY, false);
    
    // Reduce movement points
    unit.movesLeft -= moveCost;
    
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
      movesLeft: unit.movesLeft
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
    
    // Calculate attack damage based on attacker's attack vs defender's defense
    const baseDamage = attacker.attack;
    const mitigatedDamage = Math.max(1, baseDamage - defender.defense / 2);
    
    // Apply damage to the defender
    defender.takeDamage(mitigatedDamage);
    
    // Show attack animation
    attacker.playAttackAnimation(defender.gridX, defender.gridY);
    
    // Use up the attacker's action
    attacker.actionsLeft = 0;
    
    // Check if defender is defeated
    if (defender.health <= 0) {
      this.destroyEntity(defender);
    }
    
    // Update UI
    this.updateUI();
    
    // Emit event for UI
    EventBridge.emit('phaser:attackPerformed', {
      attackerId: attacker.id,
      defenderId: defender.id,
      damage: mitigatedDamage,
      defenderRemaining: defender.health
    });
  }
  
  destroyEntity(entity: Unit | Building) {
    // Make the tile walkable again
    this.pathFinder.setWalkableAt(entity.gridX, entity.gridY, true);
    
    // Remove from appropriate array
    if (entity instanceof Unit) {
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
    
    // Physically destroy the sprite
    entity.destroy();
    
    // If this was the selected entity, clear selection
    if (this.selectedEntity && this.selectedEntity.id === entity.id) {
      this.selectEntity(null);
    }
  }
  
  checkWinCondition(defeatedPlayerId: string) {
    // The player who lost their starting city has been defeated
    const victor = this.players.find(p => p.id !== defeatedPlayerId);
    if (victor) {
      // Game over - emit victory event
      EventBridge.emit('phaser:gameOver', {
        victorId: victor.id,
        victoryType: 'conquest'
      });
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
    // Check if the tile has resources
    const tile = this.tiles[targetY][targetX];
    if (!tile) return;
    
    const tileType = tile.getData('tileType');
    let resourceGained = 0;
    let resourceType: 'food' | 'production' = 'food';
    
    // Different tiles provide different resources
    if (tileType === 'grass') {
      resourceGained = 2;
      resourceType = 'food';
    } else if (tileType === 'forest') {
      resourceGained = 2;
      resourceType = 'production';
    } else if (tileType === 'hill') {
      resourceGained = 3;
      resourceType = 'production';
    }
    
    // Add resources to player
    const player = this.players.find(p => p.id === worker.playerId);
    if (player) {
      player.resources[resourceType] += resourceGained;
    }
    
    // Use up worker's action
    worker.actionsLeft = 0;
    
    // Show gathering animation
    worker.playGatherAnimation();
    
    // Update UI
    this.updateUI();
    
    // Emit event for UI
    EventBridge.emit('phaser:resourceGathered', {
      workerId: worker.id,
      resourceType,
      amount: resourceGained,
      tileX: targetX,
      tileY: targetY
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
            // Create the new unit
            this.createUnit(producedUnit, emptyTile.x, emptyTile.y, building.playerId);
            
            // Update pathfinder
            this.pathFinder.setWalkableAt(emptyTile.x, emptyTile.y, false);
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
  
  isValidMovementTile(x: number, y: number): boolean {
    // Check if within map bounds
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
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
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
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
