import { describe, expect, it, vi } from "vitest";

import { CachedCardDataSource, InMemoryCardCache, type CardDataSource } from "../../src/card-data/index.js";
import type { Card } from "../../src/domain/index.js";
import { createCardMap, createTestCard } from "../utils/cardFactory.js";

describe("CachedCardDataSource", () => {
  it("returns cards from cache before calling the source", async () => {
    const solRing = createTestCard({ name: "Sol Ring" });
    const cache = new InMemoryCardCache();
    await cache.set("sol ring", solRing);

    const source: CardDataSource = {
      findCardByName: vi.fn(),
      findCardsByNames: vi.fn(),
    };

    const cachedSource = new CachedCardDataSource(source, cache);
    const card = await cachedSource.findCardByName("Sol Ring");

    expect(card).toBe(solRing);
    expect(source.findCardByName).not.toHaveBeenCalled();
  });

  it("stores cards fetched by single-card lookup", async () => {
    const solRing = createTestCard({ name: "Sol Ring" });
    const cache = new InMemoryCardCache();
    const source: CardDataSource = {
      findCardByName: vi.fn(async () => solRing),
      findCardsByNames: vi.fn(),
    };

    const cachedSource = new CachedCardDataSource(source, cache);

    await expect(cachedSource.findCardByName("Sol Ring")).resolves.toBe(solRing);
    await expect(cachedSource.findCardByName("Sol Ring")).resolves.toBe(solRing);
    expect(source.findCardByName).toHaveBeenCalledTimes(1);
  });

  it("fetches only missing cards in batch lookup", async () => {
    const solRing = createTestCard({ name: "Sol Ring" });
    const arcaneSignet = createTestCard({ name: "Arcane Signet" });
    const cache = new InMemoryCardCache();
    await cache.set("sol ring", solRing);

    const source: CardDataSource = {
      findCardByName: vi.fn(),
      findCardsByNames: vi.fn(async (names: readonly string[]): Promise<ReadonlyMap<string, Card>> => {
        expect(names).toEqual(["arcane signet"]);
        return createCardMap([arcaneSignet]);
      }),
    };

    const cachedSource = new CachedCardDataSource(source, cache);
    const cards = await cachedSource.findCardsByNames(["Sol Ring", "Arcane Signet"]);

    expect(cards.get("sol ring")).toBe(solRing);
    expect(cards.get("arcane signet")).toBe(arcaneSignet);
    expect(source.findCardsByNames).toHaveBeenCalledTimes(1);
  });
});
