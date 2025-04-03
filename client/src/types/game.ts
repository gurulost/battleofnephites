// Tile types
export type TileType = 'grass' | 'forest' | 'hill';

// Unit types
export type UnitType = 'worker' | 'melee' | 'ranged';

// Building types
export type BuildingType = 'city' | 'barracks';

// Faction types
export type FactionType = 'nephites' | 'lamanites' | 'mulekites' | 'anti-nephi-lehies' | 'jaredites';

// Game entities
export interface Unit {
  id: string;
  type: UnitType;
  playerId: string;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  movesLeft: number;
  actionsLeft: number;
  canActOnFirstTurn: boolean;
  gridX?: number;
  gridY?: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  playerId: string;
  health: number;
  defense: number;
  gridX?: number;
  gridY?: number;
  productionQueue: UnitType[];
  turnsToNextUnit: number;
}

// Game state interfaces
export interface Player {
  id: string;
  faction: FactionType;
  resources: {
    food: number;
    production: number;
  };
  units: Unit[];
  buildings: Building[];
}

export interface GameState {
  turn: number;
  currentPlayerId: string;
  players: Player[];
}