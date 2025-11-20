import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/ui/header";
import { RouteMap } from "@/components/route-map";
import { MapPin, Plus, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertTripSchema } from "@shared/schema";
import type { TripType } from "@shared/schema";
import { z } from "zod";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useRef } from "react";
import React from "react";
import { format } from "date-fns";
import { enUS, ru as ruLocale } from "date-fns/locale";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useTranslation } from "react-i18next";
import {
  getRouteTypeIcon,
  resolveRouteTypeDescription,
  resolveRouteTypeName,
} from "@/lib/routeTypes";

const createTripSchema = insertTripSchema.extend({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  route: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).optional(),
});

type CreateTripData = z.infer<typeof createTripSchema>;

export default function CreateTrip() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation(["pages", "common", "trips"]);
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const dateFnsLocale = resolvedLanguage.startsWith("ru") ? ruLocale : enUS;
  const genericAny = t("common:generic.any");
  const clearCityLabel = t("common:generic.clearCity");
  const toastLogoutTitle = t("common:generic.toastLogoutTitle");
  const toastLogoutDescription = t("common:generic.toastLogoutDescription");
  const [selectedCity, setSelectedCity] = useState<{ lat: number; lng: number }>({ lat: 50.4501, lng: 30.5234 });
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [mainPhotoLoading, setMainPhotoLoading] = useState(false);
  const [additionalPhotosLoading, setAdditionalPhotosLoading] = useState(false);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const [participantGender, setParticipantGender] = useState<'any' | 'male' | 'female'>('any');

  // Date and time states
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  // Update form dateTime when date or time changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    setDate(val);
    form.setValue("date", val);
  };
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || null;
    setTime(val);
    form.setValue("time", val);
  };

  // Split dateTime into date and time on form initialization
  React.useEffect(() => {
    const d = form.getValues("date");
    const t = form.getValues("time");
    setDate(d ?? null);
    setTime(t ?? null);
  }, []);

  // Preset cities
  const popularCities = [
    { name: "Kyiv", lat: 50.4501, lng: 30.5234 },
    { name: "Lviv", lat: 49.8419, lng: 24.0315 },
    { name: "Kharkiv", lat: 49.9935, lng: 36.2304 },
    { name: "Odesa", lat: 46.4825, lng: 30.7233 },
    { name: "Dnipro", lat: 48.4647, lng: 35.0462 },
  ];

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

  // Get trip types from API
  const { data: tripTypes = [], isLoading: tripTypesLoading, error: tripTypesError } = useQuery({
    queryKey: ["/api/trip-types"],
    queryFn: async () => {
      const resp = await fetch("/api/trip-types");
      if (!resp.ok) throw new Error("Failed to load trip types");
      return resp.json();
    },
  });

  const sortedTripTypes = useMemo(
    () =>
      [...tripTypes].sort((a: TripType, b: TripType) => {
        const diff = (a.ordering ?? 0) - (b.ordering ?? 0);
        if (diff !== 0) {
          return diff;
        }
        return a.id.localeCompare(b.id);
      }),
    [tripTypes],
  );

  // Get cities with filtering
  const { data: cityOptions = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["/api/cities", cityInput],
    queryFn: async () => {
      const resp = await fetch(`/api/cities?q=${encodeURIComponent(cityInput)}&limit=15`);
      if (!resp.ok) throw new Error("Failed to load cities");
      return resp.json();
    },
    enabled: cityDropdownOpen,
  });

  const form = useForm<CreateTripData>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "walk",
      city: "",
      location: { lat: 50.4501, lng: 30.5234 },
      route: [],
      date: null,
      time: null,
      maxParticipants: 2,
      creatorParticipates: true,
    },
  });

  const uploadMainPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file, file.name);
      
      const token = localStorage.getItem("accessToken");
      const response = await fetch('/api/trips/upload-main-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMainPhoto(data.photoUrl);
      setMainPhotoLoading(false);
    },
    onError: (error: any) => {
      setMainPhotoLoading(false);
      toast({
        variant: "destructive",
        title: t("pages:createTrip.toasts.errorTitle"),
        description: error.message || t("pages:createTrip.toasts.uploadError"),
      });
    },
  });

  const uploadAdditionalPhotosMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('photos', file, file.name);
      });
      
      const token = localStorage.getItem("accessToken");
      const response = await fetch('/api/trips/upload-additional-photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAdditionalPhotos(prev => [...prev, ...data.photoUrls]);
      setAdditionalPhotosLoading(false);
      // toast({
      //   title: "Photos uploaded",
      //   description: "Additional photos uploaded successfully",
      // });
    },
    onError: (error: any) => {
      setAdditionalPhotosLoading(false);
      toast({
        variant: "destructive",
        title: t("pages:createTrip.toasts.errorTitle"),
        description: error.message || t("pages:createTrip.toasts.uploadError"),
      });
    },
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: CreateTripData) => {
      const requestData = {
        ...data,
        date: data.date || null,
        time: data.time || null,
        mainPhotoUrl: mainPhoto,
        additionalPhotos: additionalPhotos,
        route: routePoints,
        participantGender,
      };
      const response = await apiRequest("/api/trips", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("pages:createTrip.toasts.successTitle"),
        description: t("pages:createTrip.toasts.successDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setLocation("/trips");
    },
    onError: (error: any) => {
      console.error("Trip creation error:", error);
      
      // If auth error, redirect to login page
      if (error.message.includes("401") || error.message.includes("Invalid or expired token")) {
        localStorage.removeItem("accessToken");
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        toast({
          variant: "destructive",
          title: t("pages:createTrip.toasts.sessionExpiredTitle"),
          description: t("pages:createTrip.toasts.sessionExpiredDescription"),
        });
        setLocation("/auth");
        return;
      }
      
      toast({
        variant: "destructive",
        title: t("pages:createTrip.toasts.errorTitle"),
        description: error.message || t("pages:createTrip.toasts.errorDescription"),
      });
    },
  });

  const onSubmit = (data: CreateTripData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: t("pages:createTrip.toasts.loginRequiredTitle"),
        description: t("pages:createTrip.toasts.loginRequiredDescription"),
      });
      return;
    }

    // Date validation
    if (data.date) {
      try {
        const selectedDate = new Date(data.date);
        const now = new Date();
        if (isNaN(selectedDate.getTime())) {
          toast({
            variant: "destructive",
            title: t("pages:createTrip.toasts.errorTitle"),
            description: t("pages:createTrip.toasts.invalidDate"),
          });
          return;
        }
        if (selectedDate <= now) {
          toast({
            variant: "destructive",
            title: t("pages:createTrip.toasts.errorTitle"),
            description: t("pages:createTrip.toasts.datePast"),
          });
          return;
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: t("pages:createTrip.toasts.errorTitle"),
          description: t("pages:createTrip.toasts.invalidDate"),
        });
        return;
      }
    }

    createTripMutation.mutate(data);
  };

  const handleMainPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMainPhotoLoading(true);
      uploadMainPhotoMutation.mutate(file);
    }
    event.target.value = '';
  };

  const handleAdditionalPhotosUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setAdditionalPhotosLoading(true);
      const fileArray: File[] = [];
      for (let i = 0; i < files.length; i++) {
        fileArray.push(files[i]);
      }
      uploadAdditionalPhotosMutation.mutate(fileArray);
    }
    event.target.value = '';
  };

  const removeMainPhoto = () => {
    setMainPhoto(null);
  };

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const triggerMainPhotoUpload = () => {
    const input = document.getElementById('main-photo-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const triggerAdditionalPhotosUpload = () => {
    const input = document.getElementById('additional-photos-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleCitySelect = (cityName: string) => {
    const city = popularCities.find(c => c.name === cityName);
    if (city) {
      form.setValue("city", cityName);
      form.setValue("location", { lat: city.lat, lng: city.lng });
      setSelectedCity({ lat: city.lat, lng: city.lng });
      // Clear route when city changes
      setRoutePoints([]);
      form.setValue("route", []);
    }
  };

  const handleRouteChange = (route: { lat: number; lng: number }[]) => {
    setRoutePoints(route);
    form.setValue("route", route);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    toast({
      title: toastLogoutTitle,
      description: toastLogoutDescription,
    });
    setLocation("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t("pages:createTrip.auth.title")}</CardTitle>
            <CardDescription>
              {t("pages:createTrip.auth.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth">
              <Button className="w-full">{t("pages:createTrip.auth.button")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <MapPin className="h-5 w-5 mr-2" />
              {t("pages:createTrip.title")}
            </CardTitle>
            <CardDescription>
              {t("pages:createTrip.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Second row: Route type, Number of participants, Date, Time */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pages:createTrip.form.routeType")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("pages:createTrip.form.routeTypePlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <TooltipProvider>
                            <SelectContent className="z-[9999]">
                              {sortedTripTypes.map((type: TripType) => {
                                const Icon = getRouteTypeIcon(type.id);
                                const localizedName = resolveRouteTypeName(type.id, t, i18n);
                                const localizedDescription = resolveRouteTypeDescription(type.id, t, i18n);
                                return (
                                  <Tooltip key={type.id}>
                                    <TooltipTrigger asChild>
                                      <SelectItem value={type.id}>
                                        <div className="flex items-center space-x-2">
                                          <Icon className="h-4 w-4" />
                                          <span>{localizedName}</span>
                                        </div>
                                      </SelectItem>
                                    </TooltipTrigger>
                                    <TooltipContent style={{ zIndex: 99999 }} className="max-w-xs break-words" side="right" align="center">
                                      {localizedDescription}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </SelectContent>
                          </TooltipProvider>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxParticipants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pages:createTrip.form.participants")}</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("pages:createTrip.form.participantsPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="7">7</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                            <SelectItem value="9">9</SelectItem>
                            <SelectItem value="10">10+</SelectItem>
                            <SelectItem value="20">20+</SelectItem>
                            <SelectItem value="30">30+</SelectItem>
                            <SelectItem value="40">40+</SelectItem>
                            <SelectItem value="50">50+</SelectItem>
                            <SelectItem value="100">100+</SelectItem>
                            <SelectItem value="200">200+</SelectItem>
                            <SelectItem value="300">300+</SelectItem>
                            <SelectItem value="400">400+</SelectItem>
                            <SelectItem value="500">500+</SelectItem>
                            <SelectItem value="1000">1000+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                      <FormItem>
                        <FormLabel>{t("pages:createTrip.form.date")}</FormLabel>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm text-gray-900 dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              tabIndex={0}
                              aria-label={t("pages:createTrip.form.ariaDate")}
                              onClick={() => setDatePickerOpen(true)}
                            >
                              <span className={date ? "" : "text-black text-sm"}>
                                {date ? format(new Date(date), "d MMMM yyyy", { locale: dateFnsLocale }) : genericAny}
                              </span>
                              {date && (
                                <X
                                  className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDate(null);
                                    form.setValue("date", null);
                                    setDatePickerOpen(false);
                                  }}
                                  tabIndex={0}
                                  aria-label={t("pages:createTrip.form.clearDate")}
                                />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="p-0.5 w-auto min-w-[140px] z-[9999] text-xs">
                            <Calendar
                              mode="single"
                              selected={date ? new Date(date) : undefined}
                              onSelect={d => {
                                if (d) {
                                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                  setDate(iso);
                                  form.setValue("date", iso);
                                  setDatePickerOpen(false);
                                }
                              }}
                              locale={dateFnsLocale}
                              className="!gap-1 [&_.rdp-day]:h-6 [&_.rdp-day]:w-6 [&_.rdp-day]:text-xs"
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                      <FormItem>
                        <FormLabel>{t("pages:createTrip.form.time")}</FormLabel>
                        <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm text-gray-900 dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              tabIndex={0}
                              aria-label={t("pages:createTrip.form.ariaTime")}
                              onClick={() => setTimePickerOpen(true)}
                            >
                              <span className={time ? "" : "text-black text-sm"}>
                                {time ? `${time}:00` : genericAny}
                              </span>
                              {time && (
                                <X
                                  className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setTime(null);
                                    form.setValue("time", null);
                                    setTimePickerOpen(false);
                                  }}
                                  tabIndex={0}
                                  aria-label={t("pages:createTrip.form.clearTime")}
                                />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="p-2 w-auto z-[9999] text-xs">
                            <div className="flex gap-4">
                              <div className="flex flex-col gap-2">
                                {Array.from({ length: 12 }, (_, h) => h).map(h => (
                                  <button
                                    key={h}
                                    type="button"
                                    className={`px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${time === String(h).padStart(2, '0') ? 'bg-blue-600 text-white' : 'bg-background text-gray-900 dark:text-white'}`}
                                    onClick={() => {
                                      const val = String(h).padStart(2, '0');
                                      setTime(val);
                                      form.setValue("time", val);
                                      setTimePickerOpen(false);
                                    }}
                                  >
                                    {String(h).padStart(2, '0')}:00
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-col gap-2">
                                {Array.from({ length: 12 }, (_, i) => i + 12).map(h => (
                                  <button
                                    key={h}
                                    type="button"
                                    className={`px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${time === String(h).padStart(2, '0') ? 'bg-blue-600 text-white' : 'bg-background text-gray-900 dark:text-white'}`}
                                    onClick={() => {
                                      const val = String(h).padStart(2, '0');
                                      setTime(val);
                                      form.setValue("time", val);
                                      setTimePickerOpen(false);
                                    }}
                                  >
                                    {String(h).padStart(2, '0')}:00
                                  </button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                  </div>

                {/* Participation checkbox and gender select */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="creatorParticipates"
                    render={({ field }) => (
                      <FormItem className="w-full md:w-auto flex flex-row items-start space-x-3 space-y-0 md:mb-1">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {t("pages:createTrip.participation.label")}
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {t("pages:createTrip.participation.description")}
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormItem className="w-full md:w-1/4 md:ml-auto">
                    <FormLabel>{t("pages:createTrip.participation.genderLabel")}</FormLabel>
                    <Select value={participantGender} onValueChange={v => setParticipantGender(v as 'any' | 'male' | 'female')}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("pages:createTrip.participation.genderLabel")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">{t("pages:createTrip.participation.any")}</SelectItem>
                        <SelectItem value="male">{t("pages:createTrip.participation.male")}</SelectItem>
                        <SelectItem value="female">{t("pages:createTrip.participation.female")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                </div>

                {/* Route title and City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pages:createTrip.form.title")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("pages:createTrip.form.titlePlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pages:createTrip.form.city")}</FormLabel>
                        <div className="relative">
                          <Input
                            ref={cityInputRef}
                            value={cityInput}
                            onFocus={() => setCityDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setCityDropdownOpen(false), 150)}
                            onChange={e => {
                              setCityInput(e.target.value);
                              field.onChange(e.target.value);
                            }}
                            placeholder={t("pages:createTrip.form.cityPlaceholder")}
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
                                field.onChange("");
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
                                    field.onChange(city.name);
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Route description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("pages:createTrip.form.description")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("pages:createTrip.form.descriptionPlaceholder")}
                          className="min-h-[120px]"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Route map */}
                <div className="md:col-span-2">
                  <FormLabel className="text-base font-medium mb-4 block">
                    {t("pages:createTrip.form.buildRoute")}
                  </FormLabel>
                  <div className="mb-4">
                    <RouteMap
                      center={selectedCity}
                      route={routePoints}
                      onRouteChange={handleRouteChange}
                      className="mb-4"
                    />
                  </div>
                </div>

                {/* Photo Upload Section */}
                <div className="space-y-4">
                  <FormLabel className="text-base font-medium">{t("pages:createTrip.form.routePhotos")}</FormLabel>
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Main Photo */}
                    <div className="w-full md:w-1/3">
                      <FormLabel className="text-sm text-gray-600 dark:text-gray-400">{t("pages:createTrip.form.mainPhoto")}</FormLabel>
                      <div className="mt-2">
                        {mainPhoto ? (
                          <div className="relative">
                            <img
                              src={mainPhoto}
                              alt="Main photo"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                              onClick={removeMainPhoto}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <input
                              id="main-photo-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleMainPhotoUpload}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-48 border-dashed border-2 flex flex-col items-center justify-center"
                              onClick={triggerMainPhotoUpload}
                              disabled={mainPhotoLoading}
                            >
                              {mainPhotoLoading ? (
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent mb-2" />
                              ) : (
                                <Plus className="h-6 w-6 mb-2" />
                              )}
                              <span className="text-sm">
                                {mainPhotoLoading ? t("pages:createTrip.photos.mainUploading") : t("pages:createTrip.form.mainPhoto")}
                              </span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Additional Photos */}
                    <div className="w-full md:w-2/3">
                      <FormLabel className="text-sm text-gray-600 dark:text-gray-400">{t("pages:createTrip.form.additionalPhotos")}</FormLabel>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {additionalPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-5 w-5 p-0 rounded-full"
                              onClick={() => removeAdditionalPhoto(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <div>
                          <input
                            id="additional-photos-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAdditionalPhotosUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-48 border-dashed border-2 flex flex-col items-center justify-center rounded-lg"
                            onClick={triggerAdditionalPhotosUpload}
                            disabled={additionalPhotosLoading}
                          >
                            {additionalPhotosLoading ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mb-1" />
                            ) : (
                              <Plus className="h-4 w-4 mb-1" />
                            )}
                            <span className="text-sm">
                              {additionalPhotosLoading ? t("pages:createTrip.photos.additionalUploading") : t("pages:createTrip.form.additionalPhotos")}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{height: '32px'}} />
                <div className="flex justify-end space-x-4 mt-8">
                  <Link href="/trips">
                    <Button type="button" variant="outline">
                      {t("pages:createTrip.buttons.cancel")}
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    disabled={createTripMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {createTripMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t("pages:createTrip.buttons.submitting")}
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        {t("pages:createTrip.buttons.submit")}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}