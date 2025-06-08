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

  const { data: countries = [], isLoading: countriesLoading } = useQuery<string[]>({
    queryKey: ["/api/countries"],
  });

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs/country", selectedCountry],
    queryFn: ({ queryKey }) => {
      const [, , country] = queryKey;
      return fetch(`/api/clubs/country/${encodeURIComponent(country)}`).then(res => res.json());
    },
    enabled: !!selectedCountry,
  });

  const { data: teamAnalysis, isLoading: analysisLoading } = useQuery<TeamAnalysis>({
    queryKey: ["/api/teams", selectedClub, "analysis"],
    queryFn: ({ queryKey }) => {
      const [, clubName] = queryKey;
      return fetch(`/api/teams/${encodeURIComponent(clubName)}/analysis`).then(res => res.json());
    },
    enabled: !!selectedClub,
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark mb-2">Team Analysis</h2>
        <p className="text-gray-600">
          Analyze team formation and player position compatibility
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
          <div className="max-w-md">
            <Select value={selectedClub} onValueChange={setSelectedClub}>
              <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                <SelectValue placeholder="Choose a team to analyze..." />
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
                    .slice(0, 50)
                    .map((club) => (
                      <SelectItem key={club.id} value={club.name}>
                        {club.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedClub && (
        <>
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
                  Team Statistics - {teamAnalysis.clubName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {teamAnalysis.analytics.avgCompatibility.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Compatibility</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-analytics">
                      {teamAnalysis.analytics.bestPosition}
                    </div>
                    <div className="text-sm text-gray-600">Strongest Position</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-accent">
                      {teamAnalysis.analytics.playerCount}
                    </div>
                    <div className="text-sm text-gray-600">Total Players</div>
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
                  Team Players ({teamAnalysis.players.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamAnalysis.players.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No players found for this team.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamAnalysis.players.map((player) => (
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
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {player.sub_position}
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
                            {player.compatibility ? (
                              <>
                                <div className="text-lg font-bold text-primary">
                                  {player.compatibility.best_fit_score?.toFixed(1)}%
                                </div>
                                <p className="text-xs text-gray-500">
                                  Best: {player.compatibility.best_pos}
                                </p>
                              </>
                            ) : (
                              <div className="text-sm text-gray-400">
                                No analysis
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
