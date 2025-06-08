import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormationView } from "@/components/team/formation-view";
import { PlayerCard } from "@/components/player/player-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Club } from "@shared/schema";

interface TeamAnalysis {
  clubName: string;
  analytics: {
    avgCompatibility: number;
    playerCount: number;
    bestPosition: string;
    positionBreakdown: Record<string, number>;
  };
  players: Array<{
    id: number;
    name: string;
    sub_position: string;
    age: number;
    ovr: number;
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
  { value: "all", label: "כל העמדות" },
  { value: "ST", label: "חלוץ מרכז (ST)" },
  { value: "LW", label: "חלוץ שמאל (LW)" },
  { value: "RW", label: "חלוץ ימין (RW)" },
  { value: "CAM", label: "קשר התקפי (CAM)" },
  { value: "CM", label: "קשר מרכז (CM)" },
  { value: "CDM", label: "קשר הגנתי (CDM)" },
  { value: "LB", label: "בק שמאל (LB)" },
  { value: "RB", label: "בק ימין (RB)" },
  { value: "CB", label: "מגן מרכז (CB)" }
];

export default function TeamAnalysis() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("all");

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery<string[]>({
    queryKey: ["/api/countries"],
  });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs/country", selectedCountry],
    queryFn: ({ queryKey }) => {
      const [, , league] = queryKey;
      return fetch(`/api/clubs/country/${encodeURIComponent(league as string)}`).then(res => res.json());
    },
    enabled: !!selectedCountry,
  });

  const { data: teamAnalysis, isLoading: analysisLoading } = useQuery<TeamAnalysis>({
    queryKey: ["/api/teams", selectedClub, "analysis"],
    queryFn: ({ queryKey }) => {
      const [, , clubName] = queryKey;
      return fetch(`/api/teams/${encodeURIComponent(clubName as string)}/analysis`).then(res => res.json());
    },
    enabled: !!selectedClub,
  });

  // Function to get position compatibility score for a player
  const getPositionScore = (player: TeamAnalysis['players'][0], position: string) => {
    if (!player.compatibility) return 0;
    const positionKey = `${position.toLowerCase()}_fit` as keyof typeof player.compatibility;
    return player.compatibility[positionKey] as number || 0;
  };

  // Filter players by selected position
  const filteredPlayers = teamAnalysis?.players.filter(player => {
    if (selectedPosition === "all") return true;
    return getPositionScore(player, selectedPosition) > 50; // Show only players with good fit
  }).sort((a, b) => {
    if (selectedPosition === "all") {
      return (b.compatibility?.best_fit_score || 0) - (a.compatibility?.best_fit_score || 0);
    }
    return getPositionScore(b, selectedPosition) - getPositionScore(a, selectedPosition);
  }) || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark mb-2">ניתוח קבוצה</h2>
        <p className="text-gray-600">
          נתח הרכב קבוצה והתאמת שחקנים לעמדות
        </p>
      </div>

      {/* Team Selection */}
      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-dark">
            בחירת קבוצה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* League Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ליגה
              </label>
              <Select value={selectedCountry} onValueChange={(value) => {
                setSelectedCountry(value);
                setSelectedClub(""); // Reset club selection
              }}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="בחר ליגה..." />
                </SelectTrigger>
                <SelectContent>
                  {leaguesLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-32" />
                    </div>
                  ) : (
                    leagues.map((league) => (
                      <SelectItem key={league} value={league}>
                        {league}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Club Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קבוצה
              </label>
              <Select 
                value={selectedClub} 
                onValueChange={setSelectedClub}
                disabled={!selectedCountry}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder={selectedCountry ? "בחר קבוצה..." : "בחר ליגה תחילה"} />
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
                סינון לפי עמדה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="בחר עמדה לבדיקה..." />
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

          {/* Team Statistics */}
          {analysisLoading ? (
            <Card className="shadow-sm mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                      <Skeleton className="h-8 w-16 mx-auto mb-2" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : teamAnalysis ? (
            <Card className="shadow-sm mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-dark">
                  סטטיסטיקות קבוצה - {teamAnalysis.clubName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {teamAnalysis.analytics.avgCompatibility.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">ממוצע התאמה</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-analytics">
                      {teamAnalysis.analytics.bestPosition}
                    </div>
                    <div className="text-sm text-gray-600">עמדה חזקה ביותר</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-accent">
                      {teamAnalysis.analytics.playerCount}
                    </div>
                    <div className="text-sm text-gray-600">סה״כ שחקנים</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {filteredPlayers.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedPosition === "all" ? "כל השחקנים" : `מתאימים ל-${POSITIONS.find(p => p.value === selectedPosition)?.label}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Formation View */}
          {teamAnalysis && (
            <Card className="shadow-sm mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-dark">
                  Formation Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormationView players={teamAnalysis.players} />
              </CardContent>
            </Card>
          )}

          {/* Player List */}
          {analysisLoading ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-dark">
                  שחקני הקבוצה
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
                  שחקני הקבוצה ({filteredPlayers.length} מתוך {teamAnalysis.players.length})
                </CardTitle>
                {selectedPosition !== "all" && (
                  <p className="text-sm text-gray-600">
                    מציג שחקנים עם התאמה מעל 50% ל{POSITIONS.find(p => p.value === selectedPosition)?.label}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {selectedPosition === "all" 
                        ? "לא נמצאו שחקנים בקבוצה זו."
                        : `לא נמצאו שחקנים מתאימים לעמדת ${POSITIONS.find(p => p.value === selectedPosition)?.label}.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPlayers.map((player) => {
                      const positionScore = selectedPosition === "all" 
                        ? player.compatibility?.best_fit_score 
                        : getPositionScore(player, selectedPosition);
                      
                      const positionLabel = selectedPosition === "all"
                        ? player.compatibility?.best_pos
                        : POSITIONS.find(p => p.value === selectedPosition)?.label;

                      return (
                        <div
                          key={player.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-16 h-16 bg-gradient-to-br from-primary to-analytics rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                  {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-dark">{player.name}</h4>
                                <div className="flex items-center space-x-4 mt-1">
                                  <Badge variant="secondary">
                                    {player.sub_position}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {player.age} שנים
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    OVR {player.ovr}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {player.compatibility ? (
                                <>
                                  <div className={`text-lg font-bold ${
                                    (positionScore || 0) >= 80 ? 'text-green-600' :
                                    (positionScore || 0) >= 60 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {positionScore?.toFixed(1)}%
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {selectedPosition === "all" ? "הטוב ביותר: " : "התאמה ל"}{positionLabel}
                                  </p>
                                  {selectedPosition !== "all" && (
                                    <div className="flex gap-1 mt-2">
                                      {POSITIONS.slice(1).map((pos) => {
                                        const score = getPositionScore(player, pos.value);
                                        return (
                                          <div
                                            key={pos.value}
                                            className={`text-xs px-1 py-0.5 rounded ${
                                              score >= 70 ? 'bg-green-100 text-green-800' :
                                              score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-gray-100 text-gray-600'
                                            }`}
                                            title={`${pos.label}: ${score.toFixed(1)}%`}
                                          >
                                            {pos.value}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-sm text-gray-400">
                                  ללא ניתוח
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
