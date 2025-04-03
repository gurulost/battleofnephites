import { useEffect } from 'react';
import { useGameSetup } from '../lib/stores/useGameSetup';
import { GameModeSelect } from './setup/GameModeSelect';
import { FactionSelect } from './setup/FactionSelect';
import { GameSetup } from './setup/GameSetup';
import { LoadingScreen } from './setup/LoadingScreen';

interface GameSetupFlowProps {
  onStartGame: () => void;
}

export const GameSetupFlow = ({ onStartGame }: GameSetupFlowProps) => {
  const { setupPhase, goToNextPhase, selectedFaction, opponents, difficulty, selectedMode } = useGameSetup();
  
  // Expose the game setup state to the window object for Phaser to access
  useEffect(() => {
    // Make game setup state available globally for Phaser
    (window as any).gameSetupState = {
      selectedFaction,
      opponents, 
      difficulty,
      selectedMode
    };
    
    // Clean up on unmount
    return () => {
      // Keep the state available even after unmount so Phaser can use it
      // but we'll mark it as inactive
      (window as any).gameSetupState = {
        ...((window as any).gameSetupState || {}),
        active: false
      };
    };
  }, [selectedFaction, opponents, difficulty, selectedMode]);
  
  const handleLoadingComplete = () => {
    // This advances to the game phase in the setup state
    goToNextPhase();
    
    // This triggers the actual game start
    onStartGame();
  };
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-gradient-to-b from-slate-900 to-slate-700">
      {setupPhase === 'mode' && <GameModeSelect />}
      {setupPhase === 'faction' && <FactionSelect onBack={() => goToNextPhase()} />}
      {setupPhase === 'setup' && <GameSetup onStartGame={() => goToNextPhase()} />}
      {setupPhase === 'loading' && <LoadingScreen onComplete={handleLoadingComplete} />}
    </div>
  );
};