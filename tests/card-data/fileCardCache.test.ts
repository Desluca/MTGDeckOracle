import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { FileCardCache } from "../../src/card-data/index.js";
import { createCardMap, createTestCard } from "../utils/cardFactory.js";

let tempDirs: string[] = [];

describe("FileCardCache", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("returns undefined for missing cache files", async () => {
    const cache = new FileCardCache(join(await createTempDir(), "cards.json"));

    await expect(cache.get("sol ring")).resolves.toBeUndefined();
  });

  it("persists a card to disk", async () => {
    const cachePath = join(await createTempDir(), "nested", "cards.json");
    const cache = new FileCardCache(cachePath);
    const solRing = createTestCard({ name: "Sol Ring" });

    await cache.set("sol ring", solRing);

    const reloadedCache = new FileCardCache(cachePath);
    await expect(reloadedCache.get("sol ring")).resolves.toEqual(solRing);
  });

  it("persists many cards to disk", async () => {
    const cachePath = join(await createTempDir(), "cards.json");
    const cache = new FileCardCache(cachePath);
    const solRing = createTestCard({ name: "Sol Ring" });
    const arcaneSignet = createTestCard({ name: "Arcane Signet" });

    await cache.setMany(createCardMap([solRing, arcaneSignet]));

    const cards = await cache.getMany(["sol ring", "arcane signet", "missing"]);
    expect(cards.get("sol ring")).toEqual(solRing);
    expect(cards.get("arcane signet")).toEqual(arcaneSignet);
    expect(cards.has("missing")).toBe(false);
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-deck-oracle-"));
  tempDirs.push(tempDir);
  return tempDir;
}
