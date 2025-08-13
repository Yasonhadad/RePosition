import type { Express as ExpressApp } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchFiltersSchema, insertPlayerSchema, insertClubSchema, type Club } from "@shared/schema";

import { setupAuth, requireAuth } from "./auth";
import multer from "multer";

export async function registerRoutes(app: ExpressApp): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes - handled by auth.ts
  const upload = multer({ storage: multer.memoryStorage() });
  
  // Get all players with optional search filters
  app.get("/api/players", async (req, res) => {
    try {
      // Convert query string parameters to appropriate types
      const queryFilters: any = { ...req.query };
      
      // Extract pagination parameters (allow pageSize=0 to pass through)
      const rawPage = req.query.page as string | undefined;
      const rawPageSize = req.query.pageSize as string | undefined;
      const page = rawPage !== undefined && !Number.isNaN(parseInt(rawPage)) ? parseInt(rawPage) : 1;
      // Default to 0 (no server-side limit) so the client can paginate
      const pageSize = rawPageSize !== undefined && !Number.isNaN(parseInt(rawPageSize)) ? parseInt(rawPageSize) : 0;
      
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

  // Upload CSV of player data and return position compatibility for each player_id
  app.post("/api/compatibility/upload", upload.single("csvFile"), async (req, res) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: "CSV file is required under field 'csvFile'" });
      }
      // Persist uploaded CSV to a temp file and invoke Python script to compute scores
      const fs = await import("fs/promises");
      const os = await import("os");
      const path = await import("path");
      const { spawn } = await import("child_process");

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-"));
      const inPath = path.join(tmpDir, "input.csv");
      const outPath = path.join(tmpDir, "output.csv");
      await fs.writeFile(inPath, file.buffer);

      // Build fallback maps from original input for name/sub_position by player_id
      const inputCsvText = file.buffer.toString("utf-8");
      const inputLines = inputCsvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      const inputHeader = inputLines[0].split(",").map(h => h.trim());
      const inMap: Record<string, number> = {};
      inputHeader.forEach((h, idx) => (inMap[h] = idx));
      const inputById: Record<number, { name?: string | null; natural_pos?: string | null }> = {};
      if (inMap["player_id"] !== undefined) {
        for (const line of inputLines.slice(1)) {
          const cols = line.split(",");
          const pid = parseInt((cols[inMap["player_id"]] || "").trim());
          if (!Number.isNaN(pid)) {
            inputById[pid] = {
              name: inMap["name"] !== undefined ? (cols[inMap["name"]] || null) : null,
              natural_pos: inMap["sub_position"] !== undefined ? (cols[inMap["sub_position"]] || null) : null,
            };
          }
        }
      }

      const py = spawn(process.platform === "win32" ? "python" : "python3", [
        path.join(process.cwd(), "models", "predict_from_csv.py"),
        "--input", inPath,
        "--out", outPath,
      ], { stdio: "inherit" });

      await new Promise<void>((resolve, reject) => {
        py.on("exit", (code) => {
          if (code === 0) resolve(); else reject(new Error(`Python exited with code ${code}`));
        });
        py.on("error", reject);
      });

      const csvOut = await fs.readFile(outPath, "utf-8");
      // Parse the minimal columns we need to return
      const lines = csvOut.split(/\r?\n/).filter(l => l.trim().length > 0);
      const header = lines[0].split(",").map(h => h.trim());
      const map: Record<string, number> = {};
      header.forEach((h, idx) => map[h] = idx);
      const results = lines.slice(1).map(line => {
        const cols = line.split(",");
        const pid = parseInt((cols[map["player_id"]] || "0").trim());
        const nameOut = map["name"] !== undefined ? (cols[map["name"]] || null) : null;
        const natOut = map["natural_pos"] !== undefined ? (cols[map["natural_pos"]] || null) : null;
        const fallback = inputById[pid] || {};
        return {
          player_id: pid,
          name: nameOut || fallback.name || null,
          natural_pos: natOut || fallback.natural_pos || null,
          status: "ok" as const,
          compatibility: {
            best_pos: cols[map["best_pos"]] || null,
            best_fit_score: cols[map["best_fit_score"]] ? parseFloat(cols[map["best_fit_score"]]) : null,
            st_fit: cols[map["st_fit"]] ? parseFloat(cols[map["st_fit"]]) : null,
            lw_fit: cols[map["lw_fit"]] ? parseFloat(cols[map["lw_fit"]]) : null,
            rw_fit: cols[map["rw_fit"]] ? parseFloat(cols[map["rw_fit"]]) : null,
            cm_fit: cols[map["cm_fit"]] ? parseFloat(cols[map["cm_fit"]]) : null,
            cdm_fit: cols[map["cdm_fit"]] ? parseFloat(cols[map["cdm_fit"]]) : null,
            cam_fit: cols[map["cam_fit"]] ? parseFloat(cols[map["cam_fit"]]) : null,
            lb_fit: cols[map["lb_fit"]] ? parseFloat(cols[map["lb_fit"]]) : null,
            rb_fit: cols[map["rb_fit"]] ? parseFloat(cols[map["rb_fit"]]) : null,
            cb_fit: cols[map["cb_fit"]] ? parseFloat(cols[map["cb_fit"]]) : null,
          }
        };
      });

      res.json({ count: results.length, results });
    } catch (error) {
      console.error("CSV compatibility upload error:", error);
      res.status(500).json({ error: "Failed to process CSV" });
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
