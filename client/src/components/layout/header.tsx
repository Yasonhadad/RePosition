import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CircleDot, User, BarChart3, Search, Users, Upload, LogOut, LogIn } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isAuthenticated = !!user;
  
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
      name: "Favorites",
      href: "/favorites",
      icon: User,
      current: location === "/favorites"
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
                className="h-20 w-auto"
              />
            </div>
            
            <div>
              <h1 className="text-xl font-bold gradient-text">
                REPOSITION
              </h1>
              <p className="text-sm text-gray-600">
                AI-powered position compatibility analysis
              </p>
            </div>
            
            {/* Navigation Links - Only show when authenticated */}
            {isAuthenticated && (
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
                          : "text-gray-700 hover:bg-black/10 hover:backdrop-blur-sm border border-transparent hover:border-black/20"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                  <User className="text-white h-5 w-5" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthenticated ? (
                  <>
                    {user && (
                      <div className="px-2 py-1.5 text-sm">
                        <div className="font-medium">{user.firstName || user.email}</div>
                        <div className="text-muted-foreground truncate">{user.email}</div>
                      </div>
                    )}
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <Link href="/auth">
                    <DropdownMenuItem>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
