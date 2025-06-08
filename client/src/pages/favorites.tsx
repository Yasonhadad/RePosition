import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerCard } from "@/components/player/player-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Heart } from "lucide-react";
import type { Player } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Favorites() {
  const { isAuthenticated, user } = useAuth();

  const { data: favorites = [], isLoading } = useQuery<Player[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated && !!user,
  });

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-2">Login Required</h2>
          <p className="text-gray-500">Please login to view your favorite players.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="shadow-sm mb-6">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
              <Star className="h-6 w-6 text-white fill-current" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-dark">
                My Favorite Players
              </CardTitle>
              <p className="text-gray-600">
                Players you've starred for quick access and analysis
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-dark">
              Starred Players ({favorites.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-16 h-16 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Favorite Players Yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start exploring players and click the star icon to add them to your favorites.
              </p>
              <a 
                href="/search" 
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Star className="h-4 w-4 mr-2" />
                Search Players
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={() => {
                    // Navigate to player details if needed
                    window.location.href = `/players/${player.id}`;
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}