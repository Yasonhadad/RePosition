/**
 * Authentication hook for checking user login status
 * Returns null for user when not authenticated (401) instead of throwing
 */
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

/**
 * Hook to get current authentication state
 * @returns Authentication state and user data
 */
export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null instead of throwing on 401
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}