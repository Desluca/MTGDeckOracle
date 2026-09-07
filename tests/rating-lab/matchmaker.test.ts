import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { createCardMatch, RatingStore, type RandomCardSource, type RatingCard } from "../../src/rating-lab/index.js";

let tempDirs: string[] = [];

describe("createCardMatch", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("creates a random match when similar rating is disabled", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    const source = sequenceSource([card("a", "Card A"), card("b", "Card B")]);

    const match = await createCardMatch(store, source, { similarRatingChance: 0 });

    expect(match.strategy).toBe("random");
    expect(match.left.id).toBe("a");
    expect(match.right.id).toBe("b");
  });

  it("uses a similarly rated stored card when available", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    await store.upsertCard(card("target", "Target", 1700));
    await store.upsertCard(card("same-rating", "Same Rating", 1700));
    await store.upsertCard(card("outside-range", "Outside Range", 1900));
    const source = sequenceSource([]);

    const match = await createCardMatch(store, source, {
      similarRatingChance: 1,
      randomFn: sequenceRandom([0, 0, 0, 0]),
    });

    expect(match.strategy).toBe("similar_rating");
    expect(match.left.id).toBe("target");
    expect(match.right.id).toBe("same-rating");
  });

  it("can start from the high-rated pool", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    await store.upsertCard(card("high", "High", 1700));
    await store.upsertCard(card("low", "Low", 1400));
    const source = sequenceSource([card("random", "Random")]);

    const match = await createCardMatch(store, source, {
      similarRatingChance: 0,
      randomFn: sequenceRandom([0, 0, 1]),
    });

    expect(match.left.id).toBe("high");
    expect(match.right.id).toBe("random");
  });

  it("can start from the low-rated pool", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    await store.upsertCard(card("high", "High", 1700));
    await store.upsertCard(card("low", "Low", 1400));
    const source = sequenceSource([card("random", "Random")]);

    const match = await createCardMatch(store, source, {
      similarRatingChance: 0,
      randomFn: sequenceRandom([0.9, 0, 1]),
    });

    expect(match.left.id).toBe("low");
    expect(match.right.id).toBe("random");
  });

  it("includes exactly 1500-rated cards in the low-rated pool", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    await store.upsertCard(card("baseline", "Baseline", 1500));
    await store.upsertCard(card("high", "High", 1700));
    const source = sequenceSource([card("random", "Random")]);

    const match = await createCardMatch(store, source, {
      similarRatingChance: 0,
      randomFn: sequenceRandom([0.9, 0, 1]),
    });

    expect(match.left.id).toBe("baseline");
    expect(match.right.id).toBe("random");
  });

  it("can force the first card from weak, medium, or strong pools", async () => {
    const store = new RatingStore(join(await createTempDir(), "ratings.json"));
    await store.upsertCard(card("weak", "Weak", 1499));
    await store.upsertCard(card("medium", "Medium", 1600));
    await store.upsertCard(card("strong", "Strong", 1701));
    const source = sequenceSource([card("random-a", "Random A"), card("random-b", "Random B"), card("random-c", "Random C")]);

    const weakMatch = await createCardMatch(store, source, {
      firstCardRatingPool: "weak",
      similarRatingChance: 0,
      randomFn: sequenceRandom([0, 0, 1]),
    });
    const mediumMatch = await createCardMatch(store, source, {
      firstCardRatingPool: "medium",
      similarRatingChance: 0,
      randomFn: sequenceRandom([0, 0, 1]),
    });
    const strongMatch = await createCardMatch(store, source, {
      firstCardRatingPool: "strong",
      similarRatingChance: 0,
      randomFn: sequenceRandom([0, 0, 1]),
    });

    expect(weakMatch.left.id).toBe("weak");
    expect(mediumMatch.left.id).toBe("medium");
    expect(strongMatch.left.id).toBe("strong");
  });
});

function sequenceSource(cards: readonly RatingCard[]): RandomCardSource {
  let index = 0;

  return {
    async getRandomCard() {
      const cardToReturn = cards[index];
      if (!cardToReturn) {
        throw new Error("No more cards in test source.");
      }

      index += 1;
      return cardToReturn;
    },
  };
}

function sequenceRandom(values: readonly number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index];

    if (value === undefined) {
      return 0;
    }

    index += 1;
    return value;
  };
}

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
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-matchmaker-"));
  tempDirs.push(tempDir);
  return tempDir;
}
