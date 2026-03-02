import { describe, it, expect } from "vitest";
import {
  searchFiltersSchema,
  loginSchema,
  registerSchema,
  insertPlayerSchema,
  insertClubSchema,
} from "./schema";

describe("searchFiltersSchema", () => {
  it("accepts empty filters", () => {
    const result = searchFiltersSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts valid name filter", () => {
    const result = searchFiltersSchema.parse({ name: "Messi" });
    expect(result.name).toBe("Messi");
  });

  it("accepts valid position filter", () => {
    const result = searchFiltersSchema.parse({ position: "ST" });
    expect(result.position).toBe("ST");
  });

  it("accepts combined filters", () => {
    const result = searchFiltersSchema.parse({
      name: "Messi",
      position: "RW",
      team: "Barcelona",
      country: "Spain",
      ageMin: 20,
      ageMax: 30,
    });
    expect(result.name).toBe("Messi");
    expect(result.ageMin).toBe(20);
    expect(result.ageMax).toBe(30);
  });

  it("accepts valid sortBy values", () => {
    for (const sortBy of ["compatibility", "overall", "age", "market_value"] as const) {
      const result = searchFiltersSchema.parse({ sortBy });
      expect(result.sortBy).toBe(sortBy);
    }
  });

  it("rejects invalid sortBy value", () => {
    expect(() => searchFiltersSchema.parse({ sortBy: "invalid" })).toThrow();
  });

  it("accepts valid compatPosition values", () => {
    for (const pos of ["ST", "LW", "RW", "CM", "CDM", "CAM", "LB", "RB", "CB"] as const) {
      const result = searchFiltersSchema.parse({ compatPosition: pos });
      expect(result.compatPosition).toBe(pos);
    }
  });

  it("rejects invalid compatPosition", () => {
    expect(() => searchFiltersSchema.parse({ compatPosition: "GK" })).toThrow();
  });

  it("accepts minCompatibility as number", () => {
    const result = searchFiltersSchema.parse({ minCompatibility: 75.5 });
    expect(result.minCompatibility).toBe(75.5);
  });
});

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.parse({ email: "user@test.com", password: "123456" });
    expect(result.email).toBe("user@test.com");
  });

  it("rejects invalid email", () => {
    expect(() => loginSchema.parse({ email: "not-email", password: "123456" })).toThrow();
  });

  it("rejects short password", () => {
    expect(() => loginSchema.parse({ email: "user@test.com", password: "12345" })).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => loginSchema.parse({})).toThrow();
    expect(() => loginSchema.parse({ email: "user@test.com" })).toThrow();
  });
});

describe("registerSchema", () => {
  it("accepts valid registration with matching passwords", () => {
    const result = registerSchema.parse({
      email: "user@test.com",
      password: "123456",
      confirmPassword: "123456",
    });
    expect(result.email).toBe("user@test.com");
  });

  it("rejects mismatched passwords", () => {
    expect(() =>
      registerSchema.parse({
        email: "user@test.com",
        password: "123456",
        confirmPassword: "654321",
      })
    ).toThrow();
  });

  it("accepts optional name fields", () => {
    const result = registerSchema.parse({
      email: "user@test.com",
      password: "123456",
      confirmPassword: "123456",
      firstName: "John",
      lastName: "Doe",
    });
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
  });
});

describe("insertPlayerSchema", () => {
  it("accepts valid player data with required fields", () => {
    const result = insertPlayerSchema.parse({
      player_id: 100,
      name: "Test Player",
    });
    expect(result.player_id).toBe(100);
    expect(result.name).toBe("Test Player");
  });

  it("accepts full player data with optional fields", () => {
    const result = insertPlayerSchema.parse({
      player_id: 100,
      name: "Test Player",
      position: "Attack",
      sub_position: "ST",
      age: 25,
      ovr: 85,
      height_in_cm: 180,
      foot: "Right",
    });
    expect(result.ovr).toBe(85);
    expect(result.sub_position).toBe("ST");
  });

  it("rejects missing required name", () => {
    expect(() => insertPlayerSchema.parse({ player_id: 100 })).toThrow();
  });

  it("rejects missing required player_id", () => {
    expect(() => insertPlayerSchema.parse({ name: "Test" })).toThrow();
  });
});

describe("insertClubSchema", () => {
  it("accepts valid club data", () => {
    const result = insertClubSchema.parse({
      club_id: 1,
      name: "FC Barcelona",
    });
    expect(result.club_id).toBe(1);
    expect(result.name).toBe("FC Barcelona");
  });

  it("accepts optional fields", () => {
    const result = insertClubSchema.parse({
      club_id: 1,
      name: "FC Barcelona",
      squad_size: 25,
      average_age: 26.5,
      coach_name: "Xavi",
    });
    expect(result.squad_size).toBe(25);
  });

  it("rejects missing required name", () => {
    expect(() => insertClubSchema.parse({ club_id: 1 })).toThrow();
  });
});
