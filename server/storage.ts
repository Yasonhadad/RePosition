import { 
  users,
  players, 
  clubs, 
  competitions, 
  position_compatibility, 
  ml_analysis_cache,
  player_favorites,
  type User,
  type InsertUser,
  type Player, 
  type Club, 
  type Competition, 
  type PositionCompatibility, 
  type InsertPlayer, 
  type InsertClub, 
  type InsertCompetition, 
  type InsertPositionCompatibility, 
  type InsertMlAnalysisCache, 
  type MlAnalysisCache,
  type InsertPlayerFavorite,
  type PlayerFavorite,
  type SearchFilters 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, desc, asc, sql, isNotNull, inArray } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";

export interface IStorage {
  // User operations for simple email/password authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Players
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerByPlayerId(playerId: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  searchPlayers(filters: SearchFilters): Promise<Player[]>;
  getAllPlayers(): Promise<Player[]>;
  bulkCreatePlayers(players: InsertPlayer[]): Promise<Player[]>;

  // Competitions
  getCompetition(id: number): Promise<Competition | undefined>;
  getAllCompetitions(): Promise<Competition[]>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  bulkCreateCompetitions(competitions: InsertCompetition[]): Promise<Competition[]>;

  // Clubs
  getClub(id: number): Promise<Club | undefined>;
  getClubByClubId(clubId: number): Promise<Club | undefined>;
  getAllClubs(): Promise<Club[]>;
  createClub(club: InsertClub): Promise<Club>;
  bulkCreateClubs(clubs: InsertClub[]): Promise<Club[]>;
  getPlayersByClub(clubName: string): Promise<Player[]>;
  getClubsByCompetition(competitionId: string): Promise<Club[]>;

  // Leagues
  getAllLeagues(): Promise<string[]>;

  // Countries
  getAllCountries(): Promise<string[]>;
  getClubsByCountry(country: string): Promise<Club[]>;
  getLeaguesByCountry(country: string): Promise<string[]>;

  // Position Compatibility
  getPositionCompatibility(playerId: number): Promise<PositionCompatibility | undefined>;
  createPositionCompatibility(compatibility: InsertPositionCompatibility): Promise<PositionCompatibility>;
  updatePositionCompatibility(playerId: number, compatibility: Partial<InsertPositionCompatibility>): Promise<PositionCompatibility | undefined>;
  bulkCreatePositionCompatibility(compatibilities: InsertPositionCompatibility[]): Promise<PositionCompatibility[]>;

  // ML Analysis Cache
  getMlAnalysisCache(cacheKey: string): Promise<MlAnalysisCache | undefined>;
  createMlAnalysisCache(cache: InsertMlAnalysisCache): Promise<MlAnalysisCache>;
  
  // Player Favorites
  addPlayerToFavorites(userId: number, playerId: number): Promise<PlayerFavorite>;
  removePlayerFromFavorites(userId: number, playerId: number): Promise<void>;
  getUserFavorites(userId: number): Promise<Player[]>;
  isPlayerFavorited(userId: number, playerId: number): Promise<boolean>;

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

  // User operations for simple email/password authentication
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Players
  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async getPlayerByPlayerId(playerId: number): Promise<Player | undefined> {
    // First get the basic player data
    const [player] = await db.select().from(players).where(eq(players.player_id, playerId));
    if (!player) return undefined;
    
    // Try to get league information from competitions table via clubs
    const leagueResult = await db
      .select({ league_name: competitions.name })
      .from(clubs)
      .leftJoin(competitions, eq(clubs.domestic_competition_id, competitions.competition_id))
      .where(eq(clubs.name, player.current_club_name))
      .limit(1);
    
    const leagueName = leagueResult[0]?.league_name;
    
    // Return player with updated league information
    return {
      ...player,
      league: leagueName || player.league || null
    };
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
      conditions.push(sql`LOWER(${players.name}) LIKE LOWER(${'%' + filters.name + '%'})`);
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
      conditions.push(sql`LOWER(${players.current_club_name}) LIKE LOWER(${'%' + filters.team + '%'})`);
    }

    if (filters.country) {
      // Find all clubs from competitions in the selected country
      const clubsInCountry = db.select({ name: clubs.name })
        .from(clubs)
        .innerJoin(competitions, eq(clubs.domestic_competition_id, competitions.competition_id))
        .where(eq(competitions.country_name, filters.country));
      
      conditions.push(inArray(players.current_club_name, clubsInCountry));
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
    
    const chunkSize = 100;
    const created: Player[] = [];
    
    for (let i = 0; i < playersData.length; i += chunkSize) {
      const chunk = playersData.slice(i, i + chunkSize);
      const chunkResult = await db
        .insert(players)
        .values(chunk)
        .returning();
      created.push(...chunkResult);
    }
    
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
    
    const chunkSize = 100;
    const created: Club[] = [];
    
    for (let i = 0; i < clubsData.length; i += chunkSize) {
      const chunk = clubsData.slice(i, i + chunkSize);
      const chunkResult = await db
        .insert(clubs)
        .values(chunk)
        .returning();
      created.push(...chunkResult);
    }
    
    return created;
  }

  async getPlayersByClub(clubName: string): Promise<Player[]> {
    return await db.select().from(players).where(sql`LOWER(${players.current_club_name}) = LOWER(${clubName})`);
  }

  async getClubsByCompetition(competitionId: string): Promise<Club[]> {
    return await db.select().from(clubs).where(eq(clubs.domestic_competition_id, competitionId));
  }

  // Competitions
  async getCompetition(id: number): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    return competition || undefined;
  }

