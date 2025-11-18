import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Users, 
  Calendar, 
  Car, 
  Plane, 
  Train, 
  Bike, 
  PersonStanding, 
  Ship, 
  Phone, 
  Mail,
  MessageCircle,
  X,
  MapIcon,
  Clock,
  Send,
  MessageSquare
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { InsertMessage } from "@shared/schema";
import { RouteDisplayMap } from "./route-display-map";
import { FavoriteButton } from "@/components/favorite-button";
import { GalleryModal } from "@/components/gallery-modal";
import React from "react";
import { UserProfileModal } from "@/components/user-profile-modal";

const transportIcons = {
  car: Car,
  plane: Plane,
  train: Train,
  bike: Bike,
  walk: PersonStanding,
  boat: Ship,
  public_transport: Train,
} as const;

const transportNames = {
  car: "Car",
  plane: "Plane", 
  train: "Train",
  bike: "Bicycle",
  walk: "Walk",
  boat: "Boat",
  public_transport: "Public Transport",
} as const;

interface TripDetailModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TripDetailModal({ tripId, isOpen, onClose }: TripDetailModalProps) {
  const [joinMessage, setJoinMessage] = useState("Hi! I'd like to join :)");
  const [hasAlreadyResponded, setHasAlreadyResponded] = useState(false);
  const [joinRequestSent, setJoinRequestSent] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return null;

