import { apiRequest } from "./queryClient";

export interface SearchFilters {
  name?: string;
  position?: string;
  team?: string;
  league?: string;
  ageMin?: number;
  ageMax?: number;
  sortBy?: "compatibility" | "overall" | "age" | "market_value";
}

export async function searchPlayers(filters: SearchFilters) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      params.append(key, value.toString());
    }
  });

  const response = await apiRequest("GET", `/api/players?${params}`);
  return response.json();
}

export async function getPlayer(playerId: number) {
  const response = await apiRequest("GET", `/api/players/${playerId}`);
  return response.json();
}

export async function getPlayerCompatibility(playerId: number) {
  const response = await apiRequest("GET", `/api/players/${playerId}/compatibility`);
  return response.json();
}

export async function getClubs(league?: string) {
  const url = league && league !== 'all' ? `/api/clubs?league=${encodeURIComponent(league)}` : '/api/clubs';
  const response = await apiRequest("GET", url);
  return response.json();
}

export async function getCompetitions() {
  const response = await apiRequest("GET", "/api/competitions");
  return response.json();
}

export async function getLeagues() {
  const response = await apiRequest("GET", "/api/leagues");
  return response.json();
}

export async function getTeamAnalysis(clubName: string) {
  const response = await apiRequest("GET", `/api/teams/${encodeURIComponent(clubName)}/analysis`);
  return response.json();
}

export async function getGlobalStats() {
  const response = await apiRequest("GET", "/api/stats");
  return response.json();
}

export async function uploadCsvFile(file: File, fileType: string) {
  const formData = new FormData();
  formData.append("csvFile", file);
  formData.append("fileType", fileType);

  const response = await apiRequest("POST", "/api/upload", formData);
  return response.json();
}

export async function runPlayerAnalysis(playerIds: number[]) {
  const response = await apiRequest("POST", "/api/analyze", { playerIds });
  return response.json();
}

export async function runBulkAnalysis() {
  const response = await apiRequest("POST", "/api/analyze/all");
  return response.json();
}
