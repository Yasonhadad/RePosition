import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { IStorage } from "./storage";

const { mockStorage } = vi.hoisted(() => {
  const mockStorage: IStorage = {
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    getPlayer: vi.fn(),
    getPlayerByPlayerId: vi.fn(),
    createPlayer: vi.fn(),
    updatePlayer: vi.fn(),
    searchPlayers: vi.fn(),
    getAllPlayers: vi.fn(),
    bulkCreatePlayers: vi.fn(),
    getCompetition: vi.fn(),
    getAllCompetitions: vi.fn(),
    createCompetition: vi.fn(),
    bulkCreateCompetitions: vi.fn(),
    getClub: vi.fn(),
    getClubByClubId: vi.fn(),
    getAllClubs: vi.fn(),
    createClub: vi.fn(),
    bulkCreateClubs: vi.fn(),
    getPlayersByClub: vi.fn(),
    getClubsByCompetition: vi.fn(),
    getAllLeagues: vi.fn(),
    getAllCountries: vi.fn(),
    getClubsByCountry: vi.fn(),
    getLeaguesByCountry: vi.fn(),
    getPositionCompatibility: vi.fn(),
    getPositionCompatibilities: vi.fn(),
    createPositionCompatibility: vi.fn(),
    updatePositionCompatibility: vi.fn(),
    bulkCreatePositionCompatibility: vi.fn(),
    addPlayerToFavorites: vi.fn(),
    removePlayerFromFavorites: vi.fn(),
    getUserFavorites: vi.fn(),
    isPlayerFavorited: vi.fn(),
    getTeamAnalytics: vi.fn(),
    getGlobalStats: vi.fn(),
  };
  return { mockStorage };
});

vi.mock("./storage", () => ({
  storage: mockStorage,
  DatabaseStorage: vi.fn(),
}));

vi.mock("./auth", () => ({
  setupAuth: vi.fn(),
  requireAuth: vi.fn((_req: any, _res: any, next: any) => {
    _req.user = { id: 1, email: "test@test.com" };
    _req.isAuthenticated = () => true;
    next();
  }),
}));

vi.mock("./db", () => ({
  db: {},
  pool: {},
}));

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ----- Player Routes -----

describe("GET /api/players", () => {
  it("returns players list", async () => {
    const players = [
      { id: 1, player_id: 100, name: "Messi" },
      { id: 2, player_id: 200, name: "Ronaldo" },
    ];
    vi.mocked(mockStorage.searchPlayers).mockResolvedValue(players as any);

    const res = await request(app).get("/api/players");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Messi");
  });

  it("passes filters to storage", async () => {
    vi.mocked(mockStorage.searchPlayers).mockResolvedValue([]);

    await request(app).get("/api/players?name=Messi&position=RW&page=2&pageSize=10");
    expect(mockStorage.searchPlayers).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Messi", position: "RW" }),
      2,
      10
    );
  });

  it("returns 400 for invalid filter params", async () => {
    vi.mocked(mockStorage.searchPlayers).mockRejectedValue(new Error("Bad"));

    const res = await request(app).get("/api/players?sortBy=invalid");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid search parameters");
  });
});

describe("GET /api/players/:id", () => {
  it("returns player with compatibility", async () => {
    const player = { id: 1, player_id: 100, name: "Messi" };
    const compat = { player_id: 100, best_pos: "RW", st_fit: 80 };
    vi.mocked(mockStorage.getPlayerByPlayerId).mockResolvedValue(player as any);
    vi.mocked(mockStorage.getPositionCompatibility).mockResolvedValue(compat as any);

    const res = await request(app).get("/api/players/100");
    expect(res.status).toBe(200);
    expect(res.body.player.name).toBe("Messi");
    expect(res.body.compatibility.best_pos).toBe("RW");
  });

  it("returns 404 when player not found", async () => {
    vi.mocked(mockStorage.getPlayerByPlayerId).mockResolvedValue(undefined);

    const res = await request(app).get("/api/players/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Player not found");
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await request(app).get("/api/players/abc");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid player ID");
  });
});

