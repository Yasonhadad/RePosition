import { pgTable, text, serial, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  player_id: integer("player_id").notNull().unique(),
  name: text("name").notNull(),
  country_of_citizenship: text("country_of_citizenship"),
  date_of_birth: text("date_of_birth"),
  sub_position: text("sub_position"),
  position: text("position"),
  foot: text("foot"),
  height_in_cm: integer("height_in_cm"),
  current_club_name: text("current_club_name"),
  market_value_in_eur: integer("market_value_in_eur"),
  highest_market_value_in_eur: integer("highest_market_value_in_eur"),
  club_id: integer("club_id"),
  ovr: integer("ovr"),
  pac: integer("pac"),
  sho: integer("sho"),
  pas: integer("pas"),
  dri: integer("dri"),
  def: integer("def"),
  phy: integer("phy"),
  // Detailed FIFA attributes
  acceleration: integer("acceleration"),
  sprint_speed: integer("sprint_speed"),
  positioning: integer("positioning"),
  finishing: integer("finishing"),
  shot_power: integer("shot_power"),
  long_shots: integer("long_shots"),
  volleys: integer("volleys"),
  penalties: integer("penalties"),
  vision: integer("vision"),
  crossing: integer("crossing"),
  free_kick_accuracy: integer("free_kick_accuracy"),
  short_passing: integer("short_passing"),
  long_passing: integer("long_passing"),
  curve: integer("curve"),
  dribbling: integer("dribbling"),
  agility: integer("agility"),
  balance: integer("balance"),
  reactions: integer("reactions"),
  ball_control: integer("ball_control"),
  composure: integer("composure"),
  interceptions: integer("interceptions"),
  heading_accuracy: integer("heading_accuracy"),
  def_awareness: integer("def_awareness"),
  standing_tackle: integer("standing_tackle"),
  sliding_tackle: integer("sliding_tackle"),
  jumping: integer("jumping"),
  stamina: integer("stamina"),
  strength: integer("strength"),
  aggression: integer("aggression"),
  weak_foot: integer("weak_foot"),
  skill_moves: integer("skill_moves"),
  preferred_foot: text("preferred_foot"),
  alternative_positions: text("alternative_positions"),
  play_style: text("play_style"),
  // Goalkeeper specific attributes
  gk_diving: integer("gk_diving"),
  gk_handling: integer("gk_handling"),
  gk_kicking: integer("gk_kicking"),
  gk_positioning: integer("gk_positioning"),
  gk_reflexes: integer("gk_reflexes"),
  // Additional info
  league: text("league"),
  team: text("team"),
  weight: real("weight"),
  age: integer("age"),
  created_at: timestamp("created_at").defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  competition_id: text("competition_id").notNull().unique(),
  competition_code: text("competition_code"),
  name: text("name").notNull(),
  sub_type: text("sub_type"),
  type: text("type"),
  country_id: integer("country_id"),
  country_name: text("country_name"),
  domestic_league_code: text("domestic_league_code"),
  confederation: text("confederation"),
  url: text("url"),
  is_major_national_league: text("is_major_national_league"),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  club_id: integer("club_id").notNull().unique(),
  club_code: text("club_code"),
  name: text("name").notNull(),
  domestic_competition_id: text("domestic_competition_id"),
  total_market_value: integer("total_market_value"),
  squad_size: integer("squad_size"),
  average_age: real("average_age"),
  foreigners_number: integer("foreigners_number"),
  foreigners_percentage: real("foreigners_percentage"),
  national_team_players: integer("national_team_players"),
  stadium_name: text("stadium_name"),
  stadium_seats: integer("stadium_seats"),
  net_transfer_record: text("net_transfer_record"),
  coach_name: text("coach_name"),
  last_season: integer("last_season"),
});

export const position_compatibility = pgTable("position_compatibility", {
  id: serial("id").primaryKey(),
  player_id: integer("player_id").notNull(),
  natural_pos: text("natural_pos"),
  st_fit: real("st_fit"),
  lw_fit: real("lw_fit"),
  rw_fit: real("rw_fit"),
  cm_fit: real("cm_fit"),
  cdm_fit: real("cdm_fit"),
  cam_fit: real("cam_fit"),
  lb_fit: real("lb_fit"),
  rb_fit: real("rb_fit"),
  cb_fit: real("cb_fit"),
  best_pos: text("best_pos"),
  best_fit_score: real("best_fit_score"),
  best_fit_pct: real("best_fit_pct"),
  ovr: integer("ovr"),
  created_at: timestamp("created_at").defaultNow(),
});

export const ml_analysis_cache = pgTable("ml_analysis_cache", {
  id: serial("id").primaryKey(),
  cache_key: text("cache_key").notNull().unique(),
  analysis_data: jsonb("analysis_data").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  created_at: true,
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
});

export const insertPositionCompatibilitySchema = createInsertSchema(position_compatibility).omit({
  id: true,
  created_at: true,
});

export const insertMlAnalysisCacheSchema = createInsertSchema(ml_analysis_cache).omit({
  id: true,
  created_at: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitions.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;
export type InsertPositionCompatibility = z.infer<typeof insertPositionCompatibilitySchema>;
export type PositionCompatibility = typeof position_compatibility.$inferSelect;
export type InsertMlAnalysisCache = z.infer<typeof insertMlAnalysisCacheSchema>;
export type MlAnalysisCache = typeof ml_analysis_cache.$inferSelect;

// Football positions
export const POSITIONS = ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"] as const;
export type Position = typeof POSITIONS[number];

// Search filters
export const searchFiltersSchema = z.object({
  name: z.string().optional(),
  position: z.string().optional(),
  team: z.string().optional(),
  country: z.string().optional(),
  ageMin: z.number().optional(),
  ageMax: z.number().optional(),
  minCompatibility: z.number().optional(),
  sortBy: z.enum(["compatibility", "overall", "age", "market_value"]).optional(),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;
