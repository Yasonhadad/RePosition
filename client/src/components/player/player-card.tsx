import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Player } from "@shared/schema";

interface PlayerCardProps {
  player: Player;
  isSelected?: boolean;
  onClick?: () => void;
  onComparePositions?: () => void;
  compatibility?: {
    best_pos: string;
    best_fit_score: number;
  };
}

export function PlayerCard({ player, isSelected, onClick, onComparePositions, compatibility }: PlayerCardProps) {
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
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    return null;
  };

  const getCompatibilityColor = (score?: number) => {
    if (!score) return "from-gray-400 to-gray-500";
    if (score >= 90) return "from-primary to-success";
    if (score >= 80) return "from-analytics to-primary";
    if (score >= 70) return "from-accent to-analytics";
    return "from-gray-400 to-gray-500";
  };

  const compatibilityScore = compatibility?.best_fit_score || 0;

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
            <PlayerImage player={player} />
            <div className={`w-16 h-16 bg-gradient-to-br ${getCompatibilityColor(compatibilityScore)} rounded-lg flex items-center justify-center hidden`}>
              <span className="text-white font-bold text-lg">
                {getPlayerInitials(player.name)}
              </span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-dark">{player.name}</h4>
            <p className="text-sm text-gray-600">{player.current_club_name}</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {player.sub_position || player.position}
              </span>
              <span className="text-xs text-gray-500">
                {player.age} years
              </span>
              <span className="text-xs text-gray-500">
                OVR {player.ovr}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          {compatibility ? (
            <>
              <div className="text-lg font-bold text-primary">
                {compatibility.best_fit_score.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500">
                {compatibility.best_pos} Compatibility
              </p>
              <div className="flex items-center mt-2">
                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${Math.min(compatibility.best_fit_score, 100)}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <Button 
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onComparePositions?.();
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
