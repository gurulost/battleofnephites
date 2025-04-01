// Game types

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  occupiedBy?: Unit | Building;
  resourceAmount?: number;
}

export type TileType = 'grass' | 'forest' | 'hill';

export interface Resource {
  type: ResourceType;
  amount: number;
}

export type ResourceType = 'food' | 'production';

export interface GameState {
  // Game state
  turn: number;
  currentPlayer: Player;
  players: Player[];
  map: Map;
  selectedEntity: Unit | Building | null;
  gamePhase: GamePhase;
  
  // Actions
  selectEntity: (entity: Unit | Building | null) => void;
  moveUnit: (unit: Unit, x: number, y: number) => void;
  buildBuilding: (buildingType: BuildingType, x: number, y: number) => void;
  trainUnit: (unitType: UnitType, buildingId: string) => void;
  attack: (attacker: Unit, defender: Unit | Building) => void;
  gatherResource: (worker: Unit, x: number, y: number) => void;
  endTurn: () => void;
  startGame: () => void;
}

export type GamePhase = 'start' | 'playing' | 'victory' | 'defeat';

export interface Player {
  id: string;
  name: string;
  faction: Faction;
  resources: {
    food: number;
    production: number;
  };
  units: Unit[];
  buildings: Building[];
  startingCityId: string;
}

export type Faction = 'nephites' | 'lamanites';

export interface Map {
  width: number;
  height: number;
  tiles: Tile[][];
}

export interface Unit {
  id: string;
  type: UnitType;
  playerId: string;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  x: number;
  y: number;
  movesLeft: number;
  actionsLeft: number;
  state: EntityState;
}

export type UnitType = 'worker' | 'melee' | 'ranged';

export interface Building {
  id: string;
  type: BuildingType;
  playerId: string;
  health: number;
  defense: number;
  x: number;
  y: number;
  productionQueue: UnitType[];
  turnsToNextUnit?: number;
  state: EntityState;
}

export type BuildingType = 'city' | 'barracks';

export type EntityState = 'idle' | 'moving' | 'attacking' | 'gathering';

export interface PathNode {
  x: number;
  y: number;
  f: number;
  g: number;
  h: number;
  parent?: PathNode;
}

export interface EventPayload {
  type: string;
  data?: any;
}
