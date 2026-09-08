import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { enrichLeaderboardCards, RatingStore, type RatingCard, type RatingCardDetailsSource } from "../../src/rating-lab/index.js";

let tempDirs: string[] = [];

describe("enrichLeaderboardCards", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("replaces seed-only cards with fetched details and persists them", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    await store.applyRatingSeed("topCommanderStaples", "v1", [
      {
        normalizedName: "sol ring",
        name: "Sol Ring",
        rating: 2100,
      },
    ]);
    const detailsSource: RatingCardDetailsSource = {
      async findCardsByNames() {
        return [
          {
            id: "sol-ring",
            name: "Sol Ring",
            typeLine: "Artifact",
            manaValue: 1,
            imageUrl: "https://example.com/sol-ring.jpg",
            rating: 1500,
            wins: 0,
            losses: 0,
          },
        ];
      },
    };

    const leaderboard = await store.findLeaderboardCards(1, 100);
    const enrichedCards = await enrichLeaderboardCards(store, detailsSource, leaderboard.cards);

    expect(enrichedCards[0]).toMatchObject({
      id: "sol-ring",
      imageUrl: "https://example.com/sol-ring.jpg",
      rating: 2100,
    });
    expect(await store.findCard("sol-ring")).toMatchObject({
      imageUrl: "https://example.com/sol-ring.jpg",
      rating: 2100,
    });
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-leaderboard-enrichment-"));
  tempDirs.push(tempDir);
  return tempDir;
}
