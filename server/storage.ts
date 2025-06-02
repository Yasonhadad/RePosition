import { players, clubs, position_compatibility, ml_analysis_cache, type Player, type Club, type PositionCompatibility, type InsertPlayer, type InsertClub, type InsertPositionCompatibility, type InsertMlAnalysisCache, type MlAnalysisCache, type SearchFilters } from "@shared/schema";

export interface IStorage {
  // Players
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerByPlayerId(playerId: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  searchPlayers(filters: SearchFilters): Promise<Player[]>;
  getAllPlayers(): Promise<Player[]>;
  bulkCreatePlayers(players: InsertPlayer[]): Promise<Player[]>;

  // Clubs
  getClub(id: number): Promise<Club | undefined>;
  getClubByClubId(clubId: number): Promise<Club | undefined>;
  getAllClubs(): Promise<Club[]>;
  createClub(club: InsertClub): Promise<Club>;
  bulkCreateClubs(clubs: InsertClub[]): Promise<Club[]>;
  getPlayersByClub(clubName: string): Promise<Player[]>;

  // Position Compatibility
  getPositionCompatibility(playerId: number): Promise<PositionCompatibility | undefined>;
  createPositionCompatibility(compatibility: InsertPositionCompatibility): Promise<PositionCompatibility>;
  updatePositionCompatibility(playerId: number, compatibility: Partial<InsertPositionCompatibility>): Promise<PositionCompatibility | undefined>;
  bulkCreatePositionCompatibility(compatibilities: InsertPositionCompatibility[]): Promise<PositionCompatibility[]>;

  // ML Analysis Cache
  getMlAnalysisCache(cacheKey: string): Promise<MlAnalysisCache | undefined>;
  createMlAnalysisCache(cache: InsertMlAnalysisCache): Promise<MlAnalysisCache>;
  
  // Analytics
  getTeamAnalytics(clubName: string): Promise<{
    avgCompatibility: number;
    playerCount: number;
    bestPosition: string;
    positionBreakdown: Record<string, number>;
  }>;
  getGlobalStats(): Promise<{
    totalPlayers: number;
    totalTeams: number;
    avgCompatibility: number;
    topPositions: Array<{ position: string; count: number }>;
  }>;
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private clubs: Map<number, Club>;
  private positionCompatibilities: Map<number, PositionCompatibility>;
  private mlCache: Map<string, MlAnalysisCache>;
  private currentPlayerId: number;
  private currentClubId: number;
  private currentCompatibilityId: number;
  private currentCacheId: number;

  constructor() {
    this.players = new Map();
    this.clubs = new Map();
    this.positionCompatibilities = new Map();
    this.mlCache = new Map();
    this.currentPlayerId = 1;
    this.currentClubId = 1;
    this.currentCompatibilityId = 1;
    this.currentCacheId = 1;
  }

  // Players
  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerByPlayerId(playerId: number): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(player => player.player_id === playerId);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.currentPlayerId++;
    const player: Player = {
      ...insertPlayer,
      id,
      created_at: new Date(),
    };
    this.players.set(id, player);
    return player;
  }

  async updatePlayer(id: number, playerUpdate: Partial<InsertPlayer>): Promise<Player | undefined> {
    const existing = this.players.get(id);
    if (!existing) return undefined;
    
    const updated: Player = { ...existing, ...playerUpdate };
    this.players.set(id, updated);
    return updated;
  }

  async searchPlayers(filters: SearchFilters): Promise<Player[]> {
    let results = Array.from(this.players.values());

    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      results = results.filter(player => 
        player.name.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.position) {
      results = results.filter(player => 
        player.sub_position === filters.position || player.position === filters.position
      );
    }

    if (filters.team) {
      results = results.filter(player => 
        player.current_club_name?.toLowerCase().includes(filters.team.toLowerCase())
      );
    }

    if (filters.ageMin !== undefined) {
      results = results.filter(player => 
        player.age !== null && player.age >= filters.ageMin!
      );
    }

    if (filters.ageMax !== undefined) {
      results = results.filter(player => 
        player.age !== null && player.age <= filters.ageMax!
      );
    }

    // Sort results
    if (filters.sortBy) {
      results.sort((a, b) => {
        switch (filters.sortBy) {
          case "overall":
            return (b.ovr || 0) - (a.ovr || 0);
          case "age":
            return (a.age || 0) - (b.age || 0);
          case "market_value":
            return (b.market_value_in_eur || 0) - (a.market_value_in_eur || 0);
          default:
            return 0;
        }
      });
    }

    return results;
  }

  async getAllPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  async bulkCreatePlayers(playersData: InsertPlayer[]): Promise<Player[]> {
    const created: Player[] = [];
    for (const playerData of playersData) {
      const player = await this.createPlayer(playerData);
      created.push(player);
    }
    return created;
  }

  // Clubs
  async getClub(id: number): Promise<Club | undefined> {
    return this.clubs.get(id);
  }

  async getClubByClubId(clubId: number): Promise<Club | undefined> {
    return Array.from(this.clubs.values()).find(club => club.club_id === clubId);
  }

