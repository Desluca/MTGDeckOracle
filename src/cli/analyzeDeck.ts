import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { analyzeDeckStructure } from "../analysis/index.js";
import { CachedCardDataSource, FileCardCache, ScryfallCardDataSource } from "../card-data/index.js";
import { parseAnalyzeDeckCliOptions } from "./cliOptions.js";
import { CommanderSpellbookComboDataProvider, detectDeckCombos, evaluateDetectedCombos } from "../combo/index.js";
import { analyzeConsistency } from "../consistency/index.js";
import { resolveDeckList } from "../deck/index.js";
import { generateDeckScoreExplanation } from "../explanation/index.js";
import { parseDeckList } from "../parser/index.js";
import { recommendDeckImprovements } from "../recommendations/index.js";
import { renderReport } from "../report/index.js";
import { scoreCommanderDeck } from "../scoring/index.js";
import { tagDeckCards } from "../tagging/index.js";
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

  const taggedDeck = tagDeckCards(resolution.deck);
  const structure = analyzeDeckStructure(taggedDeck);
  const consistency = analyzeConsistency(taggedDeck);
  const detectedCombos = await detectDeckCombos(taggedDeck, new CommanderSpellbookComboDataProvider());
  const comboEvaluations = evaluateDetectedCombos(detectedCombos, taggedDeck);
  const score = scoreCommanderDeck({
    deck: taggedDeck,
    legality,
    comboEvaluations,
    consistency,
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
