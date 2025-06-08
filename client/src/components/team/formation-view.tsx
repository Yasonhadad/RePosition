interface FormationPlayer {
  id: number;
  name: string;
  sub_position: string;
  compatibility?: {
    best_pos: string;
    best_fit_score: number;
  };
}

interface FormationViewProps {
  players: FormationPlayer[];
}

export function FormationView({ players }: FormationViewProps) {
  const getPlayersByPosition = (position: string) => {
    return players.filter(p => 
      p.sub_position === position || 
      p.compatibility?.best_pos === position
    );
  };

  const getPositionPlayers = (positions: string[]) => {
    const positionPlayers: FormationPlayer[] = [];
    
    positions.forEach(pos => {
      const playersInPos = getPlayersByPosition(pos);
      if (playersInPos.length > 0) {
        positionPlayers.push(playersInPos[0]); // Take first player for this position
      }
    });
    
    return positionPlayers;
  };

  const forwards = getPositionPlayers(["LW", "ST", "RW"]);
  const midfielders = getPositionPlayers(["CM", "CAM", "CDM"]);
  const defenders = getPositionPlayers(["LB", "CB", "RB"]);

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const getCompatibilityColor = (score?: number) => {
    if (!score) return "bg-white bg-opacity-20";
    if (score >= 90) return "bg-accent bg-opacity-30";
    if (score >= 80) return "bg-white bg-opacity-30";
    return "bg-white bg-opacity-20";
  };

  return (
    <div className="bg-gradient-to-b from-primary to-success rounded-lg p-8 relative">
      <div className="text-center text-white">
        <h4 className="font-semibold mb-6">Formation Analysis</h4>
        
        <div className="space-y-12">
          {/* Forwards */}
          {forwards.length > 0 && (
            <div className="flex justify-center space-x-16">
              {forwards.map((player, index) => (
                <div key={player.id} className="text-center">
                  <div className={`w-12 h-12 ${getCompatibilityColor(player.compatibility?.best_fit_score)} rounded-full flex items-center justify-center mb-2`}>
                    <span className="text-xs font-bold">
                      {player.sub_position}
                    </span>
                  </div>
                  <div className="text-xs">
                    {player.name.split(' ')[0]}<br/>
                    {player.compatibility?.best_fit_score?.toFixed(0) || "N/A"}%
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Midfielders */}
          {midfielders.length > 0 && (
            <div className="flex justify-center space-x-20">
              {midfielders.map((player) => (
                <div key={player.id} className="text-center">
                  <div className={`w-12 h-12 ${getCompatibilityColor(player.compatibility?.best_fit_score)} rounded-full flex items-center justify-center mb-2`}>
                    <span className="text-xs font-bold">
                      {player.sub_position}
                    </span>
                  </div>
                  <div className="text-xs">
                    {player.name.split(' ')[0]}<br/>
                    {player.compatibility?.best_fit_score?.toFixed(0) || "N/A"}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Defenders */}
          {defenders.length > 0 && (
            <div className="flex justify-center space-x-24">
              {defenders.map((player) => (
                <div key={player.id} className="text-center">
                  <div className={`w-12 h-12 ${getCompatibilityColor(player.compatibility?.best_fit_score)} rounded-full flex items-center justify-center mb-2`}>
                    <span className="text-xs font-bold">
                      {player.sub_position}
                    </span>
                  </div>
                  <div className="text-xs">
                    {player.name.split(' ')[0]}<br/>
                    {player.compatibility?.best_fit_score?.toFixed(0) || "N/A"}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {players.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/70">No player data available for formation view</p>
          </div>
        )}
      </div>
    </div>
  );
}
