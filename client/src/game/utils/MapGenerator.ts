import { Faction, Map, Player, TileType } from "../../types/game";

// Map generation constants
const TILE_TYPES: TileType[] = ['grass', 'forest', 'hill'];

// Map size by opponent count
export const MAP_SIZES = {
  1: { width: 15, height: 15 },
  2: { width: 20, height: 20 },
  3: { width: 25, height: 25 },
  4: { width: 30, height: 30 },
  5: { width: 35, height: 35 }
};

/**
 * Generates a unique ID (simplistic version)
 */
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generates a game map with procedurally generated terrain
 */
export function generateMap(opponents: number): Map {
  // Get map dimensions based on opponent count
  const { width, height } = MAP_SIZES[opponents as keyof typeof MAP_SIZES] || MAP_SIZES[1];
  
  // Create empty tiles array
  const tiles: Map['tiles'] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));
  
  // Fill tiles with procedurally generated terrain
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Simple terrain generation - can be improved with noise functions
      const tileTypeIndex = Math.floor(Math.random() * TILE_TYPES.length);
      const type = TILE_TYPES[tileTypeIndex];
      
      // All tile types are walkable in our current game
      const walkable = true;
      
      tiles[y][x] = {
        x,
        y,
        type,
        walkable,
        resourceAmount: getResourceAmount(type)
      };
    }
  }
  
  return {
    width,
    height,
    tiles
  };
}

/**
 * Gets the resource amount for a given tile type
 */
function getResourceAmount(type: TileType): number {
  switch (type) {
    case 'grass':
      return 2; // Food
    case 'forest':
      return 2; // Production
    case 'hill':
      return 3; // Production
    default:
      return 0;
  }
}

/**
 * Generates players based on game setup
 */
export function generatePlayers(
  playerFaction: Faction, 
  opponents: number, 
  playerName: string = 'Player'
): Player[] {
  const players: Player[] = [];
  
  // Create human player
  const humanPlayer: Player = {
    id: generateUniqueId(),
    name: playerName,
    faction: playerFaction,
    resources: {
      food: 10,
      production: 10
    },
    units: [],
    buildings: [],
    startingCityId: generateUniqueId()
  };
  
  players.push(humanPlayer);
  
  // Create AI players
  const opponentFaction: Faction = playerFaction === 'nephites' ? 'lamanites' : 'nephites';
  
  for (let i = 0; i < opponents; i++) {
    const aiPlayer: Player = {
      id: generateUniqueId(),
      name: `${opponentFaction.charAt(0).toUpperCase() + opponentFaction.slice(1)} Tribe ${i + 1}`,
      faction: opponentFaction,
      resources: {
        food: 10,
        production: 10
      },
      units: [],
      buildings: [],
      startingCityId: generateUniqueId()
    };
    
    players.push(aiPlayer);
  }
  
  return players;
}

/**
 * Finds suitable city placement locations on the map for each player
 */
export function findCityLocations(map: Map, playerCount: number): { x: number, y: number }[] {
  const locations: { x: number, y: number }[] = [];
  const { width, height } = map;
  
  // For simplicity in this example, we'll place cities in fixed positions
  // In a real implementation, you'd want to use a more sophisticated algorithm
  // that ensures cities are well-spaced and in resource-rich areas
  
  // Place human player's city in the center
  locations.push({ 
    x: Math.floor(width / 2), 
    y: Math.floor(height / 2) 
  });
  
  // Place AI cities at the corners and edges
  if (playerCount > 1) locations.push({ x: 2, y: 2 });
  if (playerCount > 2) locations.push({ x: width - 3, y: height - 3 });
  if (playerCount > 3) locations.push({ x: width - 3, y: 2 });
  if (playerCount > 4) locations.push({ x: 2, y: height - 3 });
  if (playerCount > 5) locations.push({ x: Math.floor(width / 2), y: 2 });
  
  return locations;
}