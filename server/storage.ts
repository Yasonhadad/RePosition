/**
 * Database storage layer for the RePosition application
 * Provides abstraction over database operations using Drizzle ORM
 */
import { 
  users,
  players, 
  clubs, 
  competitions, 
  position_compatibility, 
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
  type InsertPlayerFavorite,
  type PlayerFavorite,
  type SearchFilters 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, desc, asc, sql, isNotNull, inArray } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import unidecode from "unidecode";

/**
 * Storage interface defining all database operations
 */
export interface IStorage {
  /** User authentication operations */
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  /** Player data operations */
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerByPlayerId(playerId: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  searchPlayers(filters: SearchFilters): Promise<Player[]>;
  getAllPlayers(): Promise<Player[]>;
  bulkCreatePlayers(players: InsertPlayer[]): Promise<Player[]>;

  /** Competition data operations */
  getCompetition(id: number): Promise<Competition | undefined>;
  getAllCompetitions(): Promise<Competition[]>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  bulkCreateCompetitions(competitions: InsertCompetition[]): Promise<Competition[]>;

  /** Club data operations */
  getClub(id: number): Promise<Club | undefined>;
  getClubByClubId(clubId: number): Promise<Club | undefined>;
  getAllClubs(): Promise<Club[]>;
  createClub(club: InsertClub): Promise<Club>;
  bulkCreateClubs(clubs: InsertClub[]): Promise<Club[]>;
  getPlayersByClub(clubName: string): Promise<Player[]>;
  getClubsByCompetition(competitionId: string): Promise<Club[]>;

  /** League operations */
  getAllLeagues(): Promise<string[]>;

  /** Country and geographical operations */
  getAllCountries(): Promise<string[]>;
  getClubsByCountry(country: string): Promise<Club[]>;
  getLeaguesByCountry(country: string): Promise<string[]>;

  /** Position compatibility ML results */
  getPositionCompatibility(playerId: number): Promise<PositionCompatibility | undefined>;
  /** Fetch multiple players' compatibilities in one query */
  getPositionCompatibilities(playerIds: number[]): Promise<Map<number, PositionCompatibility>>;
  createPositionCompatibility(compatibility: InsertPositionCompatibility): Promise<PositionCompatibility>;
  updatePositionCompatibility(playerId: number, compatibility: Partial<InsertPositionCompatibility>): Promise<PositionCompatibility | undefined>;
  bulkCreatePositionCompatibility(compatibilities: InsertPositionCompatibility[]): Promise<PositionCompatibility[]>;

  /** User favorites management */
  addPlayerToFavorites(userId: number, playerId: number): Promise<PlayerFavorite>;
  removePlayerFromFavorites(userId: number, playerId: number): Promise<void>;
  getUserFavorites(userId: number): Promise<Player[]>;
  isPlayerFavorited(userId: number, playerId: number): Promise<boolean>;

  /** Analytics and statistics */
  getTeamAnalytics(clubName: string): Promise<{
    playerCount: number;
  }>;
  getGlobalStats(): Promise<{
    totalPlayers: number;
    totalTeams: number;
    totalCompetitions: number;
  }>;
}

/**
 * PostgreSQL implementation of the storage interface using Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  constructor() {}

  // === Generic Helper Methods ===
  
  /**
   * Generic method to get a single record by ID
   */
  private async getById<T>(table: any, idColumn: any, id: number): Promise<T | undefined> {
    const [result] = await db.select().from(table).where(eq(idColumn, id));
    return result as T;
  }

  /**
   * Generic method to get a single record by a specific column
   */
  private async getByColumn<T>(table: any, column: any, value: any): Promise<T | undefined> {
    const [result] = await db.select().from(table).where(eq(column, value));
    return result as T;
  }

  /**
   * Generic method to get all records from a table
   */
  private async getAll<T>(table: any): Promise<T[]> {
    return await db.select().from(table) as T[];
  }

  /**
   * Generic method to create a single record
   */
  private async create<T>(table: any, data: any): Promise<T> {
    const result = await db.insert(table).values(data).returning();
    return (Array.isArray(result) ? result[0] : result) as T;
  }

