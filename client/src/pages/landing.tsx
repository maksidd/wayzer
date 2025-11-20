import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(["pages", "common"]);
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

  const handleRegister = () => {
    sessionStorage.setItem("returnUrl", window.location.pathname);
    setLocation("/auth?mode=register");
  };

  const handleLogin = () => {
    sessionStorage.setItem("returnUrl", window.location.pathname);
    setLocation("/auth");
  };

  const paragraphs = t("landing.paragraphs", { ns: "pages", returnObjects: true }) as string[];
  const cta = t("landing.cta", { ns: "pages", returnObjects: true }) as Record<string, string>;
  const gallery = t("landing.gallery", { ns: "pages", returnObjects: true }) as Record<string, string>;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          {t("landing.heroTitle", { ns: "pages" })}
        </h1>
        {paragraphs.map((text, index) => (
          <p key={index} className="max-w-xl text-center text-base md:text-lg text-gray-600 dark:text-gray-600 mb-8">
            {text}
          </p>
        ))}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          {user ? (
            <>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                onClick={() => setLocation("/create-trip")}
              >
                {cta.createRoute}
              </Button>
              <Link
                href="/trips"
                className="text-blue-600 dark:text-blue-400 text-lg flex items-center justify-center"
              >
                {cta.viewRoutes}
              </Link>
            </>
          ) : (
            <>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                onClick={handleRegister}
              >
                {cta.signUp}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-3 text-lg border-gray-300 dark:border-gray-600"
                onClick={handleLogin}
              >
                {cta.logIn}
              </Button>
            </>
          )}
        </div>
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80" alt={gallery.mountains} className="rounded-lg object-cover h-40 w-full" />
          <img src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80" alt={gallery.friends} className="rounded-lg object-cover h-40 w-full" />
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80" alt={gallery.city} className="rounded-lg object-cover h-40 w-full" />
          <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" alt={gallery.happy} className="rounded-lg object-cover h-40 w-full" />
        </div>
        <div className="max-w-xl text-center text-base md:text-lg text-gray-600 dark:text-gray-600 mb-8">
          {t("landing.closing", { ns: "pages" })}
        </div>
      </main>
      <footer className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm mt-8">
        {t("landing.footer", { ns: "pages" })}
      </footer>
    </div>
  );
}