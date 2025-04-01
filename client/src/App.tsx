import { useEffect, useState, useRef } from 'react';
import Phaser from 'phaser';
import { GameUI } from './components/GameUI';
import { StartMenu } from './components/StartMenu';
import { GameConfig } from './game/config';
import { EventBridge } from './lib/events/EventBridge';
import { useGameState } from './lib/stores/useGameState';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const { gamePhase, startGame } = useGameState();

  // Initialize the Phaser game when component mounts
  useEffect(() => {
    // Only create the game instance once
    if (gameRef.current && !gameInstance.current) {
      gameInstance.current = new Phaser.Game({
        ...GameConfig,
        parent: gameRef.current,
      });

      // When component unmounts, destroy the game instance
      return () => {
        if (gameInstance.current) {
          gameInstance.current.destroy(true);
          gameInstance.current = null;
        }
      };
    }
  }, []);

  // Handle game start
  const handleStartGame = () => {
    setGameStarted(true);
    
    // Emit event to Phaser game to start the game
    EventBridge.emit('ui:startGame', {});
    
    // Update global game state
    startGame();
  };

  return (
    <div className="game-container w-full h-screen overflow-hidden bg-background">
      {/* Phaser game canvas container */}
      <div 
        ref={gameRef} 
        className="w-full h-full absolute top-0 left-0 z-0"
      />

      {/* UI Layer: Either show Start Menu or Game UI based on game state */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        {gamePhase === 'start' ? (
          <StartMenu onStartGame={handleStartGame} />
        ) : (
          <GameUI />
        )}
      </div>
    </div>
  );
}

export default App;
