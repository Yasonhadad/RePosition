import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarButton } from "@/components/ui/star-button";
import { PositionCompatibility } from "./position-compatibility";
import { Link } from "wouter";
import type { Player, PositionCompatibility as PositionCompatibilityType } from "@shared/schema";

interface PlayerProfileProps {
  player: Player | null;
  showCompatibilityByDefault?: boolean;
}

interface PlayerData {
  player: Player;
  compatibility?: PositionCompatibilityType;
}

export function PlayerProfile({ player, showCompatibilityByDefault = false }: PlayerProfileProps) {
  const [showPositionCompatibility, setShowPositionCompatibility] = useState(showCompatibilityByDefault);
  
  // Reset position compatibility when player changes or update based on prop
  useEffect(() => {
    setShowPositionCompatibility(showCompatibilityByDefault);
  }, [player?.player_id, showCompatibilityByDefault]);
  
  const { data: playerData, isLoading } = useQuery<PlayerData>({
    queryKey: ["/api/players", player?.player_id],
    queryFn: ({ queryKey }) => {
      const [, playerId] = queryKey;
      return fetch(`/api/players/${playerId}`).then(res => res.json());
    },
    enabled: !!player?.player_id,
  });

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const PlayerImage = ({ player, size = "w-20 h-20" }: { player: Player, size?: string }) => {
    if (player.image_url) {
      return (
        <img
          src={player.image_url}
          alt={player.name}
          className={`${size} rounded-full object-cover border-2 border-white shadow-lg`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    return null;
  };

  function capitalizeName(name: string) {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  if (!player) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-white">Select a player to view their profile</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <Skeleton className="w-20 h-20 rounded-full mx-auto mb-3" />
            <Skeleton className="h-5 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-24 mx-auto mb-2" />
            <div className="flex justify-center space-x-2">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          
          <div className="mb-6">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-8" />
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-2 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPlayer = playerData?.player || player;
  const compatibility = playerData?.compatibility;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-dark">
          Player Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Player Info */}
        <div className="text-center mb-6">
          <div className="relative mx-auto mb-3">
            <PlayerImage player={currentPlayer} />
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-analytics rounded-full flex items-center justify-center mx-auto hidden">
              <span className="text-white font-bold text-xl">
                {getPlayerInitials(currentPlayer.name)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <h4 className="font-bold text-dark">{capitalizeName(currentPlayer.name)}</h4>
            <StarButton 
              playerId={currentPlayer.player_id} 
              size="sm" 
              variant="ghost"
            />
          </div>
          <p className="text-sm text-white">{currentPlayer.current_club_name}</p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <span className="text-xs bg-primary text-black px-2 py-1 rounded">
              {currentPlayer.sub_position || currentPlayer.position}
            </span>
            <span className="text-xs text-white">
              {currentPlayer.age} years
            </span>
          </div>
        </div>

        {/* Position Compatibility - Only shown when button is clicked */}
        {showPositionCompatibility && compatibility && (
          <div className="mb-6">
            <PositionCompatibility compatibility={compatibility} />
          </div>
        )}

        {/* Key Statistics */}
        <div className="mb-6">
          <h5 className="font-medium text-dark mb-3">Key Statistics</h5>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-black">{currentPlayer.pac || "N/A"}</div>
              <div className="text-xs text-black">PACE</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-black">{currentPlayer.sho || "N/A"}</div>
              <div className="text-xs text-black">SHOOTING</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-black">{currentPlayer.dri || "N/A"}</div>
              <div className="text-xs text-black">DRIBBLING</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-black">{currentPlayer.ovr || "N/A"}</div>
              <div className="text-xs text-black">OVERALL</div>
              <div className="text-lg font-bold text-white">{currentPlayer.ovr || "N/A"}</div>
              <div className="text-xs text-white">OVERALL</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link href={`/player/${currentPlayer.player_id}`}>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors duration-200"
              variant="default"
            >
              View Detailed Profile
            </Button>
          </Link>
          <Button 
            className="w-full border-green-600 text-green-600 hover:bg-green-50 font-medium py-2.5 rounded-lg transition-colors duration-200" 
            variant="outline"
            onClick={() => setShowPositionCompatibility(!showPositionCompatibility)}
          >
            {showPositionCompatibility ? 'Hide Position Analysis' : 'Compare Positions'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
