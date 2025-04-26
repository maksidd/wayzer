import { useState } from 'react';
import { useTranslation } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Car, Mountain, Bike, Tent, Building, Filter, X } from 'lucide-react';
import { RouteTypes } from '@shared/schema';

interface MobileFilterMenuProps {
  onFilterApply: (filters: {
    type: string | null;
    dateFrom: Date | null;
    dateTo: Date | null;
    distance: number;
  }) => void;
}

export default function MobileFilterMenu({ onFilterApply }: MobileFilterMenuProps) {
  const { t } = useTranslation();
  const [routeType, setRouteType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [distance, setDistance] = useState<number>(50);

  const handleApplyFilters = () => {
    onFilterApply({
      type: routeType,
      dateFrom: dateFrom ? new Date(dateFrom) : null,
      dateTo: dateTo ? new Date(dateTo) : null,
      distance
    });
  };

  const routeTypeButtons = [
    { type: RouteTypes.HIKING, icon: <Mountain className="text-lg" /> },
    { type: RouteTypes.ROAD_TRIP, icon: <Car className="text-lg" /> },
    { type: RouteTypes.BIKING, icon: <Bike className="text-lg" /> },
    { type: RouteTypes.CAMPING, icon: <Tent className="text-lg" /> }
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Filter className="h-4 w-4 mr-2" />
          {t('filters.filter')}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex justify-between items-center">
            <span>{t('filters.filters')}</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">{t('filters.route_type')}</h3>
            <div className="grid grid-cols-4 gap-2">
              {routeTypeButtons.map(({ type, icon }) => (
                <Button
                  key={type}
                  variant={routeType === type ? "default" : "outline"}
                  className="flex flex-col items-center justify-center p-2 h-auto"
                  onClick={() => setRouteType(type === routeType ? null : type)}
                >
                  {icon}
                  <span className="text-xs mt-1">{t(`route_types.${type}`)}</span>
                </Button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">{t('filters.date_range')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">{t('filters.from')}</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('filters.to')}</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">{t('filters.distance')}</h3>
            <Slider
              value={[distance]}
              onValueChange={(values) => setDistance(values[0])}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>&lt; 5km</span>
              <span>&lt; 50km</span>
              <span>{t('filters.any')}</span>
            </div>
          </div>
        </div>
        
        <SheetFooter>
          <Button 
            className="w-full" 
            onClick={handleApplyFilters}
          >
            {t('filters.apply_filters')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
