import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StarButton } from "@/components/ui/star-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";
import { capitalizeName, getCompatibilityColor } from "@/lib/player-utils";

interface UnifiedPlayerCardProps {
  player: Player;
  variant?: 'default' | 'favorite';
  isSelected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  onComparePositions?: () => void;
  compatibility?: {
    best_pos: string;
    best_fit_score: number;
  };
  showProfileButton?: boolean;
}



export function UnifiedPlayerCard({ 
  player, 
  variant = 'default',
  isSelected, 
  onClick, 
  onRemove,
  onComparePositions, 
  compatibility, 
  showProfileButton 
}: UnifiedPlayerCardProps) {
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

  const compatibilityScore = compatibility?.best_fit_score || 0;

  if (variant === 'favorite') {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {player.image_url && (
                <img
                  src={player.image_url}
                  alt={player.name}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm"
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-dark truncate">{capitalizeName(player.name)}</h4>
              <p className="text-sm text-white truncate">{player.current_club_name}</p>
              
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {player.sub_position || player.position}
                </Badge>
                <span className="text-xs text-white">{player.age} years</span>
                <span className="text-xs text-white">OVR {player.ovr}</span>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFavoriteMutation.mutate();
                }}
                disabled={removeFavoriteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {player.image_url && (
              <img
                src={player.image_url}
                alt={player.name}
                className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm"
              />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-dark">{capitalizeName(player.name)}</h4>
            <p className="text-sm text-white">{player.current_club_name}</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs bg-gray-100 text-black px-2 py-1 rounded">
                {player.sub_position || player.position}
              </span>
              <span className="text-xs text-white">
                {player.age} years
              </span>
              <span className="text-xs text-white">
                OVR {player.ovr}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div>
            {compatibility ? (
              <>
                <div className="text-lg font-bold text-primary">
                  {compatibility.best_fit_score.toFixed(1)}%
                </div>
                <p className="text-xs text-white">
                  {compatibility.best_pos} Compatibility
                </p>
              </>
            ) : (
              <StarButton playerId={player.player_id} />
            )}
          </div>
          {showProfileButton && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            >
              View Profile
            </Button>
          )}
          {onComparePositions && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onComparePositions();
              }}
            >
              Compare Positions
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 