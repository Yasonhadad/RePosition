import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import { Header } from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import PlayerSearch from "@/pages/player-search";
import PlayerDetails from "@/pages/player-details";
import TeamAnalysis from "@/pages/team-analysis";

import Favorites from "@/pages/favorites";
import NotFound from "@/pages/not-found";
import { Landing } from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import CsvUploadPage from "@/pages/csv-upload";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-4">
        <Switch>
          <Route path="/" component={isAuthenticated ? Dashboard : Landing} />
          <Route path="/auth" component={isAuthenticated ? () => <Redirect to="/" /> : AuthPage} />
          {isAuthenticated && (
            <>
              <Route path="/search" component={PlayerSearch} />
              <Route path="/players" component={PlayerSearch} />
              <Route path="/player/:id" component={PlayerDetails} />
              <Route path="/favorites" component={Favorites} />
              <Route path="/teams" component={TeamAnalysis} />
              <Route path="/upload" component={CsvUploadPage} />

            </>
          )}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
