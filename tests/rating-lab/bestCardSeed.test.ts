import { describe, expect, it } from "vitest";

import { parseBestCardRanking, parseTopCommanderStaplesRanking } from "../../src/rating-lab/index.js";

describe("parseBestCardRanking", () => {
  it("filters non-card ranking lines and deduplicates card names at a fixed 1600 rating", () => {
    const seed = parseBestCardRanking(`
Sol Ring
Sol Ring
0,69 €
$2.99
83%
inclusion
8.27M decks
Arcane Signet
Swords to Plowshares
`);

    expect(seed).toEqual([
      {
        normalizedName: "sol ring",
        name: "Sol Ring",
        rating: 1600,
      },
      {
        normalizedName: "arcane signet",
        name: "Arcane Signet",
        rating: 1600,
      },
      {
        normalizedName: "swords to plowshares",
        name: "Swords to Plowshares",
        rating: 1600,
      },
    ]);
  });
});

describe("parseTopCommanderStaplesRanking", () => {
  it("scales ranked card names from 2100 to 1600", () => {
    const seed = parseTopCommanderStaplesRanking(`
Sol Ring
Arcane Signet
Swords to Plowshares
`);

    expect(seed).toEqual([
      {
        normalizedName: "sol ring",
        name: "Sol Ring",
        rating: 2100,
      },
      {
        normalizedName: "arcane signet",
        name: "Arcane Signet",
        rating: 1850,
      },
      {
        normalizedName: "swords to plowshares",
        name: "Swords to Plowshares",
        rating: 1600,
      },
    ]);
  });
});
