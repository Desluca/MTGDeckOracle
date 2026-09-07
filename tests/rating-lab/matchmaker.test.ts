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
    await store.upsertCard(card("seed-a", "Seed A"));
    await store.upsertCard(card("seed-b", "Seed B"));
    await store.recordVote("seed-a", "seed-b", "random");
    const source = sequenceSource([card("new", "New Card")]);

    const match = await createCardMatch(store, source, {
      similarRatingChance: 1,
      randomFn: () => 0,
    });

    expect(match.strategy).toBe("similar_rating");
    expect(match.left.id).toBe("new");
    expect(["seed-a", "seed-b"]).toContain(match.right.id);
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

function card(id: string, name: string): RatingCard {
  return {
    id,
    name,
    typeLine: "Artifact",
    manaValue: 1,
    rating: 1500,
    wins: 0,
    losses: 0,
  };
}

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-matchmaker-"));
  tempDirs.push(tempDir);
  return tempDir;
}
