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

export const GameUI = () => {
  const { 
    turn, 
    currentPlayer, 
    selectedEntity,
    gamePhase,
    endTurn 
  } = useGameState();
  
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showTrainMenu, setShowTrainMenu] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');
  
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
  
  // Listen for game over events
  useEffect(() => {
    const removeListener = EventBridge.on('phaser:gameOver', (data: any) => {
      const isPlayerVictory = data.victorId === 'player1';
      setGameOverMessage(isPlayerVictory ? 'Victory! You have conquered your enemies!' : 'Defeat! Your city has fallen!');
    });
    
    return () => removeListener();
  }, []);
  
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
          <ResourceDisplay 
            food={currentPlayer.resources.food}
            production={currentPlayer.resources.production}
          />
          
          <TurnDisplay 
            turn={turn}
            currentPlayer={currentPlayer.name}
            faction={currentPlayer.faction}
          />
          
          <Button 
            onClick={handleEndTurnClick}
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
