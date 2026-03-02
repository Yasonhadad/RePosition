import { describe, it, expect } from "vitest";
import { capitalizeName, getCompatibilityColor } from "./player-utils";

describe("capitalizeName", () => {
  it("capitalizes a single word", () => {
    expect(capitalizeName("messi")).toBe("Messi");
  });

  it("capitalizes multiple words", () => {
    expect(capitalizeName("lionel messi")).toBe("Lionel Messi");
  });

  it("lowercases already-capitalized words", () => {
    expect(capitalizeName("LIONEL MESSI")).toBe("Lionel Messi");
  });

  it("handles mixed case", () => {
    expect(capitalizeName("lIONEL mESSI")).toBe("Lionel Messi");
  });

  it("handles empty string", () => {
    expect(capitalizeName("")).toBe("");
  });

  it("handles single character", () => {
    expect(capitalizeName("m")).toBe("M");
  });
});

describe("getCompatibilityColor", () => {
  it("returns green gradient for score >= 90", () => {
    expect(getCompatibilityColor(95)).toBe("from-primary to-success");
    expect(getCompatibilityColor(90)).toBe("from-primary to-success");
  });

  it("returns blue gradient for score >= 80", () => {
    expect(getCompatibilityColor(85)).toBe("from-analytics to-primary");
    expect(getCompatibilityColor(80)).toBe("from-analytics to-primary");
  });

  it("returns accent gradient for score >= 70", () => {
    expect(getCompatibilityColor(75)).toBe("from-accent to-analytics");
    expect(getCompatibilityColor(70)).toBe("from-accent to-analytics");
  });

  it("returns gray gradient for score < 70", () => {
    expect(getCompatibilityColor(69)).toBe("from-gray-400 to-gray-500");
    expect(getCompatibilityColor(0)).toBe("from-gray-400 to-gray-500");
  });

  it("returns gray gradient for undefined score", () => {
    expect(getCompatibilityColor(undefined)).toBe("from-gray-400 to-gray-500");
  });

  it("returns gray gradient for zero score (falsy)", () => {
    expect(getCompatibilityColor(0)).toBe("from-gray-400 to-gray-500");
  });
});
