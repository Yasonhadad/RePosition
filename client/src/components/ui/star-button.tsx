import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface StarButtonProps {
  playerId: number;
  size?: "sm" | "lg" | "default" | "icon";
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

export function StarButton({ playerId, size = "default", variant = "ghost", className = "" }: StarButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if player is favorited
  const { data: favoriteStatus, isLoading } = useQuery({
    queryKey: ["favorites", playerId, "status"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/favorites/${playerId}/status`);
      return response.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/favorites/${playerId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorites", playerId, "status"] });
      queryClient.setQueryData(["favorites", playerId, "status"], { isFavorited: true });
      toast({
        title: "Player starred",
        description: "Player added to your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to star player",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/favorites/${playerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorites", playerId, "status"] });
      queryClient.setQueryData(["favorites", playerId, "status"], { isFavorited: false });
      toast({
        title: "Player unstarred",
        description: "Player removed from your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unstar player",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to save favorite players.",
        variant: "destructive",
      });
      return;
    }

    if (favoriteStatus?.isFavorited) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const isFavorited = favoriteStatus?.isFavorited || false;
  const isPending = addFavoriteMutation.isPending || removeFavoriteMutation.isPending;

  const iconSize = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6",
    icon: "h-4 w-4"
  }[size];

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isLoading || isPending || !isAuthenticated}
      className={`${className} ${isFavorited ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-yellow-500"}`}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={`${iconSize} transition-colors ${isFavorited ? "fill-yellow-500 text-yellow-500" : "fill-none text-gray-400 hover:text-yellow-500"}`}
      />
    </Button>
  );
}