import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RatingStore, type RatingCard } from "../../src/rating-lab/index.js";
import { loadCardRatingProviderFromRatingStore } from "../../src/ratings/index.js";
import { createTestCard } from "../utils/cardFactory.js";

let tempDirs: string[] = [];

describe("loadCardRatingProviderFromRatingStore", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("loads Elo ratings collected by the rating lab", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    await store.upsertCard(card("sol-ring", "Sol Ring", 2100));

    const provider = await loadCardRatingProviderFromRatingStore(store);

    expect(provider.getEloRating(createTestCard({ name: "Sol Ring" }))).toBe(2100);
  });
});

function card(id: string, name: string, rating: number): RatingCard {
  return {
    id,
    name,
    typeLine: "Artifact",
    manaValue: 1,
    rating,
    wins: 0,
    losses: 0,
  };
}

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-rating-provider-"));
  tempDirs.push(tempDir);
  return tempDir;
}
