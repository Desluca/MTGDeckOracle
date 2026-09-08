import { describe, expect, it } from "vitest";

import { createComboSeedCache, indexCombosByCard, knownComboSeed } from "../../src/combo/index.js";
import { normalizeLookupName } from "../../src/card-data/index.js";

describe("knownComboSeed", () => {
  it("keeps unique ids and indexes every listed piece", () => {
    const ids = knownComboSeed.map((combo) => combo.id);
    expect(new Set(ids).size).toBe(ids.length);

    const byCard = indexCombosByCard();
    for (const combo of knownComboSeed) {
      for (const piece of combo.pieces) {
        const names = [piece.cardName, ...(piece.alternatives ?? [])];
        for (const name of names) {
          expect(byCard[normalizeLookupName(name)]?.some((candidate) => candidate.id === combo.id)).toBe(true);
        }
      }
    }
  });

  it("exposes the seed as an offline catalog without becoming the live Spellbook dump", () => {
    const cache = createComboSeedCache();

    expect(cache.catalog).toBe(knownComboSeed);
    expect(cache.catalog.length).toBeGreaterThanOrEqual(6);
    expect(cache.catalog.length).toBeLessThan(30);
    expect(cache.catalog.map((combo) => combo.id)).toEqual(
      expect.arrayContaining([
        "isochron-dramatic",
        "thoracle-consult",
        "breach-led-brain-freeze",
        "dualcaster-twinflame",
      ]),
    );
  });
});
