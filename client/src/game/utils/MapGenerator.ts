import { TileType } from '../../types/game';

export interface MapTile {
  type: TileType;
  walkable: boolean;
}

export interface GeneratedMap {
  width: number;
  height: number;
  data: MapTile[][];
  startingPositions: {
    player1: { x: number, y: number };
    player2: { x: number, y: number };
    // Add more starting positions for more players if needed
    player3?: { x: number, y: number };
    player4?: { x: number, y: number };
    player5?: { x: number, y: number };
    player6?: { x: number, y: number };
  };
}

export class MapGenerator {
  /**
   * Generates a random map with appropriate size for the given player count
   */
  static generateMap(playerCount: number): GeneratedMap {
    // Scale map size based on player count
    // Minimum size 15x15, add 2 tiles in each dimension per additional player
    const mapSize = Math.max(15, 13 + (playerCount * 2));
    
    // Initialize map data
    const data: MapTile[][] = [];
    for (let y = 0; y < mapSize; y++) {
      data[y] = [];
      for (let x = 0; x < mapSize; x++) {
        // Random tile distribution: 70% grass, 20% forest, 10% hills
        const rand = Math.random();
        let tileType: TileType;
        
        if (rand < 0.7) tileType = 'grass';
        else if (rand < 0.9) tileType = 'forest';
        else tileType = 'hill';
        
        data[y][x] = {
          type: tileType,
          walkable: true // All tiles are walkable by default
        };
      }
    }
    
    // Calculate starting positions based on player count
    // For 2 players, use opposite corners
    // For more players, distribute evenly around the map
    const startingPositions: GeneratedMap['startingPositions'] = {
      player1: { x: 0, y: 0 },
      player2: { x: 0, y: 0 }
    };
    
    // Calculate player starting positions
    for (let i = 0; i < playerCount; i++) {
      // For evenly distributed starting positions, use polar coordinates
      const angle = (i / playerCount) * 2 * Math.PI;
      const distanceFromCenter = mapSize * 0.4; // 40% of map size
      
      const centerX = Math.floor(mapSize / 2);
      const centerY = Math.floor(mapSize / 2);
      
      // Convert polar to cartesian coordinates
      let x = Math.floor(centerX + Math.cos(angle) * distanceFromCenter);
      let y = Math.floor(centerY + Math.sin(angle) * distanceFromCenter);
      
      // Ensure coordinates are within map bounds
      x = Math.max(1, Math.min(mapSize - 2, x));
      y = Math.max(1, Math.min(mapSize - 2, y));
      
      // Make sure the starting positions are on grass tiles
      data[y][x] = {
        type: 'grass',
        walkable: true
      };
      
      // Add to starting positions
      startingPositions[`player${i + 1}` as keyof typeof startingPositions] = { x, y };
    }
    
    return {
      width: mapSize,
      height: mapSize,
      data,
      startingPositions
    };
  }
  
  /**
   * Creates a balanced map with resource distribution
   */
  static generateBalancedMap(playerCount: number): GeneratedMap {
    // Get a base map
    const map = this.generateMap(playerCount);
    
    // Improve resource distribution around starting positions
    const resourceRadius = 3; // Number of tiles around each starting position to ensure resources
    
    // For each player starting position
    Object.values(map.startingPositions).forEach(pos => {
      if (!pos) return;
      
      // Add some forest and hills around each starting position
      for (let dy = -resourceRadius; dy <= resourceRadius; dy++) {
        for (let dx = -resourceRadius; dx <= resourceRadius; dx++) {
          const x = pos.x + dx;
          const y = pos.y + dy;
          
          // Skip the center tile (city location) and ensure valid coordinates
          if ((dx === 0 && dy === 0) || x < 0 || y < 0 || x >= map.width || y >= map.height) {
            continue;
          }
          
          // Calculate distance from starting position
          const distance = Math.abs(dx) + Math.abs(dy);
          
          if (distance <= resourceRadius) {
            // Place resources with higher probability as distance increases
            const resourceProbability = 0.2 + (distance * 0.1);
            
            if (Math.random() < resourceProbability) {
              // 50/50 chance for forest or hill
              const isForest = Math.random() < 0.5;
              map.data[y][x] = {
                type: isForest ? 'forest' : 'hill',
                walkable: true
              };
            }
          }
        }
      }
    });
    
    // Add some additional resource clusters throughout the map
    const clusterCount = Math.floor(map.width / 5); // 1 cluster per 5 tiles of map width
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterX = Math.floor(Math.random() * map.width);
      const clusterY = Math.floor(Math.random() * map.height);
      const clusterSize = Math.floor(Math.random() * 3) + 2; // 2-4 tile clusters
      
      // Generate the resource cluster
      for (let dy = -Math.floor(clusterSize/2); dy <= Math.floor(clusterSize/2); dy++) {
        for (let dx = -Math.floor(clusterSize/2); dx <= Math.floor(clusterSize/2); dx++) {
          const x = clusterX + dx;
          const y = clusterY + dy;
          
          // Ensure valid coordinates
          if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
            continue;
          }
          
          // Don't overwrite starting position tiles
          let isStartingPosition = false;
          for (const pos of Object.values(map.startingPositions)) {
            if (pos && pos.x === x && pos.y === y) {
              isStartingPosition = true;
              break;
            }
          }
          
          if (!isStartingPosition && Math.random() < 0.7) {
            // 50/50 chance for forest or hill
            const isForest = Math.random() < 0.5;
            map.data[y][x] = {
              type: isForest ? 'forest' : 'hill',
              walkable: true
            };
          }
        }
      }
    }
    
    return map;
  }
}