      const response = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
  });

  const { data: trip, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) throw new Error("Failed to load trip");
      return response.json();
    },
    enabled: !!tripId && isOpen,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["/api/trips", tripId, "participants"],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}/participants`);
      if (!response.ok) throw new Error("Failed to load participants");
      return response.json();
    },
    enabled: !!tripId && isOpen,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["/api/trips", tripId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}/comments`);
      if (!response.ok) throw new Error("Failed to load comments");
      return response.json();
    },
    enabled: !!tripId && isOpen,
  });

  // Check user status in trip
  const { data: tripStatus } = useQuery({
    queryKey: ["/api/trips", tripId, "status"],
    queryFn: async () => {
      if (!user || !tripId) return { status: null };
      const response = await apiRequest(`/api/trips/${tripId}/status`);
      return response.json();
    },
    enabled: !!user && !!tripId && isOpen,
  });

  const joinTripMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/trips2/${tripId}/join`, {
      method: 'POST',
      });
      return response.json();
    },
    onSuccess: () => {
      setJoinMessage("Hi! I'd like to join :)");
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "participants"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send request",
        variant: "destructive",
      });
    },
  });

  const sendJoinMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; tripId: string; text: string }) => {
      // Send single message with type "request"
      await apiRequest('/api/messages2', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: data.receiverId,
          text: data.text,
          tripId: data.tripId,
          type: 'request',
        }),
        headers: { 'Content-Type': 'application/json' },
      }).then(r => r.json());

      return true;
    },
    onSuccess: () => {
      setJoinRequestSent(true);
      setHasAlreadyResponded(true);
      joinTripMutation.mutate();
      toast({
        title: "Request sent",
        description: "Message sent to route creator",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations2'] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "status"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const leaveTripMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/trips/${tripId}/leave`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You left the trip",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to leave trip",
        variant: "destructive",
      });
    },
  });

  // Favorite trips list (for displaying active heart)
  const { data: favoriteTrips = [] } = useQuery<any[]>({
    queryKey: ["/api/favorites", user?.id],
    enabled: !!user, // only if logged in
    queryFn: async () => {
      const resp = await fetch('/api/favorites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` || ''
        }
      });
      const data = await resp.json();
      return data;
    }
  });

  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryIndex, setGalleryIndex] = React.useState(0);
  const allPhotos = React.useMemo(() => {
    if (!trip) return [];
    return [
      ...(trip.mainPhotoUrl ? [trip.mainPhotoUrl] : []),
      ...(trip.additionalPhotos || [])
    ];
  }, [trip]);

  if (!trip && !isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Route not found</DialogTitle>
          <div className="text-center py-8">
            <p className="text-gray-500">Trip not found</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Loading...</DialogTitle>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Only after trip is guaranteed to be defined
  const TransportIcon = transportIcons[trip.type as keyof typeof transportIcons] || Car;

  // Check user status
  const isCreator = user && trip.creatorId === user.id;
  const userStatus = tripStatus?.status;
  const isParticipant = userStatus === 'approved';
  const hasPendingApplication = userStatus === 'pending';
  const isRejected = userStatus === 'rejected';




  const canJoin = user && !isParticipant && !isCreator && participants.length < trip.maxParticipants;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleJoinTrip = () => {
    if (!user || !trip || !joinMessage.trim()) return;

    sendJoinMessageMutation.mutate({
      receiverId: trip.creatorId,
      text: joinMessage,
      tripId: trip.id,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trip.title}</DialogTitle>
          <DialogDescription className="sr-only">Route details, photos, participants and chat</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-3">Trip details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{trip.city}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{formatDate(trip.dateTime)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{participants.length}/{trip.maxParticipants} participants</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {trip.description && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-3">Description</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{trip.description}</p>
                  </CardContent>
                </Card>
              )}
              {/* Route map */}
              {trip.route && trip.route.length > 0 && (
                <Card>
                  <CardContent className="p-0">
                    <RouteDisplayMap 
                      route={trip.route} 
                      center={trip.location}
                      className="w-full h-72 md:h-96"
                    />
                  </CardContent>
                </Card>
              )}
              {/* Additional photos */}
              {trip.additionalPhotos && trip.additionalPhotos.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-3">Additional photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {trip.additionalPhotos.map((photo: string, index: number) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden transition duration-300 ease-in-out hover:scale-105 hover:cursor-zoom-in">
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                            onClick={() => { setGalleryIndex((trip.mainPhotoUrl ? 1 : 0) + index); setGalleryOpen(true); }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {/* Main Photo with hover effect and gallery */}
              {trip.mainPhotoUrl && (
                <div
                  className="w-full h-64 rounded-lg overflow-hidden relative transition duration-300 ease-in-out hover:scale-105 hover:cursor-zoom-in"
                  onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}
                >
                  <img
                    src={trip.mainPhotoUrl}
                    alt={trip.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Route type badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="secondary" className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm">
                      <TransportIcon className="h-3 w-3" />
                      <span className="text-xs">
                        {transportNames[trip.type as keyof typeof transportNames] || trip.type}
                      </span>
                    </Badge>
                  </div>
                  {/* Favorite button */}
                  <FavoriteButton
                    tripId={trip.id}
                    initialIsFavorite={!!favoriteTrips?.some((f: any) => (f.id ?? f) === trip.id)}
                  />
                </div>
              )}
              {/* Creator Info */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-3">Organizer</h3>
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-16 w-16 cursor-pointer" onClick={() => setProfileUserId(trip.creator.id)}>
                      <AvatarImage 
                        src={trip.creator.avatarThumbnailUrl || trip.creator.avatarUrl} 
                        alt={trip.creator.name}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(trip.creator.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{trip.creator.name}</h4>
                      {trip.creator.age && (
                        <p className="text-gray-500 text-sm">{trip.creator.age} years old</p>
                      )}
                      {trip.creator.bio && (
                        <p className="text-gray-600 text-sm mt-1">{trip.creator.bio}</p>
                      )}
                      {trip.creator.city && (
                        <div className="flex items-center space-x-1 text-gray-500 text-sm mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{trip.creator.city}</span>
                        </div>
                      )}
                      {trip.creator.phone && (
                        <div className="flex items-center space-x-1 text-gray-500 text-sm mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{trip.creator.phone}</span>
                        </div>
                      )}
                      {trip.creator.email && (
                        <div className="flex items-center space-x-1 text-gray-500 text-sm mt-1">
                          <Mail className="h-3 w-3" />
                          <span>{trip.creator.email}</span>
                        </div>
                      )}
                      {trip.creator.languages && trip.creator.languages.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Languages:</p>
                          <div className="flex flex-wrap gap-1">
                            {trip.creator.languages.map((lang: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {trip.creator.messengers && Object.keys(trip.creator.messengers).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Messengers:</p>
                          <div className="space-y-1">
                            {Object.entries(trip.creator.messengers).map(([type, username], index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                <MessageCircle className="h-3 w-3 text-gray-400" />
                                <span className="font-medium">{type}:</span>
                                <span className="text-gray-600">{String(username)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participants */}
              {participants.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-3">Participants ({participants.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {participants.map((participant: any) => (
                        <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Avatar className="h-10 w-10 cursor-pointer" onClick={() => setProfileUserId(participant.id)}>
                            <AvatarImage 
                              src={participant.avatarThumbnailUrl || participant.avatarUrl} 
                              alt={participant.name}
                            />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                              {getInitials(participant.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{participant.name}</p>
                            {participant.city && (
                              <div className="flex items-center space-x-1 text-gray-500 text-sm">
                                <MapPin className="h-3 w-3" />
                                <span>{participant.city}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {isCreator && (
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        You are the organizer of this trip
                      </Badge>
                    )}

                    {isParticipant && (
                      <Badge variant="secondary" className="w-full justify-center py-2 bg-green-100 text-green-800 border-green-200">
                        You are a trip participant
                      </Badge>
                    )}

                    {hasPendingApplication && (
                      <Badge variant="secondary" className="w-full justify-center py-2 bg-yellow-100 text-yellow-800 border-yellow-200">
                        Request sent, awaiting approval
                      </Badge>
                    )}

                    {isRejected && (
                      <Badge variant="secondary" className="w-full justify-center py-2 bg-red-100 text-red-800 border-red-200">
                        Request rejected
                      </Badge>
                    )}

                    {user && !isCreator && !userStatus && participants.length < trip.maxParticipants && !joinRequestSent && (
                      <div className="space-y-3">
                        <div className="text-center">
                          <h4 className="font-semibold text-lg">Join trip</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            The route creator will see your response
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your message
                          </label>
                          <textarea
                            value={joinMessage}
                            onChange={(e) => setJoinMessage(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder="Write a message to the creator..."
                          />
                        </div>
                        
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={handleJoinTrip}
                          disabled={sendJoinMessageMutation.isPending || !joinMessage.trim()}
                        >
                          {sendJoinMessageMutation.isPending ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    )}

                    {/* If not logged in — show custom block */}
                    {!user && (
                      <div className="space-y-3 text-center">
                        <h4 className="font-semibold text-lg">To send a message to the creator, you need to log in</h4>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              sessionStorage.setItem("returnUrl", window.location.pathname + window.location.search);
                              setLocation('/auth');
                            }}
                          >
                            Log in
                          </Button>
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              sessionStorage.setItem("returnUrl", window.location.pathname + window.location.search);
                              setLocation('/auth?mode=register');
                            }}
                          >
                            Sign up
                          </Button>
                        </div>
                      </div>
                    )}

                    {joinRequestSent && !userStatus && (
                      <Badge variant="secondary" className="w-full justify-center py-2 bg-blue-100 text-blue-800 border-blue-200">
                        Request sent to route creator
                      </Badge>
                    )}

                    {user && !isCreator && !userStatus && participants.length >= trip.maxParticipants && (
                      <Badge variant="secondary" className="w-full justify-center py-2 bg-gray-100 text-gray-800 border-gray-200">
                        Trip is full
                      </Badge>
                    )}

                    {isParticipant && (
                      <Button 
                        variant="destructive"
                        className="w-full"
                        onClick={() => leaveTripMutation.mutate()}
                        disabled={leaveTripMutation.isPending}
                      >
                        {leaveTripMutation.isPending ? "Leaving..." : "Leave trip"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
      {/* Gallery modal */}
      <GalleryModal
        photos={allPhotos}
        initialIndex={galleryIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={trip?.title}
        description={trip?.description}
      />
      {profileUserId && (
        <UserProfileModal userId={profileUserId} isOpen={!!profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </Dialog>
  );
}