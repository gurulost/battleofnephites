import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EventBridge } from '../events/EventBridge';
import { 
  GameState, 
  GamePhase,
  Player,
  Unit,
  Building,
  UnitType,
  BuildingType,
  ResourceType
} from '../../types/game';

// Game state store with Zustand
export const useGameState = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial game state
    turn: 1,
    currentPlayer: {
      id: 'player1',
      name: 'Nephites',
      faction: 'nephites',
      resources: {
        food: 10,
        production: 10
      },
      units: [],
      buildings: [],
      startingCityId: 'city1'
    },
    players: [
      {
        id: 'player1',
        name: 'Nephites',
        faction: 'nephites',
        resources: {
          food: 10,
          production: 10
        },
        units: [],
        buildings: [],
        startingCityId: 'city1'
      },
      {
        id: 'player2',
        name: 'Lamanites',
        faction: 'lamanites',
        resources: {
          food: 10,
          production: 10
        },
        units: [],
        buildings: [],
        startingCityId: 'city2'
      }
    ],
    map: {
      width: 15,
      height: 15,
      tiles: []
    },
    selectedEntity: null,
    gamePhase: 'start',
    
    // Actions
    selectEntity: (entity) => {
      set({ selectedEntity: entity });
    },
    
    moveUnit: (unit, x, y) => {
      set(state => {
        // Find the player who owns this unit
        const playerIndex = state.players.findIndex(p => p.id === unit.playerId);
        if (playerIndex === -1) return state;
        
        // Find the unit in the player's units
        const unitIndex = state.players[playerIndex].units.findIndex(u => u.id === unit.id);
        if (unitIndex === -1) return state;
        
        // Update the unit's position
        const updatedPlayers = [...state.players];
        updatedPlayers[playerIndex].units[unitIndex] = {
          ...updatedPlayers[playerIndex].units[unitIndex],
          x,
          y,
          movesLeft: unit.movesLeft - 1
        };
        
        return { players: updatedPlayers };
      });
      
      // Tell Phaser to move the unit
      EventBridge.emit('ui:moveUnit', { unitId: unit.id, x, y });
    },
    
    buildBuilding: (buildingType, x, y) => {
      set(state => {
        const currentPlayer = state.players.find(p => p.id === state.currentPlayer.id);
        if (!currentPlayer) return state;
        
        // Check if player has enough resources
        const costs = {
          city: { food: 5, production: 10 },
          barracks: { food: 2, production: 5 }
        };
        
        if (currentPlayer.resources.food < costs[buildingType].food || 
            currentPlayer.resources.production < costs[buildingType].production) {
          console.log("Not enough resources to build structure");
          return state;
        }
        
        // Deduct resources
        const updatedPlayers = state.players.map(player => {
          if (player.id === currentPlayer.id) {
            return {
              ...player,
              resources: {
                food: player.resources.food - costs[buildingType].food,
                production: player.resources.production - costs[buildingType].production
              }
            };
          }
          return player;
        });
        
        // Tell Phaser to build the building
        EventBridge.emit('game:buildBuilding', { buildingType, x, y });
        
        return { players: updatedPlayers };
      });
    },
    
    trainUnit: (unitType, buildingId) => {
      set(state => {
        const currentPlayer = state.players.find(p => p.id === state.currentPlayer.id);
        if (!currentPlayer) return state;
        
        // Check if player has enough resources
        const costs = {
          worker: { food: 2, production: 1 },
          melee: { food: 1, production: 3 },
          ranged: { food: 1, production: 4 }
        };
        
        if (currentPlayer.resources.food < costs[unitType].food || 
            currentPlayer.resources.production < costs[unitType].production) {
          console.log("Not enough resources to train unit");
          return state;
        }
        
        // Deduct resources
        const updatedPlayers = state.players.map(player => {
          if (player.id === currentPlayer.id) {
            return {
              ...player,
              resources: {
                food: player.resources.food - costs[unitType].food,
                production: player.resources.production - costs[unitType].production
              }
            };
          }
          return player;
        });
        
        // Tell Phaser to train the unit
        EventBridge.emit('game:trainUnit', { buildingId, unitType });
        
        return { players: updatedPlayers };
      });
    },
    
    attack: (attacker, defender) => {
      EventBridge.emit('game:attack', { attackerId: attacker.id, defenderId: defender.id });
    },
    
    gatherResource: (worker, x, y) => {
      EventBridge.emit('game:gather', { workerId: worker.id, x, y });
    },
    
    endTurn: () => {
      EventBridge.emit('game:endTurn', {});
    },
    
    startGame: () => {
      import('../stores/useGameSetup').then(({ useGameSetup }) => {
        import('../../game/utils/MapGenerator').then(({ MapGenerator }) => {
          // Get game setup options
          const { 
            selectedMode, 
            selectedFaction, 
            opponents, 
            difficulty 
          } = useGameSetup.getState();
          
          if (!selectedFaction || !selectedMode) {
            console.error('Cannot start game: faction or mode not selected');
            return;
          }
          
          // Generate a balanced map based on opponent count
          const generatedMap = MapGenerator.generateBalancedMap(opponents + 1); // +1 to include human player
          
          // Create map object for the game state
          const map = {
            width: generatedMap.width,
            height: generatedMap.height,
            tiles: [] // Tiles will be created by Phaser
          };
          
          // Create players array
          const players: Player[] = [];
          
          // Add human player (always player1)
          players.push({
            id: 'player1',
            name: selectedFaction === 'nephites' ? 'Nephites' : 'Lamanites',
            faction: selectedFaction,
            resources: { food: 10, production: 10 },
            units: [],
            buildings: [],
            startingCityId: 'city1'
          });
          
          // Add AI players
          const enemyFaction = selectedFaction === 'nephites' ? 'lamanites' : 'nephites';
          for (let i = 0; i < opponents; i++) {
            players.push({
              id: `player${i + 2}`,
              name: enemyFaction === 'nephites' ? `Nephites ${i + 1}` : `Lamanites ${i + 1}`,
              faction: enemyFaction,
              resources: { food: 10, production: 10 },
              units: [],
              buildings: [],
              startingCityId: `city${i + 2}`
            });
          }
          
          // Update the game state with the new setup
          set({ 
            gamePhase: 'playing',
            players,
            currentPlayer: players[0], // Human player is always first
            map
          });
          
          // Send the map and player setup to Phaser
          EventBridge.emit('ui:setupGame', {
            map: generatedMap,
            players,
            gameMode: selectedMode,
            difficulty
          });
        });
      });
    }
  }))
);

