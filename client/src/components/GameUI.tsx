import { useEffect, useState } from 'react';
import { ResourceDisplay } from './ResourceDisplay';
import { SelectionPanel } from './SelectionPanel';
import { BuildMenu } from './BuildMenu';
import { TrainUnitMenu } from './TrainUnitMenu';
import { TurnDisplay } from './TurnDisplay';
import { useGameState } from '../lib/stores/useGameState';
import { EventBridge } from '../lib/events/EventBridge';
import { Button } from './ui/button';
import { Building, Unit } from '../types/game';
import { Card, CardContent } from './ui/card';
import { Swords, Shield, Heart, Volume2, VolumeX, Music, Music2 } from 'lucide-react';
import { useGame } from '../lib/stores/useGame';

// Combat prediction display component
const CombatPredictor = ({ 
  attacker, 
  defender, 
  terrainBonus = 0 
}: { 
  attacker: Unit; 
  defender: Unit | Building; 
  terrainBonus?: number;
}) => {
  // Calculate expected damage
  const calculateDamage = () => {
    const attackValue = attacker.attack;
    const defenseValue = defender.defense + terrainBonus;
    return Math.max(1, attackValue - defenseValue / 2);
  };
  
  // Calculate health after attack
  const calculateRemainingHealth = () => {
    const damage = calculateDamage();
    return Math.max(0, defender.health - damage);
  };
  
  // Calculate if attack will defeat the defender
  const willDefeat = () => {
    return calculateRemainingHealth() <= 0;
  };
  
  const expectedDamage = calculateDamage();
  const remainingHealth = calculateRemainingHealth();
  const defeatPrediction = willDefeat();
  
  return (
    <Card className="mt-4 bg-slate-700 border-red-500 border">
      <CardContent className="p-3">
        <h3 className="text-white font-bold mb-2 flex items-center">
          <Swords className="h-4 w-4 mr-1 text-red-500" />
          Combat Prediction
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center">
            <Swords className="h-4 w-4 mr-1 text-orange-400" /> 
            <span className="text-white text-sm">Attack: {attacker.attack}</span>
          </div>
          
          <div className="flex items-center">
            <Shield className="h-4 w-4 mr-1 text-blue-400" /> 
            <span className="text-white text-sm">Defense: {defender.defense} {terrainBonus > 0 ? `+${terrainBonus}` : ''}</span>
          </div>
        </div>
        
        <div className="mt-2 p-2 bg-slate-800 rounded-md">
          <div className="text-white text-sm flex items-center mb-1">
            <span className="text-red-500 font-bold mr-2">-{expectedDamage}</span>
            <span>Expected damage</span>
          </div>
          
          <div className="text-white text-sm flex items-center">
            <Heart className="h-4 w-4 mr-1 text-red-400" />
            <span>{remainingHealth} / {defender.health} HP remaining</span>
          </div>
          
          {defeatPrediction && (
            <div className="mt-2 text-red-500 text-sm font-bold">
              Will defeat enemy!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const GameUI = () => {
  const { 
    turn, 
    currentPlayer, 
    selectedEntity,
    gamePhase,
    endTurn,
    players
  } = useGameState();
  
  const {
    musicPlaying,
    soundEffectsEnabled,
    toggleMusic,
    toggleSoundEffects,
    playSound
  } = useGame();
  
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showTrainMenu, setShowTrainMenu] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [combatTarget, setCombatTarget] = useState<Unit | Building | null>(null);
  const [terrainBonus, setTerrainBonus] = useState<number>(0);
  const [attackingUnit, setAttackingUnit] = useState<Unit | null>(null);
  
  // Handle build button click
  const handleBuildClick = () => {
    setShowBuildMenu(true);
    setShowTrainMenu(false);
  };
  
  // Handle train button click
  const handleTrainClick = () => {
    setShowTrainMenu(true);
    setShowBuildMenu(false);
  };
  
  // Handle end turn button click
  const handleEndTurnClick = () => {
    setShowBuildMenu(false);
    setShowTrainMenu(false);
    endTurn();
  };
  
  // Listen for game events
  useEffect(() => {
    // Handle game over events
    const gameOverListener = EventBridge.on('phaser:gameOver', (data: any) => {
      const isPlayerVictory = data.victorId === 'player1';
      setGameOverMessage(isPlayerVictory ? 'Victory! You have conquered your enemies!' : 'Defeat! Your city has fallen!');
    });
    
    // Handle potential combat target detection
    const potentialCombatListener = EventBridge.on('phaser:potentialCombat', (data: any) => {
      const { attackerId, defenderId, terrainDefenseBonus } = data;
      
      // Find attacker and defender entities
      let attacker: Unit | null = null;
      let defender: Unit | Building | null = null;
      
      // Search among all players' units and buildings
      for (const player of players) {
        // Look for attacker in units
        const foundAttacker = player.units.find(unit => unit.id === attackerId);
        if (foundAttacker) attacker = foundAttacker;
        
        // Look for defender in units
        const foundDefenderUnit = player.units.find(unit => unit.id === defenderId);
        if (foundDefenderUnit) defender = foundDefenderUnit;
        
        // Look for defender in buildings
        const foundDefenderBuilding = player.buildings.find(building => building.id === defenderId);
        if (foundDefenderBuilding) defender = foundDefenderBuilding;
      }
      
      if (attacker && defender) {
        setAttackingUnit(attacker);
        setCombatTarget(defender);
        setTerrainBonus(terrainDefenseBonus || 0);
      } else {
        setAttackingUnit(null);
        setCombatTarget(null);
      }
    });
    
    // Clear combat prediction when selection changes or attack completes
    const clearCombatListener = EventBridge.on('phaser:entitySelected', () => {
      setCombatTarget(null);
      setAttackingUnit(null);
    });
    
    const attackCompletedListener = EventBridge.on('phaser:attackPerformed', () => {
      setCombatTarget(null);
      setAttackingUnit(null);
    });
    
    const clearPredictionListener = EventBridge.on('phaser:clearCombatPrediction', () => {
      setCombatTarget(null);
      setAttackingUnit(null);
    });
    
    return () => {
      gameOverListener();
      potentialCombatListener();
      clearCombatListener();
      attackCompletedListener();
      clearPredictionListener();
    };
  }, [players]);
  
  // Don't render UI during start phase
  if (gamePhase === 'start') {
    return null;
  }
  
  // Game over screen
  if (gamePhase === 'victory' || gamePhase === 'defeat') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white pointer-events-auto">
        <div className="bg-slate-800 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-3xl mb-4 font-bold">
            {gamePhase === 'victory' ? 'Victory!' : 'Defeat!'}
          </h2>
          <p className="mb-6 text-xl">{gameOverMessage}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Play Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar with resources and turn info */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-slate-800 bg-opacity-80 pointer-events-auto">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <ResourceDisplay 
              food={currentPlayer.resources.food}
              production={currentPlayer.resources.production}
            />
            
            {/* Audio controls */}
            <div className="flex gap-1 ml-4">
              <Button 
                size="icon"
                variant="outline" 
                onClick={() => {
                  toggleMusic(); 
                  playSound('select');
                }}
                className="h-8 w-8 rounded-full"
              >
                {musicPlaying ? <Music className="h-4 w-4" /> : <Music2 className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button 
                size="icon"
                variant="outline" 
                onClick={() => {
                  // Play sound before toggling if sound is enabled
                  if (soundEffectsEnabled) {
                    playSound('select');
                  }
                  toggleSoundEffects();
                }}
                className="h-8 w-8 rounded-full"
              >
                {soundEffectsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
          
          <TurnDisplay 
            turn={turn}
            currentPlayer={currentPlayer.name}
            faction={currentPlayer.faction}
          />
          
          <Button 
            onClick={() => {
              handleEndTurnClick();
              playSound('select');
            }}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            End Turn
          </Button>
        </div>
      </div>
      
      {/* Selection panel (right side) */}
      <div className="absolute right-0 top-20 bottom-0 w-72 p-4 bg-slate-800 bg-opacity-80 pointer-events-auto overflow-y-auto">
        {selectedEntity ? (
          <SelectionPanel 
            entity={selectedEntity} 
            onBuildClick={handleBuildClick}
            onTrainClick={handleTrainClick}
          />
        ) : (
          <div className="text-white text-center mt-8">
            <p>Select a unit or building</p>
          </div>
        )}
        
        {/* Combat prediction when hovering enemy */}
        {attackingUnit && combatTarget && (
          <CombatPredictor 
            attacker={attackingUnit} 
            defender={combatTarget}
            terrainBonus={terrainBonus}
          />
        )}
        
        {/* Build menu */}
        {showBuildMenu && selectedEntity && (selectedEntity as Unit).type === 'worker' && (
          <BuildMenu 
            onClose={() => setShowBuildMenu(false)}
            workerUnit={selectedEntity as Unit}
          />
        )}
        
        {/* Train unit menu */}
        {showTrainMenu && selectedEntity && 'productionQueue' in selectedEntity && (
          <TrainUnitMenu 
            onClose={() => setShowTrainMenu(false)}
            building={selectedEntity as Building}
          />
        )}
      </div>
    </div>
  );
};
