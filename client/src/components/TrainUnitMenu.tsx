import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Building, UnitType } from '../types/game';
import { useGameState } from '../lib/stores/useGameState';
import { X, User, Swords, Crosshair } from 'lucide-react';

interface TrainUnitMenuProps {
  onClose: () => void;
  building: Building;
}

export const TrainUnitMenu = ({ onClose, building }: TrainUnitMenuProps) => {
  const { currentPlayer, trainUnit } = useGameState();
  const [selectedUnit, setSelectedUnit] = useState<UnitType | null>(null);
  
  // Determine available units based on building type
  const availableUnits: {
    type: UnitType;
    name: string;
    description: string;
    icon: JSX.Element;
    cost: { food: number; production: number };
  }[] = [];
  
  if (building.type === 'city') {
    availableUnits.push({
      type: 'worker',
      name: 'Worker',
      description: 'Gathers resources and builds structures',
      icon: <User className="h-6 w-6" />,
      cost: { food: 2, production: 1 }
    });
  } else if (building.type === 'barracks') {
    availableUnits.push({
      type: 'melee',
      name: 'Melee Unit',
      description: 'Strong close combat fighter',
      icon: <Swords className="h-6 w-6" />,
      cost: { food: 1, production: 3 }
    });
    availableUnits.push({
      type: 'ranged',
      name: 'Ranged Unit',
      description: 'Attacks from a distance',
      icon: <Crosshair className="h-6 w-6" />,
      cost: { food: 1, production: 4 }
    });
  }
  
  // Check if player can afford each unit
  const canAfford = (foodCost: number, productionCost: number) => {
    return currentPlayer.resources.food >= foodCost && 
           currentPlayer.resources.production >= productionCost;
  };
  
  // Handle train button click
  const handleTrain = () => {
    if (!selectedUnit) return;
    
    trainUnit(selectedUnit, building.id);
    onClose();
  };
  
  return (
    <Card className="mt-4 bg-slate-700 text-white border-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Train Unit</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-gray-400">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        {availableUnits.length > 0 ? (
          <div className="space-y-2">
            {availableUnits.map((unit) => {
              const affordable = canAfford(unit.cost.food, unit.cost.production);
              
              return (
                <div 
                  key={unit.type}
                  className={`
                    p-2 rounded border flex items-start gap-3 cursor-pointer
                    ${selectedUnit === unit.type ? 'border-blue-500 bg-slate-600' : 'border-slate-600'}
                    ${!affordable ? 'opacity-50' : ''}
                  `}
                  onClick={() => affordable && setSelectedUnit(unit.type)}
                >
                  <div className="bg-slate-800 p-2 rounded">
                    {unit.icon}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium">{unit.name}</h3>
                    <p className="text-xs text-gray-300">{unit.description}</p>
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-yellow-400">Food: {unit.cost.food}</span>
                      <span className="text-blue-400">Production: {unit.cost.production}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-300">
            No units available to train in this building
          </div>
        )}
        
        {availableUnits.length > 0 && (
          <Button 
            className="w-full mt-4"
            disabled={!selectedUnit}
            onClick={handleTrain}
          >
            Train
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
