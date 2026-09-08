import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { analyzeDeckStructure } from "../analysis/index.js";
import { CachedCardDataSource, FileCardCache, ScryfallCardDataSource } from "../card-data/index.js";
import { parseAnalyzeDeckCliOptions } from "./cliOptions.js";
import { CommanderSpellbookComboDataProvider, FileComboCache, detectDeckCombos, evaluateDetectedCombos } from "../combo/index.js";
import { analyzeConsistency } from "../consistency/index.js";
import { resolveDeckList } from "../deck/index.js";
import { generateDeckScoreExplanation } from "../explanation/index.js";
import { parseDeckList } from "../parser/index.js";
import { createRatingStore } from "../rating-lab/index.js";
import { loadCardRatingProviderFromRatingStore } from "../ratings/index.js";
import { recommendDeckImprovements } from "../recommendations/index.js";
import { renderReport } from "../report/index.js";
import { scoreCommanderDeck } from "../scoring/index.js";
import { createComboTagsByName, FileCardTagProvider, tagDeckCards, tagDeckCardsWithProvider } from "../tagging/index.js";
import { validateCommanderDeck } from "../validation/index.js";

async function main(): Promise<void> {
  const options = parseAnalyzeDeckCliOptions(process.argv.slice(2));

  if (!options.deckFilePath) {
    console.error("Usage: npm run analyze -- <decklist-file> [--format json|markdown|html]");
    process.exitCode = 1;
    return;
  }

  const rawDeckList = await readFile(options.deckFilePath, "utf8");
  const parsedDeck = parseDeckList(rawDeckList, {
    sourceType: "plain_text",
    sourceUrl: options.deckFilePath,
  });
  const cardDataSource = new CachedCardDataSource(
    new ScryfallCardDataSource(),
    new FileCardCache(join(process.cwd(), ".cache", "scryfall-cards.json")),
  );
  const resolution = await resolveDeckList(parsedDeck, cardDataSource);
  const legality = validateCommanderDeck(parsedDeck, {
    cardsByNormalizedName: resolution.cardsByNormalizedName,
  });

  if (!resolution.deck) {
    console.log(JSON.stringify({ parsedDeck, legality, unresolvedNames: resolution.unresolvedNames }, null, 2));
    process.exitCode = 1;
    return;
  }

  const tagProvider = await loadOptionalCardTagProvider();
  const baseTaggedDeck = tagProvider ? await tagDeckCardsWithProvider(resolution.deck, tagProvider) : tagDeckCards(resolution.deck);
  const detectedCombos = await detectDeckCombos(
    baseTaggedDeck,
    new CommanderSpellbookComboDataProvider({
      cache: new FileComboCache(join(process.cwd(), ".cache", "commander-spellbook-combos.json")),
    }),
  );
  const taggedDeck = tagDeckCards(baseTaggedDeck, createComboTagsByName(detectedCombos));
  const structure = analyzeDeckStructure(taggedDeck);
  const consistency = analyzeConsistency(taggedDeck);
  const comboEvaluations = evaluateDetectedCombos(detectedCombos, taggedDeck);
  const ratingProvider = await loadOptionalRatingProvider(options.cardRatings);
  const score = scoreCommanderDeck({
    deck: taggedDeck,
    legality,
    comboEvaluations,
    consistency,
    ...(ratingProvider ? { ratingProvider } : {}),
  });
  const explanation = generateDeckScoreExplanation({
    score,
    legality,
    structure,
    consistency,
    comboEvaluations,
  });
  const detailedRecommendations = recommendDeckImprovements(taggedDeck, structure);

  console.log(renderReport(
    {
      legality,
      structure,
      consistency,
      detectedCombos,
      comboEvaluations,
      score,
      explanation,
      detailedRecommendations,
    },
    options.format,
  ));
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
