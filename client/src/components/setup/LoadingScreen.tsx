import { useEffect, useState } from 'react';
import { useGameSetup } from '../../lib/stores/useGameSetup';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const { selectedMode, selectedFaction, opponents, difficulty } = useGameSetup();
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Creating world...');
  
  // Simulate loading process
  useEffect(() => {
    const loadingSteps = [
      { progress: 15, text: 'Generating terrain...' },
      { progress: 35, text: 'Placing resources...' },
      { progress: 55, text: 'Creating civilizations...' },
      { progress: 75, text: 'Establishing boundaries...' },
      { progress: 90, text: 'Finalizing...' },
      { progress: 100, text: 'Ready!' }
    ];
    
    let currentStep = 0;
    
    // Update progress at intervals
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setProgress(loadingSteps[currentStep].progress);
        setLoadingText(loadingSteps[currentStep].text);
        currentStep++;
        
        // When complete, trigger the callback
        if (currentStep === loadingSteps.length) {
          setTimeout(() => {
            onComplete();
          }, 500);
        }
      } else {
        clearInterval(interval);
      }
    }, 800);
    
    return () => clearInterval(interval);
  }, [onComplete]);
  
  return (
    <div className="w-full max-w-md mx-4 bg-slate-800 text-white border-none shadow-lg p-8 rounded-lg">
      <div className="flex flex-col items-center justify-center space-y-6">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        
        <div className="w-full space-y-2">
          <div className="flex justify-between text-sm">
            <span>{loadingText}</span>
            <span>{progress}%</span>
          </div>
          
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-slate-400 mt-6">
            <div>
              <div>Mode: <span className="capitalize">{selectedMode}</span></div>
              <div>Faction: <span className="capitalize">{selectedFaction}</span></div>
            </div>
            <div className="text-right">
              <div>Opponents: {opponents}</div>
              <div>Difficulty: <span className="capitalize">{difficulty}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};