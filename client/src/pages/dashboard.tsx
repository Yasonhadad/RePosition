import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Shield, Upload } from "lucide-react";
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
    <div className="main-content p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-3">
          Football Analytics Dashboard
        </h2>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="stat-card hover-lift modern-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {stat.title}
                  </p>
                  <p className="text-4xl font-bold stat-number">{stat.value}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card className="stat-card hover-lift modern-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-bold gradient-text">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/search">
                <div className="p-6 glass-effect rounded-xl hover-lift transition-all duration-300 cursor-pointer group border border-white/10">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Search Players</h4>
                      <p className="text-sm text-muted-foreground">
                        Find and analyze player compatibility
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/teams">
                <div className="p-6 glass-effect rounded-xl hover-lift transition-all duration-300 cursor-pointer group border border-white/10">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform">
                      <Shield className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Team Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        Analyze team formation and compatibility
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/upload">
                <div className="p-6 glass-effect rounded-xl hover-lift transition-all duration-300 cursor-pointer group border border-white/10">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Upload Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Import new player and team data
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
