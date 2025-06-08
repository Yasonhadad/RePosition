import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, TrendingUp, User, MapPin, Calendar, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { PositionCompatibility } from "@/components/player/position-compatibility";
import type { Player, PositionCompatibility as PositionCompatibilityType } from "@shared/schema";

interface PlayerData {
  player: Player;
  compatibility?: PositionCompatibilityType;
}

export default function PlayerDetails() {
  const [, params] = useRoute("/player/:id");
  const playerId = params?.id;

  const { data: playerData, isLoading, error } = useQuery<PlayerData>({
    queryKey: ["/api/players", playerId],
    queryFn: ({ queryKey }) => {
      const [, id] = queryKey;
      return fetch(`/api/players/${id}`).then(res => {
        if (!res.ok) throw new Error('Player not found');
        return res.json();
      });
    },
    enabled: !!playerId,
  });

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const PlayerImage = ({ player, size = "w-24 h-24" }: { player: Player, size?: string }) => {
    if (player.image_url) {
      return (
        <img
          src={player.image_url}
          alt={player.name}
          className={`${size} rounded-full object-cover border-4 border-white shadow-lg`}
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

  const formatCurrency = (value: number | null) => {
    if (!value) return "N/A";
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    }
    return `€${value}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-6 mb-6">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-32" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Link href="/players">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Search
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Player not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { player, compatibility } = playerData;

  // Physical and Technical Stats
  const physicalStats = [
    { label: "Pace", value: player.pac },
    { label: "Shooting", value: player.sho },
    { label: "Passing", value: player.pas },
    { label: "Dribbling", value: player.dri },
    { label: "Defending", value: player.def },
    { label: "Physical", value: player.phy },
  ];

  const detailedStats = [
    { label: "Crossing", value: player.crossing },
    { label: "Finishing", value: player.finishing },
    { label: "Heading Accuracy", value: player.heading_accuracy },
    { label: "Short Passing", value: player.short_passing },
    { label: "Volleys", value: player.volleys },
    { label: "Long Shots", value: player.long_shots },
    { label: "Curve", value: player.curve },
    { label: "FK Accuracy", value: player.free_kick_accuracy },
    { label: "Long Passing", value: player.long_passing },
    { label: "Ball Control", value: player.ball_control },
    { label: "Acceleration", value: player.acceleration },
    { label: "Sprint Speed", value: player.sprint_speed },
    { label: "Agility", value: player.agility },
    { label: "Reactions", value: player.reactions },
    { label: "Balance", value: player.balance },
    { label: "Shot Power", value: player.shot_power },
    { label: "Jumping", value: player.jumping },
    { label: "Stamina", value: player.stamina },
    { label: "Strength", value: player.strength },
    { label: "Aggression", value: player.aggression },
    { label: "Interceptions", value: player.interceptions },
    { label: "Positioning", value: player.positioning },
    { label: "Vision", value: player.vision },
    { label: "Penalties", value: player.penalties },
    { label: "Composure", value: player.composure },
    { label: "Def Awareness", value: player.def_awareness },
    { label: "Standing Tackle", value: player.standing_tackle },
    { label: "Sliding Tackle", value: player.sliding_tackle },
  ];

  return (
    <div className="p-6">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/players">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="relative">
                  <PlayerImage player={player} />
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-analytics rounded-full flex items-center justify-center hidden">
                    <span className="text-white font-bold text-2xl">
                      {getPlayerInitials(player.name)}
                    </span>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-dark mb-2">{player.name}</h1>
                  <p className="text-lg text-gray-600 mb-3">{player.current_club_name}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" className="bg-primary">
                      {player.sub_position || player.position}
                    </Badge>
                    <Badge variant="outline">
                      {player.age} years
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      OVR {player.ovr}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Key Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Nationality</p>
                    <p className="font-medium">{player.country_of_citizenship || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Height/Weight</p>
                    <p className="font-medium">{player.height_in_cm || "N/A"}cm / {player.weight_in_kg || "N/A"}kg</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Weak Foot</p>
                    <p className="font-medium">{player.weak_foot || "N/A"}★</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Skill Moves</p>
                    <p className="font-medium">{player.skill_moves || "N/A"}★</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Main Attributes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {physicalStats.map((stat) => (
                  <div key={stat.label} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-dark mb-1">
                      {stat.value || "N/A"}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attributes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {detailedStats.filter(stat => stat.value !== null && stat.value !== undefined).map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">{stat.label}</span>
                    <span className="font-bold text-primary">{stat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Club:</span>
                <span className="font-medium">{player.current_club_name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">League:</span>
                <span className="font-medium">{player.league || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Value:</span>
                <span className="font-medium">{formatCurrency(player.market_value_in_eur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Highest Value:</span>
                <span className="font-medium">{formatCurrency(player.highest_market_value_in_eur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Foot:</span>
                <span className="font-medium">{player.preferred_foot || player.foot || "N/A"}</span>
              </div>

            </CardContent>
          </Card>

          {/* Position Compatibility */}
          {compatibility && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Position Compatibility</CardTitle>
              </CardHeader>
              <CardContent>
                <PositionCompatibility compatibility={compatibility} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}