// Listen for game state updates from Phaser
EventBridge.on('phaser:gameStateUpdate', (data: any) => {
  const { turn, currentPlayerId, players } = data;
  
  useGameState.setState(state => {
    // Update turn
    const newState: Partial<GameState> = { turn };
    
    // Update current player
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    if (currentPlayer) {
      newState.currentPlayer = currentPlayer;
    }
    
    // Update player resources
    if (players) {
      newState.players = state.players.map(player => {
        const updatedPlayer = players.find((p: any) => p.id === player.id);
        if (updatedPlayer) {
          return {
            ...player,
            resources: updatedPlayer.resources
          };
        }
        return player;
      });
    }
    
    return newState;
  });
});

// Listen for entity selection from Phaser
EventBridge.on('phaser:entitySelected', (data: any) => {
  if (data.id) {
    // An entity was selected
    useGameState.setState(state => {
      const entity = data.type === 'unit'
        ? state.players.flatMap(p => p.units).find(u => u.id === data.id)
        : state.players.flatMap(p => p.buildings).find(b => b.id === data.id);
      
      return { selectedEntity: entity || null };
    });
  } else {
    // Nothing selected
    useGameState.setState({ selectedEntity: null });
  }
});

// Listen for game over from Phaser
EventBridge.on('phaser:gameOver', (data: any) => {
  const { victorId, victoryType } = data;
  
  useGameState.setState(state => {
    const isPlayerVictory = victorId === 'player1';
    return { 
      gamePhase: isPlayerVictory ? 'victory' : 'defeat' 
    };
  });
});

