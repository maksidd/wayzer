import { Header } from "@/components/ui/header";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Trips from "@/pages/trips";
import CreateTrip from "@/pages/create-trip";
import Profile from "@/pages/profile";
import About from "@/pages/about";
import Rules from "@/pages/rules";
import Messages from "@/pages/messages";
import Favorites from "@/pages/favorites";
import AdminPage from "@/pages/admin";
import TestsPage from "@/pages/tests";
import MyRoutes from "@/pages/my-routes";
import MyTrips from "@/pages/my-trips";
import { Switch, Route } from "wouter";
import { useChatWebSocket } from "@/hooks/use-chat-websocket";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/trips" component={Trips} />
      <Route path="/trips/:id" component={Trips} />
      <Route path="/create-trip" component={CreateTrip} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/profile" component={Profile} />
      <Route path="/about" component={About} />
      <Route path="/rules" component={Rules} />
      <Route path="/messages" component={Messages} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/tests" component={TestsPage} />
      <Route path="/my-routes" component={MyRoutes} />
      <Route path="/my-routes/:id" component={MyRoutes} />
      <Route path="/my-trips" component={MyTrips} />
      <Route path="/my-trips/:id" component={MyTrips} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function AppLayout() {
  const { user, logout, navigateToAuth } = useAuth();

  const wsEnabled = !!user;
  useChatWebSocket(wsEnabled ? {
    onAnyMessage: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/conversations2'] });
    },
    onNewMessage: () => { },
  } : { onAnyMessage: () => { }, onNewMessage: () => { } });

  return (
    <>
      <Header user={user} onLogout={logout} onAuthClick={navigateToAuth} />
      <Router />
    </>
  );
} 