describe("GET /api/players/:id/compatibility", () => {
  it("returns compatibility data", async () => {
    const player = { id: 1, player_id: 100, name: "Messi" };
    const compat = { player_id: 100, best_pos: "RW" };
    vi.mocked(mockStorage.getPlayerByPlayerId).mockResolvedValue(player as any);
    vi.mocked(mockStorage.getPositionCompatibility).mockResolvedValue(compat as any);

    const res = await request(app).get("/api/players/100/compatibility");
    expect(res.status).toBe(200);
    expect(res.body.best_pos).toBe("RW");
  });

  it("returns 404 when no compatibility data exists", async () => {
    const player = { id: 1, player_id: 100, name: "Messi" };
    vi.mocked(mockStorage.getPlayerByPlayerId).mockResolvedValue(player as any);
    vi.mocked(mockStorage.getPositionCompatibility).mockResolvedValue(undefined);

    const res = await request(app).get("/api/players/100/compatibility");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("Position compatibility not found");
  });

  it("returns 404 when player not found", async () => {
    vi.mocked(mockStorage.getPlayerByPlayerId).mockResolvedValue(undefined);

    const res = await request(app).get("/api/players/999/compatibility");
    expect(res.status).toBe(404);
  });
});

// ----- Club Routes -----

describe("GET /api/clubs", () => {
  it("returns all clubs when no country filter", async () => {
    const clubs = [{ id: 1, name: "Barcelona" }];
    vi.mocked(mockStorage.getAllClubs).mockResolvedValue(clubs as any);

    const res = await request(app).get("/api/clubs");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockStorage.getAllClubs).toHaveBeenCalled();
  });

  it("returns all clubs when country=all", async () => {
    vi.mocked(mockStorage.getAllClubs).mockResolvedValue([]);

    await request(app).get("/api/clubs?country=all");
    expect(mockStorage.getAllClubs).toHaveBeenCalled();
    expect(mockStorage.getClubsByCountry).not.toHaveBeenCalled();
  });

  it("filters by country", async () => {
    vi.mocked(mockStorage.getClubsByCountry).mockResolvedValue([]);

    await request(app).get("/api/clubs?country=Spain");
    expect(mockStorage.getClubsByCountry).toHaveBeenCalledWith("Spain");
  });
});

describe("GET /api/clubs/country/:country", () => {
  it("returns clubs for a country", async () => {
    const clubs = [{ id: 1, name: "Barcelona" }];
    vi.mocked(mockStorage.getClubsByCountry).mockResolvedValue(clubs as any);

    const res = await request(app).get("/api/clubs/country/Spain");
    expect(res.status).toBe(200);
    expect(mockStorage.getClubsByCountry).toHaveBeenCalledWith("Spain");
  });

  it("decodes URL-encoded country names", async () => {
    vi.mocked(mockStorage.getClubsByCountry).mockResolvedValue([]);

    await request(app).get(`/api/clubs/country/${encodeURIComponent("United Kingdom")}`);
    expect(mockStorage.getClubsByCountry).toHaveBeenCalledWith("United Kingdom");
  });
});

// ----- Competition Routes -----

describe("GET /api/competitions", () => {
  it("returns all competitions", async () => {
    const competitions = [{ id: 1, name: "La Liga" }];
    vi.mocked(mockStorage.getAllCompetitions).mockResolvedValue(competitions as any);

    const res = await request(app).get("/api/competitions");
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("La Liga");
  });

  it("returns 500 on storage error", async () => {
    vi.mocked(mockStorage.getAllCompetitions).mockRejectedValue(new Error("DB down"));

    const res = await request(app).get("/api/competitions");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Failed to fetch competitions");
  });
});

// ----- League Routes -----

describe("GET /api/leagues", () => {
  it("returns all leagues", async () => {
    vi.mocked(mockStorage.getAllLeagues).mockResolvedValue(["La Liga", "Premier League"]);

    const res = await request(app).get("/api/leagues");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["La Liga", "Premier League"]);
  });
});

describe("GET /api/leagues/country/:country", () => {
  it("returns leagues for a country", async () => {
    vi.mocked(mockStorage.getLeaguesByCountry).mockResolvedValue(["La Liga"]);

    const res = await request(app).get("/api/leagues/country/Spain");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["La Liga"]);
  });
});

