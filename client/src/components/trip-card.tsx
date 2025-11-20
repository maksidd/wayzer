import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users, User } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import React from "react";
import type { Locale } from "date-fns";

type TripCardProps = {
  trip: any;
  isFavorite: boolean;
  typeName: string;
  TypeIcon: React.ComponentType<{ className?: string }>;
  getInitials: (name: string) => string;
  onClick: () => void;
  handleProfileClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  organizerLabel?: string;
  noDateLabel?: string;
  dateLocale?: Locale;
};

export const TripCard = ({
  trip,
  isFavorite,
  typeName,
  TypeIcon,
  getInitials,
  onClick,
  handleProfileClick,
  organizerLabel = "Organizer",
  noDateLabel = "Any date",
  dateLocale = enUS,
}: TripCardProps) => (
  <Card
    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] overflow-hidden"
    onClick={onClick}
  >
    <div className="relative w-full h-48">
      {trip.mainPhotoUrl ? (
        <img
          src={trip.mainPhotoUrl}
          alt={trip.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = document.getElementById(`fallback-${trip.id}`);
            if (fallback) fallback.style.display = "flex";
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
          <MapPin className="h-12 w-12 text-white" />
        </div>
      )}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
        <Badge variant="secondary" className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
          <TypeIcon className="h-4 w-4" />
          <span className="text-xs">{typeName}</span>
        </Badge>
        <Badge variant="secondary" className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
          <MapPin className="h-4 w-4" />
          <span className="text-xs">{trip.city}</span>
        </Badge>
      </div>
      <div className="absolute top-1 right-1 z-10">
        <FavoriteButton tripId={trip.id} initialIsFavorite={!!isFavorite} />
      </div>
      <div className="absolute -bottom-4 left-4 z-10">
        <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-gray-900 shadow-lg cursor-pointer" onClick={handleProfileClick}>
          <AvatarImage src={trip.creator.avatarThumbnailUrl || trip.creator.avatarUrl} alt={trip.creator.name} />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
            {getInitials(trip.creator.name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
    <CardContent className="pt-8 pb-4 flex flex-col min-h-[180px]">
      <div>
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{trip.title}</CardTitle>
        </div>
        <div className="flex items-center text-sm text-gray-500 mb-2 gap-2">
          <User className="h-4 w-4 mr-1" />
          <span>{trip.creator.name}</span>
          <span className="ml-1 text-xs text-gray-400">{organizerLabel}</span>
        </div>
        {trip.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">{trip.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
        <span>{trip.date ? format(new Date(trip.date), "d MMMM yyyy", { locale: dateLocale }) : noDateLabel}</span>
        <span>
          <Users className="h-4 w-4 inline" /> {trip.participantsCount || 0}/{trip.maxParticipants}
        </span>
      </div>
    </CardContent>
  </Card>
);