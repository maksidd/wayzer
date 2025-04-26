import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-language';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Star, Calendar, ThumbsUp, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Review } from '@shared/schema';

// Extended review type with author info
type ReviewWithAuthor = Review & {
  author?: {
    id: number;
    username: string;
    avatar?: string;
  };
  route?: {
    id: number;
    title: string;
  };
};

export default function ReviewsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('received');

  // Fetch reviews received by the user
  const { data: receivedReviews, isLoading: isLoadingReceived } = useQuery({
    queryKey: ['/api/users', user?.id, 'reviews'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/reviews`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch reviews left by the user
  const { data: givenReviews, isLoading: isLoadingGiven } = useQuery({
    queryKey: ['/api/users', user?.id, 'reviews', 'given'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/reviews/given`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  };

  // Get rating stars component
  const getRatingStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? "text-amber-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Page header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{t('reviews.title')}</h1>
            
            <div className="flex items-center">
              <div className="flex mr-2">
                {getRatingStars(user?.rating || 0)}
              </div>
              <span className="font-semibold">{user?.rating || 0}/5</span>
            </div>
          </div>
          
          {/* Reviews tabs */}
          <Tabs 
            defaultValue={activeTab} 
            onValueChange={setActiveTab}
            className="bg-white rounded-lg shadow-sm"
          >
            <div className="p-4 border-b">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="received">{t('reviews.received')}</TabsTrigger>
                <TabsTrigger value="given">{t('reviews.given')}</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Received reviews tab */}
            <TabsContent value="received" className="p-4 space-y-4">
              {isLoadingReceived ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : receivedReviews && receivedReviews.length > 0 ? (
                receivedReviews.map((review: ReviewWithAuthor) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={review.author?.avatar || ''} />
                          <AvatarFallback>
                            {review.author?.username ? getInitials(review.author.username) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{review.author?.username}</h3>
                            {getRatingStars(review.rating)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                          
                          {review.route && (
                            <div className="bg-gray-50 p-2 rounded mt-2 text-xs text-gray-600">
                              {t('reviews.for_route')}: <span className="font-medium">{review.route.title}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs text-gray-400 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(review.createdAt)}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ThumbsUp className="h-4 w-4 text-gray-400" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MessageCircle className="h-4 w-4 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('profile.no_reviews')}</p>
                  <p className="text-gray-400 text-sm mt-2">{t('reviews.received_explainer')}</p>
                </div>
              )}
            </TabsContent>
            
            {/* Given reviews tab */}
            <TabsContent value="given" className="p-4 space-y-4">
              {isLoadingGiven ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : givenReviews && givenReviews.length > 0 ? (
                givenReviews.map((review: ReviewWithAuthor) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={review.author?.avatar || ''} />
                          <AvatarFallback>
                            {review.author?.username ? getInitials(review.author.username) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium">
                              {t('reviews.your_review_for')} {review.author?.username}
                            </h3>
                            {getRatingStars(review.rating)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                          
                          {review.route && (
                            <div className="bg-gray-50 p-2 rounded mt-2 text-xs text-gray-600">
                              {t('reviews.for_route')}: <span className="font-medium">{review.route.title}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs text-gray-400 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(review.createdAt)}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 text-xs"
                              >
                                {t('reviews.edit')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('reviews.no_reviews_given')}</p>
                  <p className="text-gray-400 text-sm mt-2">{t('reviews.given_explainer')}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <MobileTabs />
    </div>
  );
}