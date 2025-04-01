import { CalendarDays } from 'lucide-react';
import { Faction } from '../types/game';

interface TurnDisplayProps {
  turn: number;
  currentPlayer: string;
  faction: Faction;
}

export const TurnDisplay = ({ turn, currentPlayer, faction }: TurnDisplayProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center space-x-2">
        <CalendarDays className="h-5 w-5 text-gray-300" />
        <span className="text-white font-medium">Turn {turn}</span>
      </div>
      
      <div className="text-sm text-gray-300">
        {currentPlayer}'s turn
      </div>
    </div>
  );
};
