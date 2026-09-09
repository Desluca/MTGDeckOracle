import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryCardDataSource } from "../../src/card-data/index.js";
import { CommanderSpellbookComboDataProvider, FileComboCache, createComboSeedCache } from "../../src/combo/index.js";
import {
  MAX_DECKLIST_CHARS,
  analyzeDeckToHtml,
  extractDecklistFromRequestBody,
  renderAnalyzeFormPage,
  type AnalyzeDeckWebDependencies,
} from "../../src/deck-report/index.js";
import { createCardMap } from "../utils/cardFactory.js";
import { stapleCards } from "../fixtures/cards/stapleCards.js";

let tempDirs: string[] = [];

describe("deck-report web analysis", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  it("renders a paste form with a decklist textarea", () => {
    const html = renderAnalyzeFormPage();

    expect(html).toContain('action="/analyze"');
    expect(html).toContain('<textarea id="decklist" name="decklist"');
    expect(html).toContain("Non si importano URL");
  });

  it("extracts decklist from form and json bodies", () => {
    expect(extractDecklistFromRequestBody("application/x-www-form-urlencoded", "decklist=1+Sol+Ring")).toBe("1 Sol Ring");
    expect(extractDecklistFromRequestBody("application/json; charset=utf-8", JSON.stringify({ decklist: "1 Sol Ring" }))).toBe("1 Sol Ring");
    expect(extractDecklistFromRequestBody("application/json", JSON.stringify({}))).toBe("");
  });

  it("returns 400 when the pasted list is empty", async () => {
    const result = await analyzeDeckToHtml("  \n  ", await createDependencies());

    expect(result.statusCode).toBe(400);
    expect(result.html).toContain("Incolla una decklist testuale");
    expect(result.html).toContain('name="decklist"');
  });

  it("returns 413 when the pasted list is too long", async () => {
    const result = await analyzeDeckToHtml("x".repeat(MAX_DECKLIST_CHARS + 1), await createDependencies());

    expect(result.statusCode).toBe(413);
    expect(result.html).toContain("troppo lunga");
  });

  it("scores a real Kinnan list and shows the Italian report", async () => {
    const rawText = await readFile(join(process.cwd(), "tests", "fixtures", "decks", "real", "kinnan-high-power.deck"), "utf8");
    const result = await analyzeDeckToHtml(rawText, await createDependencies());

    expect(result.statusCode).toBe(200);
    expect(result.html).toContain("Report mazzo");
    expect(result.html).toContain("/100");
    expect(result.html).toContain("Curva di mana");
    expect(result.html).toContain("Punti forti");
    expect(result.html).toContain('href="/analyze"');
    expect(result.html).toMatch(/9[0-9]\/100|8[6-9]\/100/);
  });

  it("returns 422 when cards cannot be resolved", async () => {
    const result = await analyzeDeckToHtml(
      "Commander\n1 Completely Fake Commander Name\n\nDeck\n1 Totally Unknown Card Name\n",
      await createDependencies(),
    );

    expect(result.statusCode).toBe(422);
    expect(result.html).toContain("Carte non riconosciute");
    expect(result.html).toContain("Completely Fake Commander Name");
    expect(result.html).toContain('name="decklist"');
  });

  it("still returns a report when the list is illegal but resolved", async () => {
    const rawText = await readFile(join(process.cwd(), "tests", "fixtures", "decks", "real", "kinnan-illegal-size.deck"), "utf8");
    const result = await analyzeDeckToHtml(rawText, await createDependencies());

    expect(result.statusCode).toBe(200);
    expect(result.html).toContain("Errori di legalita'");
    expect(result.html).toContain("invalid_deck_size");
    expect(result.html).toContain("class=\"illegal\"");
  });
});

async function createDependencies(): Promise<AnalyzeDeckWebDependencies> {
  const fetchFn = vi.fn();
  const cache = new FileComboCache(join(await createTempDir(), "combos.json"), {
    seed: createComboSeedCache(),
    useSeedCatalog: true,
  });

  return {
    cardDataSource: new InMemoryCardDataSource(createCardMap(stapleCards)),
    comboDataProvider: new CommanderSpellbookComboDataProvider({ fetchFn, cache }),
  };
}

async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "mtg-deck-oracle-deck-report-"));
  tempDirs.push(tempDir);
  return tempDir;
}