  /**
   * Generic method to update a record
   */
  private async update<T>(table: any, idColumn: any, id: number, data: any): Promise<T | undefined> {
    const result = await db.update(table).set(data).where(eq(idColumn, id)).returning();
    return (Array.isArray(result) ? result[0] : result) as T;
  }

  /**
   * Generic method to bulk create records with chunking
   */
  private async bulkCreate<T>(table: any, data: any[], chunkSize: number = 100): Promise<T[]> {
    if (data.length === 0) return [];
    
    const created: T[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResult = await db.insert(table).values(chunk).returning();
      created.push(...chunkResult as T[]);
    }
    
    return created;
  }

  /**
   * Helper method to get player internal ID from external player ID
   */
  private async getPlayerInternalId(playerId: number): Promise<number | null> {
    const player = await this.getPlayerByPlayerId(playerId);
    return player?.id || null;
  }

  // === User Authentication Operations ===
  
  /**
   * Get user by ID
   * @param id - User ID
   * @returns User object or undefined if not found
   */
  async getUser(id: number): Promise<User | undefined> {
    return await this.getById<User>(users, users.id, id);
  }

  /**
   * Get user by email address
   * @param email - User email address
   * @returns User object or undefined if not found
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    return await this.getByColumn<User>(users, users.email, email);
  }

  /**
   * Create a new user
   * @param userData - User data to insert
   * @returns Created user object
   */
  async createUser(userData: InsertUser): Promise<User> {
    return await this.create<User>(users, userData);
  }

  // === Player Operations ===
  
  /**
   * Get player by internal ID
   * @param id - Internal player ID
   * @returns Player object or undefined if not found
   */
  async getPlayer(id: number): Promise<Player | undefined> {
    return await this.getById<Player>(players, players.id, id);
  }

  /**
   * Get player by external player ID with league information
   * @param playerId - External player ID
   * @returns Player object with league info or undefined if not found
   */
  async getPlayerByPlayerId(playerId: number): Promise<Player | undefined> {
    const player = await this.getByColumn<Player>(players, players.player_id, playerId);
    if (!player) return undefined;
    
    // Get league information from competitions table via clubs
    const leagueResult = await db
      .select({ league_name: competitions.name })
      .from(clubs)
      .leftJoin(competitions, eq(clubs.domestic_competition_id, competitions.competition_id))
      .where(player.current_club_name ? eq(clubs.name, player.current_club_name) : undefined)
      .limit(1);
    
    const leagueName = leagueResult[0]?.league_name;
    
    return {
      ...player,
      league: leagueName || player.league || null
    };
  }

