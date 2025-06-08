import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";

interface FavoritePlayerCardProps {
  player: Player;
  onRemove?: () => void;
}

export function FavoritePlayerCard({ player, onRemove }: FavoritePlayerCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/favorites/${player.player_id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Removed from favorites",
        description: `${player.name} was removed from your favorites.`,
      });
      onRemove?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove player from favorites",
        variant: "destructive",
      });
    },
  });

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const PlayerImage = ({ player, size = "w-16 h-16" }: { player: Player, size?: string }) => {
    if (player.image_url) {
      return (
        <img
          src={player.image_url}
          alt={player.name}
          className={`${size} rounded-lg object-cover border-2 border-white shadow-sm`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentNode as HTMLElement;
            if (parent) {
              parent.innerHTML = `
                <div class="${size} bg-gradient-to-br from-primary to-analytics rounded-lg flex items-center justify-center">
                  <span class="text-white font-bold text-sm">${getPlayerInitials(player.name)}</span>
                </div>
              `;
            }
          }}
        />
      );
    } else {
      return (
        <div className={`${size} bg-gradient-to-br from-primary to-analytics rounded-lg flex items-center justify-center`}>
          <span className="text-white font-bold text-sm">
            {getPlayerInitials(player.name)}
          </span>
        </div>
      );
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Player Image */}
          <PlayerImage player={player} />

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-dark truncate">{player.name}</h4>
            <p className="text-sm text-gray-600 truncate">{player.current_club_name}</p>
            
            {/* Player Stats */}
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {player.sub_position || player.position}
              </Badge>
              <span className="text-xs text-gray-500">
                {player.age} years
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/player/${player.player_id}`}
              className="flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span>View</span>
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeFavoriteMutation.mutate()}
              disabled={removeFavoriteMutation.isPending}
              className="flex items-center space-x-1"
            >
              <Trash2 className="h-4 w-4" />
              <span>{removeFavoriteMutation.isPending ? "Removing..." : "Remove"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}