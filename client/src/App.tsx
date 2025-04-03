import { useEffect, useState, useRef } from 'react';
import Phaser from 'phaser';
import { GameUI } from './components/GameUI';
import { StartMenu } from './components/StartMenu';
import { GameConfig } from './game/config';
import { EventBridge } from './lib/events/EventBridge';
import { useGameState } from './lib/stores/useGameState';
import { useGame } from './lib/stores/useGame';
import { useGameSetup } from './lib/stores/useGameSetup';
import { SoundService } from './lib/services/SoundService';
import { useAudio } from './lib/stores/useAudio';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const soundService = useRef<SoundService>(SoundService.getInstance());
  const { gamePhase, startGame } = useGameState();
  const { start: startUIGame } = useGame();
  const { setupPhase } = useGameSetup();
  const { musicEnabled } = useAudio();

  // Initialize the Phaser game when component mounts
  useEffect(() => {
    // Only create the game instance once
    if (gameRef.current && !gameInstance.current) {
      gameInstance.current = new Phaser.Game({
        ...GameConfig,
        parent: gameRef.current,
      });
      
      // Connect the sound service to the game instance
      soundService.current.connectToGame(gameInstance.current);

      // When component unmounts, destroy the game instance
      return () => {
        if (gameInstance.current) {
          gameInstance.current.destroy(true);
          gameInstance.current = null;
        }
        // Stop any playing music when unmounting
        soundService.current.stopMusic();
      };
    }
  }, []);
  
  // Play theme music when the app starts and when music enabled status changes
  useEffect(() => {
    if (musicEnabled && gamePhase === 'start') {
      soundService.current.playMusic('theme');
    } else {
      soundService.current.stopMusic();
    }
    
    // Connect SoundService to event system
    EventBridge.on('game:playSound', (data: { key: string }) => {
      soundService.current.playSound(data.key);
    });
    
    EventBridge.on('game:playMusic', (data: { key: string }) => {
      soundService.current.playMusic(data.key);
    });
    
    EventBridge.on('game:stopMusic', () => {
      soundService.current.stopMusic();
    });
    
    return () => {
      EventBridge.off('game:playSound');
      EventBridge.off('game:playMusic');
      EventBridge.off('game:stopMusic');
    };
  }, [musicEnabled, gamePhase]);

  // Handle game start
  const handleStartGame = () => {
    setGameStarted(true);
    
    // Emit event to Phaser game to start the game
    EventBridge.emit('ui:startGame', {});
    
    // Update both game state stores
    startGame();
    startUIGame();
    
    // Play sound effect and switch music to battle theme
    soundService.current.playSound('select');
    if (musicEnabled) {
      soundService.current.stopMusic();
      soundService.current.playMusic('battle');
    }
  };

  return (
    <div className="game-container w-full h-screen overflow-hidden bg-background">
      {/* Phaser game canvas container */}
      <div 
        ref={gameRef} 
        className="w-full h-full absolute top-0 left-0 z-0"
      />

      {/* UI Layer: Show appropriate UI based on game state */}
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
