import { describe, expect, it } from "vitest";

import { eloRatingToBasePowerRating, InMemoryCardRatingProvider } from "../../src/ratings/index.js";
import { createTestCard } from "../utils/cardFactory.js";

describe("eloRatingToBasePowerRating", () => {
  it("keeps 1500 close to the neutral 5 out of 10 rating", () => {
    expect(eloRatingToBasePowerRating(1500)).toBe(5);
  });

  it("clamps very low and very high Elo ratings", () => {
    expect(eloRatingToBasePowerRating(800)).toBe(0);
    expect(eloRatingToBasePowerRating(2200)).toBe(10);
  });
});

describe("InMemoryCardRatingProvider", () => {
  it("finds card ratings by normalized card name", () => {
    const provider = new InMemoryCardRatingProvider({
      "Sol Ring": 2100,
    });

    expect(provider.getEloRating(createTestCard({ name: "Sol Ring" }))).toBe(2100);
  });
});
