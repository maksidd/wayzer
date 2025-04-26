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
  Users,
  Clock,
  Filter,
  SortDesc
} from 'lucide-react';
import { format } from 'date-fns';
import { Route, RouteMember } from '@shared/schema';

// Type for route data with joined member info
type JoinedTrip = Route & {
  memberStatus: string;
  creatorUsername: string;
  participantCount: number;
};

export default function MyTripsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all', 'accepted', 'pending', 'upcoming', 'past'

  // Fetch user's joined trips
  const { data: userTrips, isLoading } = useQuery({
    queryKey: ['/api/routes/joined', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/routes/joined?userId=${user?.id}`);
      if (!res.ok) throw new Error('Failed to fetch user trips');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  };

  // Filter trips based on current filter
  const filteredTrips = () => {
    if (!userTrips) return [];
    
    const today = new Date();
    
    switch(filter) {
      case 'accepted':
        return userTrips.filter((trip: JoinedTrip) => 
          trip.memberStatus === 'accepted'
        );
      case 'pending':
        return userTrips.filter((trip: JoinedTrip) => 
          trip.memberStatus === 'pending'
        );
      case 'upcoming':
        return userTrips.filter((trip: JoinedTrip) => {
          const tripDate = new Date(trip.date);
          return tripDate > today;
        });
      case 'past':
        return userTrips.filter((trip: JoinedTrip) => {
          const tripDate = new Date(trip.date);
          return tripDate < today;
        });
      default:
        return userTrips;
    }
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'accepted':
        return <Badge variant="success">{t('my_trips.accepted')}</Badge>;
      case 'pending':
        return <Badge variant="warning">{t('my_trips.pending')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('my_trips.rejected')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Page header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('profile.my_trips')}</h1>
            
            <Button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              <span>{t('my_trips.explore_routes')}</span>
            </Button>
          </div>
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  {t('my_trips.all')}
                </Button>
                
                <Button
                  variant={filter === 'accepted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('accepted')}
                >
                  {t('my_trips.accepted')}
                </Button>
                
                <Button
                  variant={filter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('pending')}
                >
                  {t('my_trips.pending')}
                </Button>
                
                <Button
                  variant={filter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('upcoming')}
                >
                  {t('my_trips.upcoming')}
                </Button>
                
                <Button
                  variant={filter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('past')}
                >
                  {t('my_trips.past')}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>{t('my_trips.filter')}</span>
                </Button>
                
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <SortDesc className="h-4 w-4" />
                  <span>{t('my_trips.sort')}</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Trips list */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTrips().length > 0 ? (
              filteredTrips().map((trip: JoinedTrip) => (
                <Card key={trip.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Trip Image */}
                      <div 
                        className="h-48 md:h-auto md:w-48 bg-cover bg-center" 
                        style={{ backgroundImage: trip.imageUrl ? `url(${trip.imageUrl})` : 'url(https://images.unsplash.com/photo-1566438480900-0609be27a4be?auto=format&fit=crop&q=80)' }}
                      ></div>
                      
                      {/* Trip Info */}
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <h2 className="text-lg font-semibold">{trip.title}</h2>
                              <div className="ml-2">
                                {getStatusBadge(trip.memberStatus)}
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{trip.startPoint} → {trip.endPoint}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(trip.date)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{trip.participantCount} / {trip.maxParticipants} {t('my_trips.participants')}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{t('my_trips.organized_by')} {trip.creatorUsername}</span>
                            </div>
                          </div>
                          
                          <Badge variant="outline">
                            {t(`route_types.${trip.routeType}`)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {trip.description}
                        </p>
                        
                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/routes/${trip.id}`}
                          >
                            {t('my_trips.view_details')}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            {t('my_trips.contact_organizer')}
                          </Button>
                          
                          {trip.memberStatus === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive"
                            >
                              {t('my_trips.cancel_request')}
                            </Button>
                          )}
                          
                          {trip.memberStatus === 'accepted' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive"
                            >
                              {t('my_trips.leave_trip')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">{t('profile.no_trips')}</p>
                <Button onClick={() => window.location.href = '/'}>
                  {t('profile.find_trips')}
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