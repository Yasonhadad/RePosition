import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Search, 
  Users, 
  Upload, 
  Dna
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Player Search", href: "/search", icon: Search },
  { name: "Team Analysis", href: "/teams", icon: Users },
  { name: "Data Upload", href: "/upload", icon: Upload },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-30">
      <div className="p-6">
        {/* RePosition Logo */}
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-3">
            <Dna className="text-white h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-dark">RePosition</h1>
        </div>

        {/* Navigation Menu */}
        <nav>
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <a
                      className={cn(
                        "flex items-center p-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
