import { describe, expect, it } from "vitest";

import { consistencyMultiplier, hypergeometricAtLeastOne } from "../../src/probability/index.js";

describe("hypergeometricAtLeastOne", () => {
  it("returns zero when there are no successes", () => {
    expect(hypergeometricAtLeastOne(100, 0, 10)).toBe(0);
  });

  it("returns one when every card is a success", () => {
    expect(hypergeometricAtLeastOne(100, 100, 10)).toBe(1);
  });

  it("estimates at least one success probability", () => {
    expect(hypergeometricAtLeastOne(100, 10, 10)).toBeCloseTo(0.6695, 4);
  });

  it("returns zero when draws, successes or population are empty", () => {
    expect(hypergeometricAtLeastOne(0, 10, 10)).toBe(0);
    expect(hypergeometricAtLeastOne(100, 10, 0)).toBe(0);
    expect(hypergeometricAtLeastOne(-5, 10, 10)).toBe(0);
  });

  it("returns one when the whole library is drawn", () => {
    expect(hypergeometricAtLeastOne(20, 3, 20)).toBe(1);
  });
});

describe("consistencyMultiplier", () => {
  it("does not penalize baseline deck size", () => {
    expect(consistencyMultiplier(100)).toBe(1);
  });

  it("normalizes larger deck sizes", () => {
    expect(consistencyMultiplier(200)).toBeCloseTo(0.3789, 4);
  });

  it("does not penalize decks smaller than the baseline", () => {
    expect(consistencyMultiplier(80)).toBe(1);
    expect(consistencyMultiplier(0)).toBe(0);
  });
});
