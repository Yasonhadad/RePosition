import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface GlobalStats {
  totalPlayers: number;
  totalTeams: number;
  totalCompetitions: number;
  avgCompatibility: number;
  topPositions: Array<{ position: string; count: number }>;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ["/api/stats"],
  });


  if (isLoading) {
    return (
      <div className="main-content p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="stat-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Players",
      value: stats?.totalPlayers?.toLocaleString() || "0",
      icon: Users,
      bgColor: "bg-primary bg-opacity-10",
      iconColor: "text-primary",
    },
    {
      title: "Total Teams",
      value: stats?.totalTeams?.toLocaleString() || "0",
      icon: Shield,
      bgColor: "bg-accent bg-opacity-10",
      iconColor: "text-accent",
    },
    {
      title: "Total Competitions",
      value: stats?.totalCompetitions?.toLocaleString() || "0",
      icon: Trophy,
      bgColor: "bg-success bg-opacity-10",
      iconColor: "text-success",
    },
  ];

  return (
    <div className="main-content p-6 pt-8">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-bold gradient-text mb-3">
          Football Analytics Dashboard
        </h2>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="stat-card hover-lift modern-shadow">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-medium text-muted-foreground mb-3">
                    {stat.title}
                  </p>
                  <p className="text-5xl font-bold stat-number">{stat.value}</p>
                </div>
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <stat.icon className="h-10 w-10 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Description */}
      <div className="text-center mt-12 mb-8">
        <h3 className="text-2xl font-semibold text-foreground mb-4">
          Advanced Football Analytics Platform
        </h3>
        <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
          Machine-Learning Engine that scores every player's ideal position and helps you build data-driven, high-performance squads.
        </p>
      </div>

      {/* CSV upload moved to /upload page */}

    </div>
  );
}
