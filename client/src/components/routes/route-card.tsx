import { useTranslation } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Route } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { MapPin, Calendar, Users, Star } from 'lucide-react';

type RouteWithExtras = Route & {
  participantCount: number;
  creator: {
    id: number;
    username: string;
    avatar?: string;
    rating: number;
  } | null;
};

interface RouteCardProps {
  route: RouteWithExtras;
  onRouteSelect: (routeId: number) => void;
}

export default function RouteCard({ route, onRouteSelect }: RouteCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get route type icon
  const getRouteTypeIcon = (type: string) => {
    switch (type) {
      case 'road_trip':
        return <i className="fas fa-car mr-1 text-primary"></i>;
      case 'hiking':
        return <i className="fas fa-hiking mr-1 text-primary"></i>;
      case 'biking':
        return <i className="fas fa-bicycle mr-1 text-primary"></i>;
      case 'camping':
        return <i className="fas fa-campground mr-1 text-primary"></i>;
      case 'city_tour':
        return <i className="fas fa-city mr-1 text-primary"></i>;
      case 'beach':
        return <i className="fas fa-umbrella-beach mr-1 text-primary"></i>;
      case 'train':
        return <i className="fas fa-train mr-1 text-primary"></i>;
      case 'festival':
        return <i className="fas fa-music mr-1 text-primary"></i>;
      case 'food':
        return <i className="fas fa-utensils mr-1 text-primary"></i>;
      case 'mountain':
        return <i className="fas fa-mountain mr-1 text-primary"></i>;
      default:
        return <i className="fas fa-route mr-1 text-primary"></i>;
    }
  };

  // Get route type display name
  const getRouteTypeName = (type: string) => {
    return t(`route_types.${type}`);
  };

  // Join route mutation
  const joinRouteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/routes/${route.id}/join`);
    },
    onSuccess: () => {
      toast({
        title: t('routes.join_success'),
        description: t('routes.join_success_message'),
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/routes'],
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('routes.join_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleJoinClick = () => {
    if (!user) {
      toast({
        title: t('routes.login_required'),
        description: t('routes.login_to_join'),
        variant: 'destructive',
      });
      return;
    }

    joinRouteMutation.mutate();
  };

  const handleCardClick = () => {
    onRouteSelect(route.id);
  };

  // Format the date properly
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="md:flex">
        <div className="md:w-1/3 h-40 md:h-auto relative">
          {route.imageUrl ? (
            <img 
              src={route.imageUrl} 
              alt={route.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <i className="fas fa-image text-gray-400 text-4xl"></i>
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-white bg-opacity-90 text-gray-700 hover:bg-white">
            {getRouteTypeIcon(route.routeType)}
            {getRouteTypeName(route.routeType)}
          </Badge>
        </div>
        
        <div className="p-4 md:w-2/3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800">{route.title}</h3>
              <p className="text-sm text-gray-600 mt-1 flex items-center">
                <MapPin className="h-4 w-4 text-amber-500 mr-1" />
                {route.startPoint} → {route.endPoint}
              </p>
            </div>
            
            {route.creator && (
              <div className="flex items-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={route.creator.avatar || ''} />
                  <AvatarFallback>{route.creator.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {route.creator.rating > 0 && (
                  <div className="ml-1 flex items-center text-amber-400 text-xs">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="ml-1 text-gray-700">{route.creator.rating}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-2">
            <p className="text-sm text-gray-600 line-clamp-2">{route.description}</p>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDate(route.date)}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <div className="mr-4 text-gray-600 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{route.participantCount}/{route.maxParticipants}</span>
              </div>
              
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinClick();
                }}
                disabled={joinRouteMutation.isPending || route.userId === user?.id}
              >
                {route.userId === user?.id ? t('routes.your_route') : t('routes.join')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
