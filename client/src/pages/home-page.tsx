import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import RouteCard from '@/components/routes/route-card';
import RouteFilters from '@/components/routes/route-filters';
import RouteMap from '@/components/map/route-map'; // Восстанавливаем импорт карты
import CreateRouteModal from '@/components/routes/create-route-modal';
import MobileFilterMenu from '@/components/routes/mobile-filter-menu';
import ChatDialog from '@/components/chat/chat-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Route } from '@shared/schema';

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [routeTypeFilter, setRouteTypeFilter] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Fetch routes with type filter
  const { data: routes, isLoading } = useQuery({
    queryKey: ['/api/routes', routeTypeFilter],
    queryFn: async () => {
      const url = routeTypeFilter
        ? `/api/routes?type=${routeTypeFilter}`
        : '/api/routes';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch routes');
      return res.json();
    }
  });

  // Handle filter changes
  const handleFilterChange = (type: string | null) => {
    setRouteTypeFilter(type);
  };

  // Handle mobile filter apply
  const handleMobileFilterApply = (filters: any) => {
    setRouteTypeFilter(filters.type);
    // Other filters would be applied here
  };

  // Handle route selection
  const handleRouteSelect = (routeId: number) => {
    setSelectedRouteId(routeId);
    if (user) {
      setIsChatOpen(true);
    }
  };

  // Получаем выбранный маршрут
  const selectedRoute = routes?.find((route: Route) => route.id === selectedRouteId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        {/* Фильтры маршрутов */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <MobileFilterMenu onFilterApply={handleMobileFilterApply} />
            
            <div className="hidden md:block flex-1 mx-4">
              <RouteFilters
                onFilterChange={handleFilterChange}
                currentFilter={routeTypeFilter}
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2 hidden md:inline">{t('home.sort_by')}:</span>
              <select className="text-sm border-none bg-transparent focus:outline-none focus:ring-0 text-gray-700 font-medium">
                <option value="popular">{t('home.popular')}</option>
                <option value="newest">{t('home.newest')}</option>
                <option value="closest">{t('home.closest')}</option>
              </select>
            </div>
          </div>
          
          <h1 className="text-xl font-bold text-gray-800">{t('home.popular_routes')}</h1>
        </div>
        
        <div className="md:flex md:flex-row-reverse gap-6">
          {/* Карта (справа на десктопе, сверху на мобильных) */}
          <div className="md:w-1/2 lg:w-3/5 mb-6 md:mb-0">
            <RouteMap 
              routes={routes || []} 
              selectedRouteId={selectedRouteId}
              onRouteSelect={handleRouteSelect}
            />
          </div>
          
          {/* Левая колонка с маршрутами */}
          <div className="md:w-1/2 lg:w-2/5">
            {/* Заголовок показывающий информацию о выбранном маршруте */}
            {selectedRoute && (
              <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold">{selectedRoute.title}</h2>
                <div className="flex flex-wrap text-sm text-gray-500 mt-1">
                  <span>{selectedRoute.startPoint} → {selectedRoute.endPoint}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(selectedRoute.date).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-gray-700">{selectedRoute.description}</p>
              </div>
            )}

            {/* Список маршрутов */}
            <div className="space-y-4 md:max-h-[600px] md:overflow-y-auto pr-1">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : routes && routes.length > 0 ? (
                routes.map((route: Route) => (
                  <div key={route.id} id={`route-${route.id}`}>
                    <RouteCard 
                      route={route} 
                      onRouteSelect={handleRouteSelect} 
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">{t('home.no_routes_found')}</p>
                  {routeTypeFilter && (
                    <Button 
                      variant="link" 
                      onClick={() => setRouteTypeFilter(null)}
                    >
                      {t('home.clear_filters')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <CreateRouteModal />
      
      <ChatDialog 
        routeId={selectedRouteId} 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
      />
      
      <MobileTabs />
    </div>
  );
}
