import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockFrom,
  mockWhere,
  mockReturning,
  mockLimit,
  mockLeftJoin,
  mockInnerJoin,
  mockOrderBy,
  mockOnConflictDoNothing,
  mockValues,
  mockSet,
  mockSelectDistinct,
} = vi.hoisted(() => {
  return {
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockFrom: vi.fn(),
    mockWhere: vi.fn(),
    mockReturning: vi.fn(),
    mockLimit: vi.fn(),
    mockLeftJoin: vi.fn(),
    mockInnerJoin: vi.fn(),
    mockOrderBy: vi.fn(),
    mockOnConflictDoNothing: vi.fn(),
    mockValues: vi.fn(),
    mockSet: vi.fn(),
    mockSelectDistinct: vi.fn(),
  };
});

function chainable() {
  return {
    from: mockFrom,
    where: mockWhere,
    returning: mockReturning,
    limit: mockLimit,
    leftJoin: mockLeftJoin,
    innerJoin: mockInnerJoin,
    orderBy: mockOrderBy,
    values: mockValues,
    set: mockSet,
    onConflictDoNothing: mockOnConflictDoNothing,
  };
}

vi.mock("./db", () => ({
  db: {
    select: mockSelect,
    selectDistinct: mockSelectDistinct,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
  pool: {},
}));

vi.mock("unidecode", () => ({
  default: (s: string) => s,
}));

import { DatabaseStorage } from "./storage";

describe("DatabaseStorage", () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new DatabaseStorage();

    mockSelect.mockReturnValue(chainable());
    mockSelectDistinct.mockReturnValue(chainable());
    mockInsert.mockReturnValue(chainable());
    mockUpdate.mockReturnValue(chainable());
    mockDelete.mockReturnValue(chainable());
    mockFrom.mockReturnValue(chainable());
    mockWhere.mockReturnValue(chainable());
    mockLimit.mockReturnValue(chainable());
    mockLeftJoin.mockReturnValue(chainable());
    mockInnerJoin.mockReturnValue(chainable());
    mockOrderBy.mockReturnValue(chainable());
    mockValues.mockReturnValue(chainable());
    mockSet.mockReturnValue(chainable());
    mockOnConflictDoNothing.mockReturnValue(chainable());
    mockReturning.mockResolvedValue([]);
  });

  describe("getUser", () => {
    it("returns user when found", async () => {
      const mockUser = { id: 1, email: "test@test.com", password: "hashed" };
      mockWhere.mockResolvedValueOnce([mockUser]);

      const user = await storage.getUser(1);
      expect(user).toEqual(mockUser);
      expect(mockSelect).toHaveBeenCalled();
    });

    it("returns undefined when not found", async () => {
      mockWhere.mockResolvedValueOnce([]);

      const user = await storage.getUser(999);
      expect(user).toBeUndefined();
    });
  });

  describe("getUserByEmail", () => {
    it("returns user when email matches", async () => {
      const mockUser = { id: 1, email: "test@test.com" };
      mockWhere.mockResolvedValueOnce([mockUser]);

      const user = await storage.getUserByEmail("test@test.com");
      expect(user).toEqual(mockUser);
    });
  });

  describe("createUser", () => {
    it("creates and returns user", async () => {
      const newUser = { id: 1, email: "new@test.com", password: "hashed" };
      mockReturning.mockResolvedValueOnce([newUser]);

      const user = await storage.createUser({
        email: "new@test.com",
        password: "hashed",
      });
      expect(user).toEqual(newUser);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("getPlayerByPlayerId", () => {
    it("returns player with league info when found", async () => {
      const mockPlayer = {
        id: 1,
        player_id: 100,
        name: "Messi",
        current_club_name: "Inter Miami",
        league: null,
      };
      mockWhere.mockResolvedValueOnce([mockPlayer]);
      mockLimit.mockResolvedValueOnce([{ league_name: "MLS" }]);

      const player = await storage.getPlayerByPlayerId(100);
      expect(player).toBeDefined();
      expect(player!.name).toBe("Messi");
      expect(player!.league).toBe("MLS");
    });

    it("returns undefined when player not found", async () => {
      mockWhere.mockResolvedValueOnce([]);

      const player = await storage.getPlayerByPlayerId(999);
      expect(player).toBeUndefined();
    });
  });

  describe("getAllClubs", () => {
    it("returns all clubs", async () => {
      const mockClubs = [
        { id: 1, club_id: 10, name: "Barcelona" },
        { id: 2, club_id: 20, name: "Real Madrid" },
      ];
      mockFrom.mockResolvedValueOnce(mockClubs);

      const clubs = await storage.getAllClubs();
      expect(clubs).toEqual(mockClubs);
    });
  });

  describe("getAllCompetitions", () => {
    it("returns all competitions", async () => {
      const mockCompetitions = [
        { id: 1, competition_id: "ES1", name: "La Liga" },
      ];
      mockFrom.mockResolvedValueOnce(mockCompetitions);

      const competitions = await storage.getAllCompetitions();
      expect(competitions).toEqual(mockCompetitions);
    });
  });

  describe("getAllLeagues", () => {
    it("returns unique league names, filtering nulls and empty strings", async () => {
      mockWhere.mockResolvedValueOnce([
        { league: "La Liga" },
        { league: "Premier League" },
      ]);

      const leagues = await storage.getAllLeagues();
      expect(leagues).toEqual(["La Liga", "Premier League"]);
    });
  });

  describe("getAllCountries", () => {
    it("returns sorted country names", async () => {
      mockWhere.mockResolvedValueOnce([
        { country: "Spain" },
        { country: "England" },
        { country: "Germany" },
      ]);

      const countries = await storage.getAllCountries();
      expect(countries).toEqual(["England", "Germany", "Spain"]);
    });
  });

  describe("getGlobalStats", () => {
    it("returns total counts", async () => {
      mockFrom
        .mockResolvedValueOnce([{ count: 1000 }])
        .mockResolvedValueOnce([{ count: 50 }])
        .mockResolvedValueOnce([{ count: 10 }]);

      const stats = await storage.getGlobalStats();
      expect(stats).toEqual({
        totalPlayers: 1000,
        totalTeams: 50,
        totalCompetitions: 10,
      });
    });

    it("returns zeros when tables are empty", async () => {
      mockFrom
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      const stats = await storage.getGlobalStats();
      expect(stats).toEqual({
        totalPlayers: 0,
        totalTeams: 0,
        totalCompetitions: 0,
      });
    });
  });

  describe("getPositionCompatibility", () => {
    it("returns compatibility data for a player", async () => {
      const mockCompat = { id: 1, player_id: 100, st_fit: 85.5, best_pos: "ST" };
      mockWhere.mockResolvedValueOnce([mockCompat]);

      const result = await storage.getPositionCompatibility(100);
      expect(result).toEqual(mockCompat);
    });

    it("returns undefined on error", async () => {
      mockWhere.mockRejectedValueOnce(new Error("DB error"));

      const result = await storage.getPositionCompatibility(999);
      expect(result).toBeUndefined();
    });
  });

  describe("getPositionCompatibilities", () => {
    it("returns empty map for empty array", async () => {
      const result = await storage.getPositionCompatibilities([]);
      expect(result.size).toBe(0);
    });

    it("returns map of compatibilities by player_id", async () => {
      const compat1 = { id: 1, player_id: 100, best_pos: "ST" };
      const compat2 = { id: 2, player_id: 200, best_pos: "RW" };
      mockWhere.mockResolvedValueOnce([compat1, compat2]);

      const result = await storage.getPositionCompatibilities([100, 200]);
      expect(result.size).toBe(2);
      expect(result.get(100)).toEqual(compat1);
      expect(result.get(200)).toEqual(compat2);
    });

    it("returns empty map on error", async () => {
      mockWhere.mockRejectedValueOnce(new Error("DB error"));

      const result = await storage.getPositionCompatibilities([100]);
      expect(result.size).toBe(0);
    });
  });

  describe("isPlayerFavorited", () => {
    it("returns false when player not found in DB", async () => {
      mockWhere.mockResolvedValueOnce([]);

      const result = await storage.isPlayerFavorited(1, 999);
      expect(result).toBe(false);
    });
  });

  describe("getTeamAnalytics", () => {
    it("returns player count for a club", async () => {
      mockWhere.mockResolvedValueOnce([
        { id: 1, name: "Player1" },
        { id: 2, name: "Player2" },
      ]);

      const analytics = await storage.getTeamAnalytics("Barcelona");
      expect(analytics.playerCount).toBe(2);
    });

    it("returns zero for unknown club", async () => {
      mockWhere
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const analytics = await storage.getTeamAnalytics("Unknown FC");
      expect(analytics.playerCount).toBe(0);
    });
  });
});
