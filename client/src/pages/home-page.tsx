import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import RouteCard from '@/components/routes/route-card';
import RouteFilters from '@/components/routes/route-filters';
// Временно отключаем карту
// import RouteMap from '@/components/map/route-map';
import CreateRouteModal from '@/components/routes/create-route-modal';
import MobileFilterMenu from '@/components/routes/mobile-filter-menu';
import ChatDialog from '@/components/chat/chat-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Map } from 'lucide-react';

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
  const selectedRoute = routes?.find(route => route.id === selectedRouteId);

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
        
        {/* Заголовок показывающий информацию о выбранном маршруте */}
        {selectedRoute && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold">{selectedRoute.title}</h2>
            <div className="flex text-sm text-gray-500 mt-1">
              <span>{selectedRoute.startPoint} → {selectedRoute.endPoint}</span>
              <span className="mx-2">•</span>
              <span>{new Date(selectedRoute.date).toLocaleDateString()}</span>
            </div>
            <p className="mt-2 text-gray-700">{selectedRoute.description}</p>
          </div>
        )}

        {/* Содержимое */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : routes && routes.length > 0 ? (
            routes.map((route) => (
              <div key={route.id} id={`route-${route.id}`}>
                <RouteCard 
                  route={route} 
                  onRouteSelect={handleRouteSelect} 
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <i className="fas fa-route text-4xl text-gray-300 mb-3"></i>
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

        {/* Заглушка вместо карты */}
        <div className="mt-8 p-6 bg-gray-100 border border-gray-200 rounded-lg text-center">
          <Map className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">{t('home.map_placeholder')}</p>
          <Button variant="outline" className="mt-2" onClick={() => alert('Карта временно недоступна')}>
            {t('home.view_on_map')}
          </Button>
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
