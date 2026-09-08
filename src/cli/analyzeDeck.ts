import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { CachedCardDataSource, CacheOnlyCardDataSource, FileCardCache, ScryfallCardDataSource } from "../card-data/index.js";
import { parseAnalyzeDeckCliOptions } from "./cliOptions.js";
import { CommanderSpellbookComboDataProvider, FileComboCache, createComboSeedCache } from "../combo/index.js";
import { analyzeCommanderDeck } from "../pipeline/index.js";
import { createRatingStore } from "../rating-lab/index.js";
import { loadCardRatingProviderFromRatingStore } from "../ratings/index.js";
import { renderReport } from "../report/index.js";
import { FileCardTagProvider } from "../tagging/index.js";

async function main(): Promise<void> {
  const options = parseAnalyzeDeckCliOptions(process.argv.slice(2));

  if (!options.deckFilePath) {
    console.error("Usage: npm run analyze -- <decklist-file> [--format json|markdown|html] [--offline] [--notes \"text\"]");
    process.exitCode = 1;
    return;
  }

  const rawText = await readFile(options.deckFilePath, "utf8");
  const offline = options.offline || process.env.MTG_DECK_ORACLE_OFFLINE === "1";
  const cardCache = new FileCardCache(join(process.cwd(), ".cache", "scryfall-cards.json"));
  const tagProvider = await loadOptionalCardTagProvider();
  const ratingProvider = await loadOptionalRatingProvider(options.cardRatings);
  const result = await analyzeCommanderDeck({
    rawText,
    sourceUrl: options.deckFilePath,
    cardDataSource: offline
      ? new CacheOnlyCardDataSource(cardCache)
      : new CachedCardDataSource(new ScryfallCardDataSource(), cardCache),
    comboDataProvider: new CommanderSpellbookComboDataProvider({
      cache: new FileComboCache(join(process.cwd(), ".cache", "commander-spellbook-combos.json"), {
        seed: createComboSeedCache(),
        useSeedCatalog: offline,
      }),
    }),
    ...(tagProvider ? { tagProvider } : {}),
    ...(ratingProvider ? { ratingProvider } : {}),
    ...(options.scoreNotes ? { scoreNotes: options.scoreNotes } : {}),
  });

  if (!result.ok) {
    console.log(JSON.stringify({ parsedDeck: result.parsedDeck, legality: result.legality, unresolvedNames: result.unresolvedNames }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(renderReport(result.report, options.format));
}

await main();

async function loadOptionalRatingProvider(cardRatingsMode: "auto" | "off") {
  if (cardRatingsMode === "off") {
    return undefined;
  }

  try {
    return await loadCardRatingProviderFromRatingStore(createRatingStore());
  } catch (error) {
    console.warn(`Could not load Rating Lab card ratings, using default card ratings. ${error instanceof Error ? error.message : ""}`);
    return undefined;
  }
}

async function loadOptionalCardTagProvider(): Promise<FileCardTagProvider | undefined> {
  const externalTagsPath = join(process.cwd(), ".cache", "external-card-tags.json");

  try {
    await access(externalTagsPath);
    return new FileCardTagProvider(externalTagsPath);
  } catch {
    return undefined;
  }
}
