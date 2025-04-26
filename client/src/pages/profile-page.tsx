import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-language';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Star, Calendar, MapPin, Edit, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);

  // Fetch user's created routes
  const { data: userRoutes, isLoading: isLoadingRoutes } = useQuery({
    queryKey: ['/api/routes', 'user', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/routes?user=${user?.id}`);
      if (!res.ok) throw new Error('Failed to fetch user routes');
      return res.json();
    },
  });

  // Fetch reviews for the user
  const { data: userReviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['/api/users', user?.id, 'reviews'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/reviews`);
      if (!res.ok) throw new Error('Failed to fetch user reviews');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest('PATCH', `/api/users/${user?.id}`, userData);
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/user'], updatedUser);
      toast({
        title: t('profile.update_success'),
        description: t('profile.update_success_message'),
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('profile.update_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!user) return null;

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      updateProfileMutation.mutate(editedUser);
    } else {
      // Enable editing
      setEditedUser(user);
      setIsEditing(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedUser({ ...editedUser, [name]: value });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="md:flex gap-6">
            {/* Left Column - Profile Card */}
            <div className="md:w-1/3 mb-6 md:mb-0">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src={user.avatar || ''} />
                      <AvatarFallback className="text-xl">{getInitials(user.fullName)}</AvatarFallback>
                    </Avatar>
                    
                    {isEditing ? (
                      <Input
                        className="text-center font-semibold text-xl mb-1"
                        name="fullName"
                        value={editedUser.fullName}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <h2 className="font-semibold text-xl mb-1">{user.fullName}</h2>
                    )}
                    
                    <p className="text-gray-500 mb-2">@{user.username}</p>
                    
                    {user.rating > 0 && (
                      <div className="flex items-center text-amber-400 mb-4">
                        <Star className="h-5 w-5 fill-current" />
                        <Star className="h-5 w-5 fill-current" />
                        <Star className="h-5 w-5 fill-current" />
                        <Star className="h-5 w-5 fill-current" />
                        <Star className="h-5 w-5 text-gray-300" />
                        <span className="ml-2 text-gray-700">{user.rating}/5</span>
                      </div>
                    )}
                    
                    <Button
                      variant={isEditing ? "default" : "outline"}
                      className="mb-4 w-full"
                      onClick={handleEditToggle}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : isEditing ? (
                        <Save className="h-4 w-4 mr-2" />
                      ) : (
                        <Edit className="h-4 w-4 mr-2" />
                      )}
                      {isEditing ? t('profile.save_profile') : t('profile.edit_profile')}
                    </Button>
                    
                    <div className="w-full space-y-4">
                      {isEditing ? (
                        <>
                          <div>
                            <Label>{t('profile.age')}</Label>
                            <Input
                              type="number"
                              name="age"
                              value={editedUser.age || ''}
                              onChange={handleInputChange}
                            />
                          </div>
                          
                          <div>
                            <Label>{t('profile.bio')}</Label>
                            <Textarea
                              name="bio"
                              value={editedUser.bio || ''}
                              onChange={handleInputChange}
                              rows={4}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <h3 className="font-medium text-sm text-gray-500">{t('profile.about')}</h3>
                            <p className="mt-1">{user.bio || t('profile.no_bio')}</p>
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-sm text-gray-500">{t('profile.age')}</h3>
                            <p className="mt-1">{user.age || t('profile.not_specified')}</p>
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-sm text-gray-500">{t('profile.travel_goal')}</h3>
                            <p className="mt-1">{t(`purpose_types.${user.travelGoal}`)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!isEditing && (
                <Card className="mt-4">
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
              )}
            </div>
            
            {/* Right Column - Tabs */}
            <div className="md:w-2/3">
              <Tabs defaultValue="routes">
                <TabsList className="w-full">
                  <TabsTrigger value="routes" className="flex-1">{t('profile.my_routes')}</TabsTrigger>
                  <TabsTrigger value="trips" className="flex-1">{t('profile.my_trips')}</TabsTrigger>
                  <TabsTrigger value="reviews" className="flex-1">{t('profile.reviews')}</TabsTrigger>
                </TabsList>
                
                {/* My Routes Tab */}
                <TabsContent value="routes" className="space-y-4 mt-4">
                  {isLoadingRoutes ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : userRoutes && userRoutes.length > 0 ? (
                    userRoutes.map((route) => (
                      <Card key={route.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{route.title}</h3>
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
                          <p className="text-sm mt-2 text-gray-600 line-clamp-2">{route.description}</p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <i className="fas fa-route text-4xl text-gray-300 mb-3"></i>
                      <p className="text-gray-500">{t('profile.no_routes')}</p>
                      <Button 
                        variant="link" 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-create-route-modal'))}
                      >
                        {t('profile.create_route')}
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                {/* My Trips Tab */}
                <TabsContent value="trips" className="space-y-4 mt-4">
                  <div className="text-center py-12">
                    <i className="fas fa-hiking text-4xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500">{t('profile.no_trips')}</p>
                    <Button variant="link" onClick={() => window.location.href = "/"}>
                      {t('profile.find_trips')}
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Reviews Tab */}
                <TabsContent value="reviews" className="space-y-4 mt-4">
                  {isLoadingReviews ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : userReviews && userReviews.length > 0 ? (
                    userReviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src={review.author?.avatar || ''} />
                              <AvatarFallback>
                                {review.author?.username.substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h3 className="font-medium">{review.author?.username}</h3>
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < review.rating ? "text-amber-400 fill-current" : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                {formatDate(review.createdAt)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <i className="fas fa-star text-4xl text-gray-300 mb-3"></i>
                      <p className="text-gray-500">{t('profile.no_reviews')}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      
      <MobileTabs />
    </div>
  );
}
