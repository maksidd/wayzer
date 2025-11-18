import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/ui/header";
import { Edit2, User, MapPin, Phone, Mail, MessageSquare, Camera, Plus, X, Languages } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UpdateUserProfile } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableFieldProps {
  label: string;
  value: string | number | undefined;
  field: keyof UpdateUserProfile;
  type?: 'text' | 'number' | 'textarea';
  icon: React.ReactNode;
  onUpdate: (field: keyof UpdateUserProfile, value: any) => void;
}

function EditableField({ label, value, field, type = 'text', icon, onUpdate }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const handleSave = () => {
    const finalValue = type === 'number' ? Number(tempValue) : tempValue;
    onUpdate(field, finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center min-w-[110px] text-gray-700 dark:text-gray-300 font-medium">
        {icon}
        <span className="ml-2">{label}</span>
      </div>
      {isEditing ? (
        <div className="flex-1 flex justify-end">
          {type === 'textarea' ? (
            <Textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              autoFocus
              className="min-h-[80px]"
            />
          ) : (
            <Input
              type={type}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              autoFocus
              className="w-full"
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-end">
          <span className="text-gray-900 dark:text-white truncate">{value || 'Not specified'}</span>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 ml-2"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface EditableLanguagesProps {
  languages: string[] | undefined;
  onUpdate: (field: keyof UpdateUserProfile, value: any) => void;
}

function EditableLanguages({ languages, onUpdate }: EditableLanguagesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const currentLanguages = languages || [];

  const addLanguage = () => {
    if (newLanguage.trim() && !currentLanguages.includes(newLanguage.trim())) {
      const updatedLanguages = [...currentLanguages, newLanguage.trim()];
      onUpdate('languages', updatedLanguages);
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    const updatedLanguages = currentLanguages.filter(l => l !== lang);
    onUpdate('languages', updatedLanguages);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Languages className="h-4 w-4" />
          <span className="font-medium text-gray-700 dark:text-gray-300">Languages</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="h-6 w-6 p-0"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="ml-6 space-y-2">
        <div className="flex flex-wrap gap-2">
          {currentLanguages.map((lang, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {lang}
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLanguage(lang)}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </Badge>
          ))}
          {currentLanguages.length === 0 && (
            <span className="text-gray-500">Not specified</span>
          )}
        </div>
        
        {isEditing && (
          <div className="flex space-x-2">
            <Input
              placeholder="Add language"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addLanguage();
                }
              }}
              className="flex-1"
            />
            <Button size="sm" onClick={addLanguage}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Profile validation schema
const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["male", "female", "other"], { required_error: "Gender is required" }),
  age: z.number({ invalid_type_error: "Age is required" }).min(1, "Age is required"),
  city: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  languages: z.array(z.string()).optional(),
  messengers: z.record(z.string()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        const err = new Error("No token found");
        // @ts-ignore
        err.status = 401;
        throw err;
      }
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const err = new Error("Failed to fetch user");
        // @ts-ignore
        err.status = response.status;
        throw err;
      }
      return response.json();
    },
    retry: 2,
    retryDelay: 500,
  });
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [agePickerOpen, setAgePickerOpen] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const [languageInput, setLanguageInput] = useState("");

  // Sync cityInput with form
  React.useEffect(() => {
    if (user) setCityInput(user.city || "");
  }, [user]);

  // Get cities with filtering when dropdown is open
  const { data: cityOptions = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["/api/cities", cityInput],
    queryFn: async () => {
      const resp = await fetch(`/api/cities?q=${encodeURIComponent(cityInput)}&limit=15`);
      if (!resp.ok) throw new Error("Failed to load cities");
      return resp.json();
    },
    enabled: cityDropdownOpen,
  });

  // useForm for profile
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: {
      name: user?.name || "",
      gender: (user?.gender as any) || undefined,
      age: user?.age || undefined,
      city: user?.city || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      languages: user?.languages || [],
      messengers: user?.messengers || {},
    },
  });

  // Sync form values with user on load
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        gender: (user.gender as any) || undefined,
        age: user.age || undefined,
        city: user.city || "",
        phone: user.phone || "",
        bio: user.bio || "",
        languages: user.languages || [],
        messengers: user.messengers || {},
      });
      setLanguageInput("");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UpdateUserProfile>) => {
      return apiRequest(`/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Profile updated",
        description: "Changes saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await apiRequest(`/api/users/avatar`, {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      // Update cache immediately
      queryClient.setQueryData(["/api/users/me"], data.user);
      
      // Set loading state for avatar
      setAvatarLoading(true);
      
      toast({
        title: "Avatar updated",
        description: "Profile photo uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload photo",
      });
    },
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: async (fileListOrArray: FileList | File[]) => {
      console.log('Starting photos upload with files:', fileListOrArray);
      console.log('Files length:', fileListOrArray.length);
      console.log('Files type:', typeof fileListOrArray);
      console.log('Files constructor:', fileListOrArray.constructor.name);
      
      if (!fileListOrArray || fileListOrArray.length === 0) {
        throw new Error('No files provided');
      }
      
      // Convert to proper File array
      let filesArray: File[];
      if (fileListOrArray instanceof FileList) {
        filesArray = Array.from(fileListOrArray);
      } else {
        filesArray = fileListOrArray;
      }
      
      console.log('Files as array:', filesArray);
      console.log('First file check:', filesArray[0]);
      
      if (filesArray.length === 0 || !filesArray[0]) {
        throw new Error('No valid files found');
      }
      
      // Use fetch directly to avoid apiRequest issues with FormData
      const formData = new FormData();
      
      filesArray.forEach((file, index) => {
        console.log(`Processing file ${index}:`, file.name, file.size, file.type);
        formData.append('photos', file, file.name);
      });
      
      // Debug FormData contents
      console.log('FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]);
      }
      
      const token = localStorage.getItem("accessToken");
      console.log('Making direct fetch request...');
      
      const response = await fetch('/api/users/photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      console.log('Response received:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Set loading state for photos
      setPhotosLoading(true);
      // Force refetch immediately
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.refetchQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Photos added",
        description: "Additional photos uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload photo",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await apiRequest(`/api/users/photos/${filename}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Photo deleted",
        description: "Photo deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete photo",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    setLocation("/auth");
  };

  // Alternative click handlers for debugging
  const triggerAvatarUpload = () => {
    console.log('Avatar upload button clicked');
    const input = document.getElementById('avatar-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const triggerPhotosUpload = () => {
    console.log('Photos upload button clicked');
    const input = document.getElementById('photos-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Avatar upload triggered', event.target.files);
    const file = event.target.files?.[0];
    if (file) {
      console.log('Uploading avatar:', file.name, file.size);
      uploadAvatarMutation.mutate(file);
    }
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handlePhotosUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Photos upload triggered', event.target.files);
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log('Uploading photos:', Array.from(files).map(f => f.name));
      console.log('Files object:', files);
      console.log('Files as array:', Array.from(files));
      console.log('Files[0]:', files[0]);
      console.log('FileList prototype:', Object.getPrototypeOf(files));
      
      // Create a proper file array
      const fileArray: File[] = [];
      for (let i = 0; i < files.length; i++) {
        fileArray.push(files[i]);
      }
      console.log('Manual file array:', fileArray);
      
      uploadPhotosMutation.mutate(fileArray);
    }
    // Reset the input so the same files can be selected again
    event.target.value = '';
  };

  const handleDeletePhoto = (photoUrl: string) => {
    const filename = photoUrl.split('/').pop();
    if (filename) {
      deletePhotoMutation.mutate(filename);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    // If error is explicitly 401 — redirect to /auth
    // @ts-ignore
    if (error && error.status === 401) {
    setLocation("/auth");
    return null;
    }
    // Otherwise show error message
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Failed to load profile. Try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <Header user={user} onLogout={handleLogout} />  // REMOVED */}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </CardTitle>
            <CardDescription>
              Click the edit icon next to a field to change it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Photos */}
            {user && (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center">
                <span className="font-medium text-gray-900 dark:text-white mb-3">Main photo</span>
                <div className="relative inline-block">
                  <Avatar className="h-32 w-32 mx-auto">
                    <AvatarImage 
                      src={user.avatarUrl} 
                      alt={user.name}
                      key={user.avatarUrl}
                      onLoad={() => setAvatarLoading(false)}
                      onError={() => setAvatarLoading(false)}
                    />
                    <AvatarFallback className="text-2xl">
                      {(avatarLoading || uploadAvatarMutation.isPending) ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0">
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full h-8 w-8 p-0 cursor-pointer"
                      type="button"
                      disabled={uploadAvatarMutation.isPending}
                      onClick={triggerAvatarUpload}
                    >
                      {uploadAvatarMutation.isPending ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Additional photos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {user.additionalPhotos?.map((photo: string, index: number) => (
                    <div key={`${photo}-${index}`} className="relative">
                      {photosLoading ? (
                        <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </div>
                      ) : (
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                          onLoad={() => setPhotosLoading(false)}
                          onError={() => setPhotosLoading(false)}
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-5 w-5 p-0 rounded-full"
                        onClick={() => handleDeletePhoto(photo)}
                        disabled={deletePhotoMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <input
                      id="photos-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotosUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="h-32 border-dashed border-2 flex flex-col items-center justify-center w-full cursor-pointer"
                      type="button"
                      disabled={uploadPhotosMutation.isPending}
                      onClick={triggerPhotosUpload}
                    >
                        <Plus className="h-6 w-6 text-gray-400" />
                        <span className="text-xs mt-1">Add</span>
                    </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal information */}
            {user && (
              <Form {...form}>
                <form className="max-w-2xl mx-auto" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  {/* City field with autocomplete */}
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
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
                              placeholder="Enter city or select from list"
                        autoComplete="off"
                      />
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Gender */}
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Not specified" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Age */}
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                    <Popover open={agePickerOpen} onOpenChange={setAgePickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm text-gray-900 dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          tabIndex={0}
                          aria-label="Select age"
                          onClick={() => setAgePickerOpen(true)}
                        >
                                  <span className={field.value ? "" : "text-black text-sm"}>
                                    {field.value ? `${field.value} years old` : "Not specified"}
                          </span>
                                  {field.value && (
                            <X
                              className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                              onClick={e => {
                                e.stopPropagation();
                                        field.onChange(undefined);
                                setAgePickerOpen(false);
                              }}
                              tabIndex={0}
                              aria-label="Clear age"
                            />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-2 w-auto z-[9999] text-xs">
                        <div className="flex flex-wrap gap-2 max-w-xs">
                          {Array.from({ length: 83 }, (_, i) => 18 + i).map((a) => (
                            <button
                              key={a}
                              type="button"
                                      className={`px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${field.value === a ? 'bg-blue-600 text-white' : 'bg-background text-gray-900 dark:text-white'}`}
                              onClick={() => {
                                        field.onChange(a);
                                setAgePickerOpen(false);
                              }}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {/* Additional fields */}
                  {/* Phone and Email on one line */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Email now also in FormItem for same spacing */}
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                    <Input value={user.email} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>
                  {/* Languages */}
                  <FormField
                    control={form.control}
                    name="languages"
                    render={() => (
                      <FormItem className="mt-4">
                        <FormLabel>Languages</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                          {(form.getValues('languages') || []).map((lang, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {lang}
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                                onClick={() => {
                                  const langs = form.getValues('languages') || [];
                                  form.setValue('languages', langs.filter((l: string) => l !== lang));
                                }}
                                className="h-3 w-3 p-0 ml-1"
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add language"
                            value={languageInput}
                            onChange={e => setLanguageInput(e.target.value)}
                        onKeyDown={e => {
                              if (e.key === 'Enter' && languageInput.trim()) {
                                const langs = form.getValues('languages') || [];
                                const newLangs = languageInput
                                  .split(/[\s,]+/)
                                  .map(l => l.trim())
                                  .filter(l => l.length > 0 && !langs.includes(l))
                                  .map(l => l.charAt(0).toUpperCase() + l.slice(1));
                                if (newLangs.length > 0) {
                                  form.setValue('languages', [...langs, ...newLangs]);
                                }
                                setLanguageInput("");
                              }
                            }}
                            onBlur={() => {
                              if (languageInput.trim()) {
                                const langs = form.getValues('languages') || [];
                                const newLangs = languageInput
                                  .split(/[\s,]+/)
                                  .map(l => l.trim())
                                  .filter(l => l.length > 0 && !langs.includes(l))
                                  .map(l => l.charAt(0).toUpperCase() + l.slice(1));
                                if (newLangs.length > 0) {
                                  form.setValue('languages', [...langs, ...newLangs]);
                                }
                                setLanguageInput("");
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => {
                              if (languageInput.trim()) {
                                const langs = form.getValues('languages') || [];
                                const newLangs = languageInput
                                  .split(/[\s,]+/)
                                  .map(l => l.trim())
                                  .filter(l => l.length > 0 && !langs.includes(l))
                                  .map(l => l.charAt(0).toUpperCase() + l.slice(1));
                                if (newLangs.length > 0) {
                                  form.setValue('languages', [...langs, ...newLangs]);
                                }
                                setLanguageInput("");
                          }
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* About */}
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>About</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Messengers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {['telegram', 'whatsapp', 'viber', 'instagram'].map((messenger) => (
                      <FormField
                        key={messenger}
                        control={form.control}
                        name={`messengers.${messenger}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="capitalize">{messenger}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
              ))}
            </div>
                <Button
                  type="submit"
                    className="mt-8 mx-auto block bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}