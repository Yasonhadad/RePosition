import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Calculator, Loader2 } from "lucide-react";
import type { Player, SearchFilters } from "@shared/schema";
import { getClubs } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";


export default function PlayerSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    name: "",
    position: "",
    team: "",
    country: "",
    ageMin: undefined,
    ageMax: undefined,
    sortBy: "compatibility",
  });
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    name: "",
    position: "",
    team: "",
    country: "",
    ageMin: undefined,
    ageMax: undefined,
    sortBy: "compatibility",
  });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [calculatingPlayer, setCalculatingPlayer] = useState<number | null>(null);
  const [compatibilityResults, setCompatibilityResults] = useState<any>(null);
  const queryClient = useQueryClient();

  // Mutation for calculating position compatibility
  const calculateCompatibility = useMutation({
    mutationFn: async (playerId: number) => {
      return apiRequest(`/api/players/${playerId}/analyze`, "POST");
    },
    onSuccess: (data, playerId) => {
      setCompatibilityResults(data);
      setCalculatingPlayer(null);
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/compatibility`] });
    },
    onError: () => {
      setCalculatingPlayer(null);
    }
  });

  const { data: playersData, isLoading } = useQuery<Player[]>({
    queryKey: ["/api/players", searchFilters],
    queryFn: ({ queryKey }) => {
      const [url, searchFilters] = queryKey;
      const params = new URLSearchParams();

      Object.entries(searchFilters as Record<string, any>).forEach(
        ([key, value]) => {
          if (value !== undefined && value !== "" && value !== null) {
            params.append(key, value.toString());
          }
        },
      );

      return fetch(`${url}?${params}`).then((res) => res.json());
    },
  });

  // Ensure players is always an array
  const players = Array.isArray(playersData) ? playersData : [];

  const { data: competitionsData = [] } = useQuery({
    queryKey: ["/api/competitions"],
  });

  const { data: clubsData = [] } = useQuery({
    queryKey: ["/api/clubs", filters.country],
    queryFn: () => getClubs(filters.country),
  });

  const { data: leaguesData = [] } = useQuery({
    queryKey: ["/api/leagues"],
  });

  // Ensure clubs, leagues and competitions are always arrays
  const clubs = Array.isArray(clubsData) ? clubsData : [];
  const leagues = Array.isArray(leaguesData) ? leaguesData : [];
  const competitions = Array.isArray(competitionsData) ? competitionsData : [];

  // Get unique country names from competitions
  const countries = competitions
    .filter((comp) => comp.country_name && comp.country_name.trim() !== "")
    .map((comp) => comp.country_name)
    .filter((country, index, self) => self.indexOf(country) === index)
    .sort();

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
      actualValue =
        key === "position" || key === "team" || key === "country"
          ? ""
          : undefined;
    }
    setFilters((prev) => ({ ...prev, [key]: actualValue }));
  };

  const handleAgeRangeChange = (value: string) => {
    const range = ageRanges.find((r) => r.label === value);
    if (range) {
      setFilters((prev) => ({
        ...prev,
        ageMin: range.min,
        ageMax: range.max,
      }));
    }
  };

  const handleSearch = () => {
    setSearchFilters(filters);
  };

  const handleCalculateCompatibility = (player: Player) => {
    setCalculatingPlayer(player.id);
    calculateCompatibility.mutate(player.id);
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
              <Label
                htmlFor="playerName"
                className="text-sm font-medium text-gray-700 mb-2"
              >
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
              <Select
                onValueChange={(value) => handleFilterChange("position", value)}
              >
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
                Leagues by Country
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange("country", value)}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country, index) => (
                    <SelectItem key={country || index} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">
                Team
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange("team", value)}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {clubs
                    .filter((club) => club.name && club.name.trim() !== "")
                    .map((club, index) => (
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
              <CardTitle className="text-lg font-semibold text-dark">
                Search Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No players found matching your criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{player.name}</h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Position: {player.position || "Unknown"}</p>
                            <p>Team: {player.current_club_name || "Unknown"}</p>
                            <p>Age: {player.age || "Unknown"}</p>
                            {player.country_of_citizenship && (
                              <p>Country: {player.country_of_citizenship}</p>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            onClick={() => handleCalculateCompatibility(player)}
                            disabled={calculatingPlayer === player.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {calculatingPlayer === player.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Computing...
                              </>
                            ) : (
                              <>
                                <Calculator className="w-4 h-4 mr-2" />
                                Calculate Compatibility
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Compatibility Results */}
        <div>
          {compatibilityResults ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-dark">
                  Position Compatibility Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {compatibilityResults.positions && Object.entries(compatibilityResults.positions).map(([position, score]) => (
                    <div key={position} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{position}</span>
                      <span className="text-lg font-bold text-green-600">
                        {typeof score === 'number' ? `${score.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  ))}
                  {compatibilityResults.bestPosition && (
                    <div className="mt-4 p-3 bg-green-100 rounded">
                      <p className="font-semibold text-green-800">
                        Best Position: {compatibilityResults.bestPosition} 
                        ({compatibilityResults.bestScore?.toFixed(1)}%)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a player and calculate compatibility to see results</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
