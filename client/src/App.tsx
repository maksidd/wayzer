import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Trips from "@/pages/trips";
import CreateTrip from "@/pages/create-trip";
import Profile from "@/pages/profile";
import About from "@/pages/about";
import Messages from "@/pages/messages";
import Favorites from "@/pages/favorites";
import AdminPage from "@/pages/admin";
import MyRoutes from "@/pages/my-routes";
import MyTrips from "@/pages/my-trips";
import { Header } from "@/components/ui/header";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "./AppLayout";

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
      <Route path="/messages" component={Messages} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/my-routes" component={MyRoutes} />
      <Route path="/my-routes/:id" component={MyRoutes} />
      <Route path="/my-trips" component={MyTrips} />
      <Route path="/my-trips/:id" component={MyTrips} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <AppLayout />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;