import { players, clubs, position_compatibility, ml_analysis_cache, type Player, type Club, type PositionCompatibility, type InsertPlayer, type InsertClub, type InsertPositionCompatibility, type InsertMlAnalysisCache, type MlAnalysisCache, type SearchFilters } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, desc, asc } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  constructor() {}

  // Players
  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async getPlayerByPlayerId(playerId: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.player_id, playerId));
    return player || undefined;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db
      .insert(players)
      .values(insertPlayer)
      .returning();
    return player;
  }

  async updatePlayer(id: number, playerUpdate: Partial<InsertPlayer>): Promise<Player | undefined> {
    const [player] = await db
      .update(players)
      .set(playerUpdate)
      .where(eq(players.id, id))
      .returning();
    return player || undefined;
  }

  async searchPlayers(filters: SearchFilters): Promise<Player[]> {
    let query = db.select().from(players);
    const conditions = [];

    if (filters.name) {
      conditions.push(like(players.name, `%${filters.name}%`));
    }

    if (filters.position) {
      conditions.push(
        or(
          eq(players.sub_position, filters.position),
          eq(players.position, filters.position)
        )
      );
    }

    if (filters.team) {
      conditions.push(like(players.current_club_name, `%${filters.team}%`));
    }

    if (filters.ageMin !== undefined) {
      conditions.push(gte(players.age, filters.ageMin));
    }

    if (filters.ageMax !== undefined) {
      conditions.push(lte(players.age, filters.ageMax));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sort results
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "overall":
          query = query.orderBy(desc(players.ovr));
          break;
        case "age":
          query = query.orderBy(asc(players.age));
          break;
        case "market_value":
          query = query.orderBy(desc(players.market_value_in_eur));
          break;
      }
    }

    return await query;
  }

  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async bulkCreatePlayers(playersData: InsertPlayer[]): Promise<Player[]> {
    if (playersData.length === 0) return [];
    
    const created = await db
      .insert(players)
      .values(playersData)
      .returning();
    return created;
  }

  // Clubs
  async getClub(id: number): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club || undefined;
  }

  async getClubByClubId(clubId: number): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.club_id, clubId));
    return club || undefined;
  }

  async getAllClubs(): Promise<Club[]> {
    return await db.select().from(clubs);
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const [club] = await db
      .insert(clubs)
      .values(insertClub)
      .returning();
    return club;
  }

  async bulkCreateClubs(clubsData: InsertClub[]): Promise<Club[]> {
    if (clubsData.length === 0) return [];
    
    const created = await db
      .insert(clubs)
      .values(clubsData)
      .returning();
    return created;
  }

  async getPlayersByClub(clubName: string): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.current_club_name, clubName));
  }

  // Position Compatibility
  async getPositionCompatibility(playerId: number): Promise<PositionCompatibility | undefined> {
    const [compatibility] = await db.select().from(position_compatibility).where(eq(position_compatibility.player_id, playerId));
    return compatibility || undefined;
  }

  async createPositionCompatibility(compatibility: InsertPositionCompatibility): Promise<PositionCompatibility> {
    const [created] = await db
      .insert(position_compatibility)
      .values(compatibility)
      .returning();
    return created;
  }

  async updatePositionCompatibility(playerId: number, compatibilityUpdate: Partial<InsertPositionCompatibility>): Promise<PositionCompatibility | undefined> {
    const [updated] = await db
      .update(position_compatibility)
      .set(compatibilityUpdate)
      .where(eq(position_compatibility.player_id, playerId))
      .returning();
    return updated || undefined;
  }

  async bulkCreatePositionCompatibility(compatibilities: InsertPositionCompatibility[]): Promise<PositionCompatibility[]> {
    if (compatibilities.length === 0) return [];
    
    const created = await db
      .insert(position_compatibility)
      .values(compatibilities)
      .returning();
    return created;
  }

  // ML Analysis Cache
  async getMlAnalysisCache(cacheKey: string): Promise<MlAnalysisCache | undefined> {
    const [cache] = await db.select().from(ml_analysis_cache).where(eq(ml_analysis_cache.cache_key, cacheKey));
    return cache || undefined;
  }

  async createMlAnalysisCache(cache: InsertMlAnalysisCache): Promise<MlAnalysisCache> {
    const [created] = await db
      .insert(ml_analysis_cache)
      .values(cache)
      .returning();
    return created;
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

export const storage = new DatabaseStorage();
