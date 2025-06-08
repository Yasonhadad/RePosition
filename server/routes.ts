import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchFiltersSchema, insertPlayerSchema, insertClubSchema } from "@shared/schema";
import { processMLAnalysis, processCsvData } from "./ml-processor";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes - handled by auth.ts
  
  // Get all players with optional search filters
  app.get("/api/players", async (req, res) => {
    try {
      // Convert query string parameters to appropriate types
      const queryFilters = { ...req.query };
      
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
      const players = await storage.searchPlayers(filters);
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

      // Check cache first
      const cacheKey = `compatibility_${playerId}`;
      let compatibility = await storage.getPositionCompatibility(playerId);
      
      if (!compatibility) {
        // Run ML analysis
        const analysisResult = await processMLAnalysis([player]);
        if (analysisResult.length > 0) {
          compatibility = await storage.createPositionCompatibility(analysisResult[0]);
        }
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
      let clubs;
      
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
        } else {
          clubs = [];
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

  // Upload and process CSV data
  app.post("/api/upload", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const fileType = req.body.fileType; // 'players', 'clubs', or 'competitions'

      try {
        const result = await processCsvData(filePath, fileType);
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        res.json({
          message: "File processed successfully",
          recordsProcessed: result.recordsProcessed,
          errors: result.errors
        });
      } catch (error) {
        // Clean up uploaded file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw error;
      }
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to process uploaded file" });
    }
  });

  // Run ML analysis for specific players
  app.post("/api/analyze", async (req, res) => {
    try {
      const { playerIds } = req.body;
      
      if (!Array.isArray(playerIds) || playerIds.length === 0) {
        return res.status(400).json({ error: "Player IDs array is required" });
      }

      const players = await Promise.all(
        playerIds.map(id => storage.getPlayerByPlayerId(id))
      );

      const validPlayers = players.filter(p => p !== undefined);
      
      if (validPlayers.length === 0) {
        return res.status(404).json({ error: "No valid players found" });
      }

      const analysisResults = await processMLAnalysis(validPlayers);
      
      // Store results in database
      await storage.bulkCreatePositionCompatibility(analysisResults);

      res.json({
        message: "Analysis completed successfully",
        results: analysisResults
      });
    } catch (error) {
      console.error("ML analysis error:", error);
      res.status(500).json({ error: "Failed to run ML analysis" });
    }
  });

  // Bulk analyze all players (for initial setup)
  app.post("/api/analyze/all", async (req, res) => {
    try {
      const allPlayers = await storage.getAllPlayers();
      
      if (allPlayers.length === 0) {
        return res.status(400).json({ error: "No players found in database" });
      }

      // Process in batches to avoid overwhelming the system
      const batchSize = 100;
      let totalProcessed = 0;
      const errors: string[] = [];

      for (let i = 0; i < allPlayers.length; i += batchSize) {
        const batch = allPlayers.slice(i, i + batchSize);
        
        try {
          const analysisResults = await processMLAnalysis(batch);
          await storage.bulkCreatePositionCompatibility(analysisResults);
          totalProcessed += analysisResults.length;
        } catch (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error}`);
        }
      }

      res.json({
        message: "Bulk analysis completed",
        totalProcessed,
        totalPlayers: allPlayers.length,
        errors
      });
    } catch (error) {
      console.error("Bulk analysis error:", error);
      res.status(500).json({ error: "Failed to run bulk analysis" });
    }
  });

  // Player Favorites API endpoints
  app.post("/api/favorites/:playerId", isAuthenticated, async (req, res) => {
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

  app.delete("/api/favorites/:playerId", isAuthenticated, async (req, res) => {
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

  app.get("/api/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ error: "Failed to get user favorites" });
    }
  });

  app.get("/api/favorites/:playerId/status", isAuthenticated, async (req, res) => {
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
