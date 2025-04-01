import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useGameSetup } from '../../lib/stores/useGameSetup';
import { useGame } from '../../lib/stores/useGame';
import { Faction } from '../../types/game';
import { ArrowLeft, ChevronRight, InfoIcon, X } from 'lucide-react';

// Faction details
const factionDetails: Record<Faction, {
  name: string;
  description: string;
  bonus: string;
  locked: boolean;
}> = {
  'nephites': {
    name: 'Nephites',
    description: 'A righteous civilization focused on faith and defense.',
    bonus: 'Start with extra food and a stronger city defense.',
    locked: false
  },
  'lamanites': {
    name: 'Lamanites',
    description: 'A fierce, tribal people skilled in warfare and survival.',
    bonus: 'Units have +1 attack strength and cost less to train.',
    locked: false
  }
};

// Additional factions (locked)
const additionalFactions: Array<Faction> = [];

interface FactionSelectProps {
  onBack: () => void;
}

export const FactionSelect = ({ onBack }: FactionSelectProps) => {
  const { selectedFaction, selectFaction, goToNextPhase, goToPreviousPhase } = useGameSetup();
  const { playSound } = useGame();
  const [detailFaction, setDetailFaction] = useState<Faction | null>(null);
  
  // Handle faction selection
  const handleSelectFaction = (faction: Faction) => {
    if (factionDetails[faction].locked) return;
    
    playSound('select');
    selectFaction(faction);
  };
  
  // Handle continue button
  const handleContinue = () => {
    if (selectedFaction) {
      playSound('select');
      goToNextPhase();
    }
  };
  
  // Handle back button
  const handleBack = () => {
    playSound('select');
    goToPreviousPhase();
  };
  
  // Show faction details
  const handleShowDetails = (faction: Faction) => {
    playSound('select');
    setDetailFaction(faction);
  };
  
  // Close faction details
  const handleCloseDetails = () => {
    playSound('select');
    setDetailFaction(null);
  };
  
  // Render faction details modal
  const renderDetailsModal = () => {
    if (!detailFaction) return null;
    
    const faction = factionDetails[detailFaction];
    
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4 bg-slate-800 text-white border-none shadow-lg">
          <CardHeader className="relative">
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute right-2 top-2"
              onClick={handleCloseDetails}
            >
              <X className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold">{faction.name}</CardTitle>
            <CardDescription className="text-slate-300">
              {faction.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="font-medium mb-1 text-primary">Starting Bonus</h3>
                <p className="text-sm text-slate-300">{faction.bonus}</p>
              </div>
              
              {/* Faction-specific visual elements could go here */}
              <div className="h-40 bg-slate-700 rounded-md flex items-center justify-center">
                <span className="text-sm text-slate-400">Faction Preview</span>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleCloseDetails}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    handleSelectFaction(detailFaction);
                    handleCloseDetails();
                  }}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  disabled={faction.locked}
                >
                  Pick
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <>
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
            <CardTitle className="flex-1 text-2xl font-bold">PICK YOUR TRIBE</CardTitle>
            <div className="w-10"></div> {/* Spacer for alignment */}
          </div>
          <CardDescription className="text-slate-300">
            Each tribe has unique bonuses and abilities
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {/* Available factions */}
            {(Object.keys(factionDetails) as Faction[]).map((faction) => (
              <div 
                key={faction}
                className={`
                  relative p-4 border-2 rounded-md flex flex-col items-center justify-center
                  cursor-pointer hover:bg-slate-700 h-28
                  ${selectedFaction === faction ? 'border-primary bg-slate-700' : 'border-slate-600'}
                  ${factionDetails[faction].locked ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => factionDetails[faction].locked ? null : handleSelectFaction(faction)}
              >
                <span className="font-semibold">{factionDetails[faction].name}</span>
                
                {/* Info button */}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 top-1 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowDetails(faction);
                  }}
                >
                  <InfoIcon className="h-4 w-4" />
                </Button>
                
                {/* Locked indicator */}
                {factionDetails[faction].locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                    <span className="text-xs text-white font-medium">LOCKED</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Locked faction placeholders */}
            {additionalFactions.map((faction, index) => (
              <div 
                key={`locked-${index}`}
                className="p-4 border-2 border-slate-600 rounded-md flex flex-col items-center justify-center opacity-50 cursor-not-allowed h-28"
              >
                <span className="font-semibold">???</span>
                <span className="text-xs text-slate-400">Locked</span>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={!selectedFaction}
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white"
            size="lg"
          >
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
      
      {/* Faction details modal */}
      {renderDetailsModal()}
    </>
  );
};