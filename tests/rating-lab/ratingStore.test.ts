import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { RatingStore, type RatingCard } from "../../src/rating-lab/index.js";

let tempDirs: string[] = [];

describe("RatingStore", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("starts with an empty database", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));

    await expect(store.getDatabase()).resolves.toEqual({
      cards: {},
      comparisons: [],
    });
  });

  it("persists cards", async () => {
    const databasePath = join(await createTempDir(), "ratings.json");
    const store = new RatingStore(databasePath);

    await store.upsertCard(card("sol-ring", "Sol Ring"));

    const reloaded = new RatingStore(databasePath);
    await expect(reloaded.findCard("sol-ring")).resolves.toMatchObject({
      name: "Sol Ring",
      rating: 1500,
    });
  });

  it("preserves existing rating when upserting a seen card", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));

    await store.upsertCard(card("sol-ring", "Sol Ring"));
    await store.upsertCard(card("arcane-signet", "Arcane Signet"));
    await store.recordVote("sol-ring", "arcane-signet", "random");
    await store.upsertCard({ ...card("sol-ring", "Sol Ring"), rating: 1500 });

    expect((await store.findCard("sol-ring"))?.rating).toBeGreaterThan(1500);
  });

  it("records votes and updates Elo ratings", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));

    await store.upsertCard(card("sol-ring", "Sol Ring"));
    await store.upsertCard(card("arcane-signet", "Arcane Signet"));
    const comparison = await store.recordVote("sol-ring", "arcane-signet", "similar_rating");

    expect(comparison.strategy).toBe("similar_rating");
    expect((await store.findCard("sol-ring"))?.wins).toBe(1);
    expect((await store.findCard("arcane-signet"))?.losses).toBe(1);
  });

  it("stores anonymous visitor ids on comparisons", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));

    await store.upsertCard(card("sol-ring", "Sol Ring"));
    await store.upsertCard(card("arcane-signet", "Arcane Signet"));
    const comparison = await store.recordVote("sol-ring", "arcane-signet", "random", "visitor-123");

    expect(comparison.visitorId).toBe("visitor-123");
    expect((await store.getDatabase()).comparisons[0]?.visitorId).toBe("visitor-123");
  });

  it("applies rating seeds to existing and future cards", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));

    await store.upsertCard(card("sol-ring", "Sol Ring"));
    const applied = await store.applyRatingSeed("bestcard", "v1", [
      {
        normalizedName: "sol ring",
        name: "Sol Ring",
        rating: 2100,
      },
      {
        normalizedName: "arcane signet",
        name: "Arcane Signet",
        rating: 1800,
      },
    ]);

    await store.upsertCard(card("arcane-signet", "Arcane Signet"));

    expect(applied).toBe(true);
    expect((await store.findCard("sol-ring"))?.rating).toBe(2100);
    expect((await store.findCard("arcane-signet"))?.rating).toBe(1800);
  });

  it("does not apply the same seed version twice", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));

    await expect(store.applyRatingSeed("bestcard", "v1", [])).resolves.toBe(true);
    await expect(store.applyRatingSeed("bestcard", "v1", [])).resolves.toBe(false);
  });

  it("returns leaderboard cards sorted by rating with pagination", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));

    await store.upsertCard(card("middle", "Middle", 1700));
    await store.upsertCard(card("top", "Top", 1900));
    await store.upsertCard(card("bottom", "Bottom", 1400));

    const firstPage = await store.findLeaderboardCards(1, 2);
    const secondPage = await store.findLeaderboardCards(2, 2);

    expect(firstPage).toMatchObject({
      page: 1,
      pageSize: 2,
      totalCards: 3,
      totalPages: 2,
    });
    expect(firstPage.cards.map((card) => card.id)).toEqual(["top", "middle"]);
    expect(secondPage.cards.map((card) => card.id)).toEqual(["bottom"]);
  });
});

function card(id: string, name: string, rating = 1500): RatingCard {
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
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-rating-lab-"));
  tempDirs.push(tempDir);
  return tempDir;
}
