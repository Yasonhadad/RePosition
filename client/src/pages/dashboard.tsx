import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Shield, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
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
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark mb-2">
          Player Analysis Dashboard
        </h2>
        <p className="text-gray-600">
          AI-powered position compatibility analysis
        </p>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-dark">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`${stat.iconColor} h-6 w-6`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-dark">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/search"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:bg-opacity-20 transition-colors">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-dark">Search Players</h4>
                    <p className="text-sm text-gray-600">
                      Find and analyze player compatibility
                    </p>
                  </div>
                </div>
              </a>

              <a
                href="/teams"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-analytics bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-analytics group-hover:bg-opacity-20 transition-colors">
                    <Shield className="h-5 w-5 text-analytics" />
                  </div>
                  <div>
                    <h4 className="font-medium text-dark">Team Analysis</h4>
                    <p className="text-sm text-gray-600">
                      Analyze team formation and compatibility
                    </p>
                  </div>
                </div>
              </a>

              <a
                href="/upload"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-accent group-hover:bg-opacity-20 transition-colors">
                    <Upload className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium text-dark">Upload Data</h4>
                    <p className="text-sm text-gray-600">
                      Import new player and team data
                    </p>
                  </div>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
