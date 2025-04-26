import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-language';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Header from '@/components/layout/header';
import MobileTabs from '@/components/layout/mobile-tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Save,
  Camera,
  X,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  CalendarDays,
  User
} from 'lucide-react';

// Validation schema for profile form
const profileFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  age: z.coerce.number().min(16, {
    message: "You must be at least 16 years old.",
  }).optional(),
  gender: z.string().optional(),
  bio: z.string().max(500, {
    message: "Bio must not exceed 500 characters.",
  }).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  interests: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function EditProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  // Profile form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      age: user?.age || undefined,
      gender: user?.gender || undefined,
      bio: user?.bio || '',
      location: user?.location || '',
      phone: user?.phone || '',
      website: user?.website || '',
      telegram: user?.telegram || '',
      whatsapp: user?.whatsapp || '',
      interests: user?.interests || [],
      languages: user?.languages || [],
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName || '',
        email: user.email || '',
        age: user.age || undefined,
        gender: user.gender || undefined,
        bio: user.bio || '',
        location: user.location || '',
        phone: user.phone || '',
        website: user.website || '',
        telegram: user.telegram || '',
        whatsapp: user.whatsapp || '',
        interests: user.interests || [],
        languages: user.languages || [],
      });
    }
  }, [user, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('PATCH', `/api/users/${user?.id}`, data, true);
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/user'], updatedUser);
      toast({
        title: t('profile.update_success'),
        description: t('profile.update_success_message'),
      });
      setLocation('/profile');
    },
    onError: (error: Error) => {
      toast({
        title: t('profile.update_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle photo file selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotoFiles(prev => [...prev, ...newFiles]);
      
      // Create previews
      const newPreviewPromises = newFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(newPreviewPromises).then(newPreviews => {
        setPhotoPreview(prev => [...prev, ...newPreviews]);
      });
    }
  };

  // Remove photo preview
  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreview(prev => prev.filter((_, i) => i !== index));
  };

  // Form submission handler
  const onSubmit = (values: ProfileFormValues) => {
    const formData = new FormData();
    
    // Add form values
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    
    // Add avatar if selected
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    
    // Add photos if selected
    photoFiles.forEach((file, index) => {
      formData.append(`photo_${index}`, file);
    });
    
    updateProfileMutation.mutate(formData);
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{t('profile.edit_profile')}</h1>
            
            <Button
              onClick={() => setLocation('/profile')}
              variant="outline"
            >
              {t('common.cancel')}
            </Button>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left column - Avatar and photos */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('profile.avatar')}</CardTitle>
                      <CardDescription>
                        {t('profile.avatar_description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <Avatar className="h-32 w-32">
                          <AvatarImage src={avatarPreview || user?.avatar || ''} />
                          <AvatarFallback className="text-2xl">
                            {getInitials(form.watch('fullName') || user?.fullName || '')}
                          </AvatarFallback>
                        </Avatar>
                        <label 
                          htmlFor="avatar-upload"
                          className="absolute -right-2 bottom-0 bg-primary text-white p-2 rounded-full cursor-pointer"
                        >
                          <Camera className="h-4 w-4" />
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        {t('profile.avatar_requirements')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('profile.photos')}</CardTitle>
                      <CardDescription>
                        {t('profile.photos_description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {photoPreview.map((preview, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={preview} 
                              alt={`Photo ${index+1}`}
                              className="w-full h-32 object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        
                        {photoPreview.length < 6 && (
                          <label 
                            htmlFor="photo-upload"
                            className="flex items-center justify-center h-32 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition-colors"
                          >
                            <Camera className="h-8 w-8 text-gray-400" />
                          </label>
                        )}
                      </div>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500">
                        {t('profile.photo_requirements')}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Right column - Profile form */}
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('profile.personal_info')}</CardTitle>
                      <CardDescription>
                        {t('profile.personal_info_description')}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <Tabs defaultValue="basic">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="basic">{t('profile.basic')}</TabsTrigger>
                          <TabsTrigger value="details">{t('profile.details')}</TabsTrigger>
                          <TabsTrigger value="contacts">{t('profile.contacts')}</TabsTrigger>
                        </TabsList>
                        
                        {/* Basic Info Tab */}
                        <TabsContent value="basic" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('profile.full_name')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('profile.full_name_placeholder')} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('profile.email')}</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="age"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profile.age')}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="25"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="gender"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profile.gender')}</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('profile.select_gender')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="male">{t('profile.gender_male')}</SelectItem>
                                      <SelectItem value="female">{t('profile.gender_female')}</SelectItem>
                                      <SelectItem value="other">{t('profile.gender_other')}</SelectItem>
                                      <SelectItem value="prefer_not_to_say">{t('profile.gender_prefer_not')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('profile.bio')}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder={t('profile.bio_placeholder')}
                                    className="min-h-32"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                        
                        {/* Details Tab */}
                        <TabsContent value="details" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('profile.location')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('profile.location_placeholder')} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Languages selection would be added here */}
                          <div className="border rounded-md p-4">
                            <h3 className="font-medium mb-2">{t('profile.languages')}</h3>
                            <p className="text-gray-500 text-sm">
                              {t('profile.languages_placeholder')}
                            </p>
                            {/* Languages selection UI would be implemented here */}
                          </div>
                          
                          {/* Interests/tags selection would be added here */}
                          <div className="border rounded-md p-4">
                            <h3 className="font-medium mb-2">{t('profile.interests')}</h3>
                            <p className="text-gray-500 text-sm">
                              {t('profile.interests_placeholder')}
                            </p>
                            {/* Interests selection UI would be implemented here */}
                          </div>
                        </TabsContent>
                        
                        {/* Contacts Tab */}
                        <TabsContent value="contacts" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2" />
                                    {t('profile.phone')}
                                  </div>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 234 567 8900" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="flex items-center">
                                    <Globe className="h-4 w-4 mr-2" />
                                    {t('profile.website')}
                                  </div>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="telegram"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="flex items-center">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {t('profile.telegram')}
                                  </div>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="@username" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="whatsapp"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <div className="flex items-center">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {t('profile.whatsapp')}
                                  </div>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 234 567 8900" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                    
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('profile.saving')}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {t('profile.save_profile')}
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </main>
      
      <MobileTabs />
    </div>
  );
}