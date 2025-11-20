import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users, User, Search, Circle, Filter, X, Car, Plane, Train, Bike, PersonStanding, Ship, Wind, Utensils, TreePine, PartyPopper, Flower2, Squirrel, Mountain, Landmark, CircleDot } from "lucide-react";
import { Header } from "@/components/ui/header";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { TripDetailModal } from "@/components/trip-detail-modal";
import { FavoriteButton } from "@/components/favorite-button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { TripType } from "@shared/schema";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { enUS, ru as ruLocale } from "date-fns/locale";
import { UserProfileModal } from "@/components/user-profile-modal";
import { useTranslation } from "react-i18next";

export default function Favorites() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation(["pages", "common"]);
  const [searchCity, setSearchCity] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string | null>("");
  const [dateTo, setDateTo] = useState<string | null>("");
  const [cityInput, setCityInput] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [dateFromPickerOpen, setDateFromPickerOpen] = useState(false);
  const [dateToPickerOpen, setDateToPickerOpen] = useState(false);

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

  const { data: trips = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/favorites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/favorites`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!response.ok) throw new Error("Failed to load routes");
      return response.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    refetch();
  }, [searchCity, selectedType, dateFrom, dateTo, user?.id, refetch]);

  const { data: cityOptions = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["/api/cities", cityInput],
    queryFn: async () => {
      const resp = await fetch(`/api/cities?q=${encodeURIComponent(cityInput)}&limit=15`);
      if (!resp.ok) throw new Error("Failed to load cities");
      return resp.json();
    },
    enabled: cityDropdownOpen,
  });

  const { data: tripTypes = [], isLoading: tripTypesLoading, error: tripTypesError } = useQuery<TripType[]>({
    queryKey: ["/api/trip-types"],
    queryFn: async () => {
      const resp = await fetch("/api/trip-types");
      if (!resp.ok) throw new Error("Failed to load trip types");
      return resp.json();
    },
  });

  const { data: favoriteTrips = [] } = useQuery<any[]>({
    queryKey: ["/api/favorites", user?.id],
    enabled: !!user,
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

  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const dateFnsLocale = resolvedLanguage.startsWith("ru") ? ruLocale : enUS;
  const intlLocale = resolvedLanguage.startsWith("ru") ? "ru-RU" : "en-US";
  const genericAny = t("common:generic.any");
  const genericAnyDate = t("common:generic.anyDate");
  const clearCityLabel = t("common:generic.clearCity");
  const resetLabel = t("pages:trips.buttons.reset");
  const loadingLabel = t("pages:trips.status.loading");
  const emptyTitle = t("pages:favorites.empty.title");
  const emptyDescription = t("pages:favorites.empty.description");
  const emptyCta = t("pages:favorites.empty.cta");
  const headerTitle = t("pages:favorites.header.title");
  const headerSubtitle = t("pages:favorites.header.subtitle");
  const organizerLabel = t("common:generic.organizer");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intlLocale, {
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

  const handleAuthClick = (mode?: "login" | "register") => {
    const authUrl = mode === "register" ? "/auth?mode=register" : "/auth";
    setLocation(authUrl);
  };

  const handleTripClick = (tripId: string) => {
    setSelectedTripId(tripId);
  };

  const handleCloseModal = () => {
    setSelectedTripId(null);
  };

  const transportIcons: Record<string, any> = {
    car: Car,
    plane: Plane,
    bike: Bike,
    walk: PersonStanding,
    scooter: Bike,
    monowheel: CircleDot,
    motorcycle: Wind,
    sea: Ship,
    mountains: Mountain,
    sights: Landmark,
    fest: Users,
    picnic: Utensils,
    camping: TreePine,
    party: PartyPopper,
    retreat: Flower2,
    pets: Squirrel,
    other: Circle,
  };

  const filteredTrips = trips.filter((trip: any) => {
    if (searchCity && !trip.city?.toLowerCase().includes(searchCity.toLowerCase())) return false;
    if (selectedType && selectedType !== 'all' && trip.type !== selectedType) return false;
    if (dateFrom && !trip.date) return false;
    if (dateFrom && trip.date < dateFrom) return false;
    if (dateTo && !trip.date) return false;
    if (dateTo && trip.date > dateTo) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <Search className="h-5 w-5 mr-2" />
              {headerTitle}
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              {headerSubtitle}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("pages:trips.filters.cityLabel")}
                </label>
                <div className="relative">
                  <Input
                    ref={cityInputRef}
                    value={cityInput}
                    onFocus={() => setCityDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setCityDropdownOpen(false), 150)}
                    onChange={e => {
                      setCityInput(e.target.value);
                      setSearchCity(e.target.value);
                    }}
                    placeholder={t("pages:trips.filters.cityPlaceholder")}
                    autoComplete="off"
                    className={cityInput ? "pr-10" : undefined}
                  />
                  {cityInput && (
                    <button
                      type="button"
                      aria-label={clearCityLabel}
                      className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-white"
                      onMouseDown={event => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={() => {
                        setCityInput("");
                        setSearchCity("");
                        cityInputRef.current?.focus();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {cityDropdownOpen && cityOptions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[10000] max-h-96 overflow-y-auto">
                      {cityOptions.map((city: any) => (
                        <div
                          key={city.id}
                          className="px-4 py-2 cursor-pointer hover:bg-accent text-sm"
                          onMouseDown={() => {
                            setCityInput(city.name);
                            setSearchCity(city.name);
                            setCityDropdownOpen(false);
                            cityInputRef.current?.blur();
                          }}
                        >
                          {city.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("pages:trips.filters.typeLabel")}
                </label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder={t("pages:trips.filters.typePlaceholder")} />
                  </SelectTrigger>
                  <TooltipProvider>
                    <SelectContent>
                      <SelectItem value="all">{t("pages:trips.filters.allTypes")}</SelectItem>
                      {tripTypesLoading && (
                        <div className="px-4 py-2 text-sm text-gray-500">{t("common:generic.loading")}</div>
                      )}
                      {tripTypesError && (
                        <div className="px-4 py-2 text-sm text-red-500">{t("common:generic.loadingError")}</div>
                      )}
                      {!tripTypesLoading && !tripTypesError && tripTypes.map((type) => {
                        const Icon = transportIcons[type.id as keyof typeof transportIcons] || Circle;
                        return (
                          <Tooltip key={type.id}>
                            <TooltipTrigger asChild>
                              <SelectItem value={type.id}>
                                <div className="flex items-center space-x-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{type.name}</span>
                                </div>
                              </SelectItem>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs break-words" side="right" align="center">
                              {type.description || type.name}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </SelectContent>
                  </TooltipProvider>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("pages:trips.filters.dateFromLabel")}
                </label>
                <Popover open={dateFromPickerOpen} onOpenChange={setDateFromPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-sm text-gray-900 dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      tabIndex={0}
                      aria-label={t("pages:trips.filters.ariaDateFrom")}
                      onClick={() => setDateFromPickerOpen(true)}
                    >
                      <span className={dateFrom ? "" : "text-black text-sm"}>
                        {dateFrom ? format(new Date(dateFrom), "d MMMM yyyy", { locale: dateFnsLocale }) : genericAny}
                      </span>
                      {dateFrom && (
                        <X
                          className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                          onClick={e => {
                            e.stopPropagation();
                            setDateFrom("");
                            setDateFromPickerOpen(false);
                          }}
                          tabIndex={0}
                          aria-label={t("pages:trips.filters.clearDateFrom")}
                        />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0.5 w-auto min-w-[140px] z-[9999] text-xs">
                    <Calendar
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom) : undefined}
                      onSelect={d => {
                        if (d) {
                          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          setDateFrom(iso);
                          setDateFromPickerOpen(false);
                        }
                      }}
                      locale={dateFnsLocale}
                      className="!gap-1 [&_.rdp-day]:h-6 [&_.rdp-day]:w-6 [&_.rdp-day]:text-xs"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("pages:trips.filters.dateToLabel")}
                </label>
                <Popover open={dateToPickerOpen} onOpenChange={setDateToPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-sm text-gray-900 dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      tabIndex={0}
                      aria-label={t("pages:trips.filters.ariaDateTo")}
                      onClick={() => setDateToPickerOpen(true)}
                    >
                      <span className={dateTo ? "" : "text-black text-sm"}>
                        {dateTo ? format(new Date(dateTo), "d MMMM yyyy", { locale: dateFnsLocale }) : genericAny}
                      </span>
                      {dateTo && (
                        <X
                          className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                          onClick={e => {
                            e.stopPropagation();
                            setDateTo("");
                            setDateToPickerOpen(false);
                          }}
                          tabIndex={0}
                          aria-label={t("pages:trips.filters.clearDateTo")}
                        />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0.5 w-auto min-w-[140px] z-[9999] text-xs">
                    <Calendar
                      mode="single"
                      selected={dateTo ? new Date(dateTo) : undefined}
                      onSelect={d => {
                        if (d) {
                          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          setDateTo(iso);
                          setDateToPickerOpen(false);
                        }
                      }}
                      locale={dateFnsLocale}
                      className="!gap-1 [&_.rdp-day]:h-6 [&_.rdp-day]:w-6 [&_.rdp-day]:text-xs"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSearchCity("");
                    setCityInput("");
                    setSelectedType("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {resetLabel}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{loadingLabel}</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <Card className="text-center py-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent>
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {emptyTitle}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {emptyDescription}
              </p>
              {user && (
                <Link href="/trips">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    {emptyCta}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip: any) => {
              const isFavorite = true;
              const typeObj = tripTypes.find((t: TripType) => t.id === trip.type);
              const TypeIcon = Circle;
              const typeName = typeObj?.name || trip.type;
              return (
                <Card
                  key={trip.id}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] overflow-hidden"
                  onClick={() => handleTripClick(trip.id)}
                >
                  <div className="relative w-full h-48">
                    {trip.mainPhotoUrl ? (
                      <img
                        src={trip.mainPhotoUrl}
                        alt={trip.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = document.getElementById(`fallback-${trip.id}`);
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                        <MapPin className="h-12 w-12 text-white" />
                      </div>
                    )}
                    <FavoriteButton
                      tripId={trip.id}
                      initialIsFavorite={true}
                    />
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
                    <div className="absolute -bottom-4 left-4 z-10">
                      <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-gray-900 shadow-lg cursor-pointer" onClick={e => { e.stopPropagation(); setProfileUserId(trip.creator.id); }}>
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
                        <span>{trip.creator?.name}</span>
                        <span className="ml-1 text-xs text-gray-400">{organizerLabel}</span>
                      </div>
                      {trip.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">{trip.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
                      <span>{trip.date ? format(new Date(trip.date), "d MMMM yyyy", { locale: dateFnsLocale }) : genericAnyDate}</span>
                      <span>
                        <Users className="h-4 w-4 inline" /> {trip.participantsCount || 0}/{trip.maxParticipants}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        }
      </main>
      {selectedTripId && (
        <TripDetailModal
          tripId={selectedTripId}
          isOpen={!!selectedTripId}
          onClose={handleCloseModal}
        />
      )}
      {profileUserId && (
        <UserProfileModal userId={profileUserId} isOpen={!!profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </div>
  );
}