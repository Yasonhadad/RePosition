export interface SearchFilters {
  name?: string;
  position?: string;
  team?: string;
  ageMin?: number;
  ageMax?: number;
  sortBy?: "compatibility" | "overall" | "age" | "market_value";
}

export interface PlayerCompatibility {
  player_id: number;
  natural_pos: string | null;
  st_fit: number | null;
  lw_fit: number | null;
  rw_fit: number | null;
  cm_fit: number | null;
  cdm_fit: number | null;
  cam_fit: number | null;
  lb_fit: number | null;
  rb_fit: number | null;
  cb_fit: number | null;
  best_pos: string | null;
  best_fit_score: number | null;
  best_fit_pct: number | null;
  ovr: number | null;
}

export interface TeamAnalytics {
  avgCompatibility: number;
  playerCount: number;
  bestPosition: string;
  positionBreakdown: Record<string, number>;
}

export interface GlobalStats {
  totalPlayers: number;
  totalTeams: number;
  avgCompatibility: number;
  topPositions: Array<{ position: string; count: number }>;
}

export type Position = "ST" | "LW" | "RW" | "CM" | "CDM" | "CAM" | "LB" | "RB" | "CB";

export const POSITIONS: Position[] = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"];
