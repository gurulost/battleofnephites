import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Unit } from '../types/game';
import { useGameState } from '../lib/stores/useGameState';
import { useGame } from '../lib/stores/useGame';
import { X, Building, Dumbbell } from 'lucide-react';

interface BuildMenuProps {
  onClose: () => void;
  workerUnit: Unit;
}

export const BuildMenu = ({ onClose, workerUnit }: BuildMenuProps) => {
  const { currentPlayer, buildBuilding } = useGameState();
  const { playSound } = useGame();
  const [selectedBuilding, setSelectedBuilding] = useState<'city' | 'barracks' | null>(null);
  
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
  
  // Handle build button click
  const handleBuild = () => {
    if (!selectedBuilding) return;
    
    // Find a valid tile near the worker for building
    // In a real implementation, this would show a UI for selecting the build location
    // For this MVP, we'll just build adjacent to the worker (simple approach)
    
    const adjacentPositions = [
      { x: workerUnit.x + 1, y: workerUnit.y },
      { x: workerUnit.x - 1, y: workerUnit.y },
      { x: workerUnit.x, y: workerUnit.y + 1 },
      { x: workerUnit.x, y: workerUnit.y - 1 }
    ];
    
    // For this simple MVP, just use the first position (the game logic will validate)
    const buildPosition = adjacentPositions[0];
    
    // Play build sound effect
    playSound('build');
    
    buildBuilding(selectedBuilding, buildPosition.x, buildPosition.y);
    onClose();
  };
  
  return (
    <Card className="mt-4 bg-slate-700 text-white border-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Build Structure</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-gray-400">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
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
                    setSelectedBuilding(building.type);
                    playSound('select');
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
          onClick={handleBuild}
        >
          Build
        </Button>
      </CardContent>
    </Card>
  );
};
