/**
 * API helper functions for client-side data fetching
 * Provides high-level abstractions over HTTP requests
 */
import { apiRequest } from "./queryClient";
import type { SearchFilters } from "@shared/schema";

/**
 * Fetches clubs, optionally filtered by country
 * @param country - Optional country filter ('all' returns all clubs)
 * @returns Promise<Club[]> - Array of club objects
 */
export async function getClubs(country?: string) {
  const url = country && country !== 'all' ? `/api/clubs?country=${encodeURIComponent(country)}` : '/api/clubs';
  const response = await apiRequest("GET", url);
  return response.json();
}

/**
 * Uploads a CSV file for position compatibility analysis
 * @param file - CSV file containing player data
 * @returns Promise<AnalysisResult> - Compatibility analysis results
 */
export async function uploadCompatibilityCsv(file: File) {
  const formData = new FormData();
  formData.append("csvFile", file);
  const response = await apiRequest("POST", "/api/compatibility/upload", formData);
  return response.json();
}
