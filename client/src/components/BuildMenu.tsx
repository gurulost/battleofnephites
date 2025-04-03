import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Unit } from '../types/game';
import { useGameState } from '../lib/stores/useGameState';
import { useGame } from '../lib/stores/useGame';
import { X, Building, Dumbbell, Map, Check, ArrowLeft } from 'lucide-react';
import { EventBridge } from '../lib/events/EventBridge';

interface BuildMenuProps {
  onClose: () => void;
  workerUnit: Unit;
}

export const BuildMenu = ({ onClose, workerUnit }: BuildMenuProps) => {
  const { currentPlayer, buildBuilding } = useGameState();
  const { playSound } = useGame();
  const [selectedBuilding, setSelectedBuilding] = useState<'city' | 'barracks' | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [selectedTile, setSelectedTile] = useState<{x: number, y: number} | null>(null);
  const [validTiles, setValidTiles] = useState<Array<{x: number, y: number}>>([]);
  
  // Building costs and requirements
  const buildings = [
    {
      type: 'city' as const,
      name: 'City',
      description: 'A new settlement that can train workers',
      icon: <Building className="h-6 w-6" />,
      cost: { food: 5, production: 10 }
    },
    {
      type: 'barracks' as const,
      name: 'Barracks',
      description: 'Military building to train combat units',
      icon: <Dumbbell className="h-6 w-6" />,
      cost: { food: 2, production: 5 }
    }
  ];
  
  // Check if player can afford each building
  const canAfford = (foodCost: number, productionCost: number) => {
    return currentPlayer.resources.food >= foodCost && 
           currentPlayer.resources.production >= productionCost;
  };
  
  // Enter placement mode when a building is selected
  const handleSelectBuilding = (buildingType: 'city' | 'barracks') => {
    const affordable = canAfford(
      buildings.find(b => b.type === buildingType)?.cost.food || 0,
      buildings.find(b => b.type === buildingType)?.cost.production || 0
    );
    
    if (affordable) {
      setSelectedBuilding(buildingType);
      playSound('select');
    }
  };
  
  // Handle clicking the Place button to enter placement mode
  const handleEnterPlacementMode = () => {
    if (!selectedBuilding) return;
    
    // Calculate adjacent tiles to the worker
    const adjacentTiles = [
      { x: workerUnit.x + 1, y: workerUnit.y },
      { x: workerUnit.x - 1, y: workerUnit.y },
      { x: workerUnit.x, y: workerUnit.y + 1 },
      { x: workerUnit.x, y: workerUnit.y - 1 }
    ];
    
    // Enter placement mode
    setPlacementMode(true);
    setValidTiles(adjacentTiles);
    
    // Request Phaser to highlight valid tiles
    EventBridge.emit('ui:showBuildingPlacementTiles', {
      tiles: adjacentTiles,
      buildingType: selectedBuilding
    });
    
    // Default select the first valid tile
    setSelectedTile(adjacentTiles[0]);
    
    playSound('select');
  };
  
  // Handle tile selection in placement mode
  const handleTileClick = (event: any) => {
    // This event handler is for future implementation
    // where we can click directly on the tiles in the game view
  };
  
  // Handle going back from placement mode
  const handleBackFromPlacement = () => {
    setPlacementMode(false);
    setSelectedTile(null);
    
    // Tell Phaser to clear placement highlights
    EventBridge.emit('ui:hideBuildingPlacementTiles', {});
    
    playSound('select');
  };
  
  // Handle actual building placement
  const handleConfirmPlacement = () => {
    if (!selectedBuilding || !selectedTile) return;
    
    // Play build sound effect
    playSound('build');
    
    // Tell the game to build the structure
    buildBuilding(selectedBuilding, selectedTile.x, selectedTile.y);
    
    // Tell Phaser to clear placement highlights
    EventBridge.emit('ui:hideBuildingPlacementTiles', {});
    
    // Close the menu
    onClose();
  };
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Tell Phaser to clear placement highlights when menu closes
      EventBridge.emit('ui:hideBuildingPlacementTiles', {});
    };
  }, []);
  
  return (
    <Card className="mt-4 bg-slate-700 text-white border-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {placementMode 
            ? `Place ${selectedBuilding?.charAt(0).toUpperCase()}${selectedBuilding?.slice(1)}` 
            : 'Build Structure'}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={placementMode ? handleBackFromPlacement : onClose} 
          className="h-7 w-7 p-0 text-gray-400"
        >
          {placementMode ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </CardHeader>
      
      <CardContent>
        {!placementMode ? (
          // Building selection view
          <>
            <div className="space-y-2">
              {buildings.map((building) => {
                const affordable = canAfford(building.cost.food, building.cost.production);
                
                return (
                  <div 
                    key={building.type}
                    className={`
                      p-2 rounded border flex items-start gap-3 cursor-pointer
                      ${selectedBuilding === building.type ? 'border-blue-500 bg-slate-600' : 'border-slate-600'}
                      ${!affordable ? 'opacity-50' : ''}
                    `}
                    onClick={() => {
                      if (affordable) {
                        handleSelectBuilding(building.type);
                      }
                    }}
                  >
                    <div className="bg-slate-800 p-2 rounded">
                      {building.icon}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium">{building.name}</h3>
                      <p className="text-xs text-gray-300">{building.description}</p>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-yellow-400">Food: {building.cost.food}</span>
                        <span className="text-blue-400">Production: {building.cost.production}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button 
              className="w-full mt-4"
              disabled={!selectedBuilding}
              onClick={handleEnterPlacementMode}
            >
              <Map className="h-4 w-4 mr-2" />
              Choose Location
            </Button>
          </>
        ) : (
          // Placement mode view
          <>
            <p className="text-sm mb-3">
              Select a tile adjacent to your worker to place the {selectedBuilding}.
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {validTiles.map((tile, index) => (
                <Button
                  key={`${tile.x}-${tile.y}`}
                  variant={selectedTile && selectedTile.x === tile.x && selectedTile.y === tile.y ? "default" : "outline"}
                  className="h-16 flex flex-col items-center justify-center"
                  onClick={() => {
                    setSelectedTile(tile);
                    playSound('select');
                    
                    // Highlight the selected tile in the game
                    EventBridge.emit('ui:selectBuildingPlacementTile', {
                      x: tile.x,
                      y: tile.y
                    });
                  }}
                >
                  <span className="text-xs">Tile {index + 1}</span>
                  <span className="text-[10px] opacity-70">({tile.x}, {tile.y})</span>
                </Button>
              ))}
            </div>
            
            <Button 
              className="w-full"
              onClick={handleConfirmPlacement}
              disabled={!selectedTile}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirm Placement
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
