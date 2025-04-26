import { useState } from 'react';
import { useTranslation } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { 
  Car, Backpack, Bike, Tent, Building, 
  UmbrellaOff, Train, Music, Utensils, Mountain
} from 'lucide-react';

interface RouteFiltersProps {
  onFilterChange: (type: string | null) => void;
  currentFilter: string | null;
}

export default function RouteFilters({ onFilterChange, currentFilter }: RouteFiltersProps) {
  const { t } = useTranslation();
  
  const filters = [
    { id: null, label: 'all', icon: null },
    { id: 'road_trip', label: 'road_trip', icon: <Car className="h-4 w-4 mr-1" /> },
    { id: 'hiking', label: 'hiking', icon: <Backpack className="h-4 w-4 mr-1" /> },
    { id: 'biking', label: 'biking', icon: <Bike className="h-4 w-4 mr-1" /> },
    { id: 'camping', label: 'camping', icon: <Tent className="h-4 w-4 mr-1" /> },
    { id: 'city_tour', label: 'city_tour', icon: <Building className="h-4 w-4 mr-1" /> },
    { id: 'beach', label: 'beach', icon: <UmbrellaOff className="h-4 w-4 mr-1" /> },
    { id: 'train', label: 'train', icon: <Train className="h-4 w-4 mr-1" /> },
    { id: 'festival', label: 'festival', icon: <Music className="h-4 w-4 mr-1" /> },
    { id: 'food', label: 'food', icon: <Utensils className="h-4 w-4 mr-1" /> },
    { id: 'mountain', label: 'mountain', icon: <Mountain className="h-4 w-4 mr-1" /> }
  ];

  return (
    <div className="flex items-center space-x-2 pb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
      {filters.map(filter => (
        <Button
          key={filter.id?.toString() || 'all'}
          variant={currentFilter === filter.id ? "default" : "outline"}
          size="sm"
          className="flex items-center"
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.icon}
          {t(`route_types.${filter.label}`)}
        </Button>
      ))}
    </div>
  );
}
