import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-language';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Calendar, 
  MapPin, 
  Edit, 
  Loader2, 
  Mail,
  Phone,
  Globe,
  MessageCircle,
  User,
  MapIcon
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Get display name (full name or username)
  const getDisplayName = () => {
    if (!user) return '';
    return user.fullName || user.username;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <Avatar className="h-16 w-16 mr-4">
                <AvatarImage src={user.avatar || ''} />
                <AvatarFallback className="text-xl">{getInitials(getDisplayName())}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
                <p className="text-gray-500">@{user.username}</p>
                {user.rating > 0 && (
                  <div className="flex items-center text-amber-400 mt-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="ml-1 text-gray-700">{user.rating.toFixed(1)}/5</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation('/edit-profile')}
                className="flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('profile.edit_profile')}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setLocation('/my-routes')}
                className="flex items-center"
              >
                <MapIcon className="h-4 w-4 mr-2" />
                {t('profile.my_routes')}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - About Me */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('profile.about')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-700">
                      {user.bio || t('profile.no_bio')}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center mb-3">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">{t('profile.age')}:</span>
                      <span className="ml-auto">{user.age || t('profile.not_specified')}</span>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">{t('profile.gender')}:</span>
                      <span className="ml-auto">{user.gender ? t(`profile.gender_${user.gender}`) : t('profile.not_specified')}</span>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">{t('profile.location')}:</span>
                      <span className="ml-auto">{user.location || t('profile.not_specified')}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">{t('profile.joined')}:</span>
                      <span className="ml-auto">{user.createdAt ? formatDate(user.createdAt) : t('profile.not_specified')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('profile.interests')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.interests && user.interests.length > 0 ? (
                      user.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary">
                          {t(`interests.${interest}`)}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">{t('profile.no_interests')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('profile.languages')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.languages && user.languages.length > 0 ? (
                      user.languages.map((language, index) => (
                        <Badge key={index} variant="outline">
                          {language}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">{t('profile.no_languages')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Middle Column - Photos & Stats */}
            <div className="md:col-span-2 space-y-6">
              {/* Photos */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{t('profile.photos')}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-xs"
                    onClick={() => setLocation('/edit-profile')}
                  >
                    {t('profile.add_photos')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {user.photos && user.photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {user.photos.map((photo, index) => (
                        <div 
                          key={index} 
                          className="aspect-square bg-gray-100 rounded-md bg-cover bg-center"
                          style={{ backgroundImage: `url(${photo})` }}
                        ></div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-md">
                      <p className="text-gray-500 text-sm">{t('profile.no_photos')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <MapIcon className="h-10 w-10 mx-auto mb-2 text-primary" />
                    <h3 className="text-2xl font-bold">
                      {user.routesCount || '0'}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('profile.routes_created')}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <MapPin className="h-10 w-10 mx-auto mb-2 text-primary" />
                    <h3 className="text-2xl font-bold">
                      {user.tripsCount || '0'}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('profile.trips_joined')}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <Star className="h-10 w-10 mx-auto mb-2 text-primary" />
                    <h3 className="text-2xl font-bold">
                      {user.reviewsCount || '0'}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('profile.reviews_received')}</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('profile.contact_info')}</CardTitle>
                  <CardDescription>
                    {t('profile.contact_description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium">{t('profile.email')}</h4>
                        <p className="text-gray-700">{user.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium">{t('profile.phone')}</h4>
                        <p className="text-gray-700">{user.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.telegram && (
                    <div className="flex items-center">
                      <MessageCircle className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium">{t('profile.telegram')}</h4>
                        <p className="text-gray-700">{user.telegram}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.whatsapp && (
                    <div className="flex items-center">
                      <MessageCircle className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium">{t('profile.whatsapp')}</h4>
                        <p className="text-gray-700">{user.whatsapp}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.website && (
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium">{t('profile.website')}</h4>
                        <p className="text-gray-700">
                          <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {user.website.replace(/^https?:\/\//, '')}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!user.email && !user.phone && !user.telegram && !user.whatsapp && !user.website && (
                    <div className="text-center py-3">
                      <p className="text-gray-500">{t('profile.no_contact_info')}</p>
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => setLocation('/edit-profile')}
                      >
                        {t('profile.add_contact_info')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Quick Links */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => setLocation('/my-routes')}
                  className="flex items-center"
                >
                  <MapIcon className="h-4 w-4 mr-2" />
                  {t('profile.view_all_routes')}
                </Button>
                
                <Button 
                  onClick={() => setLocation('/my-trips')}
                  variant="outline"
                  className="flex items-center"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {t('profile.view_all_trips')}
                </Button>
                
                <Button 
                  onClick={() => setLocation('/reviews')}
                  variant="outline"
                  className="flex items-center"
                >
                  <Star className="h-4 w-4 mr-2" />
                  {t('profile.view_all_reviews')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <MobileTabs />
    </div>
  );
}