// Listen for unit movement from Phaser
EventBridge.on('phaser:unitMoved', (data: any) => {
  const { unitId, newX, newY, movesLeft } = data;
  
  useGameState.setState(state => {
    // Update the unit's position in our state
    const updatedPlayers = state.players.map(player => {
      const updatedUnits = player.units.map(unit => {
        if (unit.id === unitId) {
          return {
            ...unit,
            x: newX,
            y: newY,
            movesLeft
          };
        }
        return unit;
      });
      
      return {
        ...player,
        units: updatedUnits
      };
    });
    
    return { players: updatedPlayers };
  });
});

// Listen for resource gathering from Phaser
EventBridge.on('phaser:resourceGathered', (data: any) => {
  const { workerId, resourceType, amount } = data;
  
  useGameState.setState(state => {
    // Find the worker to identify the player
    let playerId = null;
    let foundUnit = null;
    
    for (const player of state.players) {
      foundUnit = player.units.find(unit => unit.id === workerId);
      if (foundUnit) {
        playerId = player.id;
        break;
      }
    }
    
    if (!playerId) return state;
    
    // Update the player's resources
    const updatedPlayers = state.players.map(player => {
      if (player.id === playerId) {
        return {
          ...player,
          resources: {
            ...player.resources,
            [resourceType]: player.resources[resourceType as ResourceType] + amount
          }
        };
      }
      return player;
    });
    
    return { players: updatedPlayers };
  });
});

// Listen for new buildings from Phaser
EventBridge.on('phaser:buildingCreated', (data: any) => {
  const { buildingType, x, y, playerId, buildingId } = data;
  
  useGameState.setState(state => {
    // Update the player's buildings list
    const updatedPlayers = state.players.map(player => {
      if (player.id === playerId) {
        // Create a new building object
        const newBuilding: Building = {
          id: buildingId,
          type: buildingType,
          playerId,
          health: buildingType === 'city' ? 25 : 15,
          defense: buildingType === 'city' ? 3 : 2,
          x,
          y,
          productionQueue: [],
          state: 'idle'
        };
        
        return {
          ...player,
          buildings: [...player.buildings, newBuilding]
        };
      }
      return player;
    });
    
    return { players: updatedPlayers };
  });
});

// Listen for new units from Phaser
EventBridge.on('phaser:unitCreated', (data: any) => {
  const { unitType, x, y, playerId, unitId } = data;
  
  useGameState.setState(state => {
    // Update the player's units list
    const updatedPlayers = state.players.map(player => {
      if (player.id === playerId) {
        // Create a new unit object
        let health = 10;
        let attack = 1;
        let defense = 1;
        let speed = 2;
        
        switch(unitType) {
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
        
        const newUnit: Unit = {
          id: unitId,
          type: unitType,
          playerId,
          health,
          attack,
          defense,
          speed,
          x,
          y,
          movesLeft: speed,
          actionsLeft: 1,
          state: 'idle'
        };
        
        return {
          ...player,
          units: [...player.units, newUnit]
        };
      }
      return player;
    });
    
    return { players: updatedPlayers };
  });
});

// Listen for turn changes from Phaser
EventBridge.on('phaser:turnChanged', (data: any) => {
  const { currentPlayerId, turn } = data;
  
  useGameState.setState(state => {
    // Update turn and current player
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    
    // Reset movement and actions for units
    const updatedPlayers = state.players.map(player => {
      if (player.id === currentPlayerId) {
        const refreshedUnits = player.units.map(unit => ({
          ...unit,
          movesLeft: unit.speed,
          actionsLeft: 1
        }));
        
        return {
          ...player,
          units: refreshedUnits
        };
      }
      return player;
    });
    
    return { 
      turn,
      currentPlayer: currentPlayer || state.currentPlayer,
      players: updatedPlayers
    };
  });
});
