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
  specialAbility: string;
  victoryType: string;
  strengths: string[];
  weaknesses: string[];
  uniqueUnits: string[];
}> = {
  'nephites': {
    name: 'Nephites',
    description: 'Technologically advanced defenders with a focus on city development and defensive strategies.',
    bonus: 'Cities have +2 defense and start with extra food.',
    locked: false,
    specialAbility: '"Title of Liberty" - Provides morale buff to all units when faith is high.',
    victoryType: 'Defensive / Cultural / Religious',
    strengths: [
      'Heavy armor and fortifications',
      'Scripture-based research boosts',
      'Skilled in record-keeping and tactics'
    ],
    weaknesses: [
      'Vulnerable to pride and internal dissent',
      'Kingmen rebellions when faith is low'
    ],
    uniqueUnits: [
      'Stripling Warriors (high defense, available when righteous)',
      'Chief Judge (leadership unit)'
    ]
  },
  'lamanites': {
    name: 'Lamanites',
    description: 'Aggressive expansionists with superior early-game power and mobility.',
    bonus: 'Units have +1 attack strength and cost 20% less to train.',
    locked: false,
    specialAbility: '"Blood Feud" - Units gain a damage boost when fighting against Nephites.',
    victoryType: 'Domination / Cultural Conversion',
    strengths: [
      'High mobility and speed',
      'Superior early-game power',
      'Strong melee units'
    ],
    weaknesses: [
      'Susceptible to ideological conversion',
      'Inconsistent political unity'
    ],
    uniqueUnits: [
      'Berserker (high attack, reduced defense)',
      'Converted Warrior (can switch sides)'
    ]
  },
  'mulekites': {
    name: 'Mulekites of Zarahemla',
    description: 'Cultural chameleons and diplomatic power brokers with adaptable ideology.',
    bonus: 'Gain population faster and receive bonuses in multicultural cities.',
    locked: false,
    specialAbility: '"Cultural Reclamation" - Gain permanent buffs by recovering knowledge from other factions.',
    victoryType: 'Diplomatic / Cultural / Historical Recovery',
    strengths: [
      'Fast population growth',
      'Adaptable ideology',
      'Diplomatic influence'
    ],
    weaknesses: [
      'Start without scripture infrastructure',
      'Vulnerable to early cultural domination'
    ],
    uniqueUnits: [
      'Royal Envoy (diplomatic unit)',
      'Zarahemla Guard (defensive unit)',
      'Memory Seeker (knowledge gatherer)'
    ]
  },
  'anti-nephi-lehies': {
    name: 'Anti-Nephi-Lehies',
    description: 'Pacifist faith-builders focused on cultural influence and conversion.',
    bonus: 'Superior cultural and faith output, can convert enemy units through non-violent means.',
    locked: false,
    specialAbility: '"Covenant of Peace" - Can convert enemy units when their morale breaks.',
    victoryType: 'Faith / Cultural Conversion',
    strengths: [
      'Strong cultural influence',
      'Missionary conversion abilities',
      'Inspire and support other factions'
    ],
    weaknesses: [
      'Cannot initiate combat',
      'Highly vulnerable in early game'
    ],
    uniqueUnits: [
      'Missionary (conversion unit)',
      'Stripling Youth (defensive only)'
    ]
  },
  'jaredites': {
    name: 'Jaredites',
    description: 'Ancient imperial might with powerful units and institutions, but plagued by civil war.',
    bonus: 'Larger units with higher base stats, access to unique war animals.',
    locked: false,
    specialAbility: '"Prophetic Collapse" - Risk of total destruction event if pride exceeds 80%.',
    victoryType: 'Military / Tragic Heroic Collapse',
    strengths: [
      'Giant units like Coriantumr',
      'Long-standing institutions',
      'Large-scale warfare capabilities'
    ],
    weaknesses: [
      'Plagued by endless civil war',
      'Pride leads to self-destruction',
      'Limited diplomatic options'
    ],
    uniqueUnits: [
      'War Elephant (high power unit)',
      'Etherian Prophet (spiritual leader)'
    ]
  }
};

// Additional factions for future expansions
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
          
          <CardContent className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Special Ability */}
              <div>
                <h3 className="font-medium mb-1 text-primary">Special Ability</h3>
                <p className="text-sm text-slate-300">{faction.specialAbility}</p>
              </div>
              
              {/* Starting Bonus */}
              <div>
                <h3 className="font-medium mb-1 text-primary">Starting Bonus</h3>
                <p className="text-sm text-slate-300">{faction.bonus}</p>
              </div>
              
              {/* Victory Type */}
              <div>
                <h3 className="font-medium mb-1 text-primary">Victory Type</h3>
                <p className="text-sm text-slate-300">{faction.victoryType}</p>
              </div>
              
              {/* Strengths */}
              <div>
                <h3 className="font-medium mb-1 text-primary">Strengths</h3>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {faction.strengths.map((strength, index) => (
                    <li key={`strength-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
              
              {/* Weaknesses */}
              <div>
                <h3 className="font-medium mb-1 text-primary">Weaknesses</h3>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {faction.weaknesses.map((weakness, index) => (
                    <li key={`weakness-${index}`}>{weakness}</li>
                  ))}
                </ul>
              </div>
              
              {/* Unique Units */}
              <div>
                <h3 className="font-medium mb-1 text-primary">Unique Units</h3>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {faction.uniqueUnits.map((unit, index) => (
                    <li key={`unit-${index}`}>{unit}</li>
                  ))}
                </ul>
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
        
        <CardContent className="max-h-[70vh] overflow-y-auto pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Available factions */}
            {(Object.keys(factionDetails) as Faction[]).map((faction) => (
              <div 
                key={faction}
                className={`
                  relative p-3 border-2 rounded-md flex flex-col items-center justify-center
                  cursor-pointer hover:bg-slate-700 h-24
                  ${selectedFaction === faction ? 'border-primary bg-slate-700' : 'border-slate-600'}
                  ${factionDetails[faction].locked ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => factionDetails[faction].locked ? null : handleSelectFaction(faction)}
              >
                <span className="font-semibold text-sm text-center">{factionDetails[faction].name}</span>
                <span className="text-xs text-slate-300 mt-1 text-center line-clamp-1">{factionDetails[faction].victoryType}</span>
                
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
                className="p-4 border-2 border-slate-600 rounded-md flex flex-col items-center justify-center opacity-50 cursor-not-allowed h-24"
              >
                <span className="font-semibold">???</span>
                <span className="text-xs text-slate-400">Locked</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 sticky bottom-0 bg-slate-800 pt-3">
            <Button 
              onClick={handleContinue}
              disabled={!selectedFaction}
              className="w-full bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Faction details modal */}
      {renderDetailsModal()}
    </>
  );
};