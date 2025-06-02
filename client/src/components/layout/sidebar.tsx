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
          <img 
            src="/attached_assets/20250506_1335_לוגו עם ספירלת DNA_remix_01jtjjjtj2e9c83xtn1y36pyd8.png" 
            alt="RePosition Logo" 
            className="w-32 h-auto"
          />
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
