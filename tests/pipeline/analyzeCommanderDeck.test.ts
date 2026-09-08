import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryCardDataSource } from "../../src/card-data/index.js";
import { CommanderSpellbookComboDataProvider, FileComboCache, createComboSeedCache } from "../../src/combo/index.js";
import { analyzeCommanderDeck } from "../../src/pipeline/index.js";
import { scoreCommanderDeck } from "../../src/scoring/index.js";
import { scoringBenchmarks } from "../fixtures/benchmarks/benchmarkDecks.js";
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

    expect(result.report.score.finalScore).toBeGreaterThanOrEqual(86);
    expect(result.report.score.finalScore).toBeLessThanOrEqual(93);
    expect(result.report.score.commanderBracket).toBeGreaterThanOrEqual(4);
    expect(result.report.detectedCombos.map((combo) => combo.combo.id)).toEqual(
      expect.arrayContaining(["isochron-dramatic", "isochron-dramatic-ballista"]),
    );
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.report.explanation.scoreNotes).toContain("High-power del martedi, non cEDH.");

    const fixture = scoringBenchmarks.find((benchmark) => benchmark.id === "real_kinnan_high_power");
    expect(fixture).toBeDefined();
    const fixtureScore = scoreCommanderDeck({
      deck: fixture!.deck,
      legality: fixture!.legality,
      ...(fixture!.comboEvaluations ? { comboEvaluations: fixture!.comboEvaluations } : {}),
      ...(fixture!.detectedCombos ? { detectedCombos: fixture!.detectedCombos } : {}),
    });
    expect(result.report.score.finalScore).toBe(fixtureScore.finalScore);
    expect(result.report.score.commanderBracket).toBe(fixtureScore.commanderBracket);
  });

  it("scores a real Kess list from the expanded seed catalog without calling Spellbook", async () => {
    const rawText = await readFile(join(process.cwd(), "tests", "fixtures", "decks", "real", "kess-spellslinger.deck"), "utf8");
    const fetchFn = vi.fn();
    const cache = new FileComboCache(join(await createTempDir(), "combos.json"), {
      seed: createComboSeedCache(),
      useSeedCatalog: true,
    });

    const result = await analyzeCommanderDeck({
      rawText,
      sourceUrl: "kess-spellslinger.deck",
      cardDataSource: new InMemoryCardDataSource(createCardMap(stapleCards)),
      comboDataProvider: new CommanderSpellbookComboDataProvider({ fetchFn, cache }),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.report.score.finalScore).toBeGreaterThanOrEqual(80);
    expect(result.report.score.finalScore).toBeLessThanOrEqual(93);
    expect(result.report.score.commanderBracket).toBe(4);
    expect(result.report.detectedCombos.map((combo) => combo.combo.id)).toEqual(
      expect.arrayContaining(["isochron-dramatic", "breach-led-brain-freeze", "dualcaster-twinflame"]),
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-deck-oracle-pipeline-"));
  tempDirs.push(tempDir);
  return tempDir;
}
