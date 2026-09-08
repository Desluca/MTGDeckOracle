import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryCardDataSource } from "../../src/card-data/index.js";
import { CommanderSpellbookComboDataProvider, FileComboCache, createComboSeedCache } from "../../src/combo/index.js";
import { analyzeCommanderDeck } from "../../src/pipeline/index.js";
import { createCardMap } from "../utils/cardFactory.js";
import { stapleCards } from "../fixtures/cards/stapleCards.js";

let tempDirs: string[] = [];

describe("analyzeCommanderDeck", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("scores a real Kinnan list offline from seed combos without calling Spellbook", async () => {
    const rawText = await readFile(join(process.cwd(), "tests", "fixtures", "decks", "real", "kinnan-high-power.deck"), "utf8");
    const fetchFn = vi.fn();
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"), {
      seed: createComboSeedCache(),
      useSeedCatalog: true,
    });

    const result = await analyzeCommanderDeck({
      rawText,
      sourceUrl: "kinnan-high-power.deck",
      cardDataSource: new InMemoryCardDataSource(createCardMap(stapleCards)),
      comboDataProvider: new CommanderSpellbookComboDataProvider({ fetchFn, cache }),
      scoreNotes: "High-power del martedi, non cEDH.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // Combo-piece retagging can lift this one point above the scoring-only Kinnan benchmark.
    expect(result.report.score.finalScore).toBeGreaterThanOrEqual(86);
    expect(result.report.score.finalScore).toBeLessThanOrEqual(93);
    expect(result.report.score.commanderBracket).toBeGreaterThanOrEqual(4);
    expect(result.report.detectedCombos.map((combo) => combo.combo.id)).toEqual(
      expect.arrayContaining(["isochron-dramatic", "isochron-dramatic-ballista"]),
    );
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.report.explanation.scoreNotes).toContain("High-power del martedi, non cEDH.");
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-deck-oracle-pipeline-"));
  tempDirs.push(tempDir);
  return tempDir;
}
