import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommanderSpellbookComboDataProvider, FileComboCache, createComboSeedCache } from "../../src/combo/index.js";
import type { KnownCombo } from "../../src/domain/index.js";

let tempDirs: string[] = [];

describe("FileComboCache", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("returns undefined when the catalog file is missing", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"));

    await expect(cache.getCatalog()).resolves.toBeUndefined();
  });

  it("persists a catalog and per-card combos", async () => {
    const cachePath = join(await createTempDir(), "nested", "combos.json");
    const cache = new FileComboCache(cachePath);
    const combo = sampleCombo("combo-1", ["Isochron Scepter"]);

    await cache.setCatalog([combo]);
    await cache.setManyByCard(new Map([["isochron scepter", [combo]]]));

    const reloaded = new FileComboCache(cachePath);
    await expect(reloaded.getCatalog()).resolves.toEqual([combo]);
    const byCard = await reloaded.getManyByCard(["isochron scepter", "missing"]);
    expect(byCard.found.get("isochron scepter")).toEqual([combo]);
    expect(byCard.missing).toEqual(["missing"]);
  });

  it("falls back to seed byCard entries when the disk cache is empty", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"), {
      seed: createComboSeedCache(),
    });

    await expect(cache.getCatalog()).resolves.toBeUndefined();
    const byCard = await cache.getManyByCard(["isochron scepter", "missing"]);
    expect(byCard.found.get("isochron scepter")?.map((combo) => combo.id)).toEqual(
      expect.arrayContaining(["isochron-dramatic", "isochron-dramatic-ballista"]),
    );
    expect(byCard.missing).toEqual(["missing"]);
  });

  it("uses the seed catalog only when requested", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"), {
      seed: createComboSeedCache(),
      useSeedCatalog: true,
    });

    const catalog = await cache.getCatalog();
    expect(catalog?.map((combo) => combo.id)).toEqual(
      expect.arrayContaining(["isochron-dramatic", "thoracle-consult"]),
    );
  });
});

describe("CommanderSpellbookComboDataProvider cache", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("filters a cached catalog without calling the API", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"));
    await cache.setCatalog([
      sampleCombo("combo-1", ["Isochron Scepter", "Dramatic Reversal"]),
      sampleCombo("combo-2", ["Thassa's Oracle"]),
    ]);
    const fetchFn = vi.fn();
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn, cache });

    const combos = await provider.findCombosForCards(["Isochron Scepter"]);

    expect(combos.map((combo) => combo.id)).toEqual(["combo-1"]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("stores per-card results so a second lookup skips the network", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"));
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              id: "combo-1",
              uses: [{ card: { name: "Isochron Scepter" } }, { card: { name: "Dramatic Reversal" } }],
              produces: [{ feature: { name: "Infinite mana" } }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn, cache });

    await provider.findCombosForCards(["Isochron Scepter"]);
    const combos = await provider.findCombosForCards(["Isochron Scepter"]);

    expect(combos).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns a cached catalog from findAllCombos unless refresh is requested", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"));
    await cache.setCatalog([sampleCombo("cached", ["Sol Ring"])]);
    const fetchFn = vi.fn();
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn, cache });

    const cached = await provider.findAllCombos();
    expect(cached.map((combo) => combo.id)).toEqual(["cached"]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("skips the network when seed byCard already has the card", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"), {
      seed: createComboSeedCache(),
    });
    const fetchFn = vi.fn();
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn, cache });

    const combos = await provider.findCombosForCards(["Isochron Scepter"]);

    expect(combos.map((combo) => combo.id)).toEqual(
      expect.arrayContaining(["isochron-dramatic", "isochron-dramatic-ballista"]),
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("uses the seed catalog offline without calling the API", async () => {
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"), {
      seed: createComboSeedCache(),
      useSeedCatalog: true,
    });
    const fetchFn = vi.fn();
    const provider = new CommanderSpellbookComboDataProvider({ fetchFn, cache });

    const combos = await provider.findCombosForCards(["Isochron Scepter"]);

    expect(combos.map((combo) => combo.id)).toEqual(
      expect.arrayContaining(["isochron-dramatic", "isochron-dramatic-ballista"]),
    );
    expect(combos.some((combo) => combo.id === "thoracle-consult")).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-deck-oracle-combo-"));
  tempDirs.push(tempDir);
  return tempDir;
}

function sampleCombo(id: string, cardNames: readonly string[]): KnownCombo {
  return {
    id,
    name: cardNames.join(" + "),
    source: "commander_spellbook",
    pieces: cardNames.map((cardName) => ({ cardName, required: true })),
    outcomes: ["value_engine"],
  };
}
