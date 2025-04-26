import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import RouteCard from '@/components/routes/route-card';
import RouteFilters from '@/components/routes/route-filters';
import RouteMap from '@/components/map/route-map';
import CreateRouteModal from '@/components/routes/create-route-modal';
import MobileFilterMenu from '@/components/routes/mobile-filter-menu';
import ChatDialog from '@/components/chat/chat-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

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

  // When a route is selected on the map, find it in the list and scroll to it
  useEffect(() => {
    if (selectedRouteId) {
      const routeElement = document.getElementById(`route-${selectedRouteId}`);
      if (routeElement) {
        routeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedRouteId]);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto md:px-4 md:py-6 flex-1">
        <div className="md:flex">
          {/* Left Side: Routes List */}
          <div className="md:w-1/2 md:pr-3 bg-white md:bg-transparent">
            {/* Filters */}
            <div className="p-4">
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
            
            {/* Routes List */}
            <div className="px-4 pb-16 md:pb-4 space-y-4 md:h-[calc(100vh-12rem)] md:overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-12">
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
                <div className="text-center py-12">
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
          </div>
          
          {/* Right Side: Map */}
          <div className="md:w-1/2 md:pl-3">
            <RouteMap 
              routes={routes || []} 
              selectedRouteId={selectedRouteId}
              onRouteSelect={handleRouteSelect}
            />
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
