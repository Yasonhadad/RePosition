import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchFiltersSchema, insertPlayerSchema, insertClubSchema, type Club } from "@shared/schema";

import { setupAuth, requireAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes - handled by auth.ts
  
  // Get all players with optional search filters
  app.get("/api/players", async (req, res) => {
    try {
      // Convert query string parameters to appropriate types
      const queryFilters: any = { ...req.query };
      
      // Extract pagination parameters
      const page = parseInt(queryFilters.page as string) || 1;
      const pageSize = parseInt(queryFilters.pageSize as string) || 50;
      
      // Remove pagination parameters from filters
      delete queryFilters.page;
      delete queryFilters.pageSize;
      
      // Convert numeric fields from strings to numbers
      if (queryFilters.ageMin) {
        queryFilters.ageMin = parseInt(queryFilters.ageMin as string);
      }
      if (queryFilters.ageMax) {
        queryFilters.ageMax = parseInt(queryFilters.ageMax as string);
      }
      if (queryFilters.minCompatibility) {
        queryFilters.minCompatibility = parseFloat(queryFilters.minCompatibility as string);
      }
      
      const filters = searchFiltersSchema.parse(queryFilters);
      const players = await storage.searchPlayers(filters, page, pageSize);
      res.json(players);
    } catch (error) {
      console.error("Search filters validation error:", error);
      res.status(400).json({ error: "Invalid search parameters" });
    }
  });

  // Get specific player by ID
  app.get("/api/players/:id", async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const player = await storage.getPlayerByPlayerId(playerId);
      
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // Get position compatibility data
      const compatibility = await storage.getPositionCompatibility(playerId);
      
      res.json({ player, compatibility });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player" });
    }
  });

  // Get player position compatibility analysis
  app.get("/api/players/:id/compatibility", async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const player = await storage.getPlayerByPlayerId(playerId);
      
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // Get position compatibility from database
      const compatibility = await storage.getPositionCompatibility(playerId);
      
      if (!compatibility) {
        return res.status(404).json({ 
          error: "Position compatibility not found. Please run full analysis first." 
        });
      }

      res.json(compatibility);
    } catch (error) {
      console.error("Compatibility analysis error:", error);
      res.status(500).json({ error: "Failed to analyze player compatibility" });
    }
  });

  // Get all clubs
  app.get("/api/clubs", async (req, res) => {
    try {
      const { country } = req.query;
      let clubs: Club[] = [];
      
      if (country && country !== 'all') {
        // Get competitions by country name, then get clubs by those competitions
        const competitions = await storage.getAllCompetitions();
        const countryCompetitions = competitions.filter(c => c.country_name === country);
        
        if (countryCompetitions.length > 0) {
          // Get clubs for all competitions from this country
          const allClubs = await Promise.all(
            countryCompetitions.map(comp => storage.getClubsByCompetition(comp.competition_id))
          );
          clubs = allClubs.flat();
          
          // Remove duplicates based on club_id
          const uniqueClubs = clubs.filter((club, index, self) => 
            index === self.findIndex(c => c.club_id === club.club_id)
          );
          clubs = uniqueClubs;
        }
      } else {
        clubs = await storage.getAllClubs();
      }
      
      res.json(clubs);
    } catch (error) {
      console.error("Error fetching clubs:", error);
      res.status(500).json({ error: "Failed to fetch clubs" });
    }
  });

  // Get all competitions
  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await storage.getAllCompetitions();
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching competitions:", error);
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  // Get all leagues
  app.get("/api/leagues", async (req, res) => {
    try {
      const leagues = await storage.getAllLeagues();
      res.json(leagues);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leagues" });
    }
  });

  // Get all countries
  app.get("/api/countries", async (req, res) => {
    try {
      const countries = await storage.getAllCountries();
      res.json(countries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });

  // Get clubs by country
  app.get("/api/clubs/country/:country", async (req, res) => {
    try {
      const country = decodeURIComponent(req.params.country);
      const clubs = await storage.getClubsByCountry(country);
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clubs by country" });
    }
  });

  // Get leagues by country
  app.get("/api/leagues/country/:country", async (req, res) => {
    try {
      const country = decodeURIComponent(req.params.country);
      const leagues = await storage.getLeaguesByCountry(country);
      res.json(leagues);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leagues by country" });
    }
  });

  // Get team analysis
  app.get("/api/teams/:clubName/analysis", async (req, res) => {
    try {
      const { clubName } = req.params;
      const decodedClubName = decodeURIComponent(clubName);
      
      const analytics = await storage.getTeamAnalytics(decodedClubName);
      const players = await storage.getPlayersByClub(decodedClubName);
      
      // Get compatibility data for all players
      const playersWithCompatibility = await Promise.all(
        players.map(async (player) => {
          const compatibility = await storage.getPositionCompatibility(player.player_id);
          return { ...player, compatibility };
        })
      );

      res.json({
        clubName: decodedClubName,
        analytics,
        players: playersWithCompatibility,
      });
    } catch (error) {
      console.error("Team analysis error:", error);
      res.status(500).json({ error: "Failed to analyze team" });
    }
  });

  // Get global statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getGlobalStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

 
  // Player Favorites API endpoints
  app.post("/api/favorites/:playerId", requireAuth, async (req, res) => {
    try {
      const playerId = parseInt(req.params.playerId);
      const userId = req.user!.id;
      
      if (isNaN(playerId)) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      // Check if player exists
      const player = await storage.getPlayerByPlayerId(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const favorite = await storage.addPlayerToFavorites(userId, playerId);
      res.json({ message: "Player added to favorites", favorite });
    } catch (error) {
      console.error("Add favorite error:", error);
      res.status(500).json({ error: "Failed to add player to favorites" });
    }
  });

  app.delete("/api/favorites/:playerId", requireAuth, async (req, res) => {
    try {
      const playerId = parseInt(req.params.playerId);
      const userId = req.user!.id;
      
      if (isNaN(playerId)) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      await storage.removePlayerFromFavorites(userId, playerId);
      res.json({ message: "Player removed from favorites" });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ error: "Failed to remove player from favorites" });
    }
  });

  app.get("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ error: "Failed to get user favorites" });
    }
  });

  app.get("/api/favorites/:playerId/status", requireAuth, async (req, res) => {
    try {
      const playerId = parseInt(req.params.playerId);
      const userId = req.user!.id;
      
      if (isNaN(playerId)) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      const isFavorited = await storage.isPlayerFavorited(userId, playerId);
      res.json({ isFavorited });
    } catch (error) {
      console.error("Check favorite status error:", error);
      res.status(500).json({ error: "Failed to check favorite status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
