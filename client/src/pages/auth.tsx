import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { registerSchema, loginSchema, type RegisterData, type LoginData } from "../../../shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(["pages", "common"]);
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get("mode") === "register" ? "register" : "login";
  const isBlocked = urlParams.get("blocked") === "1";

  const registerForm = useForm<{ email: string; password: string }>({
    resolver: zodResolver(registerSchema.omit({ name: true })),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const registrationData = {
        name: data.email.split('@')[0], // Use email part as name
        email: data.email,
        password: data.password,
      };

      // First register the user
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(error.message || "Registration error");
      }

      // Then automatically log in
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json();
        throw new Error(error.message || "Automatic login error");
      }

      return loginResponse.json();
    },
    onSuccess: (data: any) => {
      localStorage.setItem("accessToken", data.accessToken);
      // Invalidate user cache to update UI
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: t("auth.registrationSuccess.title", { ns: "common" }),
        description: t("auth.registrationSuccess.description", { ns: "common" }),
      });

      // After registration always redirect to profile
      setLocation("/profile");
    },
    onError: (error: any) => {
      toast({
        title: t("auth.registrationError.title", { ns: "common" }),
        description: error.message || t("auth.registrationError.description", { ns: "common" }),
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("auth.invalidCredentials", { ns: "common" }));
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      localStorage.setItem("accessToken", data.accessToken);
      // Invalidate user cache to update UI
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: t("auth.loginSuccess.title", { ns: "common" }),
        description: t("auth.loginSuccess.description", { ns: "common" }),
      });

      // Redirect to previous page or home
      const returnUrl = sessionStorage.getItem("returnUrl") || "/";
      sessionStorage.removeItem("returnUrl");
      setLocation(returnUrl);
    },
    onError: (error: any) => {
      toast({
        title: t("auth.loginError.title", { ns: "common" }),
        description: error.message || t("auth.loginError.description", { ns: "common" }),
        variant: "destructive",
      });
    },
  });

  const onRegister = (data: { email: string; password: string }) => {
    registerMutation.mutate(data);
  };

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and back link */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer">
            <MapPin className="h-8 w-8 mr-2" />
            <span className="text-2xl font-bold">Wayzer</span>
          </Link>
        </div>

        {isBlocked && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
            {t("auth.blockedBanner.text", { ns: "pages", defaultValue: "Ваш аккаунт заблокирован администрацией платформы. Свяжитесь с поддержкой, если считаете это ошибкой." })}
          </div>
        )}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-900 dark:text-white">
              {t("auth.title", { ns: "pages" })}
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              {t("auth.subtitle", { ns: "pages" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("auth.tabs.login", { ns: "pages" })}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.tabs.register", { ns: "pages" })}</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">{t("auth.form.email", { ns: "pages" })}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="example@email.com"
                              placeholder={t("auth.form.emailPlaceholder", { ns: "pages" })}
                              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
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
                          <FormLabel className="text-gray-700 dark:text-gray-300">{t("auth.form.password", { ns: "pages" })}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="mb-4" />
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("auth.buttons.loggingIn", { ns: "pages" })}
                        </>
                      ) : (
                        t("auth.buttons.logIn", { ns: "pages" })
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">{t("auth.form.email", { ns: "pages" })}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t("auth.form.emailPlaceholder", { ns: "pages" })}
                              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                              placeholder={t("auth.form.emailPlaceholder", { ns: "pages" })}
                              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">{t("auth.form.password", { ns: "pages" })}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pr-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="mb-4" />
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("auth.buttons.signingUp", { ns: "pages" })}
                        </>
                      ) : (
                        t("auth.buttons.signUp", { ns: "pages" })
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            {t("buttons.backHome", { ns: "common" })}
          </Link>
        </div>
      </div>
    </div>
  );
}