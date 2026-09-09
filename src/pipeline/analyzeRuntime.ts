import { access } from "node:fs/promises";
import { join } from "node:path";

import { CachedCardDataSource, CacheOnlyCardDataSource, FileCardCache, ScryfallCardDataSource, type CardDataSource } from "../card-data/index.js";
import { CommanderSpellbookComboDataProvider, FileComboCache, createComboSeedCache, type ComboDataProvider } from "../combo/index.js";
import { createRatingStore } from "../rating-lab/index.js";
import { loadCardRatingProviderFromRatingStore, type CardRatingProvider } from "../ratings/index.js";
import { FileCardTagProvider, type CardTagProvider } from "../tagging/index.js";

export interface AnalyzeRuntime {
  readonly cardDataSource: CardDataSource;
  readonly comboDataProvider: ComboDataProvider;
  readonly tagProvider?: CardTagProvider;
  readonly ratingProvider?: CardRatingProvider;
}

export interface CreateAnalyzeRuntimeOptions {
  readonly offline: boolean;
  readonly cardRatings?: "auto" | "off";
}

export async function createAnalyzeRuntime(options: CreateAnalyzeRuntimeOptions): Promise<AnalyzeRuntime> {
  const cardCache = new FileCardCache(join(process.cwd(), ".cache", "scryfall-cards.json"));
  const tagProvider = await loadOptionalCardTagProvider();
  const ratingProvider = await loadOptionalRatingProvider(options.cardRatings ?? "auto");

  return {
    cardDataSource: options.offline
      ? new CacheOnlyCardDataSource(cardCache)
      : new CachedCardDataSource(new ScryfallCardDataSource(), cardCache),
    comboDataProvider: new CommanderSpellbookComboDataProvider({
      cache: new FileComboCache(join(process.cwd(), ".cache", "commander-spellbook-combos.json"), {
        seed: createComboSeedCache(),
        useSeedCatalog: options.offline,
      }),
    }),
    ...(tagProvider ? { tagProvider } : {}),
    ...(ratingProvider ? { ratingProvider } : {}),
  };
}

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
