import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Club } from "@shared/schema";

interface TeamAnalysis {
  clubName: string;
  analytics: {
    playerCount: number;
  };
  players: Array<{
    id: number;
    player_id: number;
    name: string;
    sub_position: string;
    age: number;
    ovr: number;
    image_url?: string;
    compatibility?: {
      best_pos: string;
      best_fit_score: number;
      st_fit?: number;
      lw_fit?: number;
      rw_fit?: number;
      cm_fit?: number;
      cdm_fit?: number;
      cam_fit?: number;
      lb_fit?: number;
      rb_fit?: number;
      cb_fit?: number;
    };
  }>;
}

const POSITIONS = [
  { value: "all", label: "All Positions" },
  { value: "ST", label: "Striker (ST)" },
  { value: "LW", label: "Left Winger (LW)" },
  { value: "RW", label: "Right Winger (RW)" },
  { value: "CAM", label: "Attacking Midfielder (CAM)" },
  { value: "CM", label: "Central Midfielder (CM)" },
  { value: "CDM", label: "Defensive Midfielder (CDM)" },
  { value: "LB", label: "Left Back (LB)" },
  { value: "RB", label: "Right Back (RB)" },
  { value: "CB", label: "Center Back (CB)" }
];

function capitalizeName(name: string) {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function TeamAnalysis() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");

  const { data: countries = [], isLoading: countriesLoading } = useQuery<string[]>({
    queryKey: ["/api/countries"],
  });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs/country", selectedCountry],
    queryFn: () => {
      console.log("Fetching clubs for country:", selectedCountry);
      return fetch(`/api/clubs/country/${encodeURIComponent(selectedCountry)}`).then(res => res.json());
    },
    enabled: !!selectedCountry && selectedCountry !== "",
  });

  const { data: teamAnalysis, isLoading: analysisLoading } = useQuery<TeamAnalysis>({
    queryKey: ["/api/teams", selectedClub, "analysis"],
    queryFn: () => {
      console.log("Fetching team analysis for club:", selectedClub);
      return fetch(`/api/teams/${encodeURIComponent(selectedClub)}/analysis`).then(res => res.json());
    },
    enabled: !!selectedClub && selectedClub !== "",
  });

  // Function to get position compatibility score for a player
  const getPositionScore = (player: TeamAnalysis['players'][0], position: string) => {
    if (!player.compatibility) return 0;
    const positionKey = `${position.toLowerCase()}_fit` as keyof typeof player.compatibility;
    return player.compatibility[positionKey] as number || 0;
  };

  // Filter players by selected position
  const filteredPlayers = teamAnalysis?.players.filter(player => {
    return true; // Show all players regardless of position
  }).sort((a, b) => {
    if (selectedPosition === "all") {
      return (b.compatibility?.best_fit_score || 0) - (a.compatibility?.best_fit_score || 0);
    }
    return getPositionScore(b, selectedPosition) - getPositionScore(a, selectedPosition);
  }) || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark mb-2">Team Analysis</h2>
        <p className="text-white">
          Analyze team player position compatibility
        </p>
      </div>

      {/* Team Selection */}
      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-dark">
            Select Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Country
              </label>
              <Select value={selectedCountry} onValueChange={(value) => {
                console.log("Selected country:", value);
                setSelectedCountry(value);
                setSelectedClub(""); // Reset club selection
              }}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="Select country..." />
                </SelectTrigger>
                <SelectContent>
                  {countriesLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-32" />
                    </div>
                  ) : (
                    countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Club Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Club
              </label>
              <Select 
                value={selectedClub} 
                onValueChange={setSelectedClub}
                disabled={!selectedCountry}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder={selectedCountry ? "Select club..." : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {clubsLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-32" />
                    </div>
                  ) : (
                    clubs
                      .filter(club => club.name)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((club) => (
                        <SelectItem key={club.id} value={club.name}>
                          {club.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClub && (
        <>
          {/* Position Filter */}
          <Card className="shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-dark">
                Filter by Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Select position to analyze..." />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((position) => (
                      <SelectItem key={position.value} value={position.value}>
                        {position.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Player List */}
          {analysisLoading ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-dark">
                  Team Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-16 w-16 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24 mb-2" />
                          <div className="flex space-x-2">
                            <Skeleton className="h-6 w-8" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : teamAnalysis ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-dark">
                  Team Players ({filteredPlayers.length} of {teamAnalysis.players.length})
                </CardTitle>
                {selectedPosition !== "all" && (
                  <p className="text-sm text-white">
                    Showing all players with their compatibility scores for {POSITIONS.find(p => p.value === selectedPosition)?.label}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white">
                      {selectedPosition === "all" 
                        ? "No players found in this team."
                        : `No suitable players found for ${POSITIONS.find(p => p.value === selectedPosition)?.label} position.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {filteredPlayers.map((player) => {
                      const positionScore = selectedPosition === "all" 
                        ? player.compatibility?.best_fit_score 
                        : getPositionScore(player, selectedPosition);
                      
                      const positionLabel = selectedPosition === "all"
                        ? player.compatibility?.best_pos
                        : POSITIONS.find(p => p.value === selectedPosition)?.label;

                      return (
                        <Link 
                          key={player.id}
                          href={`/player/${player.player_id}`}
                          className="block"
                        >
                          <div className="border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer h-full">
                            <div className="flex flex-col items-center space-y-2 h-full">
                              {/* Player Image */}
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary to-analytics flex items-center justify-center relative">
                                {player.image_url ? (
                                  <>
                                    <img 
                                      src={player.image_url} 
                                      alt={player.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.parentElement?.querySelector('.fallback-initials') as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                    <span 
                                      className="fallback-initials absolute inset-0 text-white font-bold text-lg flex items-center justify-center"
                                      style={{ display: 'none' }}
                                    >
                                      {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-white font-bold text-lg">
                                    {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Player Info */}
                              <div className="text-center w-full flex-1">
                                <h4 className="font-semibold text-dark hover:text-primary transition-colors text-xs mb-1 line-clamp-2">
                                  {capitalizeName(player.name)}
                                </h4>
                                
                                <div className="flex justify-center mb-1">
                                  <Badge variant="secondary" className="text-xs px-1 py-0.5">
                                    {player.sub_position}
                                  </Badge>
                                </div>
                                
                                <div className="flex justify-between items-center text-xs text-white mb-2">
                                  <span>{player.age}y</span>
                                  <span>OVR {player.ovr}</span>
                                </div>
                                
                                {/* Compatibility Score */}
                                {player.compatibility ? (
                                  <div className="text-center">
                                    <div className={`text-lg font-bold mb-1 ${
                                      (positionScore || 0) >= 80 ? 'text-green-600' :
                                      (positionScore || 0) >= 60 ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>
                                      {positionScore?.toFixed(1)}%
                                    </div>
                                    <p className="text-xs text-white mb-1">
                                      {selectedPosition === "all" 
                                        ? `Best: ${POSITIONS.find(p => p.value === player.compatibility?.best_pos)?.label || player.compatibility?.best_pos}`
                                        : positionLabel
                                      }
                                    </p>
                                    
                                    <div className="flex flex-wrap justify-center gap-1">
                                      {POSITIONS.slice(1).filter((pos) => {
                                        const score = getPositionScore(player, pos.value);
                                        return score > 59;
                                      }).map((pos) => {
                                        const score = getPositionScore(player, pos.value);
                                        return (
                                          <div
                                            key={pos.value}
                                            className={`text-xs px-1 py-0.5 rounded font-medium ${
                                              score >= 80 ? 'bg-green-500 text-white' :
                                              score >= 70 ? 'bg-blue-500 text-white' :
                                              'bg-yellow-500 text-white'
                                            }`}
                                            title={`${pos.label}: ${score.toFixed(1)}%`}
                                          >
                                            {pos.value}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-white">
                                    No Analysis
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
