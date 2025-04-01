import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { SwordsIcon, Music, Music2, Volume2, VolumeX } from 'lucide-react';
import { useGame } from '../lib/stores/useGame';

interface StartMenuProps {
  onStartGame: () => void;
}

export const StartMenu = ({ onStartGame }: StartMenuProps) => {
  const {
    musicPlaying,
    soundEffectsEnabled,
    toggleMusic,
    toggleSoundEffects,
    playSound
  } = useGame();
  
  // Function to handle start game with sound effect
  const handleStartGame = () => {
    playSound('select');
    onStartGame();
  };
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-gradient-to-b from-slate-900 to-slate-700">
      <Card className="w-full max-w-md mx-4 bg-slate-800 text-white border-none shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-1">
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
            <SwordsIcon className="h-12 w-12 text-primary" />
            <div className="w-16"></div> {/* Empty div for spacing */}
          </div>
          <CardTitle className="text-3xl font-bold">Battles of the Covenant</CardTitle>
          <CardDescription className="text-slate-300">
            A Book of Mormon-themed strategy game
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-700 p-3 rounded">
              <h3 className="font-medium mb-1">Game Objective</h3>
              <p className="text-sm text-slate-300">
                Lead your Nephite civilization to victory by defeating the Lamanites. 
                Capture or destroy the enemy's starting city to win.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-700 p-3 rounded">
                <h3 className="font-medium mb-1">Resources</h3>
                <ul className="list-disc list-inside text-slate-300">
                  <li>Food - Feed your units</li>
                  <li>Production - Build and craft</li>
                </ul>
              </div>
              
              <div className="bg-slate-700 p-3 rounded">
                <h3 className="font-medium mb-1">Units</h3>
                <ul className="list-disc list-inside text-slate-300">
                  <li>Workers - Gather resources</li>
                  <li>Melee - Strong close fighters</li>
                  <li>Ranged - Attack from distance</li>
                </ul>
              </div>
            </div>
            
            <Button 
              onClick={handleStartGame}
              className="w-full mt-2 bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              Start Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
