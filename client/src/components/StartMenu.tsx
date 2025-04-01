import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { SwordsIcon } from 'lucide-react';

interface StartMenuProps {
  onStartGame: () => void;
}

export const StartMenu = ({ onStartGame }: StartMenuProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-gradient-to-b from-slate-900 to-slate-700">
      <Card className="w-full max-w-md mx-4 bg-slate-800 text-white border-none shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <SwordsIcon className="h-12 w-12 text-primary" />
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
              onClick={onStartGame}
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
