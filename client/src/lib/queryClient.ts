/**
 * React Query configuration and API request utilities
 * Provides centralized HTTP client with error handling and caching
 */
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** API base URL (set in production when frontend is on CloudFront and API on ALB) */
export const apiBase = (import.meta.env.VITE_API_URL as string) || "";

/**
 * Throws an error if the response is not OK (status 200-299)
 * @param res - Fetch Response object
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Makes an authenticated API request with automatic error handling
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @param url - API endpoint URL
 * @param data - Request body data (JSON object or FormData)
 * @returns Promise<Response> - Fetch Response object
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isForm = typeof FormData !== "undefined" && data instanceof FormData;
  const init: RequestInit = {
    method,
    credentials: "include", // Include cookies for session authentication
  };
  
  if (data !== undefined) {
    if (isForm) {
      init.body = data as FormData; // Browser sets multipart boundaries automatically
    } else {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(data);
    }
  }
  
  const res = await fetch(apiBase + url, init);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Creates a React Query function with configurable 401 handling
 * @param options - Configuration for unauthorized request handling
 * @returns QueryFunction<T> - Function for React Query to execute
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(apiBase + (queryKey[0] as string), {
      credentials: "include", // Include session cookies
    });

    // Handle unauthorized requests based on configuration
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Configured React Query client with optimized defaults
 * - Throws on 401 unauthorized responses
 * - Disables automatic refetching for better UX
 * - Sets infinite stale time for cached data
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity, // Data never becomes stale automatically
      retry: false, // Don't retry failed requests
    },
    mutations: {
      retry: false, // Don't retry failed mutations
    },
  },
});
