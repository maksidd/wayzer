 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, BookOpen, Gavel, Users } from "lucide-react";

export default function Rules() {
  const [, setLocation] = useLocation();

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

  const handleAuthClick = (mode?: string) => {
    sessionStorage.setItem("returnUrl", window.location.pathname);
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Platform Rules <span className="text-blue-600 dark:text-blue-400">Wayzer</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Read the main rules and principles for comfortable and safe user experience on the platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Safety</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                Always be respectful to other users. Fraud, insults, discrimination, and spam are not allowed.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Transparency</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                Always provide accurate information about yourself and your trips. Do not provide false data.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gavel className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Responsibility</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                Stick to your trip agreements. Don’t cancel without a valid reason and always notify participants in advance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Community</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                Help newcomers, share your experience, and keep a friendly atmosphere.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Violation of Rules</h2>
          <p className="text-md text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Violating the rules may result in temporary or permanent account suspension. If you encounter violations, contact support.
          </p>
          {!user && (
            <Button size="lg" onClick={() => handleAuthClick("register")} className="bg-blue-600 hover:bg-blue-700 text-white">
              Register
            </Button>
          )}
        </div>

        <Card className="mb-12 bg-white/90 dark:bg-gray-800/90 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-gray-900 dark:text-white mb-2">User Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">1. General</h3>
              <p className="text-gray-700 dark:text-gray-300">This agreement regulates the relationship between the user and the administration of the platform, which is designed for organizing joint trips, walks, and other activities.</p>
            </section>
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">2. Registration & Usage</h3>
              <p className="text-gray-700 dark:text-gray-300">The user gives accurate information during registration and is responsible for all actions performed under their account.</p>
            </section>
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">3. Behavior on Platform</h3>
              <p className="text-gray-700 dark:text-gray-300">Users must be respectful to all other members, not use the platform for illegal purposes, and not violate current laws.</p>
            </section>
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">4. What is not allowed</h3>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1">
                <li>Offensive or discriminatory statements</li>
                <li>Sexual content</li>
                <li>Calls for violence, extremism, or illegal activity</li>
                <li>Advertising without admin approval</li>
              </ul>
            </section>
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">5. Discussing Sensitive Topics</h3>
              <p className="text-gray-700 dark:text-gray-300">The platform is intended only for finding and organizing joint activities. Please refrain from discussing political, religious, nationalistic, or other controversial topics in chats, comments, or trip descriptions. If you wish to discuss such matters, leave it for private meetings.</p>
            </section>
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">6. Liability</h3>
              <p className="text-gray-700 dark:text-gray-300">The administration is not liable for user actions outside the platform. All arrangements between participants are voluntary and at their own risk.</p>
            </section>
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">7. Agreement Changes</h3>
              <p className="text-gray-700 dark:text-gray-300">The administration reserves the right to make changes to the user agreement. Changes will be announced on the platform.</p>
            </section>
            <section>
              <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">8. Contacts</h3>
              <p className="text-gray-700 dark:text-gray-300">For questions regarding the platform, contact the administration via feedback form or the provided email address.</p>
            </section>
          </CardContent>
        </Card>

      </main>
    </div>
  );
} 