import type { Express as ExpressApp } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { type Club } from "@shared/schema";
import {
  parseCsvHeader,
  buildFallbackData,
  parseCompatibilityResults,
  parsePlayerId as _parsePlayerId,
  parseFilters as _parseFilters,
} from "./route-utils";

import { setupAuth, requireAuth } from "./auth";
import multer from "multer";

export async function registerRoutes(app: ExpressApp): Promise<Server> {
  setupAuth(app);

  const upload = multer({ storage: multer.memoryStorage() });

  const handleError = (res: any, error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `${defaultMessage}: ${errorMessage}` });
  };

  const sendSuccess = (res: any, data: any) => {
    res.json(data);
  };

  const parsePlayerId = (req: any): number | null => {
    return _parsePlayerId(req.params);
  };

  const validatePlayer = async (playerId: number) => {
    const player = await storage.getPlayerByPlayerId(playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    return player;
  };

  const parseFilters = (req: any) => {
    return _parseFilters(req.query);
  };

  // === Player Routes ===
  
  // Get all players with optional search filters
  app.get("/api/players", async (req, res) => {
    try {
      const { filters, page, pageSize } = parseFilters(req);
      const players = await storage.searchPlayers(filters, page, pageSize);
      sendSuccess(res, players);
    } catch (error) {
      res.status(400).json({ error: "Invalid search parameters" });
    }
  });

  // Get specific player by ID
  app.get("/api/players/:id", async (req, res) => {
    try {
      const playerId = parsePlayerId(req);
      if (!playerId) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      const player = await validatePlayer(playerId);
      const compatibility = await storage.getPositionCompatibility(playerId);
      
      sendSuccess(res, { player, compatibility });
    } catch (error) {
      if (error instanceof Error && error.message === "Player not found") {
        res.status(404).json({ error: "Player not found" });
      } else {
        handleError(res, error, "Failed to fetch player");
      }
    }
  });

  // Get player position compatibility analysis
  app.get("/api/players/:id/compatibility", async (req, res) => {
    try {
      const playerId = parsePlayerId(req);
      if (!playerId) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      await validatePlayer(playerId);
      const compatibility = await storage.getPositionCompatibility(playerId);
      
      if (!compatibility) {
        return res.status(404).json({ 
          error: "Position compatibility not found. Please run full analysis first." 
        });
      }

      sendSuccess(res, compatibility);
    } catch (error) {
      if (error instanceof Error && error.message === "Player not found") {
        res.status(404).json({ error: "Player not found" });
      } else {
        handleError(res, error, "Failed to analyze player compatibility");
      }
    }
  });

  // === Club Routes ===
  
  // Get all clubs
  app.get("/api/clubs", async (req, res) => {
    try {
      const { country } = req.query;
      const clubs = country && country !== 'all' 
        ? await storage.getClubsByCountry(country as string)
        : await storage.getAllClubs();
      
      sendSuccess(res, clubs);
    } catch (error) {
      handleError(res, error, "Failed to fetch clubs");
    }
  });

  // Get clubs by country
  app.get("/api/clubs/country/:country", async (req, res) => {
    try {
      const country = decodeURIComponent(req.params.country);
      const clubs = await storage.getClubsByCountry(country);
      sendSuccess(res, clubs);
    } catch (error) {
      handleError(res, error, "Failed to fetch clubs by country");
    }
  });

  // === Competition Routes ===
  
  // Get all competitions
  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await storage.getAllCompetitions();
      sendSuccess(res, competitions);
    } catch (error) {
      handleError(res, error, "Failed to fetch competitions");
    }
  });

  // === League Routes ===
  
  // Get all leagues
  app.get("/api/leagues", async (req, res) => {
    try {
      const leagues = await storage.getAllLeagues();
      sendSuccess(res, leagues);
    } catch (error) {
      handleError(res, error, "Failed to fetch leagues");
    }
  });

  // Get leagues by country
  app.get("/api/leagues/country/:country", async (req, res) => {
    try {
      const country = decodeURIComponent(req.params.country);
      const leagues = await storage.getLeaguesByCountry(country);
      sendSuccess(res, leagues);
    } catch (error) {
      handleError(res, error, "Failed to fetch leagues by country");
    }
  });

  // === Country Routes ===
  
  // Get all countries
  app.get("/api/countries", async (req, res) => {
    try {
      const countries = await storage.getAllCountries();
      sendSuccess(res, countries);
    } catch (error) {
      handleError(res, error, "Failed to fetch countries");
    }
  });

  // === Team Analysis Routes ===
  
  // Get team analysis
  app.get("/api/teams/:clubName/analysis", async (req, res) => {
    try {
      const { clubName } = req.params;
      const decodedClubName = decodeURIComponent(clubName);
      
      console.log(`Analyzing team: ${decodedClubName}`);
      
      const analytics = await storage.getTeamAnalytics(decodedClubName);
      const players = await storage.getPlayersByClub(decodedClubName);
      
      console.log(`Found ${players.length} players for ${decodedClubName}`);
      
      // Fetch all compatibilities in one query to avoid pool timeouts
      const playerIds = players.map(p => p.player_id);
      const compatByPlayerId = await storage.getPositionCompatibilities(playerIds);
      const playersWithCompatibility = players.map(player => ({
        ...player,
        compatibility: compatByPlayerId.get(player.player_id) ?? null,
      }));

      sendSuccess(res, {
        clubName: decodedClubName,
        analytics,
        players: playersWithCompatibility,
      });
    } catch (error) {
      handleError(res, error, `Failed to analyze team ${req.params.clubName}`);
    }
  });

  // === Statistics Routes ===
  
  // Get global statistics (no cache - CloudFront must not serve stale stats)
  app.get("/api/stats", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const stats = await storage.getGlobalStats();
      sendSuccess(res, stats);
    } catch (error) {
      handleError(res, error, "Failed to fetch statistics");
    }
  });

  // === CSV Upload Routes ===

  const runPythonPrediction = async (inputPath: string, outputPath: string): Promise<void> => {
    const { spawn } = await import("child_process");
    const path = await import("path");
    const py = spawn(process.platform === "win32" ? "python" : "python3", [
      path.join(process.cwd(), "models", "predict_from_csv.py"),
      "--input", inputPath,
      "--out", outputPath,
    ], { stdio: "inherit" });

    return new Promise<void>((resolve, reject) => {
      py.on("exit", (code) => {
        if (code === 0) resolve(); else reject(new Error(`Python exited with code ${code}`));
      });
      py.on("error", reject);
    });
  };

  // Upload CSV of player data and return position compatibility for each player_id
  app.post("/api/compatibility/upload", upload.single("csvFile"), async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: "CSV file is required under field 'csvFile'" });
      }

      // Setup temp files
      const fs = await import("fs/promises");
      const os = await import("os");
      const path = await import("path");
      
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-"));
      const inPath = path.join(tmpDir, "input.csv");
      const outPath = path.join(tmpDir, "output.csv");
      await fs.writeFile(inPath, file.buffer);

      // Build fallback data from input
      const inputCsvText = file.buffer.toString("utf-8");
      const inputById = buildFallbackData(inputCsvText);

      // Run Python prediction
      await runPythonPrediction(inPath, outPath);

      // Parse results
      const csvOut = await fs.readFile(outPath, "utf-8");
      const results = parseCompatibilityResults(csvOut, inputById);

      sendSuccess(res, { count: results.length, results });
    } catch (error) {
      handleError(res, error, "Failed to process CSV");
    }
  });

  // === Favorites Routes ===
  
  // Add player to favorites
  app.post("/api/favorites/:playerId", requireAuth, async (req, res) => {
    try {
      const playerId = parsePlayerId(req);
      if (!playerId) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      const userId = req.user!.id;
      await validatePlayer(playerId);
      const favorite = await storage.addPlayerToFavorites(userId, playerId);
      
      sendSuccess(res, { message: "Player added to favorites", favorite });
    } catch (error) {
      if (error instanceof Error && error.message === "Player not found") {
        res.status(404).json({ error: "Player not found" });
      } else {
        handleError(res, error, "Failed to add player to favorites");
      }
    }
  });

  // Remove player from favorites
  app.delete("/api/favorites/:playerId", requireAuth, async (req, res) => {
    try {
      const playerId = parsePlayerId(req);
      if (!playerId) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      const userId = req.user!.id;
      await storage.removePlayerFromFavorites(userId, playerId);
      sendSuccess(res, { message: "Player removed from favorites" });
    } catch (error) {
      handleError(res, error, "Failed to remove player from favorites");
    }
  });

  // Get user favorites
  app.get("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const favorites = await storage.getUserFavorites(userId);
      sendSuccess(res, favorites);
    } catch (error) {
      handleError(res, error, "Failed to get user favorites");
    }
  });

  // Check if player is favorited
  app.get("/api/favorites/:playerId/status", requireAuth, async (req, res) => {
    try {
      const playerId = parsePlayerId(req);
      if (!playerId) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      const userId = req.user!.id;
      const isFavorited = await storage.isPlayerFavorited(userId, playerId);
      sendSuccess(res, { isFavorited });
    } catch (error) {
      handleError(res, error, "Failed to check favorite status");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
