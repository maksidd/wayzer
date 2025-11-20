
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users, Heart, Star, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const ABOUT_COPY = {
  en: {
    heroTitle: {
      prefix: "Discover the world with ",
      highlight: "Wayzer"
    },
    heroDescription: "We created Wayzer to make travel accessible, safe, and unforgettable. Find travel companions, share expenses, and create memories for a lifetime.",
    gallery: {
      leftAlt: "Beautiful mountain landscape",
      leftTitle: "Explore nature",
      leftDescription: "Discover amazing places together with like-minded people",
      rightAlt: "Happy travelers",
      rightTitle: "Meet people",
      rightDescription: "Make new friendships on every journey"
    },
    featuresTitle: "Why thousands of travelers choose Wayzer?",
    features: [
      {
        icon: "shield",
        title: "Security",
        description: "Verified users, rating system, and 24/7 support ensure your safety"
      },
      {
        icon: "users",
        title: "Community",
        description: "Join an active community of travelers and find like-minded people"
      },
      {
        icon: "heart",
        title: "Convenience",
        description: "Simple planning, smart search, and intuitive interface make travel easy"
      }
    ],
    statsTitle: "Wayzer in numbers",
    stats: [
      { value: "10K+", label: "Active users" },
      { value: "25K+", label: "Successful trips" },
      { value: "150+", label: "Cities" },
      { value: "4.8", label: "Rating" }
    ],
    highlight: {
      imageAlt: "Happy travelers against sunset",
      title: "Create unforgettable moments",
      description: "Every journey with Wayzer is a new story, new friends, and unforgettable experiences",
      cta: "Start traveling"
    },
    missionTitle: "Our mission",
    missionDescription: "We believe that travel should be accessible to everyone. Wayzer brings people together, helps save on trips, and creates opportunities for cultural exchange. Together we make the world more open and friendly.",
    cta: {
      authed: "My trips",
      join: "Join Wayzer",
      login: "Log in"
    }
  },
  ru: {
    heroTitle: {
      prefix: "Открой мир с ",
      highlight: "Wayzer"
    },
    heroDescription: "Мы создали Wayzer, чтобы путешествия были доступными, безопасными и незабываемыми. Находи попутчиков, дели расходы и создавай воспоминания на всю жизнь.",
    gallery: {
      leftAlt: "Живописные горы",
      leftTitle: "Исследуй природу",
      leftDescription: "Открывай удивительные места вместе с единомышленниками",
      rightAlt: "Счастливые путешественники",
      rightTitle: "Знакомься с людьми",
      rightDescription: "Заводи новых друзей в каждой поездке"
    },
    featuresTitle: "Почему тысячи путешественников выбирают Wayzer?",
    features: [
      {
        icon: "shield",
        title: "Безопасность",
        description: "Верифицированные пользователи, рейтинг и поддержка 24/7 заботятся о твоей безопасности"
      },
      {
        icon: "users",
        title: "Сообщество",
        description: "Присоединяйся к активному сообществу и находи единомышленников"
      },
      {
        icon: "heart",
        title: "Удобство",
        description: "Простое планирование, умный поиск и понятный интерфейс упрощают путешествия"
      }
    ],
    statsTitle: "Wayzer в цифрах",
    stats: [
      { value: "10K+", label: "Активных пользователей" },
      { value: "25K+", label: "Успешных поездок" },
      { value: "150+", label: "Городов" },
      { value: "4.8", label: "Рейтинг" }
    ],
    highlight: {
      imageAlt: "Счастливые путешественники на закате",
      title: "Создавай незабываемые моменты",
      description: "Каждое путешествие с Wayzer — это новая история, новые друзья и невероятные впечатления",
      cta: "Начать путешествовать"
    },
    missionTitle: "Наша миссия",
    missionDescription: "Мы верим, что путешествовать должен каждый. Wayzer объединяет людей, помогает экономить и создаёт возможности для культурного обмена. Вместе мы делаем мир открытее и дружелюбнее.",
    cta: {
      authed: "Мои поездки",
      join: "Присоединиться к Wayzer",
      login: "Войти"
    }
  }
} as const;

export default function About() {
  const [, setLocation] = useLocation();
  const { i18n } = useTranslation();
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const locale = resolvedLanguage.startsWith("ru") ? "ru" : "en";
  const copy = ABOUT_COPY[locale];
  const featureIconMap = {
    shield: Shield,
    users: Users,
    heart: Heart
  } as const;

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
            {copy.heroTitle.prefix}
            <span className="text-blue-600 dark:text-blue-400">{copy.heroTitle.highlight}</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {copy.heroDescription}
          </p>
        </div>

        {/* Beautiful Image Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
              alt={copy.gallery.leftAlt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-2xl font-bold mb-2">{copy.gallery.leftTitle}</h3>
              <p className="text-sm opacity-90">{copy.gallery.leftDescription}</p>
            </div>
          </div>
          
          <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
              alt={copy.gallery.rightAlt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-2xl font-bold mb-2">{copy.gallery.rightTitle}</h3>
              <p className="text-sm opacity-90">{copy.gallery.rightDescription}</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {copy.featuresTitle}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {copy.features.map((feature) => {
              const Icon = featureIconMap[feature.icon as keyof typeof featureIconMap];
              const colorConfig =
                feature.icon === "shield"
                  ? { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-600 dark:text-blue-400" }
                  : feature.icon === "users"
                    ? { bg: "bg-green-100 dark:bg-green-900", text: "text-green-600 dark:text-green-400" }
                    : { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-600 dark:text-purple-400" };
              return (
                <Card key={feature.title} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 ${colorConfig.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`h-8 w-8 ${colorConfig.text}`} />
                </div>
                    <CardTitle className="text-gray-900 dark:text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                      {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
              );
            })}
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 mb-16 text-white">
          <h2 className="text-3xl font-bold text-center mb-8">{copy.statsTitle}</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {copy.stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-blue-100 flex items-center justify-center gap-1">
                  {stat.label === copy.stats[copy.stats.length - 1].label && <Star className="h-4 w-4 fill-current" />}
                  {stat.label}
            </div>
              </div>
            ))}
          </div>
        </div>

        {/* Happy travelers image */}
        <div className="relative h-96 rounded-3xl overflow-hidden shadow-2xl mb-16">
          <img 
            src="https://images.unsplash.com/photo-1527219525722-f9767a7f2884?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
            alt={copy.highlight.imageAlt}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white max-w-2xl px-6">
              <h3 className="text-4xl font-bold mb-4">{copy.highlight.title}</h3>
              <p className="text-xl opacity-90 mb-6">
                {copy.highlight.description}
              </p>
              {!user && (
                <Button size="lg" onClick={() => handleAuthClick("register")} className="bg-white text-blue-600 hover:bg-gray-100">
                  {copy.highlight.cta}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{copy.missionTitle}</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            {copy.missionDescription}
          </p>
          
          {user ? (
            <Link href="/trips">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                {copy.cta.authed}
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => handleAuthClick("register")} className="bg-blue-600 hover:bg-blue-700 text-white">
                {copy.cta.join}
              </Button>
              <Button size="lg" onClick={() => handleAuthClick()} variant="outline">
                {copy.cta.login}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
