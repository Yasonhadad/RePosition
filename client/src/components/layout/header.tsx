import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CircleDot, User, BarChart3, Search, Users, Upload } from "lucide-react";
import { Link } from "wouter";

export function Header() {
  const [location] = useLocation();
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: BarChart3,
      current: location === "/"
    },
    {
      name: "Player Search",
      href: "/search",
      icon: Search,
      current: location === "/search" || location === "/players"
    },
    {
      name: "Team Analysis",
      href: "/teams",
      icon: Users,
      current: location === "/teams"
    },
    {
      name: "Data Upload",
      href: "/upload",
      icon: Upload,
      current: location === "/upload"
    }
  ];

  return (
    <header className="nav-modern glass-effect border-b border-white/10">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            {/* RePosition Logo */}
            <div className="flex items-center">
              <img 
                src="/attached_assets/reposition-logo-final.png" 
                alt="RePosition Logo" 
                className="h-12 w-auto"
              />
            </div>
            
            <div>
              <h1 className="text-xl font-bold gradient-text">
                REPOSITION
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered position compatibility analysis
              </p>
            </div>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      item.current
                        ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                        : "text-foreground hover:bg-white/10 hover:backdrop-blur-sm border border-transparent hover:border-white/20"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time data refresh indicator */}
            <div className="flex items-center text-primary bg-primary/10 px-3 py-1 rounded-full backdrop-blur-sm border border-primary/20">
              <CircleDot className="h-3 w-3 mr-2 animate-pulse" />
              <span className="text-sm font-medium">Live Models</span>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <User className="text-white h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