// ----- Country Routes -----

describe("GET /api/countries", () => {
  it("returns all countries", async () => {
    vi.mocked(mockStorage.getAllCountries).mockResolvedValue(["England", "Spain"]);

    const res = await request(app).get("/api/countries");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["England", "Spain"]);
  });
});

// ----- Team Analysis Routes -----

describe("GET /api/teams/:clubName/analysis", () => {
  it("returns team analysis with players and compatibility", async () => {
    vi.mocked(mockStorage.getTeamAnalytics).mockResolvedValue({ playerCount: 2 });
    vi.mocked(mockStorage.getPlayersByClub).mockResolvedValue([
      { id: 1, player_id: 100, name: "Player1" },
      { id: 2, player_id: 200, name: "Player2" },
    ] as any);
    vi.mocked(mockStorage.getPositionCompatibilities).mockResolvedValue(
      new Map([[100, { player_id: 100, best_pos: "ST" } as any]])
    );

    const res = await request(app).get("/api/teams/Barcelona/analysis");
    expect(res.status).toBe(200);
    expect(res.body.clubName).toBe("Barcelona");
    expect(res.body.analytics.playerCount).toBe(2);
    expect(res.body.players).toHaveLength(2);
    expect(res.body.players[0].compatibility).toBeDefined();
    expect(res.body.players[1].compatibility).toBeNull();
  });
});

// ----- Stats Routes -----

describe("GET /api/stats", () => {
  it("returns global statistics", async () => {
    const stats = { totalPlayers: 1000, totalTeams: 50, totalCompetitions: 10 };
    vi.mocked(mockStorage.getGlobalStats).mockResolvedValue(stats);

    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(stats);
  });

  it("sets no-cache headers", async () => {
    vi.mocked(mockStorage.getGlobalStats).mockResolvedValue({
      totalPlayers: 0,
      totalTeams: 0,
      totalCompetitions: 0,
    });

    const res = await request(app).get("/api/stats");
    expect(res.headers["cache-control"]).toBe("no-store, no-cache, must-revalidate");
  });
});

// ----- Favorites Routes -----

describe("POST /api/favorites/:playerId", () => {
  it("adds player to favorites", async () => {
    const player = { id: 1, player_id: 100, name: "Messi" };
    const favorite = { id: 1, user_id: 1, player_id: 1 };
    vi.mocked(mockStorage.getPlayerByPlayerId).mockResolvedValue(player as any);
    vi.mocked(mockStorage.addPlayerToFavorites).mockResolvedValue(favorite as any);

    const res = await request(app).post("/api/favorites/100");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Player added to favorites");
  });

  it("returns 404 when player not found", async () => {
    vi.mocked(mockStorage.getPlayerByPlayerId).mockResolvedValue(undefined);

    const res = await request(app).post("/api/favorites/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Player not found");
  });

  it("returns 400 for invalid player ID", async () => {
    const res = await request(app).post("/api/favorites/abc");
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/favorites/:playerId", () => {
  it("removes player from favorites", async () => {
    vi.mocked(mockStorage.removePlayerFromFavorites).mockResolvedValue();

    const res = await request(app).delete("/api/favorites/100");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Player removed from favorites");
  });
});

describe("GET /api/favorites", () => {
  it("returns user favorites", async () => {
    const favorites = [{ id: 1, player_id: 100, name: "Messi" }];
    vi.mocked(mockStorage.getUserFavorites).mockResolvedValue(favorites as any);

    const res = await request(app).get("/api/favorites");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Messi");
  });
});

describe("GET /api/favorites/:playerId/status", () => {
  it("returns favorite status", async () => {
    vi.mocked(mockStorage.isPlayerFavorited).mockResolvedValue(true);

    const res = await request(app).get("/api/favorites/100/status");
    expect(res.status).toBe(200);
    expect(res.body.isFavorited).toBe(true);
  });

  it("returns false when not favorited", async () => {
    vi.mocked(mockStorage.isPlayerFavorited).mockResolvedValue(false);

    const res = await request(app).get("/api/favorites/200/status");
    expect(res.status).toBe(200);
    expect(res.body.isFavorited).toBe(false);
  });
});