  /**
   * Create a new player
   * @param insertPlayer - Player data to insert
   * @returns Created player object
   */
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    return await this.create<Player>(players, insertPlayer);
  }

  /**
   * Update player data
   * @param id - Player ID
   * @param playerUpdate - Partial player data to update
   * @returns Updated player object or undefined if not found
   */
  async updatePlayer(id: number, playerUpdate: Partial<InsertPlayer>): Promise<Player | undefined> {
    return await this.update<Player>(players, players.id, id, playerUpdate);
  }

  /**
   * Build search conditions from filters
   * @param filters - Search filters
   * @returns Array of conditions
   */
  private buildSearchConditions(filters: SearchFilters): any[] {
      const conditions = [] as any[];

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

    return conditions;
  }

  /**
   * Get compatibility column based on position
   * @param compatPosition - Position name
   * @returns Compatibility column
   */
  private getCompatibilityColumn(compatPosition: string) {
    switch (compatPosition) {
      case 'ST': return position_compatibility.st_fit;
      case 'LW': return position_compatibility.lw_fit;
      case 'RW': return position_compatibility.rw_fit;
      case 'CM': return position_compatibility.cm_fit;
      case 'CDM': return position_compatibility.cdm_fit;
      case 'CAM': return position_compatibility.cam_fit;
      case 'LB': return position_compatibility.lb_fit;
      case 'RB': return position_compatibility.rb_fit;
      default: return position_compatibility.cb_fit;
    }
  }

  /**
   * Search players with filters and pagination
   * @param filters - Search filters (name, position, team, etc.)
   * @param page - Page number (default: 1)
   * @param pageSize - Page size, 0 for no pagination (default: 0)
   * @returns Array of players matching the filters
   */
  async searchPlayers(filters: SearchFilters, page: number = 1, pageSize: number = 0): Promise<Player[]> {
    const conditions = this.buildSearchConditions(filters);
    const compatPosition = (filters as any).compatPosition as (undefined | string);
    const needCompat = Boolean(compatPosition) || filters.minCompatibility !== undefined;

    // Build base query
    let query: any = needCompat
          ? db
              .select(getTableColumns(players))
              .from(players)
              .leftJoin(position_compatibility, eq(players.player_id, position_compatibility.player_id))
          : db.select().from(players);
        
    // Add where conditions
    if (conditions.length > 0) {
      const whereClause = needCompat && compatPosition
        ? and(
            ...conditions,
            gte(this.getCompatibilityColumn(compatPosition), filters.minCompatibility ?? 70)
          )
        : and(...conditions);
      
      query = query.where(whereClause);
      }
      
      // Apply sorting
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
          case "compatibility":
            if (needCompat && compatPosition) {
            query = query.orderBy(desc(this.getCompatibilityColumn(compatPosition)));
          }
          break;
      }
    }

    // Apply pagination if needed
    if (pageSize > 0) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return await query;
  }

  /**
   * Get all players
   * @returns Array of all players
   */
  async getAllPlayers(): Promise<Player[]> {
    return await this.getAll<Player>(players);
  }

  /**
   * Bulk create multiple players
   * @param playersData - Array of player data to insert
   * @returns Array of created player objects
   */
  async bulkCreatePlayers(playersData: InsertPlayer[]): Promise<Player[]> {
    return await this.bulkCreate<Player>(players, playersData);
  }

  // === Club Operations ===
  
  /**
   * Get club by internal ID
   * @param id - Internal club ID
   * @returns Club object or undefined if not found
   */
  async getClub(id: number): Promise<Club | undefined> {
    return await this.getById<Club>(clubs, clubs.id, id);
  }

  /**
   * Get club by external club ID
   * @param clubId - External club ID
   * @returns Club object or undefined if not found
   */
  async getClubByClubId(clubId: number): Promise<Club | undefined> {
    return await this.getByColumn<Club>(clubs, clubs.club_id, clubId);
  }

  /**
   * Get all clubs
   * @returns Array of all clubs
   */
  async getAllClubs(): Promise<Club[]> {
    return await this.getAll<Club>(clubs);
  }

  /**
   * Create a new club
   * @param insertClub - Club data to insert
   * @returns Created club object
   */
  async createClub(insertClub: InsertClub): Promise<Club> {
    return await this.create<Club>(clubs, insertClub);
  }

  /**
   * Bulk create multiple clubs
   * @param clubsData - Array of club data to insert
   * @returns Array of created club objects
   */
  async bulkCreateClubs(clubsData: InsertClub[]): Promise<Club[]> {
    return await this.bulkCreate<Club>(clubs, clubsData);
  }

  /**
   * Get players by club name with fuzzy matching
   * @param clubName - Club name to search for
   * @returns Array of players in the club
   */
  async getPlayersByClub(clubName: string): Promise<Player[]> {
    if (!clubName) return [];
    
    try {
    const normalizedClubName = unidecode(clubName);
      
      // Exact match first
    let result = await db.select().from(players).where(
      sql`${players.current_club_name} ILIKE ${normalizedClubName}`
    );
      
      // Partial match if exact match fails
    if (result.length === 0) {
      result = await db.select().from(players).where(
        sql`${players.current_club_name} ILIKE ${'%' + normalizedClubName + '%'}`
      );
    }
      
    return result;
    } catch (error) {
      console.error(`Error getting players for club ${clubName}:`, error);
      return [];
    }
  }

  /**
   * Get clubs by competition ID
   * @param competitionId - Competition ID
   * @returns Array of clubs in the competition
   */
  async getClubsByCompetition(competitionId: string): Promise<Club[]> {
    return await db.select().from(clubs).where(eq(clubs.domestic_competition_id, competitionId));
  }

  // === Competition Operations ===
  
  /**
   * Get competition by ID
   * @param id - Competition ID
   * @returns Competition object or undefined if not found
   */
  async getCompetition(id: number): Promise<Competition | undefined> {
    return await this.getById<Competition>(competitions, competitions.id, id);
  }

  /**
   * Get all competitions
   * @returns Array of all competitions
   */
  async getAllCompetitions(): Promise<Competition[]> {
    return await this.getAll<Competition>(competitions);
  }

  /**
   * Create a new competition
   * @param insertCompetition - Competition data to insert
   * @returns Created competition object
   */
  async createCompetition(insertCompetition: InsertCompetition): Promise<Competition> {
    return await this.create<Competition>(competitions, insertCompetition);
  }

  /**
   * Bulk create multiple competitions
   * @param competitionsData - Array of competition data to insert
   * @returns Array of created competition objects
   */
  async bulkCreateCompetitions(competitionsData: InsertCompetition[]): Promise<Competition[]> {
    return await this.bulkCreate<Competition>(competitions, competitionsData);
  }

  // === League Operations ===
  
  /**
   * Get all unique league names
   * @returns Array of league names
   */
  async getAllLeagues(): Promise<string[]> {
    const result = await db.selectDistinct({ league: players.league }).from(players).where(sql`${players.league} IS NOT NULL AND ${players.league} != ''`);
    return result.map(row => row.league).filter((league): league is string => league !== null && league.trim() !== "");
  }

  // === Country Operations ===
  
  /**
   * Get all unique country names
   * @returns Array of country names
   */
  async getAllCountries(): Promise<string[]> {
    const result = await db.selectDistinct({ country: competitions.country_name }).from(competitions).where(sql`${competitions.country_name} IS NOT NULL AND ${competitions.country_name} != ''`);
    return result.map(row => row.country).filter((country): country is string => country !== null && country.trim() !== "").sort();
  }

  /**
   * Get clubs by country name
   * @param country - Country name
   * @returns Array of clubs in the country
   */
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

  /**
   * Get leagues by country name
   * @param country - Country name
   * @returns Array of league names in the country
   */
  async getLeaguesByCountry(country: string): Promise<string[]> {
    const countryCompetitions = await db.select().from(competitions).where(eq(competitions.country_name, country));
    return countryCompetitions.map(c => c.name).filter(name => name && name.trim() !== "").sort();
  }

  // === Position Compatibility Operations ===
  
  /**
   * Get position compatibility data for a player
   * @param playerId - Player ID
   * @returns Position compatibility object or undefined if not found
   */
  async getPositionCompatibility(playerId: number): Promise<PositionCompatibility | undefined> {
    try {
      return await this.getByColumn<PositionCompatibility>(position_compatibility, position_compatibility.player_id, playerId);
    } catch (error) {
      console.error(`Error getting compatibility for player ${playerId}:`, error);
      return undefined;
    }
  }

  /**
   * Create position compatibility data for a player
   * @param compatibility - Position compatibility data to insert
   * @returns Created position compatibility object
   */
  async createPositionCompatibility(compatibility: InsertPositionCompatibility): Promise<PositionCompatibility> {
    return await this.create<PositionCompatibility>(position_compatibility, compatibility);
  }

  /**
   * Update position compatibility data for a player
   * @param playerId - Player ID
   * @param compatibilityUpdate - Partial compatibility data to update
   * @returns Updated position compatibility object or undefined if not found
   */
  async updatePositionCompatibility(playerId: number, compatibilityUpdate: Partial<InsertPositionCompatibility>): Promise<PositionCompatibility | undefined> {
    return await this.update<PositionCompatibility>(position_compatibility, position_compatibility.player_id, playerId, compatibilityUpdate);
  }

  /**
   * Bulk create position compatibility data for multiple players
   * @param compatibilities - Array of position compatibility data to insert
   * @returns Array of created position compatibility objects
   */
  async bulkCreatePositionCompatibility(compatibilities: InsertPositionCompatibility[]): Promise<PositionCompatibility[]> {
    return await this.bulkCreate<PositionCompatibility>(position_compatibility, compatibilities);
  }

  /**
   * Fetch compatibilities for multiple player IDs in one query
   * @param playerIds - Array of player IDs
   * @returns Map from player_id to PositionCompatibility
   */
  async getPositionCompatibilities(playerIds: number[]): Promise<Map<number, PositionCompatibility>> {
    if (playerIds.length === 0) {
      return new Map();
    }
    try {
      const compatibilities = await db.select().from(position_compatibility).where(inArray(position_compatibility.player_id, playerIds));
      const compatMap = new Map<number, PositionCompatibility>();
      for (const comp of compatibilities) {
        compatMap.set(comp.player_id, comp);
      }
      return compatMap;
    } catch (error) {
      console.error(`Error getting bulk compatibility for players:`, error);
      return new Map();
    }
  }

  // === User Favorites Operations ===
  
  /**
   * Add a player to user's favorites
   * @param userId - User ID
   * @param playerId - Player ID
   * @returns Created favorite object
   */
  async addPlayerToFavorites(userId: number, playerId: number): Promise<PlayerFavorite> {
    const internalPlayerId = await this.getPlayerInternalId(playerId);
    if (!internalPlayerId) {
      throw new Error("Player not found");
    }
    
    const [favorite] = await db
      .insert(player_favorites)
      .values({ user_id: userId, player_id: internalPlayerId })
      .onConflictDoNothing()
      .returning();
    return favorite;
  }

  /**
   * Remove a player from user's favorites
   * @param userId - User ID
   * @param playerId - Player ID
   */
  async removePlayerFromFavorites(userId: number, playerId: number): Promise<void> {
    const internalPlayerId = await this.getPlayerInternalId(playerId);
    if (!internalPlayerId) {
      throw new Error("Player not found");
    }
    
    await db
      .delete(player_favorites)
      .where(and(
        eq(player_favorites.user_id, userId),
        eq(player_favorites.player_id, internalPlayerId)
      ));
  }

  /**
   * Get all favorite players for a user
   * @param userId - User ID
   * @returns Array of favorite player objects
   */
  async getUserFavorites(userId: number): Promise<Player[]> {
    const favorites = await db
      .select(getTableColumns(players))
      .from(players)
      .innerJoin(player_favorites, eq(players.id, player_favorites.player_id))
      .where(eq(player_favorites.user_id, userId))
      .orderBy(desc(player_favorites.created_at));
    
    return favorites;
  }

  /**
   * Check if a player is favorited by a user
   * @param userId - User ID
   * @param playerId - Player ID
   * @returns True if player is favorited, false otherwise
   */
  async isPlayerFavorited(userId: number, playerId: number): Promise<boolean> {
    const internalPlayerId = await this.getPlayerInternalId(playerId);
    if (!internalPlayerId) {
      return false;
    }
    
    const [favorite] = await db
      .select()
      .from(player_favorites)
      .where(and(
        eq(player_favorites.user_id, userId),
        eq(player_favorites.player_id, internalPlayerId)
      ));
    
    return !!favorite;
  }

  // === Analytics Operations ===
  
  /**
   * Get team analytics for a club
   * @param clubName - Club name
   * @returns Team analytics object with player count
   */
  async getTeamAnalytics(clubName: string): Promise<{
    playerCount: number;
  }> {
    const teamPlayers = await this.getPlayersByClub(clubName);
      return {
        playerCount: teamPlayers.length,
    };
  }

  /**
   * Get global statistics for the application
   * @returns Global stats object with totals
   */
  async getGlobalStats(): Promise<{
    totalPlayers: number;
    totalTeams: number;
    totalCompetitions: number;
  }> {
    const totalPlayersResult = await db.select({ count: sql<number>`count(*)` }).from(players);
    const totalTeamsResult = await db.select({ count: sql<number>`count(*)` }).from(clubs);
    const totalCompetitionsResult = await db.select({ count: sql<number>`count(*)` }).from(competitions);

    return {
      totalPlayers: totalPlayersResult[0]?.count || 0,
      totalTeams: totalTeamsResult[0]?.count || 0,
      totalCompetitions: totalCompetitionsResult[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();