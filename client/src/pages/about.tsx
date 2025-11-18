
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users, Heart, Globe, Star, Shield } from "lucide-react";

export default function About() {
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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Discover the world with <span className="text-blue-600 dark:text-blue-400">Wayzer</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We created Wayzer to make travel accessible, safe, and unforgettable. 
            Find travel companions, share expenses, and create memories for a lifetime.
          </p>
        </div>

        {/* Beautiful Image Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
              alt="Beautiful mountain landscape"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-2xl font-bold mb-2">Explore nature</h3>
              <p className="text-sm opacity-90">Discover amazing places together with like-minded people</p>
            </div>
          </div>
          
          <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
              alt="Happy travelers"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-2xl font-bold mb-2">Meet people</h3>
              <p className="text-sm opacity-90">Make new friendships on every journey</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why thousands of travelers choose Wayzer?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Verified users, rating system, and 24/7 support ensure your safety
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Join an active community of travelers and find like-minded people
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">Convenience</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Simple planning, smart search, and intuitive interface make travel easy
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 mb-16 text-white">
          <h2 className="text-3xl font-bold text-center mb-8">Wayzer in numbers</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Active users</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25K+</div>
              <div className="text-blue-100">Successful trips</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">150+</div>
              <div className="text-blue-100">Cities</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.8</div>
              <div className="text-blue-100 flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-current" />
                Rating
              </div>
            </div>
          </div>
        </div>

        {/* Happy travelers image */}
        <div className="relative h-96 rounded-3xl overflow-hidden shadow-2xl mb-16">
          <img 
            src="https://images.unsplash.com/photo-1527219525722-f9767a7f2884?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
            alt="Happy travelers against sunset"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white max-w-2xl px-6">
              <h3 className="text-4xl font-bold mb-4">Create unforgettable moments</h3>
              <p className="text-xl opacity-90 mb-6">
                Every journey with Wayzer is a new story, new friends, and unforgettable experiences
              </p>
              {!user && (
                <Button size="lg" onClick={() => handleAuthClick("register")} className="bg-white text-blue-600 hover:bg-gray-100">
                  Start traveling
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our mission</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            We believe that travel should be accessible to everyone. Wayzer brings people together, 
            helps save on trips, and creates opportunities for cultural exchange. 
            Together we make the world more open and friendly.
          </p>
          
          {user ? (
            <Link href="/trips">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                My trips
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => handleAuthClick("register")} className="bg-blue-600 hover:bg-blue-700 text-white">
                Join Wayzer
              </Button>
              <Button size="lg" onClick={() => handleAuthClick()} variant="outline">
                Log in
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
