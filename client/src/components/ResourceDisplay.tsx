import { CircleDollarSign, Utensils } from 'lucide-react';

interface ResourceDisplayProps {
  food: number;
  production: number;
}

export const ResourceDisplay = ({ food, production }: ResourceDisplayProps) => {
  return (
    <div className="flex space-x-6">
      {/* Food Resource */}
      <div className="flex items-center space-x-2 cursor-help" title="Food is needed to train units and sustain your population. Gather from grass tiles.">
        <Utensils className="h-5 w-5 text-yellow-400" />
        <div className="flex flex-col">
          <span className="text-white font-medium">{food}</span>
          <span className="text-white/50 text-xs">Food</span>
        </div>
      </div>
      
      {/* Production Resource */}
      <div className="flex items-center space-x-2 cursor-help" title="Production is used to construct buildings and equipment. Gather from forest tiles (2) and hill tiles (3).">
        <CircleDollarSign className="h-5 w-5 text-blue-400" />
        <div className="flex flex-col">
          <span className="text-white font-medium">{production}</span>
          <span className="text-white/50 text-xs">Production</span>
        </div>
      </div>
    </div>
  );
};
