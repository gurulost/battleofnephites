import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useGameSetup, Difficulty } from '../../lib/stores/useGameSetup';
import { useGame } from '../../lib/stores/useGame';
import { ArrowLeft, ChevronRight, MinusIcon, PlusIcon, Users } from 'lucide-react';

interface GameSetupProps {
  onStartGame: () => void;
}

export const GameSetup = ({ onStartGame }: GameSetupProps) => {
  const { 
    selectedMode, 
    selectedFaction, 
    opponents, 
    difficulty, 
    setOpponents, 
    setDifficulty, 
    goToPreviousPhase 
  } = useGameSetup();
  
  const { playSound } = useGame();
  
  // Handle back button
  const handleBack = () => {
    playSound('select');
    goToPreviousPhase();
  };
  
  // Handle opponent count change
  const handleOpponentChange = (change: number) => {
    const newCount = Math.max(1, Math.min(5, opponents + change));
    if (newCount !== opponents) {
      playSound('select');
      setOpponents(newCount);
    }
  };
  
  // Handle difficulty change
  const handleSetDifficulty = (level: Difficulty) => {
    playSound('select');
    setDifficulty(level);
  };
  
  // Handle start game
  const handleStartGame = () => {
    playSound('select');
    onStartGame();
  };
  
  // Get map size based on opponent count
  const getMapSize = () => {
    switch (opponents) {
      case 1: return "Small (15x15)";
      case 2: return "Medium (20x20)";
      case 3: return "Large (25x25)";
      case 4: return "Very Large (30x30)";
      case 5: return "Huge (35x35)";
      default: return "Small (15x15)";
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-4 bg-slate-800 text-white border-none shadow-lg">
      <CardHeader className="text-center">
        <div className="flex items-center mb-2">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleBack}
            className="mr-auto"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="flex-1 text-2xl font-bold">GAME SETUP</CardTitle>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>
        <CardDescription className="text-slate-300">
          Customize your game settings
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Game info summary */}
          <div className="bg-slate-700 p-3 rounded-md">
            <h3 className="font-medium mb-1">Game Info</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-300">
              <span className="text-slate-400">Mode:</span>
              <span className="text-right capitalize">{selectedMode}</span>
              
              <span className="text-slate-400">Tribe:</span>
              <span className="text-right capitalize">{selectedFaction}</span>
            </div>
          </div>
          
          {/* Opponents setting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Opponents</h3>
              <div className="flex items-center">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-7 w-7"
                  onClick={() => handleOpponentChange(-1)}
                  disabled={opponents <= 1}
                >
                  <MinusIcon className="h-3 w-3" />
                </Button>
                <span className="mx-2 font-semibold">{opponents}</span>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-7 w-7"
                  onClick={() => handleOpponentChange(1)}
                  disabled={opponents >= 5}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center text-sm text-slate-300">
              <Users className="h-3 w-3 mr-1" />
              <span>Map Size: {getMapSize()}</span>
            </div>
          </div>
          
          {/* Difficulty setting */}
          <div className="space-y-2">
            <h3 className="font-medium mb-1">Difficulty</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['easy', 'normal', 'hard', 'crazy'] as Difficulty[]).map((level) => (
                <Button 
                  key={level}
                  variant={difficulty === level ? "default" : "outline"}
                  className={`
                    capitalize py-1 px-2 h-auto
                    ${difficulty === level ? 'bg-primary hover:bg-primary/90' : ''}
                  `}
                  onClick={() => handleSetDifficulty(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {difficulty === 'easy' && "Recommended for beginners. AI plays defensively."}
              {difficulty === 'normal' && "Balanced gameplay. AI uses basic strategies."}
              {difficulty === 'hard' && "For experienced players. AI plays aggressively."}
              {difficulty === 'crazy' && "The ultimate challenge. AI gets resource bonuses."}
            </p>
          </div>
          
          <Button 
            onClick={handleStartGame}
            className="w-full mt-2 bg-primary hover:bg-primary/90 text-white"
            size="lg"
          >
            Start Game
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};