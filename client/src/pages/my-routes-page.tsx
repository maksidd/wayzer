import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-language';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  MapPin, 
  Calendar, 
  Plus,
  Filter,
  SortDesc
} from 'lucide-react';
import { format } from 'date-fns';
import { Route } from '@shared/schema';

export default function MyRoutesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'past', 'upcoming'

  // Fetch user's created routes
  const { data: userRoutes, isLoading } = useQuery({
    queryKey: ['/api/routes', 'user', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/routes?user=${user?.id}`);
      if (!res.ok) throw new Error('Failed to fetch user routes');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  };

  // Filter routes based on current filter
  const filteredRoutes = () => {
    if (!userRoutes) return [];
    
    const today = new Date();
    
    switch(filter) {
      case 'active':
        return userRoutes.filter((route: Route) => {
          const routeDate = new Date(route.date);
          return routeDate.toDateString() === today.toDateString();
        });
      case 'upcoming':
        return userRoutes.filter((route: Route) => {
          const routeDate = new Date(route.date);
          return routeDate > today;
        });
      case 'past':
        return userRoutes.filter((route: Route) => {
          const routeDate = new Date(route.date);
          return routeDate < today;
        });
      default:
        return userRoutes;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Page header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('profile.my_routes')}</h1>
            
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('open-create-route-modal'))}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>{t('routes.create_new_route')}</span>
            </Button>
          </div>
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  {t('my_routes.all')}
                </Button>
                
                <Button
                  variant={filter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('active')}
                >
                  {t('my_routes.active')}
                </Button>
                
                <Button
                  variant={filter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('upcoming')}
                >
                  {t('my_routes.upcoming')}
                </Button>
                
                <Button
                  variant={filter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('past')}
                >
                  {t('my_routes.past')}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>{t('my_routes.filter')}</span>
                </Button>
                
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <SortDesc className="h-4 w-4" />
                  <span>{t('my_routes.sort')}</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Routes list */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRoutes().length > 0 ? (
              filteredRoutes().map((route: Route) => (
                <Card key={route.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Route Image */}
                      <div 
                        className="h-48 md:h-auto md:w-48 bg-cover bg-center" 
                        style={{ backgroundImage: route.imageUrl ? `url(${route.imageUrl})` : 'url(https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80)' }}
                      ></div>
                      
                      {/* Route Info */}
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-lg font-semibold">{route.title}</h2>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{route.startPoint} → {route.endPoint}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(route.date)}</span>
                            </div>
                          </div>
                          
                          <Badge variant="outline">
                            {t(`route_types.${route.routeType}`)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {route.description}
                        </p>
                        
                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/routes/${route.id}`}
                          >
                            {t('my_routes.view_details')}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            {t('my_routes.edit')}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            {t('my_routes.share')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">{t('profile.no_routes')}</p>
                <Button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-create-route-modal'))}
                >
                  {t('profile.create_route')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <MobileTabs />
    </div>
  );
}