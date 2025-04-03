import { Building, Unit } from '../types/game';
import { Button } from './ui/button';
import { ShieldAlert, Hammer, UserPlus, Heart, Swords, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SelectionPanelProps {
  entity: Unit | Building;
  onBuildClick: () => void;
  onTrainClick: () => void;
}

export const SelectionPanel = ({ entity, onBuildClick, onTrainClick }: SelectionPanelProps) => {
  // Determine if entity is a unit or building
  const isUnit = 'attack' in entity;
  
  // Helper to capitalize first letter
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  
  return (
    <Card className="bg-slate-700 text-white border-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          {isUnit ? (
            <Swords className="h-5 w-5" />
          ) : (
            <Hammer className="h-5 w-5" />
          )}
          {capitalize(entity.type)}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Stats section */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            <span>HP: {entity.health}</span>
          </div>
          
          {isUnit ? (
            <>
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-orange-400" />
                <span>Attack: {(entity as Unit).attack}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <span>Defense: {entity.defense}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-purple-400" />
                <span>Speed: {(entity as Unit).speed}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <span>Defense: {entity.defense}</span>
            </div>
          )}
        </div>
        
        {/* Status section - show moves left for units */}
        {isUnit && (
          <div className="mb-4 text-sm">
            <p>Moves left: {(entity as Unit).movesLeft}</p>
            <p>Actions left: {(entity as Unit).actionsLeft}</p>
            {/* Show information about whether the unit can act on its first turn */}
            <p className="mt-1 text-xs text-slate-300">
              {(entity as Unit).canActOnFirstTurn 
                ? "Can act on turn created" 
                : "Cannot act on turn created"}
            </p>
          </div>
        )}
        
        {/* Production queue for buildings */}
        {!isUnit && 'productionQueue' in entity && Array.isArray((entity as Building).productionQueue) && (entity as Building).productionQueue.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Production Queue:</h3>
            <div className="bg-slate-800 p-2 rounded text-xs">
              {(entity as Building).productionQueue.map((unitType, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{capitalize(unitType)}</span>
                  {idx === 0 && (
                    <span>
                      {typeof (entity as Building).turnsToNextUnit === 'number' 
                        ? `${(entity as Building).turnsToNextUnit} turns` 
                        : 'In progress'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-4">
          {/* Worker can build */}
          {isUnit && (entity as Unit).type === 'worker' && (entity as Unit).actionsLeft > 0 && (
            <Button onClick={onBuildClick} variant="secondary" className="w-full">
              <Hammer className="h-4 w-4 mr-2" />
              Build
            </Button>
          )}
          
          {/* Buildings can train units */}
          {'productionQueue' in entity && (
            <Button onClick={onTrainClick} variant="secondary" className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Train Unit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
