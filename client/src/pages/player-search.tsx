import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCard } from "@/components/player/player-card";
import { PlayerProfile } from "@/components/player/player-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import type { Player, SearchFilters } from "@shared/schema";

export default function PlayerSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    name: "",
    position: "",
    team: "",
    league: "",
    ageMin: undefined,
    ageMax: undefined,
    sortBy: "compatibility",
  });
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    name: "",
    position: "",
    team: "",
    league: "",
    ageMin: undefined,
    ageMax: undefined,
    sortBy: "compatibility",
  });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const { data: playersData, isLoading } = useQuery<Player[]>({
    queryKey: ["/api/players", searchFilters],
    queryFn: ({ queryKey }) => {
      const [url, searchFilters] = queryKey;
      const params = new URLSearchParams();
      
      Object.entries(searchFilters as Record<string, any>).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== null) {
          params.append(key, value.toString());
        }
      });
      
      return fetch(`${url}?${params}`).then(res => res.json());
    },
  });

  // Ensure players is always an array
  const players = Array.isArray(playersData) ? playersData : [];

  const { data: clubsData = [] } = useQuery({
    queryKey: ["/api/clubs"],
  });

  const { data: leaguesData = [] } = useQuery({
    queryKey: ["/api/leagues"],
  });

  // Ensure clubs and leagues are always arrays
  const clubs = Array.isArray(clubsData) ? clubsData : [];
  const leagues = Array.isArray(leaguesData) ? leaguesData : [];

  // Create league code to name mapping
  const leagueMapping: Record<string, string> = {
    'ES1': 'LALIGA EA SPORTS',
    'IT1': 'Serie A Enilive',
    'GB1': 'Premier League',
    'DE1': 'Bundesliga',
    'FR1': 'Ligue 1 McDonald\'s',
    'NL1': 'Eredivisie',
    'PT1': 'Liga Portugal Betclic',
    'TR1': 'Trendyol Süper Lig',
    'GR1': 'Hellas Liga',
    'SC1': 'Scottish Prem',
    'BE1': 'Jupiler Pro League',
    'L1': 'Österreichische Bundesliga',
    'DK1': 'Danish Superliga',
    'NO1': 'Eliteserien',
    'SE1': 'Allsvenskan',
    'CH1': 'Credit Suisse Super League',
    'RU1': 'Russian Premier League',
    'UA1': 'Ukrainian Premier League',
    'PL1': 'PKO Ekstraklasa',
    'CZ1': 'Česká Liga',
    'HR1': 'SuperSport HNL',
    'RS1': 'Mozzart Bet SuperLiga',
    'BG1': 'A Professional Football Group',
    'RO1': 'Liga I',
    'SK1': 'Niké Liga',
    'SI1': 'Prva Liga Telemach',
    'EE1': 'Meistriliiga',
    'LV1': 'Optibet Virslīga',
    'LT1': 'A lyga',
    'FI1': 'Veikkausliiga',
    'IS1': 'Besta-deild karla',
    'FO1': 'Effodeildin',
    'AD1': 'Primera Divisió',
    'MT1': 'BOV Premier League',
    'CY1': 'Cyprus League',
    'LU1': 'BGL Ligue',
    'LI1': 'FL1.Liechtenstein',
    'SM1': 'Campionato Sammarinese',
    'MC1': 'Championnat de Monaco',
    'VA1': 'Vatican League'
  };

  // Filter clubs based on selected league
  const filteredClubs = filters.league && filters.league !== "" 
    ? clubs.filter(club => {
        const clubLeague = leagueMapping[club.domestic_competition_id || ''];
        return clubLeague === filters.league;
      })
    : clubs;

  const positions = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"];
  const ageRanges = [
    { label: "All Ages", min: undefined, max: undefined },
    { label: "18-22", min: 18, max: 22 },
    { label: "23-27", min: 23, max: 27 },
    { label: "28-32", min: 28, max: 32 },
    { label: "33+", min: 33, max: undefined },
  ];

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    // Handle "all" values by setting them to empty/undefined
    let actualValue = value;
    if (value === "all") {
      actualValue = key === "position" || key === "team" || key === "league" ? "" : undefined;
    }
    setFilters(prev => ({ ...prev, [key]: actualValue }));
  };

  const handleAgeRangeChange = (value: string) => {
    const range = ageRanges.find(r => r.label === value);
    if (range) {
      setFilters(prev => ({
        ...prev,
        ageMin: range.min,
        ageMax: range.max,
      }));
    }
  };

  const handleSearch = () => {
    setSearchFilters(filters);
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
  };

  return (
    <div className="p-6">
      {/* Search and Filters */}
      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-dark">
            Search Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="playerName" className="text-sm font-medium text-gray-700 mb-2">
                Player Name
              </Label>
              <Input
                id="playerName"
                placeholder="Search by name..."
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
                className="focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">
                Age Range
              </Label>
              <Select onValueChange={handleAgeRangeChange}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="All Ages" />
                </SelectTrigger>
                <SelectContent>
                  {ageRanges.map((range) => (
                    <SelectItem key={range.label} value={range.label}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">
                Current Position
              </Label>
              <Select onValueChange={(value) => handleFilterChange("position", value)}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">
                League
              </Label>
              <Select onValueChange={(value) => handleFilterChange("league", value)}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="All Leagues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues</SelectItem>
                  {leagues.map((league, index) => (
                    <SelectItem key={league || index} value={league}>
                      {league}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">
                Team
              </Label>
              <Select onValueChange={(value) => handleFilterChange("team", value)}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {filteredClubs.filter(club => club.name && club.name.trim() !== "").map((club, index) => (
                    <SelectItem key={club.name || index} value={club.name}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Search Button */}
          <div className="flex justify-center mt-4">
            <Button 
              onClick={handleSearch}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-2 rounded-lg flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search Players
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player List */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-dark">
                  Search Results
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => handleFilterChange("sortBy", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compatibility">Compatibility</SelectItem>
                      <SelectItem value="overall">Overall Rating</SelectItem>
                      <SelectItem value="age">Age</SelectItem>
                      <SelectItem value="market_value">Market Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
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
                            <Skeleton className="h-6 w-12" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-6 w-12 mb-1" />
                          <Skeleton className="h-3 w-16 mb-2" />
                          <Skeleton className="h-2 w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No players found matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {players.map((player) => (
                    <div key={player.id} onClick={() => handlePlayerClick(player)} className="cursor-pointer">
                      <PlayerCard
                        player={player}
                        isSelected={selectedPlayer?.id === player.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Player Profile */}
        <div>
          <PlayerProfile player={selectedPlayer} />
        </div>
      </div>
    </div>
  );
}
