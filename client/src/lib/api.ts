import { apiRequest } from "./queryClient";
import type { SearchFilters } from "@shared/schema";

// Remove local interface since we import it from shared schema
// export interface SearchFilters {
//   name?: string;
//   position?: string;
//   team?: string;
//   league?: string;
//   ageMin?: number;
//   ageMax?: number;
//   sortBy?: "compatibility" | "overall" | "age" | "market_value";
// }

export async function getClubs(country?: string) {
  const url = country && country !== 'all' ? `/api/clubs?country=${encodeURIComponent(country)}` : '/api/clubs';
  const response = await apiRequest("GET", url);
  return response.json();
}

export async function uploadCompatibilityCsv(file: File) {
  const formData = new FormData();
  formData.append("csvFile", file);
  const response = await apiRequest("POST", "/api/compatibility/upload", formData);
  return response.json();
}
