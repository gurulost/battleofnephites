import { CircleDollarSign, Utensils } from 'lucide-react';

interface ResourceDisplayProps {
  food: number;
  production: number;
}

export const ResourceDisplay = ({ food, production }: ResourceDisplayProps) => {
  return (
    <div className="flex space-x-6">
      {/* Food Resource */}
      <div className="flex items-center space-x-2">
        <Utensils className="h-5 w-5 text-yellow-400" />
        <span className="text-white font-medium">{food}</span>
      </div>
      
      {/* Production Resource */}
      <div className="flex items-center space-x-2">
        <CircleDollarSign className="h-5 w-5 text-blue-400" />
        <span className="text-white font-medium">{production}</span>
      </div>
    </div>
  );
};
