import { useQuery } from "@tanstack/react-query";
import { CircleDot, User } from "lucide-react";

export function Header() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <header className="bg-white shadow-sm border-b p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark">
            Player Analysis Dashboard
          </h2>
          <p className="text-gray-600">
            AI-powered position compatibility analysis
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Real-time data refresh indicator */}
          <div className="flex items-center text-success">
            <CircleDot className="h-3 w-3 mr-2" />
            <span className="text-sm">Models Active</span>
          </div>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <User className="text-white h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
