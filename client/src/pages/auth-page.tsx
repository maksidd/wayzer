import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-language";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema, loginUserSchema } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginUserSchema>>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form with extended schema
  const registerForm = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      interests: [],
      // Эти поля будут заполняться на странице профиля
      fullName: "",
      age: undefined,
      bio: "",
    },
  });

  const onLogin = (data: z.infer<typeof loginUserSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: z.infer<typeof insertUserSchema>) => {
    registerMutation.mutate(data);
  };



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        {/* Left Side: Auth Forms */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-5">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <i className="fas fa-route text-primary text-3xl mr-2"></i>
                <span className="font-bold text-2xl text-gray-800">Wayzer</span>
              </div>
              <CardTitle className="text-2xl text-center">{t("auth.welcome")}</CardTitle>
              <CardDescription className="text-center">
                {t("auth.tagline")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                  <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 mt-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.email")}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="name@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.password")}</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending
                          ? t("auth.logging_in")
                          : t("auth.login")}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4 mt-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.username")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("auth.username_placeholder")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.email")}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="name@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("auth.password")}</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("auth.confirm_password")}</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.full_name")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("auth.full_name_placeholder")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("auth.age")}</FormLabel>
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


                      </div>



                      <FormField
                        control={registerForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.bio")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("auth.bio_placeholder")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending
                          ? t("auth.registering")
                          : t("auth.register")}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-gray-500">
              {activeTab === "login"
                ? t("auth.no_account")
                : t("auth.have_account")}
              <Button
                variant="link"
                className="px-2"
                onClick={() =>
                  setActiveTab(activeTab === "login" ? "register" : "login")
                }
              >
                {activeTab === "login" ? t("auth.register") : t("auth.login")}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Side: Hero Image */}
        <div className="hidden lg:block lg:w-1/2 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519055548599-6d4d129508c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80)' }}>
          <div className="h-full w-full bg-black bg-opacity-30 flex items-center justify-center p-8">
            <div className="max-w-lg text-white">
              <h1 className="text-4xl font-bold mb-4">{t("auth.hero_title")}</h1>
              <p className="text-lg mb-6">{t("auth.hero_subtitle")}</p>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <i className="fas fa-car mr-2"></i>
                  <span>{t("route_types.road_trip")}</span>
                </div>
                <div className="flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <i className="fas fa-hiking mr-2"></i>
                  <span>{t("route_types.hiking")}</span>
                </div>
                <div className="flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <i className="fas fa-bicycle mr-2"></i>
                  <span>{t("route_types.biking")}</span>
                </div>
                <div className="flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                  <i className="fas fa-campground mr-2"></i>
                  <span>{t("route_types.camping")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