  async getAllCompetitions(): Promise<Competition[]> {
    return await db.select().from(competitions);
  }

  async createCompetition(insertCompetition: InsertCompetition): Promise<Competition> {
    const [competition] = await db
      .insert(competitions)
      .values(insertCompetition)
      .returning();
    return competition;
  }

  async bulkCreateCompetitions(competitionsData: InsertCompetition[]): Promise<Competition[]> {
    if (competitionsData.length === 0) return [];
    
    const created = await db
      .insert(competitions)
      .values(competitionsData)
      .returning();
    return created;
  }

  // Leagues
  async getAllLeagues(): Promise<string[]> {
    const result = await db.selectDistinct({ league: players.league }).from(players).where(sql`${players.league} IS NOT NULL AND ${players.league} != ''`);
    return result.map(row => row.league).filter((league): league is string => league !== null && league.trim() !== "");
  }

  // Countries (using competitions table)
  async getAllCountries(): Promise<string[]> {
    const result = await db.selectDistinct({ country: competitions.country_name }).from(competitions).where(sql`${competitions.country_name} IS NOT NULL AND ${competitions.country_name} != ''`);
    return result.map(row => row.country).filter((country): country is string => country !== null && country.trim() !== "").sort();
  }

  async getClubsByCountry(country: string): Promise<Club[]> {
    // Get competitions for the country first
    const countryCompetitions = await db.select().from(competitions).where(eq(competitions.country_name, country));
    
    if (countryCompetitions.length === 0) {
      return [];
    }
    
    // Get clubs for all competitions from this country
    const competitionIds = countryCompetitions.map(c => c.competition_id);
    const clubs_result = await db.select().from(clubs).where(inArray(clubs.domestic_competition_id, competitionIds)).orderBy(asc(clubs.name));
    
    return clubs_result;
  }

  async getLeaguesByCountry(country: string): Promise<string[]> {
    const countryCompetitions = await db.select().from(competitions).where(eq(competitions.country_name, country));
    return countryCompetitions.map(c => c.name).filter(name => name && name.trim() !== "").sort();
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

  // Player Favorites
  async addPlayerToFavorites(userId: number, playerId: number): Promise<PlayerFavorite> {
    // Get the internal ID of the player using player_id
    const player = await this.getPlayerByPlayerId(playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    
    const [favorite] = await db
      .insert(player_favorites)
      .values({ user_id: userId, player_id: player.id })
      .onConflictDoNothing()
      .returning();
    return favorite;
  }

  async removePlayerFromFavorites(userId: number, playerId: number): Promise<void> {
    // Get the internal ID of the player using player_id
    const player = await this.getPlayerByPlayerId(playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    
    await db
      .delete(player_favorites)
      .where(and(
        eq(player_favorites.user_id, userId),
        eq(player_favorites.player_id, player.id)
      ));
  }

  async getUserFavorites(userId: number): Promise<Player[]> {
    const favorites = await db
      .select(getTableColumns(players))
      .from(players)
      .innerJoin(player_favorites, eq(players.id, player_favorites.player_id))
      .where(eq(player_favorites.user_id, userId))
      .orderBy(desc(player_favorites.created_at));
    
    return favorites;
  }

  async isPlayerFavorited(userId: number, playerId: number): Promise<boolean> {
    // Get the internal ID of the player using player_id
    const player = await this.getPlayerByPlayerId(playerId);
    if (!player) {
      return false;
    }
    
    const [favorite] = await db
      .select()
      .from(player_favorites)
      .where(and(
        eq(player_favorites.user_id, userId),
        eq(player_favorites.player_id, player.id)
      ))
      .limit(1);
    
    return !!favorite;
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
    totalCompetitions: number;
    avgCompatibility: number;
    topPositions: Array<{ position: string; count: number }>;
  }> {
    const allPlayers = await this.getAllPlayers();
    const allClubs = await this.getAllClubs();
    const allCompetitions = await this.getAllCompetitions();
    
    // Use actual clubs count from clubs table
    return {
      totalPlayers: allPlayers.length,
      totalTeams: allClubs.length,
      totalCompetitions: allCompetitions.length,
      avgCompatibility: 0, // Will be updated when compatibility data is available
      topPositions: [
        { position: "ST", count: 0 },
        { position: "CM", count: 0 },
        { position: "CB", count: 0 },
        { position: "LW", count: 0 },
        { position: "RW", count: 0 }
      ],
    };
  }
}

export const storage = new DatabaseStorage();
