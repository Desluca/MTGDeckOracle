import { describe, expect, it } from "vitest";

import { CacheOnlyCardDataSource, InMemoryCardCache } from "../../src/card-data/index.js";
import { createTestCard } from "../utils/cardFactory.js";

describe("CacheOnlyCardDataSource", () => {
  it("returns only cards already in cache", async () => {
    const solRing = createTestCard({ name: "Sol Ring" });
    const cache = new InMemoryCardCache();
    await cache.set("sol ring", solRing);

    const source = new CacheOnlyCardDataSource(cache);
    const cards = await source.findCardsByNames(["Sol Ring", "Arcane Signet"]);

    expect(await source.findCardByName("Sol Ring")).toBe(solRing);
    expect(cards.get("sol ring")).toBe(solRing);
    expect(cards.has("arcane signet")).toBe(false);
  });

  it("resolves double-faced cards from a single-slash name or the back face", async () => {
    const pathway = createTestCard({
      name: "Brightclimb Pathway // Grimclimb Pathway",
      types: ["land"],
      typeLine: "Land // Land",
    });
    const cache = new InMemoryCardCache();
    await cache.set("brightclimb pathway // grimclimb pathway", pathway);
    const source = new CacheOnlyCardDataSource(cache);

    expect(await source.findCardByName("Brightclimb Pathway / Grimclimb Pathway")).toBe(pathway);
    expect(await source.findCardByName("Grimclimb Pathway")).toBe(pathway);
  });
});