  async getAllClubs(): Promise<Club[]> {
    return Array.from(this.clubs.values());
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const id = this.currentClubId++;
    const club: Club = { ...insertClub, id };
    this.clubs.set(id, club);
    return club;
  }

  async bulkCreateClubs(clubsData: InsertClub[]): Promise<Club[]> {
    const created: Club[] = [];
    for (const clubData of clubsData) {
      const club = await this.createClub(clubData);
      created.push(club);
    }
    return created;
  }

  async getPlayersByClub(clubName: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player =>
      player.current_club_name?.toLowerCase() === clubName.toLowerCase()
    );
  }

  // Position Compatibility
  async getPositionCompatibility(playerId: number): Promise<PositionCompatibility | undefined> {
    return Array.from(this.positionCompatibilities.values()).find(
      pc => pc.player_id === playerId
    );
  }

  async createPositionCompatibility(compatibility: InsertPositionCompatibility): Promise<PositionCompatibility> {
    const id = this.currentCompatibilityId++;
    const positionCompatibility: PositionCompatibility = {
      ...compatibility,
      id,
      created_at: new Date(),
    };
    this.positionCompatibilities.set(id, positionCompatibility);
    return positionCompatibility;
  }

  async updatePositionCompatibility(playerId: number, compatibilityUpdate: Partial<InsertPositionCompatibility>): Promise<PositionCompatibility | undefined> {
    const existing = Array.from(this.positionCompatibilities.values()).find(
      pc => pc.player_id === playerId
    );
    if (!existing) return undefined;

    const updated: PositionCompatibility = { ...existing, ...compatibilityUpdate };
    this.positionCompatibilities.set(existing.id, updated);
    return updated;
  }

  async bulkCreatePositionCompatibility(compatibilities: InsertPositionCompatibility[]): Promise<PositionCompatibility[]> {
    const created: PositionCompatibility[] = [];
    for (const compatibility of compatibilities) {
      const pc = await this.createPositionCompatibility(compatibility);
      created.push(pc);
    }
    return created;
  }

  // ML Analysis Cache
  async getMlAnalysisCache(cacheKey: string): Promise<MlAnalysisCache | undefined> {
    return Array.from(this.mlCache.values()).find(cache => cache.cache_key === cacheKey);
  }

  async createMlAnalysisCache(cache: InsertMlAnalysisCache): Promise<MlAnalysisCache> {
    const id = this.currentCacheId++;
    const mlCache: MlAnalysisCache = {
      ...cache,
      id,
      created_at: new Date(),
    };
    this.mlCache.set(id, mlCache);
    return mlCache;
  }

  // Analytics
  async getTeamAnalytics(clubName: string): Promise<{
    avgCompatibility: number;
    playerCount: number;
    bestPosition: string;
    positionBreakdown: Record<string, number>;
  }> {
    const teamPlayers = await this.getPlayersByClub(clubName);
    const playerCompatibilities = await Promise.all(
      teamPlayers.map(p => this.getPositionCompatibility(p.player_id))
    );

    const validCompatibilities = playerCompatibilities.filter(pc => pc !== undefined) as PositionCompatibility[];
    
    if (validCompatibilities.length === 0) {
      return {
        avgCompatibility: 0,
        playerCount: teamPlayers.length,
        bestPosition: "N/A",
        positionBreakdown: {},
      };
    }

    const avgCompatibility = validCompatibilities.reduce((sum, pc) => sum + (pc.best_fit_score || 0), 0) / validCompatibilities.length;
    
    const positionCounts: Record<string, number> = {};
    validCompatibilities.forEach(pc => {
      if (pc.best_pos) {
        positionCounts[pc.best_pos] = (positionCounts[pc.best_pos] || 0) + 1;
      }
    });

    const bestPosition = Object.entries(positionCounts).reduce((best, [pos, count]) => 
      count > (positionCounts[best] || 0) ? pos : best, "N/A"
    );

    return {
      avgCompatibility,
      playerCount: teamPlayers.length,
      bestPosition,
      positionBreakdown: positionCounts,
    };
  }

  async getGlobalStats(): Promise<{
    totalPlayers: number;
    totalTeams: number;
    avgCompatibility: number;
    topPositions: Array<{ position: string; count: number }>;
  }> {
    const allPlayers = await this.getAllPlayers();
    const allClubs = await this.getAllClubs();
    const allCompatibilities = Array.from(this.positionCompatibilities.values());

    const avgCompatibility = allCompatibilities.length > 0 
      ? allCompatibilities.reduce((sum, pc) => sum + (pc.best_fit_score || 0), 0) / allCompatibilities.length
      : 0;

    const positionCounts: Record<string, number> = {};
    allCompatibilities.forEach(pc => {
      if (pc.best_pos) {
        positionCounts[pc.best_pos] = (positionCounts[pc.best_pos] || 0) + 1;
      }
    });

    const topPositions = Object.entries(positionCounts)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalPlayers: allPlayers.length,
      totalTeams: allClubs.length,
      avgCompatibility,
      topPositions,
    };
  }
}

export const storage = new MemStorage();
