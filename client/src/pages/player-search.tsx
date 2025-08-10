import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { UnifiedPlayerCard } from "@/components/player/unified-player-card";
import { PlayerProfile } from "@/components/player/player-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Player, SearchFilters } from "@shared/schema";
import { getClubs } from "@/lib/api";

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function PlayerSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    name: "",
    position: "",
    team: "",
    country: "",
    citizenship: "",
    ageMin: undefined,
    ageMax: undefined,
    sortBy: "compatibility",
  });
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    name: "",
    position: "",
    team: "",
    country: "",
    citizenship: "",
    ageMin: undefined,
    ageMax: undefined,
    sortBy: "compatibility",
  });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showCompatibilityForPlayer, setShowCompatibilityForPlayer] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Show 20 players per page

  // Debounce the name filter for better performance
  const debouncedName = useDebounce(filters.name, 500);

  // Update search filters when debounced name changes
  useEffect(() => {
    if (hasSearched) {
      setSearchFilters(prev => ({ ...prev, name: debouncedName }));
    }
  }, [debouncedName, hasSearched]);

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
    enabled: hasSearched,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Ensure players is always an array
  const players = Array.isArray(playersData) ? playersData : [];

  const { data: competitionsData = [] } = useQuery({
    queryKey: ["/api/competitions"],
    staleTime: 300000, // Cache for 5 minutes
  });

  const { data: clubsData = [] } = useQuery({
    queryKey: ["/api/clubs", filters.country],
    queryFn: () => getClubs(filters.country),
    staleTime: 300000, // Cache for 5 minutes
  });

  const { data: leaguesData = [] } = useQuery({
    queryKey: ["/api/leagues"],
    staleTime: 300000, // Cache for 5 minutes
  });

  // Ensure clubs, leagues and competitions are always arrays
  const clubs = Array.isArray(clubsData) ? clubsData : [];
  const leagues = Array.isArray(leaguesData) ? leaguesData : [];
  const competitions = Array.isArray(competitionsData) ? competitionsData : [];

  // Get unique country names from competitions - memoized for performance
  const countries = useMemo(() => {
    return competitions
      .filter((comp) => comp.country_name && comp.country_name.trim() !== "")
      .map((comp) => comp.country_name)
      .filter((country, index, self) => self.indexOf(country) === index)
      .sort();
  }, [competitions]);

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
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handleAgeRangeChange = (value: string) => {
    const range = ageRanges.find((r) => r.label === value);
    if (range) {
      setFilters((prev) => ({
        ...prev,
        ageMin: range.min,
        ageMax: range.max,
      }));
      setCurrentPage(1);
    }
  };

  const handleSearch = () => {
    setSearchFilters(filters);
    setHasSearched(true);
    setCurrentPage(1); // Reset to first page
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleComparePositions = (player: Player) => {
    setSelectedPlayer(player);
    setShowCompatibilityForPlayer(player.player_id);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // For now, we'll use client-side pagination
  // In the future, we can implement server-side pagination with total count
  const totalPages = Math.ceil(players.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPlayers = players.slice(startIndex, endIndex);

  return (
    <div className="p-6 pt-8">
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
                className="text-sm font-medium text-white mb-2"
              >
                Player Name
              </Label>
              <Input
                id="playerName"
                placeholder="Search by name..."
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
                className="focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder:text-white bg-dark"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-2">
                Age Range
              </Label>
              <Select onValueChange={handleAgeRangeChange}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary text-white">
                  <SelectValue placeholder="All Ages" className="text-white" />
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
              <Label className="text-sm font-medium text-white mb-2">
                Current Position
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange("position", value)}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary text-white">
                  <SelectValue placeholder="All Positions" className="text-white" />
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
              <Label className="text-sm font-medium text-white mb-2">
                Leagues by Country
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange("country", value)}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary text-white">
                  <SelectValue placeholder="All Countries" className="text-white" />
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
              <Label className="text-sm font-medium text-white mb-2">
                Team
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange("team", value)}
              >
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary text-white">
                  <SelectValue placeholder="All Teams" className="text-white" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {clubs
                    .filter((club) => club.name && club.name.trim() !== "")
                    .sort((a, b) => a.name.localeCompare(b.name))
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-dark">
                  Search Results
                  {players.length > 0 && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({players.length} players found)
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white">Sort by:</span>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) =>
                      handleFilterChange("sortBy", value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compatibility">
                        Compatibility
                      </SelectItem>
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
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg p-4"
                    >
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
                  <p className="text-white">
                    No players found matching your criteria.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentPlayers.map((player) => (
                      <div
                        key={player.id}
                        onClick={() => handlePlayerClick(player)}
                        className="cursor-pointer"
                      >
                        <UnifiedPlayerCard
                          player={player}
                          isSelected={selectedPlayer?.id === player.id}
                          onComparePositions={() => handleComparePositions(player)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-white">
                        Showing {startIndex + 1}-{Math.min(endIndex, players.length)} of {players.length} players
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Player Profile */}
        <div>
          <PlayerProfile 
            player={selectedPlayer} 
            showCompatibilityByDefault={showCompatibilityForPlayer === selectedPlayer?.player_id}
          />
        </div>
      </div>
    </div>
  );
}
