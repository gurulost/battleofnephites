import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useGameSetup, GameMode } from '../../lib/stores/useGameSetup';
import { useGame } from '../../lib/stores/useGame';
import { Shield, Timer } from 'lucide-react';

interface GameModeSelectProps {
  onBack?: () => void;
}

export const GameModeSelect = ({ onBack }: GameModeSelectProps) => {
  const { selectedMode, selectGameMode, goToNextPhase } = useGameSetup();
  const { playSound } = useGame();
  
  // Handle mode selection
  const handleSelectMode = (mode: GameMode) => {
    playSound('select');
    selectGameMode(mode);
  };
  
  // Handle continue button
  const handleContinue = () => {
    if (selectedMode) {
      playSound('select');
      goToNextPhase();
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-4 bg-slate-800 text-white border-none shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">SELECT GAME MODE</CardTitle>
        <CardDescription className="text-slate-300">
          Choose how you would like to play
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div 
            className={`
              p-4 border-2 rounded-md flex items-center space-x-3 cursor-pointer hover:bg-slate-700
              ${selectedMode === 'domination' ? 'border-primary bg-slate-700' : 'border-slate-600'}
            `}
            onClick={() => handleSelectMode('domination')}
          >
            <div className="bg-primary/20 p-2 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Domination</h3>
              <p className="text-sm text-slate-300">
                Conquer your enemies by capturing or destroying their starting city. No turn limit.
              </p>
            </div>
          </div>
          
          <div 
            className={`
              p-4 border-2 rounded-md flex items-center space-x-3 cursor-pointer hover:bg-slate-700
              ${selectedMode === 'perfection' ? 'border-primary bg-slate-700' : 'border-slate-600'}
            `}
            onClick={() => handleSelectMode('perfection')}
          >
            <div className="bg-yellow-500/20 p-2 rounded-full">
              <Timer className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Perfection <span className="text-xs text-yellow-500">(ADVANCED)</span></h3>
              <p className="text-sm text-slate-300">
                Score as many points as possible within 30 turns. For experienced players.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={!selectedMode}
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};