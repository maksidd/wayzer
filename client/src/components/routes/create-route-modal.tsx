import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { InsertRoute, insertRouteSchema, RouteTypes, PurposeTypes } from '@shared/schema';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Car, Mountain, Bike, Tent, Building, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CreateRouteModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extended schema with validation
  const formSchema = insertRouteSchema.extend({
    date: z.date({
      required_error: "Please select a date",
    }),
    maxParticipants: z.number().min(1, "At least 1 participant").max(20, "Maximum 20 participants"),
  });

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: user?.id,
      title: "",
      description: "",
      routeType: RouteTypes.ROAD_TRIP,
      startPoint: "",
      endPoint: "",
      startLat: "0",
      startLng: "0",
      endLat: "0",
      endLng: "0",
      maxParticipants: 4,
      purpose: PurposeTypes.TOURISM,
    },
  });

  // Update userId when user changes
  useEffect(() => {
    if (user) {
      form.setValue('userId', user.id);
    }
  }, [user, form]);

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (data: InsertRoute) => {
      return await apiRequest('POST', '/api/routes', data);
    },
    onSuccess: () => {
      toast({
        title: t('routes.create_success'),
        description: t('routes.create_success_message'),
      });
      setIsOpen(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ['/api/routes'],
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('routes.create_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Listen for the open modal event
  useEffect(() => {
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener('open-create-route-modal', handleOpenModal);
    
    return () => {
      window.removeEventListener('open-create-route-modal', handleOpenModal);
    };
  }, []);

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: t('routes.login_required'),
        description: t('routes.login_to_create'),
        variant: 'destructive',
      });
      return;
    }
    
    createRouteMutation.mutate(values);
  }

  // Get route type icons
  const routeTypeIcons = {
    [RouteTypes.ROAD_TRIP]: <Car className="h-5 w-5 mb-1" />,
    [RouteTypes.HIKING]: <Mountain className="h-5 w-5 mb-1" />,
    [RouteTypes.BIKING]: <Bike className="h-5 w-5 mb-1" />,
    [RouteTypes.CAMPING]: <Tent className="h-5 w-5 mb-1" />,
    [RouteTypes.CITY_TOUR]: <Building className="h-5 w-5 mb-1" />,
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            {t('routes.create_new_route')}
          </DialogTitle>
          <DialogDescription>
            {t('routes.create_route_description')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Route Type */}
            <FormField
              control={form.control}
              name="routeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('routes.type')}</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.values(RouteTypes).slice(0, 5).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant="outline"
                        className={cn(
                          "flex flex-col items-center justify-center p-3 h-auto",
                          field.value === type && "border-primary-500 bg-primary-50 text-primary-700"
                        )}
                        onClick={() => form.setValue("routeType", type)}
                      >
                        {routeTypeIcons[type as keyof typeof routeTypeIcons]}
                        <span className="text-xs">{t(`route_types.${type}`)}</span>
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Route Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('routes.title')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('routes.title_placeholder')}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Start & End Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('routes.start_point')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder={t('routes.start_point_placeholder')}
                          className="pl-10"
                          {...field} 
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                          <i className="fas fa-map-marker-alt"></i>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('routes.end_point')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder={t('routes.end_point_placeholder')}
                          className="pl-10"
                          {...field} 
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                          <i className="fas fa-flag"></i>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Date & Max Participants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('routes.date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t('routes.select_date')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('routes.max_participants')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={20}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('routes.description')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('routes.description_placeholder')}
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Purpose */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('routes.purpose')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-wrap gap-2"
                    >
                      {Object.values(PurposeTypes).map((purpose) => (
                        <div key={purpose} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={purpose}
                            id={purpose}
                            className="peer sr-only"
                          />
                          <label
                            htmlFor={purpose}
                            className="flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-full text-sm font-medium peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-white peer-data-[state=checked]:border-primary cursor-pointer"
                          >
                            {t(`purpose_types.${purpose}`)}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={createRouteMutation.isPending}
              >
                {createRouteMutation.isPending ? t('common.creating') : t('routes.create_route')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
