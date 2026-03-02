import { describe, it, expect } from "vitest";
import {
  parseCsvHeader,
  buildFallbackData,
  parseCompatibilityResults,
  parsePlayerId,
  parseFilters,
} from "./route-utils";

describe("parseCsvHeader", () => {
  it("maps column names to indices", () => {
    const csv = "player_id,name,position\n1,Messi,RW";
    const map = parseCsvHeader(csv);
    expect(map).toEqual({ player_id: 0, name: 1, position: 2 });
  });

  it("trims whitespace from headers", () => {
    const csv = " player_id , name , position \n1,Messi,RW";
    const map = parseCsvHeader(csv);
    expect(map).toEqual({ player_id: 0, name: 1, position: 2 });
  });

  it("handles single column", () => {
    const csv = "player_id\n1";
    const map = parseCsvHeader(csv);
    expect(map).toEqual({ player_id: 0 });
  });

  it("skips empty lines", () => {
    const csv = "\nplayer_id,name\n\n1,Messi\n";
    const map = parseCsvHeader(csv);
    expect(map).toEqual({ player_id: 0, name: 1 });
  });
});

describe("buildFallbackData", () => {
  it("extracts player_id, name, and sub_position from CSV", () => {
    const csv = "player_id,name,sub_position\n100,Messi,RW\n200,Ronaldo,ST";
    const result = buildFallbackData(csv);
    expect(result[100]).toEqual({ name: "Messi", natural_pos: "RW" });
    expect(result[200]).toEqual({ name: "Ronaldo", natural_pos: "ST" });
  });

  it("returns empty object when no player_id column", () => {
    const csv = "name,position\nMessi,RW";
    const result = buildFallbackData(csv);
    expect(result).toEqual({});
  });

  it("sets null for missing columns", () => {
    const csv = "player_id\n100";
    const result = buildFallbackData(csv);
    expect(result[100]).toEqual({ name: null, natural_pos: null });
  });

  it("skips rows with invalid player_id", () => {
    const csv = "player_id,name\nabc,Test\n100,Valid";
    const result = buildFallbackData(csv);
    expect(result["abc" as any]).toBeUndefined();
    expect(result[100]).toBeDefined();
  });
});

describe("parseCompatibilityResults", () => {
  const outputCsv = [
    "player_id,name,natural_pos,best_pos,best_fit_score,st_fit,lw_fit,rw_fit,cm_fit,cdm_fit,cam_fit,lb_fit,rb_fit,cb_fit",
    "100,Messi,RW,RW,95.5,80.1,90.2,95.5,70.0,50.0,85.0,30.0,35.0,20.0",
  ].join("\n");

  it("parses compatibility scores from CSV output", () => {
    const results = parseCompatibilityResults(outputCsv, {});
    expect(results).toHaveLength(1);
    expect(results[0].player_id).toBe(100);
    expect(results[0].name).toBe("Messi");
    expect(results[0].status).toBe("ok");
    expect(results[0].compatibility.best_pos).toBe("RW");
    expect(results[0].compatibility.best_fit_score).toBe(95.5);
    expect(results[0].compatibility.st_fit).toBe(80.1);
  });

  it("falls back to input data when output columns are missing", () => {
    const minimalOutput = "player_id,best_pos,best_fit_score,st_fit,lw_fit,rw_fit,cm_fit,cdm_fit,cam_fit,lb_fit,rb_fit,cb_fit\n100,RW,95.5,80,90,95,70,50,85,30,35,20";
    const inputById = { 100: { name: "Messi", natural_pos: "RW" } };
    const results = parseCompatibilityResults(minimalOutput, inputById);
    expect(results[0].name).toBe("Messi");
    expect(results[0].natural_pos).toBe("RW");
  });

  it("handles multiple rows", () => {
    const multiRow = [
      "player_id,best_pos,best_fit_score,st_fit,lw_fit,rw_fit,cm_fit,cdm_fit,cam_fit,lb_fit,rb_fit,cb_fit",
      "100,RW,95,80,90,95,70,50,85,30,35,20",
      "200,ST,92,92,60,65,40,30,50,20,25,15",
    ].join("\n");
    const results = parseCompatibilityResults(multiRow, {});
    expect(results).toHaveLength(2);
    expect(results[0].player_id).toBe(100);
    expect(results[1].player_id).toBe(200);
  });
});

describe("parsePlayerId", () => {
  it("parses valid id param", () => {
    expect(parsePlayerId({ id: "123" })).toBe(123);
  });

  it("parses valid playerId param", () => {
    expect(parsePlayerId({ playerId: "456" })).toBe(456);
  });

  it("prefers playerId over id", () => {
    expect(parsePlayerId({ playerId: "456", id: "123" })).toBe(456);
  });

  it("returns null for non-numeric values", () => {
    expect(parsePlayerId({ id: "abc" })).toBeNull();
  });

  it("returns null for empty params", () => {
    expect(parsePlayerId({})).toBeNull();
  });
});

describe("parseFilters", () => {
  it("returns default page and pageSize", () => {
    const result = parseFilters({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(0);
  });

  it("parses page and pageSize from string query params", () => {
    const result = parseFilters({ page: "3", pageSize: "20" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(20);
  });

  it("converts ageMin and ageMax to numbers", () => {
    const result = parseFilters({ ageMin: "20", ageMax: "30" });
    expect(result.filters.ageMin).toBe(20);
    expect(result.filters.ageMax).toBe(30);
  });

  it("converts minCompatibility to float", () => {
    const result = parseFilters({ minCompatibility: "75.5" });
    expect(result.filters.minCompatibility).toBe(75.5);
  });

  it("strips page/pageSize from returned filters", () => {
    const result = parseFilters({ page: "2", pageSize: "10", name: "Messi" });
    expect(result.filters).not.toHaveProperty("page");
    expect(result.filters).not.toHaveProperty("pageSize");
    expect(result.filters.name).toBe("Messi");
  });

  it("passes through name filter as-is", () => {
    const result = parseFilters({ name: "Mbappé" });
    expect(result.filters.name).toBe("Mbappé");
  });
});
